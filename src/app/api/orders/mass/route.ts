import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";

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

    // ── Generate public IDs up-front (atomic, one per order) ──
    // nextPublicId() runs its own atomic Prisma transaction internally,
    // so generating IDs in a loop is safe — no race conditions and no
    // full-table count() scans. They MUST be generated OUTSIDE the outer
    // $transaction below (nesting Prisma transactions would deadlock/error
    // on some drivers).
    const priority = PLAN_PRIORITY[user.plan] ?? "standard";

    const createdOrderMetas: {
      publicId: string;
      serviceName: string;
      quantity: number;
      totalPrice: number;
    }[] = [];

    // Pre-compute one publicId per order row + one for the summary ledger entry.
    for (const row of prepared) {
      const publicId = await nextPublicId("A", 10432);
      createdOrderMetas.push({
        publicId,
        serviceName: row.service.name,
        quantity: row.quantity,
        totalPrice: row.totalPrice,
      });
    }
    const massTxPublicId = await nextPublicId("TX", 8842);

    // Race-safe atomic batch purchase.
    //
    // The balance check happens INSIDE the transaction via a conditional
    // `updateMany` (WHERE balance >= grandTotal). If the conditional update
    // affects 0 rows, the user's balance was insufficient to cover the
    // WHOLE batch and we throw `INSUFFICIENT_BALANCE` to abort — no orders
    // are created, no debit happens. On PostgreSQL (MVCC) this prevents two
    // concurrent mass-batches from both passing the check and both debiting,
    // driving the balance negative. The original
    // `if (user.balance < grandTotal)` check ran outside the transaction and
    // was vulnerable to this race.
    let createdOrders: any[];
    try {
      createdOrders = await db.$transaction(async (tx) => {
        // Conditional update — only succeeds if balance covers the WHOLE batch.
        const updated = await tx.user.updateMany({
          where: { id: userId, balance: { gte: grandTotal } },
          data: { balance: { decrement: grandTotal } },
        });
        if (updated.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // Create all orders + the single summary ledger entry inside the
        // same transaction so the batch is fully atomic (all-or-nothing).
        const orders: any[] = [];
        for (let i = 0; i < prepared.length; i++) {
          const row = prepared[i];
          const { publicId } = createdOrderMetas[i];
          const created = await tx.order.create({
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
          });
          orders.push(created);
        }

        await tx.transaction.create({
          data: {
            publicId: massTxPublicId,
            userId,
            type: "sale",
            amount: -grandTotal,
            description: `Mass order — ${prepared.length} orders`,
            method: "balance",
            reference: `mass:${createdOrderMetas[0].publicId}-${createdOrderMetas[createdOrderMetas.length - 1].publicId}`,
          },
        });

        return orders;
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
          `Insufficient balance. Need $${grandTotal.toFixed(2)}, have $${currentBalance.toFixed(2)}`,
          402,
        );
      }
      throw e;
    }

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
    await audit(userId, "create", "order", createdOrderMetas[0]?.publicId, {
      massOrder: true,
      count: prepared.length,
      total: grandTotal,
      publicIds: createdOrderMetas.map((m) => m.publicId),
      plan: user.plan,
    });

    // Enqueue fulfillment as a background job for each order
    // (fire-and-forget). With Redis, BullMQ dispatches to the worker;
    // without Redis, enqueueJob() falls back to in-process setImmediate.
    createdOrders.forEach((order: any) => {
      enqueueJob("order.fulfill", { orderId: order.id, userId }).catch((e) =>
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
