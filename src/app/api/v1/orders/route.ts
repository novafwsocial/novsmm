import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiKey, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { enqueueJob } from "@/lib/queues";
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
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
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

    // Race-safe atomic purchase (same pattern as the internal /api/orders
    // route). The balance check happens INSIDE the transaction via a
    // conditional `updateMany` (WHERE balance >= totalPrice). If the
    // conditional update affects 0 rows, the user's balance was
    // insufficient at debit time and we throw `INSUFFICIENT_BALANCE` to
    // abort. On PostgreSQL (MVCC) this prevents two concurrent API orders
    // from both passing the check and both debiting. The original
    // `if (user.balance < totalPrice)` check ran outside the transaction
    // and was vulnerable to this race.
    //
    // publicId / txPublicId are pre-computed OUTSIDE this transaction —
    // nextPublicId() runs its own atomic Prisma transaction internally, and
    // nesting it inside this $transaction would deadlock / error on some
    // drivers.
    const publicId = await nextPublicId("A", 10432);
    const txPublicId = await nextPublicId("TX", 8842);

    let order: any;
    try {
      order = await db.$transaction(async (tx) => {
        // Conditional update — only succeeds if balance is sufficient.
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

        await tx.transaction.create({
          data: {
            publicId: txPublicId,
            userId,
            type: "sale",
            amount: -totalPrice,
            description: `API Order #${publicId} — ${service.name}`,
            method: "balance",
            reference: publicId,
          },
        });

        return created;
      });
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_BALANCE") {
        // Re-read the current balance for an accurate error message.
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

    await createNotification({
      userId,
      type: "order",
      title: `Order #${publicId} placed (via API)`,
      message: `${service.platform} · ${service.name} — ${quantity.toLocaleString()} units. Total: $${totalPrice.toFixed(2)}`,
      amount: -totalPrice,
      severity: "info",
    });

    // Enqueue fulfillment as a background job (worker via BullMQ, or
    // in-process setImmediate fallback when Redis is not available).
    enqueueJob("order.fulfill", { orderId: order.id, userId }).catch(() => {});

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
