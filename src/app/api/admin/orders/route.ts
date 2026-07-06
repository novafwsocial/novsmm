import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { z } from "zod";

const manualOrderSchema = z.object({
  userId: z.string().min(1),
  serviceId: z.string().min(1),
  quantity: z.number().int().positive(),
  link: z.string().optional(),
  // Optional: override the price (admin can give discounts)
  customPrice: z.number().positive().optional(),
});

/**
 * POST /api/admin/orders — admin creates an order manually for a user.
 * Can optionally override the price (for discounts/manual adjustments).
 * Does NOT debit the user's balance (admin-created orders are complimentary
 * or invoiced separately).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = manualOrderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { userId, serviceId, quantity, link, customPrice } = parsed.data;

  // Validate user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, status: true },
  });
  if (!user) return apiError("User not found", 404);
  if (user.status !== "active") return apiError("User is not active", 422);

  // Validate service
  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: { provider: true },
  });
  if (!service) return apiError("Service not found", 404);

  if (quantity < service.minQty || quantity > service.maxQty) {
    return apiError(`Quantity must be ${service.minQty}-${service.maxQty}`, 422);
  }

  // Calculate price (use custom price if provided, otherwise standard)
  const unitPrice = customPrice ?? service.price;
  const unitCost = service.cost;
  const totalPrice = (unitPrice * quantity) / 1000;
  const totalCost = (unitCost * quantity) / 1000;

  const orderCount = await db.order.count();
  const publicId = `A-${10432 + orderCount}`;

  // Create order WITHOUT debiting balance (admin-created = complimentary)
  const order = await db.order.create({
    data: {
      publicId,
      userId,
      serviceId: service.id,
      serviceName: service.name,
      platform: service.platform,
      quantity,
      unitCost,
      unitPrice,
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
  });

  // Notification to user
  await createNotification({
    userId,
    type: "order",
    title: `Order #${publicId} created by admin`,
    message: `${service.platform} · ${service.name} — ${quantity.toLocaleString()} units. ${customPrice ? "Custom price applied." : "Complimentary order."}`,
    amount: -totalPrice,
    severity: "info",
    sendEmail: true,
  });

  // Audit log
  await audit(adminId, "create", "order", order.id, {
    publicId,
    forUser: user.email,
    service: service.name,
    quantity,
    customPrice: customPrice ?? null,
    total: totalPrice,
  });

  // Simulate fulfillment
  simulateFulfillment(order.id, userId).catch(() => {});

  return apiOk({ order, message: "Order created manually" }, 201);
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
      select: { id: true, status: true, publicId: true, serviceName: true },
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
        severity: "success",
      });
    }
  }
}
