import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createOrderSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { placeHuntSMMOrder, extractProviderServiceId } from "@/lib/huntsmm";
import {
  awardOrderPoints,
  reconcileAchievements,
} from "@/app/api/me/loyalty/route";

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
 * Builds the JSON-encoded drip-feed configuration object stored on the order.
 * Returns `null` when drip-feed is disabled or the inputs are invalid.
 */
function buildDripFeedConfig(
  dripFeed: boolean | undefined,
  totalQuantity: number,
  dripDays: number | undefined,
  dripDelay: number | undefined,
): string | null {
  if (!dripFeed) return null;
  const chunks = Math.max(1, Math.min(365, dripDays ?? 1));
  const perChunk = Math.max(1, Math.floor(totalQuantity / chunks));
  const delayMinutes = dripDelay ?? 1440; // 24h default
  return JSON.stringify({
    totalQuantity,
    chunks,
    perChunk,
    delayMinutes,
    startDate: new Date().toISOString(),
  });
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

    if (user.balance < totalPrice) {
      return apiError(
        `Insufficient balance. Need $${totalPrice.toFixed(2)}, have $${user.balance.toFixed(2)}`,
        402
      );
    }

    // Atomic: debit balance + create order + create transaction
    const orderCount = await db.order.count();
    const publicId = `A-${10432 + orderCount}`;
    const priority = priorityForPlan(user.plan);

    // Drip-feed orders start in "pending" so the fulfillment worker / admin
    // can schedule the chunks. Non-drip orders start in "processing".
    const dripConfig = buildDripFeedConfig(dripFeed, quantity, dripDays, dripDelay);
    const initialStatus = dripConfig ? "pending" : "processing";
    const initialProgress = dripConfig ? 0 : 5;

    const [order] = await db.$transaction([
      db.order.create({
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
          dripFeedConfig: dripConfig,
        },
      }),
      db.user.update({
        where: { id: userId },
        data: { balance: { decrement: totalPrice } },
      }),
      db.transaction.create({
        data: {
          publicId: `TX-${Date.now().toString().slice(-6)}`,
          userId,
          type: "sale",
          amount: -totalPrice,
          description: `Order #${publicId} — ${service.name}`,
          method: "balance",
          reference: publicId,
          orderId: undefined,
        },
      }),
    ]);

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
      simulateFulfillment(order.id, userId).catch((e) =>
        console.error("[fulfillment] error:", e)
      );
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId,
        action: "create",
        entity: "order",
        entityId: order.id,
        metadata: JSON.stringify({
          publicId,
          service: service.name,
          quantity,
          total: totalPrice,
          priority,
          plan: user.plan,
          dripFeed: !!dripConfig,
          dripDays: dripConfig ? dripDays : undefined,
        }),
      },
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

    await db.auditLog.create({
      data: {
        userId,
        action: "cancel",
        entity: "order",
        entityId: order.id,
        metadata: JSON.stringify({
          publicId: order.publicId,
          refunded: order.totalPrice,
        }),
      },
    });

    return apiOk({ message: "Order cancelled — refund issued" });
  } catch (e: any) {
    console.error("[orders/cancel] error:", e);
    return apiError("Failed to cancel order", 500);
  }
}

/**
 * Simulates provider fulfillment by updating order progress over time.
 * In production this would be a background job polling the real provider API.
 */
async function simulateFulfillment(orderId: string, userId: string) {
  // Fetch the full order to get the link and service name
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, publicId: true, serviceName: true,
      totalPrice: true, link: true, quantity: true, priority: true,
    },
  });
  if (!order || order.status === "cancelled") return;

  // Try to place the order on HuntSMM
  const providerServiceId = extractProviderServiceId(order.serviceName);
  if (providerServiceId && order.link) {
    const result = await placeHuntSMMOrder(
      providerServiceId,
      order.link,
      order.quantity
    );

    if ("orderId" in result) {
      // Real order placed — update with provider order ID
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "in_progress",
          progress: 10,
          eta: "Processing on HuntSMM",
          providerName: `HuntSMM #${result.orderId}`,
        },
      });
      return; // Real fulfillment — status will be updated via webhook/cron
    } else {
      console.error("[fulfillment] HuntSMM order failed:", result.error);
      // Fall through to simulation
    }
  }

  // Fallback: simulate fulfillment (when no link, or provider fails).
  // Priority/highest plans get progressively faster step intervals to
  // mirror the queue-speed differentiation promised in the marketing copy.
  const speedMultiplier =
    order.priority === "highest" ? 0.4 :
    order.priority === "priority" ? 0.7 :
    1.0; // standard

  const baseSteps = [
    { delay: 2000, progress: 15, status: "in_progress" },
    { delay: 5000, progress: 40, status: "in_progress" },
    { delay: 8000, progress: 75, status: "in_progress" },
    { delay: 12000, progress: 100, status: "completed" },
  ];
  const steps = baseSteps.map((s, i) => ({
    // Delay is the gap from the previous step; first step uses its own delay.
    delay: Math.round((i === 0 ? s.delay : s.delay - baseSteps[i - 1].delay) * speedMultiplier),
    progress: s.progress,
    status: s.status,
  }));

  for (const step of steps) {
    await new Promise((r) => setTimeout(r, step.delay));

    const currentOrder = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, publicId: true, serviceName: true, totalPrice: true },
    });
    if (!currentOrder || currentOrder.status === "cancelled") return;

    await db.order.update({
      where: { id: orderId },
      data: {
        progress: step.progress,
        status: step.status,
        eta: step.status === "completed" ? "—" : `${Math.ceil((100 - step.progress) / 20)}m`,
        completedAt: step.status === "completed" ? new Date() : null,
      },
    });

    if (step.status === "completed") {
      await createNotification({
        userId,
        type: "order",
        title: `Order #${currentOrder.publicId} completed ✅`,
        message: `${currentOrder.serviceName} — delivery complete.`,
        amount: currentOrder.totalPrice,
        severity: "success",
        sendEmail: true,
      });

      // ── Loyalty points + achievement reconciliation ──
      // Award 1 point per $1 spent × plan multiplier, then run the achievement
      // reconciler to unlock any newly-eligible milestones (first_order,
      // 10_orders, 100_orders, 100_spent, 1000_spent, big_spender, etc.).
      // Each unlocked achievement awards its bonus points as a separate
      // loyalty entry (handled inside reconcileAchievements).
      try {
        const userPlan = await db.user.findUnique({
          where: { id: userId },
          select: { plan: true, name: true },
        });
        if (userPlan) {
          const awarded = await awardOrderPoints(
            userId,
            currentOrder.id,
            currentOrder.totalPrice,
            userPlan.plan,
          );
          if (awarded.points > 0) {
            await createNotification({
              userId,
              type: "system",
              title: `+${awarded.points} loyalty points earned`,
              message: `Order #${currentOrder.publicId} — ${awarded.points} pts awarded (${awarded.multiplier}× ${userPlan.plan} plan multiplier).`,
              severity: "success",
              sendEmail: false,
            });
          }
          // Unlock any newly-eligible achievements. reconcileAchievements
          // fires its own notifications for each unlock, so nothing else to do.
          await reconcileAchievements(userId);
        }
      } catch (loyaltyErr) {
        // Loyalty failures must never break order fulfillment.
        console.error("[loyalty] award/reconcile failed:", loyaltyErr);
      }
    }
  }
}
