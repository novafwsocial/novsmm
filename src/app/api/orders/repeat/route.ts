import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/orders/repeat — re-order from a previous order.
 * Body: { orderId: string }
 *
 * Creates a new order with the same service + quantity (+ optional new link),
 * debits the balance, and records the transaction.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const { orderId, link } = body;

    if (!orderId) {
      return apiError("Order ID is required", 422);
    }

    // Find the original order
    const original = await db.order.findUnique({
      where: { id: orderId },
      include: { service: true },
    });

    if (!original || original.userId !== userId) {
      return apiError("Order not found", 404);
    }

    if (!original.service || original.service.status !== "active") {
      return apiError("This service is no longer available", 422);
    }

    const service = original.service;

    // Calculate price at current rates
    const totalPrice = (service.price * original.quantity) / 1000;
    const totalCost = (service.cost * original.quantity) / 1000;
    const profit = totalPrice - totalCost;

    // Check balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true, status: true },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);
    if (user.balance < totalPrice) {
      return apiError(
        `Insufficient balance. Need $${totalPrice.toFixed(2)}, have $${user.balance.toFixed(2)}`,
        402
      );
    }

    // Create the repeated order
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
          quantity: original.quantity,
          unitCost: service.cost,
          unitPrice: service.price,
          totalCost,
          totalPrice,
          profit,
          status: "processing",
          progress: 5,
          providerId: service.providerId,
          providerName: original.providerName,
          link: link || original.link || null,
          eta: "2m",
          flag: original.flag,
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
          description: `Repeated order #${original.publicId} → #${publicId} — ${service.name}`,
          method: "balance",
          reference: publicId,
        },
      }),
    ]);

    // Notification
    await createNotification({
      userId,
      type: "order",
      title: `Order #${publicId} placed (repeated)`,
      message: `${service.platform} · ${service.name} — ${original.quantity.toLocaleString()} units. Total: $${totalPrice.toFixed(2)}`,
      amount: -totalPrice,
      severity: "info",
      sendEmail: true,
    });

    // Simulate fulfillment
    simulateFulfillment(order.id, userId).catch((e) =>
      console.error("[fulfillment] error:", e)
    );

    // Audit log
    await audit(userId, "create", "order", order.id, {
      publicId,
      repeatedFrom: original.publicId,
      service: service.name,
      quantity: original.quantity,
      total: totalPrice,
    });

    return apiOk({ order, message: "Order repeated successfully" }, 201);
  } catch (e: any) {
    console.error("[orders/repeat] error:", e);
    return apiError("Failed to repeat order", 500);
  }
}

async function simulateFulfillment(orderId: string, userId: string) {
  const steps = [
    { delay: 2000, progress: 15, status: "in_progress" },
    { delay: 5000, progress: 40, status: "in_progress" },
    { delay: 8000, progress: 75, status: "in_progress" },
    { delay: 12000, progress: 100, status: "completed" },
  ];

  for (const step of steps) {
    await new Promise((r) => setTimeout(r, step.delay));

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, publicId: true, serviceName: true, totalPrice: true },
    });
    if (!order || order.status === "cancelled") return;

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
        title: `Order #${order.publicId} completed ✅`,
        message: `${order.serviceName} — delivery complete.`,
        amount: order.totalPrice,
        severity: "success",
        sendEmail: true,
      });
    }
  }
}
