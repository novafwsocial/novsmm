import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";

/**
 * SMM Subscriptions API.
 *
 * "Auto-deliver X likes to every new post for N days" — a standard SMM panel
 * feature. This is DIFFERENT from the removed SaaS Subscription (team-seats
 * billing).
 *
 *   POST /api/subscriptions         → create a new SMM subscription
 *   GET  /api/subscriptions         → list the user's SMM subscriptions
 *
 * Per-post detection + auto-order creation happens in the
 * `smm.subscription.check` background worker (see src/lib/smm-subscriptions.ts).
 *
 * The full upfront cost is debited at creation time (charging for the max
 * quantity per post × total posts to be safe — partial coverage of the last
 * post is refunded when the subscription completes or is cancelled).
 */

// ── Zod schema: create subscription ──
const createSubscriptionSchema = z.object({
  serviceId: z.string().min(1),
  username: z.string().min(1, "Username is required"),
  link: z.string().url().optional().or(z.literal("")),
  minQuantity: z.number().int().positive(),
  maxQuantity: z.number().int().positive(),
  posts: z.number().int().min(1).max(365),
  delayMinutes: z.number().int().nonnegative().max(60 * 24 * 30).optional(),
  expiryDays: z.number().int().min(1).max(365),
}).refine((d) => d.minQuantity <= d.maxQuantity, {
  message: "minQuantity must be <= maxQuantity",
  path: ["minQuantity"],
});

/**
 * GET /api/subscriptions — list the authenticated user's SMM subscriptions.
 *
 * Returns both active and historical subscriptions, newest first, capped at 200
 * to keep the payload sane. Each item carries a service snapshot (name,
 * platform), the post-coverage progress (postsProcessed/posts), status, expiry,
 * and the cumulative totalSpent.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const subscriptions = await db.smmSubscription.findMany({
    where: {
      userId,
      ...(status && status !== "all" ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      publicId: true,
      serviceId: true,
      serviceName: true,
      platform: true,
      username: true,
      link: true,
      minQuantity: true,
      maxQuantity: true,
      posts: true,
      postsProcessed: true,
      delayMinutes: true,
      expiry: true,
      status: true,
      lastCheckedAt: true,
      lastPostUrl: true,
      totalSpent: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return apiOk({ subscriptions });
}

/**
 * POST /api/subscriptions — create a new SMM subscription.
 *
 * Flow:
 *   1. Validate body (serviceId, username, qty range, posts, expiryDays)
 *   2. Fetch service → must be active
 *   3. Validate minQuantity >= service.minQty and maxQuantity <= service.maxQty
 *   4. Compute upfront cost = service.price × maxQuantity × posts / 1000
 *      (charge for max quantity per post, to be safe — refunds on completion
 *      are out of scope for this iteration)
 *   5. Conditional atomic balance debit (same pattern as orders/route.ts):
 *      `updateMany WHERE balance >= cost` — race-safe under MVCC.
 *   6. Generate publicId via nextPublicId("SUB", 1000)
 *   7. Create subscription record + ledger transaction
 *   8. Create notification
 *   9. Enqueue a one-shot `smm.subscription.check` job so the new subscription
 *      gets its first post-detection pass quickly (instead of waiting up to 5
 *      minutes for the next cron tick).
 *  10. Return 201 with the subscription object.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  try {
    const body = await req.json();
    const parsed = createSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }
    const { serviceId, username, link, minQuantity, maxQuantity, posts, delayMinutes, expiryDays } = parsed.data;

    // ── Fetch service ──
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { provider: true },
    });
    if (!service || service.status !== "active") {
      return apiError("Service not available", 404);
    }

    // ── Quantity range must fit within the service's min/max ──
    if (minQuantity < service.minQty) {
      return apiError(`minQuantity must be >= ${service.minQty} for this service`, 422);
    }
    if (maxQuantity > service.maxQty) {
      return apiError(`maxQuantity must be <= ${service.maxQty} for this service`, 422);
    }

    // ── Upfront cost (charge for max quantity per post) ──
    const totalUnits = maxQuantity * posts;
    const totalCost = (service.price * totalUnits) / 1000;

    // ── Pre-fetch user for status check (debit happens inside tx) ──
    const fresh = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true, status: true },
    });
    if (!fresh) return apiError("User not found", 404);
    if (fresh.status !== "active") return apiError("Account suspended", 403);

    // ── Pre-compute IDs OUTSIDE the tx (nextPublicId opens its own tx) ──
    const publicId = await nextPublicId("SUB", 1000);
    const txPublicId = await nextPublicId("TX", 8842);

    const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    let subscription: any;
    try {
      subscription = await db.$transaction(async (tx) => {
        // ── Conditional balance debit (race-safe under MVCC) ──
        const updated = await tx.user.updateMany({
          where: { id: userId, balance: { gte: totalCost } },
          data: { balance: { decrement: totalCost } },
        });
        if (updated.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const created = await tx.smmSubscription.create({
          data: {
            publicId,
            userId,
            serviceId: service.id,
            serviceName: service.name,
            platform: service.platform,
            username,
            link: link || null,
            minQuantity,
            maxQuantity,
            posts,
            postsProcessed: 0,
            delayMinutes: delayMinutes ?? 0,
            expiry: expiryDate,
            status: "active",
            lastCheckedAt: null,
            lastPostUrl: null,
            totalSpent: totalCost,
          },
        });

        await tx.transaction.create({
          data: {
            publicId: txPublicId,
            userId,
            type: "sale",
            amount: -totalCost,
            description: `SMM Subscription ${publicId} — ${service.name} × ${posts} posts`,
            method: "balance",
            reference: publicId,
          },
        });

        return created;
      });
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_BALANCE") {
        const reRead = await db.user.findUnique({
          where: { id: userId },
          select: { balance: true },
        });
        const currentBalance = reRead?.balance ?? 0;
        return apiError(
          `Insufficient balance. Need $${totalCost.toFixed(2)}, have $${currentBalance.toFixed(2)}`,
          402,
        );
      }
      throw e;
    }

    // P-005 FIX: Invalidate user cache so the balance change is visible immediately.
    try {
      const { cacheInvalidate } = await import("@/lib/cache");
      await cacheInvalidate(`user:${userId}`);
      await cacheInvalidate(`dashboard:${userId}:*`);
    } catch {}

    // ── Notification + audit + background job ──
    await createNotification({
      userId,
      type: "order",
      title: `SMM subscription ${publicId} created`,
      message: `${service.platform} · ${service.name} — auto-deliver to @${username} for ${posts} posts (up to ${expiryDays} days). Total: $${totalCost.toFixed(2)}`,
      amount: -totalCost,
      severity: "info",
      sendEmail: true,
    });

    enqueueJob("smm.subscription.check", { subscriptionId: subscription.id }).catch(() => {});

    await audit(userId, "create", "smm_subscription", subscription.id, {
      publicId,
      service: service.name,
      username,
      minQuantity,
      maxQuantity,
      posts,
      expiryDays,
      total: totalCost,
    });

    return apiOk({ subscription, message: "SMM subscription created" }, 201);
  } catch (e: any) {
    console.error("[subscriptions/create] error:", e);
    return apiError("Failed to create subscription", 500);
  }
}
