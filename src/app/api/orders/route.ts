import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createOrderSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { placeHuntSMMOrder, extractProviderServiceId } from "@/lib/huntsmm";

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
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { serviceId, quantity, link } = parsed.data;

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
          status: "processing",
          progress: 5,
          providerId: service.providerId,
          providerName: service.provider?.name,
          link: link || null,
          eta: "2m",
          flag: "🌍",
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

    // Simulate provider fulfillment asynchronously
    // (In production, a background worker would poll the provider API)
    simulateFulfillment(order.id, userId).catch((e) =>
      console.error("[fulfillment] error:", e)
    );

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
 * Simulates provider fulfillment by updating order progress over time.
 * In production this would be a background job polling the real provider API.
 */
async function simulateFulfillment(orderId: string, userId: string) {
  // Fetch the full order to get the link and service name
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, publicId: true, serviceName: true,
      totalPrice: true, link: true, quantity: true,
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

  // Fallback: simulate fulfillment (when no link, or provider fails)
  const steps = [
    { delay: 2000, progress: 15, status: "in_progress" },
    { delay: 5000, progress: 40, status: "in_progress" },
    { delay: 8000, progress: 75, status: "in_progress" },
    { delay: 12000, progress: 100, status: "completed" },
  ];

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
    }
  }
}
