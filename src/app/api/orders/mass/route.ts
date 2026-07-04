import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/orders/mass — place multiple orders atomically.
 *
 * Body:
 *   { orders: [{ serviceId, link, quantity }, ...] }
 *
 * - Validates every row (service exists, quantity within bounds, link optional).
 * - Computes the total cost across all rows.
 * - Verifies the user has enough balance to cover the full batch.
 * - Debits the balance once and creates all orders + transactions in a single
 *   `db.$transaction([...])` so the batch either fully succeeds or fully fails.
 * - Returns the array of created orders.
 *
 * Plan-based monthly limits are still enforced — each row counts as one order.
 */

const PLAN_ORDER_LIMITS: Record<string, number | null> = {
  free: 50,
  starter: 1000,
  growth: 10000,
  enterprise: null,
};

const PLAN_PRIORITY: Record<string, "standard" | "priority" | "highest"> = {
  free: "standard",
  starter: "standard",
  growth: "priority",
  enterprise: "highest",
};

const massOrderRowSchema = z.object({
  serviceId: z.string().min(1),
  link: z.string().url().optional().or(z.literal("")),
  quantity: z.number().int().positive(),
});

const massOrderSchema = z.object({
  orders: z
    .array(massOrderRowSchema)
    .min(1, "At least one order is required")
    .max(100, "Max 100 orders per mass batch"),
});

function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = massOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const rows = parsed.data.orders;

    // Load user once for the whole batch
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true, status: true, plan: true },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);

    // ── Plan limit enforcement (whole batch counts against monthly quota) ──
    const planLimit = PLAN_ORDER_LIMITS[user.plan] ?? PLAN_ORDER_LIMITS.free;
    if (planLimit !== null) {
      const monthStart = startOfMonth();
      const used = await db.order.count({
        where: { userId, createdAt: { gte: monthStart } },
      });
      if (used + rows.length > planLimit) {
        return apiError(
          `Mass order would exceed your plan limit (${planLimit}/month). Used ${used}, attempting to place ${rows.length}.`,
          403,
        );
      }
    }

    // ── Resolve services + validate quantities + compute totals ──
    const serviceIds = Array.from(new Set(rows.map((r) => r.serviceId)));
    const services = await db.service.findMany({
      where: { id: { in: serviceIds } },
      include: { provider: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    type PreparedRow = {
      service: (typeof services)[number];
      link: string | null;
      quantity: number;
      totalPrice: number;
      totalCost: number;
      profit: number;
    };
    const prepared: PreparedRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const svc = serviceMap.get(row.serviceId);
      if (!svc) return apiError(`Row ${i + 1}: service not found`, 422);
      if (svc.status !== "active")
        return apiError(`Row ${i + 1}: service "${svc.name}" is not active`, 422);
      if (row.quantity < svc.minQty || row.quantity > svc.maxQty) {
        return apiError(
          `Row ${i + 1}: quantity must be between ${svc.minQty} and ${svc.maxQty} for "${svc.name}"`,
          422,
        );
      }
      const totalPrice = (svc.price * row.quantity) / 1000;
      const totalCost = (svc.cost * row.quantity) / 1000;
      prepared.push({
        service: svc,
        link: row.link || null,
        quantity: row.quantity,
        totalPrice,
        totalCost,
        profit: totalPrice - totalCost,
      });
    }

    const grandTotal = prepared.reduce((s, r) => s + r.totalPrice, 0);
    if (user.balance < grandTotal) {
      return apiError(
        `Insufficient balance. Need $${grandTotal.toFixed(2)}, have $${user.balance.toFixed(2)}`,
        402,
      );
    }

    // ── Generate public IDs up-front (one batch lookup) ──
    const baseCount = await db.order.count();
    const priority = PLAN_PRIORITY[user.plan] ?? "standard";

    // Build the transaction operations
    const txOps: any[] = [];
    const createdOrderMetas: {
      publicId: string;
      serviceName: string;
      quantity: number;
      totalPrice: number;
    }[] = [];

    prepared.forEach((row, idx) => {
      const publicId = `A-${10432 + baseCount + idx}`;
      createdOrderMetas.push({
        publicId,
        serviceName: row.service.name,
        quantity: row.quantity,
        totalPrice: row.totalPrice,
      });
      txOps.push(
        db.order.create({
          data: {
            publicId,
            userId,
            serviceId: row.service.id,
            serviceName: row.service.name,
            platform: row.service.platform,
            quantity: row.quantity,
            unitCost: row.service.cost,
            unitPrice: row.service.price,
            totalCost: row.totalCost,
            totalPrice: row.totalPrice,
            profit: row.profit,
            status: "processing",
            progress: 5,
            priority,
            providerId: row.service.providerId,
            providerName: row.service.provider?.name,
            link: row.link,
            eta:
              priority === "highest"
                ? "<1m"
                : priority === "priority"
                  ? "1m"
                  : "2m",
            flag: "🌍",
          },
        }),
      );
    });

    // Single balance debit + one summary transaction record
    txOps.push(
      db.user.update({
        where: { id: userId },
        data: { balance: { decrement: grandTotal } },
      }),
    );

    txOps.push(
      db.transaction.create({
        data: {
          publicId: `TX-${Date.now().toString().slice(-6)}`,
          userId,
          type: "sale",
          amount: -grandTotal,
          description: `Mass order — ${prepared.length} orders`,
          method: "balance",
          reference: `mass:${createdOrderMetas[0].publicId}-${createdOrderMetas[createdOrderMetas.length - 1].publicId}`,
        },
      }),
    );

    // Execute everything atomically
    const txResult = await db.$transaction(txOps);
    const createdOrders = txResult.slice(0, prepared.length);

    // Notification (single, summary)
    await createNotification({
      userId,
      type: "order",
      title: `${prepared.length} orders placed (mass)`,
      message: `${createdOrderMetas
        .slice(0, 3)
        .map((m) => `#${m.publicId}`)
        .join(", ")}${createdOrderMetas.length > 3 ? ` +${createdOrderMetas.length - 3} more` : ""}. Total: $${grandTotal.toFixed(2)}`,
      amount: -grandTotal,
      severity: "info",
      sendEmail: true,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId,
        action: "create",
        entity: "order",
        entityId: createdOrderMetas[0]?.publicId,
        metadata: JSON.stringify({
          massOrder: true,
          count: prepared.length,
          total: grandTotal,
          publicIds: createdOrderMetas.map((m) => m.publicId),
          plan: user.plan,
        }),
      },
    });

    // Kick off fulfillment simulation for each order (fire-and-forget)
    createdOrders.forEach((order: any) => {
      simulateFulfillment(order.id, userId).catch((e) =>
        console.error("[fulfillment] error:", e),
      );
    });

    return apiOk(
      {
        orders: createdOrders,
        count: createdOrders.length,
        total: grandTotal,
        message: `${createdOrders.length} orders placed successfully`,
      },
      201,
    );
  } catch (e: any) {
    console.error("[orders/mass] error:", e);
    return apiError("Failed to place mass orders", 500);
  }
}

/**
 * Simulates provider fulfillment by updating order progress over time.
 * Mirrors the behavior of the single-order endpoint.
 */
async function simulateFulfillment(orderId: string, userId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      publicId: true,
      serviceName: true,
      totalPrice: true,
      link: true,
      quantity: true,
      priority: true,
    },
  });
  if (!order || order.status === "cancelled") return;

  const speedMultiplier =
    order.priority === "highest"
      ? 0.4
      : order.priority === "priority"
        ? 0.7
        : 1.0;

  const baseSteps = [
    { delay: 2000, progress: 15, status: "in_progress" },
    { delay: 5000, progress: 40, status: "in_progress" },
    { delay: 8000, progress: 75, status: "in_progress" },
    { delay: 12000, progress: 100, status: "completed" },
  ];
  const steps = baseSteps.map((s, i) => ({
    delay: Math.round(
      (i === 0 ? s.delay : s.delay - baseSteps[i - 1].delay) * speedMultiplier,
    ),
    progress: s.progress,
    status: s.status,
  }));

  for (const step of steps) {
    await new Promise((r) => setTimeout(r, step.delay));

    const currentOrder = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        publicId: true,
        serviceName: true,
        totalPrice: true,
      },
    });
    if (!currentOrder || currentOrder.status === "cancelled") return;

    await db.order.update({
      where: { id: orderId },
      data: {
        progress: step.progress,
        status: step.status,
        eta:
          step.status === "completed"
            ? "—"
            : `${Math.ceil((100 - step.progress) / 20)}m`,
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
