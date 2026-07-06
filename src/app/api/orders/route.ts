import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { createOrderSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";

/**
 * Extended create-order schema with optional drip-feed configuration.
 *
 * - `dripFeed` toggles chunked delivery on/off.
 * - `dripDays` is the number of delivery chunks (one chunk per "day").
 * - `dripDelay` is the minutes to wait between chunks (default 1440 = 24h).
 *
 * When `dripFeed` is true, `dripDays` must be >= 1 and <= 365. `dripDelay`
 * defaults to 1440 (one chunk per day) when omitted.
 */
const createOrderWithDripSchema = createOrderSchema.extend({
  dripFeed: z.boolean().optional(),
  dripDays: z.number().int().positive().max(365).optional(),
  dripDelay: z.number().int().nonnegative().max(60 * 24 * 30).optional(),
}).refine(
  (d) => !d.dripFeed || (typeof d.dripDays === "number" && d.dripDays >= 1),
  { message: "dripDays is required (>=1) when dripFeed is true", path: ["dripDays"] }
);

/**
 * Builds the drip-feed configuration object stored on the order (Json column).
 * Prisma serializes the object automatically — no JSON.stringify needed.
 * Returns `null` when drip-feed is disabled or the inputs are invalid.
 */
function buildDripFeedConfig(
  dripFeed: boolean | undefined,
  totalQuantity: number,
  dripDays: number | undefined,
  dripDelay: number | undefined,
): Record<string, any> | null {
  if (!dripFeed) return null;
  const chunks = Math.max(1, Math.min(365, dripDays ?? 1));
  const perChunk = Math.max(1, Math.floor(totalQuantity / chunks));
  const delayMinutes = dripDelay ?? 1440; // 24h default
  return {
    totalQuantity,
    chunks,
    perChunk,
    delayMinutes,
    startDate: new Date().toISOString(),
  };
}

/**
 * Cancels a pending order and refunds the user's balance.
 * Only allowed within the first 60 seconds after creation and only when the
 * order is still in the pre-fulfillment `pending` / `processing` states.
 */
const CANCEL_WINDOW_MS = 60_000;

/**
 * Plan-based monthly order limits.
 * `null` means unlimited.
 *
 * free       → 50 orders / calendar month
 * starter    → 1,000
 * growth     → 10,000
 * enterprise → unlimited
 */
const PLAN_ORDER_LIMITS: Record<string, number | null> = {
  free: 50,
  starter: 1000,
  growth: 10000,
  enterprise: null,
};

/**
 * Plan-based order priority (speed differentiation).
 *
 * free / starter → "standard"  (normal queue, ~2s start)
 * growth         → "priority"  (priority queue, <1.2s start)
 * enterprise     → "highest"   (highest priority, <800ms start)
 *
 * Stored on every Order row so the fulfillment worker / admin
 * views can sort and dispatch accordingly.
 */
const PLAN_PRIORITY: Record<string, "standard" | "priority" | "highest"> = {
  free: "standard",
  starter: "standard",
  growth: "priority",
  enterprise: "highest",
};

/** Returns the priority for a given plan (defaults to standard). */
function priorityForPlan(plan: string): "standard" | "priority" | "highest" {
  return PLAN_PRIORITY[plan] ?? "standard";
}

/** Returns the start of the current calendar month (UTC). */
function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * GET /api/orders — list the authenticated user's orders.
 * Supports ?status= and ?search=
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const orders = await db.order.findMany({
    where: {
      userId,
      ...(status && status !== "all" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { publicId: { contains: search } },
              { serviceName: { contains: search } },
              { platform: { contains: search } },
              { providerName: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      publicId: true,
      serviceName: true,
      platform: true,
      quantity: true,
      unitCost: true,
      unitPrice: true,
      totalCost: true,
      totalPrice: true,
      profit: true,
      status: true,
      progress: true,
      priority: true,
      providerName: true,
      link: true,
      eta: true,
      flag: true,
      dripFeedConfig: true,
      createdAt: true,
      updatedAt: true,
      completedAt: true,
    },
  });

  return apiOk({ orders });
}

/**
 * POST /api/orders — create a new order (real purchase).
 * 1. Validate the service exists and is active
 * 2. Validate quantity is within min/max
 * 3. Check user has sufficient balance
 * 4. Debit balance + create transaction (atomic)
 * 5. Create order
 * 6. Emit notifications (in-app + email)
 * 7. Simulate provider fulfillment (progress over time)
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = createOrderWithDripSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { serviceId, quantity, link, dripFeed, dripDays, dripDelay } = parsed.data;

    // Fetch service
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { provider: true },
    });
    if (!service || service.status !== "active") {
      return apiError("Service not available", 404);
    }

    // Validate quantity
    if (quantity < service.minQty || quantity > service.maxQty) {
      return apiError(
        `Quantity must be between ${service.minQty} and ${service.maxQty}`,
        422
      );
    }

    // Calculate price (per 1000 units)
    const totalPrice = (service.price * quantity) / 1000;
    const totalCost = (service.cost * quantity) / 1000;
    const profit = totalPrice - totalCost;

    // Check balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true, status: true, plan: true },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active")
      return apiError("Account suspended", 403);

    // ── Plan limit enforcement (BEFORE balance validation) ──
    const planLimit = PLAN_ORDER_LIMITS[user.plan] ?? PLAN_ORDER_LIMITS.free;
    if (planLimit !== null) {
      const monthStart = startOfMonth();
      const used = await db.order.count({
        where: { userId, createdAt: { gte: monthStart } },
      });
      if (used >= planLimit) {
        return NextResponse.json(
          {
            error: "Plan limit exceeded",
            limit: planLimit,
            used,
            plan: user.plan,
            upgradeUrl: "/?upgrade=true",
          },
          { status: 403 }
        );
      }
    }

    // Race-safe atomic purchase.
    //
    // The balance check happens INSIDE the transaction via a conditional
    // `updateMany` (WHERE balance >= totalPrice). If the conditional update
    // affects 0 rows, the user's balance was insufficient at debit time and
    // we throw `INSUFFICIENT_BALANCE` to abort the whole transaction.
    //
    // Why: on SQLite the old `if (user.balance < totalPrice)` check outside
    // the transaction worked because SQLite serializes writes. On PostgreSQL
    // (MVCC) two concurrent orders can both pass the check and both debit,
    // driving the balance negative. Doing the check + debit as a single
    // conditional UPDATE eliminates that race: only one of the two updates
    // will see a sufficient balance, the other will affect 0 rows and abort.
    //
    // publicId / txPublicId are pre-computed OUTSIDE this transaction —
    // nextPublicId() runs its own atomic Prisma transaction internally, and
    // nesting it inside this $transaction would deadlock / error on some
    // drivers. The order.create inside this tx consumes the pre-computed IDs.
    const publicId = await nextPublicId("A", 10432);
    const txPublicId = await nextPublicId("TX", 8842);
    const priority = priorityForPlan(user.plan);

    // Drip-feed orders start in "pending" so the fulfillment worker / admin
    // can schedule the chunks. Non-drip orders start in "processing".
    const dripConfig = buildDripFeedConfig(dripFeed, quantity, dripDays, dripDelay);
    const initialStatus = dripConfig ? "pending" : "processing";
    const initialProgress = dripConfig ? 0 : 5;

    let order: any;
    try {
      order = await db.$transaction(async (tx) => {
        // Conditional update — only succeeds if balance is sufficient.
        // On PostgreSQL this is a single atomic UPDATE ... WHERE balance >=
        // totalPrice, so two concurrent orders cannot both succeed.
        const updated = await tx.user.updateMany({
          where: { id: userId, balance: { gte: totalPrice } },
          data: { balance: { decrement: totalPrice } },
        });
        if (updated.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // Create order + sale transaction inside the same transaction so
        // the debit, order, and ledger entry are atomic.
        const created = await tx.order.create({
          data: {
            publicId,
            userId,
            serviceId: service.id,
            serviceName: service.name,
            platform: service.platform,
            quantity,
            unitCost: service.cost,
            unitPrice: service.price,
            totalCost,
            totalPrice,
            profit,
            status: initialStatus,
            progress: initialProgress,
            priority,
            providerId: service.providerId,
            providerName: service.provider?.name,
            link: link || null,
            // Priority orders get a shorter advertised ETA in the UI.
            // Actual fulfillment speed is governed by the worker queue
            // ordering on the `priority` column.
            eta: dripConfig
              ? `${dripDays}d drip`
              : priority === "highest" ? "<1m" : priority === "priority" ? "1m" : "2m",
            flag: "🌍",
            // dripFeedConfig is a Json column. Prisma needs DbNull (not JS null)
            // when the value is absent so the column writes SQL NULL.
            dripFeedConfig: dripConfig ?? Prisma.DbNull,
          },
        });

        await tx.transaction.create({
          data: {
            publicId: txPublicId,
            userId,
            type: "sale",
            amount: -totalPrice,
            description: `Order #${publicId} — ${service.name}`,
            method: "balance",
            reference: publicId,
            orderId: undefined,
          },
        });

        return created;
      });
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_BALANCE") {
        // Re-read the current balance for an accurate error message.
        // The pre-transaction `user.balance` snapshot may be stale by the
        // time we get here (another concurrent order may have debited first).
        const fresh = await db.user.findUnique({
          where: { id: userId },
          select: { balance: true },
        });
        const currentBalance = fresh?.balance ?? 0;
        return apiError(
          `Insufficient balance. Need $${totalPrice.toFixed(2)}, have $${currentBalance.toFixed(2)}`,
          402,
        );
      }
      throw e;
    }

    // Notifications
    await createNotification({
      userId,
      type: "order",
      title: `Order #${publicId} placed`,
      message: `${service.platform} · ${service.name} — ${quantity.toLocaleString()} units. Total: $${totalPrice.toFixed(2)}`,
      amount: -totalPrice,
      severity: "info",
      sendEmail: true,
    });

    // Simulate provider fulfillment asynchronously for non-drip orders.
    // Drip-feed orders stay in "pending" until the drip scheduler / admin
    // advances them chunk-by-chunk.
    // (In production, a background worker would poll the provider API)
    if (!dripConfig) {
      // Enqueue fulfillment as a background job. When Redis is available,
      // BullMQ processes it via the worker; otherwise enqueueJob() falls
      // back to in-process setImmediate, which runs simulateFulfillment
      // with the same setTimeout chain as before (sandbox/dev mode).
      enqueueJob("order.fulfill", { orderId: order.id, userId }).catch((e) =>
        console.error("[fulfillment] error:", e)
      );
    }

    // Audit log
    await audit(userId, "create", "order", order.id, {
      publicId,
      service: service.name,
      quantity,
      total: totalPrice,
      priority,
      plan: user.plan,
      dripFeed: !!dripConfig,
      dripDays: dripConfig ? dripDays : undefined,
    });

    return apiOk({ order, message: "Order placed successfully" }, 201);
  } catch (e: any) {
    console.error("[orders/create] error:", e);
    return apiError("Failed to create order", 500);
  }
}

/**
 * PATCH /api/orders — cancel a pending order within 60 seconds of creation.
 * Body: { orderId: string }
 *
 * Refunds the full price to the user's balance and marks the order as
 * `cancelled`. Only allowed when:
 *   - the order belongs to the authenticated user
 *   - the order is in `pending` or `processing` state (not yet in progress)
 *   - the order was created less than 60 seconds ago
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const { orderId } = body;
    if (!orderId || typeof orderId !== "string") {
      return apiError("orderId is required", 422);
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, publicId: true, userId: true, status: true,
        totalPrice: true, createdAt: true, serviceName: true,
      },
    });
    if (!order) return apiError("Order not found", 404);
    if (order.userId !== userId) return apiError("Order not found", 404);

    // State check
    if (order.status !== "pending" && order.status !== "processing") {
      return apiError(
        "Order can only be cancelled while still pending",
        422,
      );
    }

    // Time window check
    const elapsed = Date.now() - order.createdAt.getTime();
    if (elapsed > CANCEL_WINDOW_MS) {
      return apiError(
        "Cancel window expired (60 seconds after placement)",
        422,
      );
    }

    // Atomic: mark cancelled + refund balance + record refund transaction
    const txPublicId = `TX-${Date.now().toString().slice(-6)}`;
    await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data: {
          status: "cancelled",
          progress: 0,
          eta: "Cancelled",
        },
      }),
      db.user.update({
        where: { id: userId },
        data: { balance: { increment: order.totalPrice } },
      }),
      db.transaction.create({
        data: {
          publicId: txPublicId,
          userId,
          type: "sale",
          amount: order.totalPrice,
          description: `Refund — cancelled order #${order.publicId} — ${order.serviceName}`,
          method: "balance",
          reference: `refund:${order.publicId}`,
          orderId: order.id,
        },
      }),
    ]);

    await createNotification({
      userId,
      type: "order",
      title: `Order #${order.publicId} cancelled`,
      message: `${order.serviceName} — $${order.totalPrice.toFixed(2)} refunded to your balance.`,
      amount: order.totalPrice,
      severity: "warning",
      sendEmail: true,
    });

    await audit(userId, "cancel", "order", order.id, {
      publicId: order.publicId,
      refunded: order.totalPrice,
    });

    return apiOk({ message: "Order cancelled — refund issued" });
  } catch (e: any) {
    console.error("[orders/cancel] error:", e);
    return apiError("Failed to cancel order", 500);
  }
}
