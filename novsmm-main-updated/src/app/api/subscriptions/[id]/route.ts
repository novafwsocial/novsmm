import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * Single-subscription endpoints.
 *
 *   GET   /api/subscriptions/[id]   → fetch a single SMM subscription (own)
 *   PATCH /api/subscriptions/[id]   → update status (pause / resume / cancel)
 *
 * Status transitions allowed:
 *   active  → paused
 *   paused  → active
 *   active  → cancelled
 *   paused  → cancelled
 *
 * Editing any other field is not allowed. Quantity, posts, expiry, etc. are
 * fixed at creation time.
 */

const updateStatusSchema = z.object({
  status: z.enum(["paused", "active", "cancelled"]),
});

/**
 * GET /api/subscriptions/[id] — fetch a single SMM subscription.
 * Verifies ownership: returns 404 if the ID doesn't exist or doesn't belong to
 * the authenticated user.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  const { id } = await params;

  const subscription = await db.smmSubscription.findUnique({
    where: { id },
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
      userId: true,
    },
  });

  // Ownership + existence check (single 404 — don't leak which IDs exist
  // across users).
  if (!subscription || subscription.userId !== userId) {
    return apiError("Subscription not found", 404);
  }

  return apiOk({ subscription });
}

/**
 * PATCH /api/subscriptions/[id] — update subscription status.
 * Body: { status: "paused" | "active" | "cancelled" }
 *
 * Only the status field can be updated. Allowed transitions:
 *   active → paused
 *   paused → active
 *   active → cancelled
 *   paused → cancelled
 *
 * Other transitions (e.g. completed → active, cancelled → anything) are
 * rejected with 422.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid status", 422);
    }
    const next = parsed.data.status;

    const subscription = await db.smmSubscription.findUnique({
      where: { id },
      select: {
        id: true,
        publicId: true,
        userId: true,
        status: true,
        serviceName: true,
        posts: true,
        postsProcessed: true,
      },
    });
    if (!subscription || subscription.userId !== userId) {
      return apiError("Subscription not found", 404);
    }

    const current = subscription.status;
    if (current === next) {
      // Idempotent — return the subscription unchanged.
      return apiOk({ subscription, message: "No change" });
    }

    // ── Transition validation ──
    const allowed: Record<string, string[]> = {
      active: ["paused", "cancelled"],
      paused: ["active", "cancelled"],
      completed: [],
      expired: [],
      cancelled: [],
    };
    if (!allowed[current]?.includes(next)) {
      return apiError(
        `Cannot transition subscription from "${current}" to "${next}"`,
        422,
      );
    }

    const updated = await db.smmSubscription.update({
      where: { id: subscription.id },
      data: { status: next },
    });

    await createNotification({
      userId,
      type: "order",
      title: `Subscription ${subscription.publicId} ${next}`,
      message:
        next === "paused"
          ? `Paused — auto-delivery for @${updated.username} is on hold. Resume anytime.`
          : next === "cancelled"
            ? `Cancelled — no further auto-deliveries will be created.`
            : `Resumed — auto-delivery for @${updated.username} is active again.`,
      severity: next === "cancelled" ? "warning" : "info",
    });

    await audit(userId, "update", "smm_subscription", subscription.id, {
      publicId: subscription.publicId,
      from: current,
      to: next,
    });

    return apiOk({ subscription: updated, message: `Subscription ${next}` });
  } catch (e: any) {
    console.error("[subscriptions/update] error:", e);
    return apiError("Failed to update subscription", 500);
  }
}
