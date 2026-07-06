import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { simulateFulfillment } from "@/lib/orders";

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

    // Load user to validate status. (Balance is checked inside the
    // transaction below via a conditional updateMany, so we don't need to
    // read it here — the pre-transaction snapshot would be stale by debit
    // time under concurrency anyway.)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);

    // Race-safe atomic re-order.
    //
    // The balance check happens INSIDE the transaction via a conditional
    // `updateMany` (WHERE balance >= totalPrice). If the conditional update
    // affects 0 rows, the user's balance was insufficient at debit time and
    // we throw `INSUFFICIENT_BALANCE` to abort the whole transaction. On
    // PostgreSQL (MVCC) this prevents two concurrent re-orders from both
    // passing the check and both debiting. The original
    // `if (user.balance < totalPrice)` check ran outside the transaction and
    // was vulnerable to this race.
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
        });

        await tx.transaction.create({
          data: {
            publicId: txPublicId,
            userId,
            type: "sale",
            amount: -totalPrice,
            description: `Repeated order #${original.publicId} → #${publicId} — ${service.name}`,
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
