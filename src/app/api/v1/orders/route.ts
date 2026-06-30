import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { z } from "zod";

const createOrderSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.number().int().positive(),
  link: z.string().url().optional().or(z.literal("")),
});

/**
 * POST /api/v1/orders
 * Public API for resellers — creates a new order.
 * Auth: Bearer nvsk_live_xxx (requires 'order' permission)
 *
 * Same atomic purchase flow as the internal API:
 * 1. Validate service + quantity
 * 2. Check balance
 * 3. Debit balance + create order + create transaction
 * 4. Emit notification
 * 5. Simulate fulfillment
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiKey(req, "order");
  if (error) return error;
  const userId = user.id;

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Invalid input", 422);
    }

    const { serviceId, quantity, link } = parsed.data;

    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { provider: true },
    });
    if (!service || service.status !== "active") {
      return apiError("Service not available", 404);
    }

    if (quantity < service.minQty || quantity > service.maxQty) {
      return apiError(`Quantity must be between ${service.minQty} and ${service.maxQty}`, 422);
    }

    const totalPrice = (service.price * quantity) / 1000;
    const totalCost = (service.cost * quantity) / 1000;

    if (user.balance < totalPrice) {
      return apiError(
        `Insufficient balance. Need $${totalPrice.toFixed(2)}, have $${user.balance.toFixed(2)}`,
        402
      );
    }

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
          profit: totalPrice - totalCost,
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
          description: `API Order #${publicId} — ${service.name}`,
          method: "balance",
          reference: publicId,
        },
      }),
    ]);

    await createNotification({
      userId,
      type: "order",
      title: `Order #${publicId} placed (via API)`,
      message: `${service.platform} · ${service.name} — ${quantity.toLocaleString()} units. Total: $${totalPrice.toFixed(2)}`,
      amount: -totalPrice,
      severity: "info",
    });

    // Simulate fulfillment
    simulateFulfillment(order.id, userId).catch(() => {});

    return apiOk({
      status: "success",
      order: order.publicId,
      service: service.name,
      quantity,
      price: totalPrice,
      status: order.status,
      message: "Order placed successfully",
    }, 201);
  } catch (e: any) {
    console.error("[v1/orders] error:", e);
    return apiError("Failed to create order", 500);
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
      });
    }
  }
}
