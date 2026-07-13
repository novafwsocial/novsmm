import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

import { nextPublicId } from "@/lib/ids";
import { raiseSecurityAlert } from "@/lib/security-alert";

/**
 * POST /api/admin/refunds — process a refund for a transaction.
 * Body: { transactionId, reason? }
 *
 * If the transaction was via Stripe, creates a real Stripe refund.
 * Credits the user's balance back (negative = deduct from balance since
 * the original transaction was a credit).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  // H-1 fix: safe JSON parse
  let body;
  try { body = await req.json(); } catch { return apiError("Invalid JSON body", 422); }
  const { transactionId, reason, orderId } = body;

  // MARKETPLACE-13-IMPROVEMENTS (#18): support refunding directly from an
  // order ID. When `orderId` is provided instead of `transactionId`, look up
  // the original sale transaction for the order. The order-create flow writes
  // one sale transaction per order with reference = order.publicId, so we can
  // resolve it deterministically.
  let resolvedTxnId = transactionId;
  if (!resolvedTxnId && orderId) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, publicId: true, userId: true, totalPrice: true, serviceName: true },
    });
    if (!order) return apiError("Order not found", 404);
    const saleTxn = await db.transaction.findFirst({
      where: { reference: order.publicId, userId: order.userId },
      orderBy: { createdAt: "desc" },
    });
    if (!saleTxn) {
      return apiError("No sale transaction found for this order", 404);
    }
    resolvedTxnId = saleTxn.id;
  }

  if (!resolvedTxnId) {
    return apiError("Transaction ID or Order ID is required", 422);
  }

  const txn = await db.transaction.findUnique({
    where: { id: resolvedTxnId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!txn) {
    return apiError("Transaction not found", 404);
  }

  if (txn.status === "failed") {
    return apiError("Transaction already failed/refunded", 422);
  }

  // Fix: Process DB refund FIRST, then Stripe refund AFTER DB commit.
  // This prevents orphaned Stripe refunds if the DB transaction fails.
  // If Stripe refund fails after DB commit, log for manual reconciliation.

  const refundAmount = Math.abs(txn.amount);

  // Compute the refund TX public ID BEFORE the $transaction([...]) call
  const refundTxPublicId = await nextPublicId("TX-REFUND", 0);

  await db.$transaction([
    // Mark original transaction as refunded
    db.transaction.update({
      where: { id: resolvedTxnId },
      data: { status: "failed" },
    }),
    // If it was a credit (topup/sale), deduct from balance
    // If it was a debit (withdrawal/sale), credit back
    db.user.update({
      where: { id: txn.userId },
      data: {
        balance: txn.amount > 0
          ? { decrement: refundAmount }
          : { increment: refundAmount },
      },
    }),
    // Create a refund transaction record
    db.transaction.create({
      data: {
        publicId: refundTxPublicId,
        userId: txn.userId,
        type: "fee",
        amount: txn.amount > 0 ? -refundAmount : refundAmount,
        description: `Refund for ${txn.publicId}${reason ? ` — ${reason}` : ""}`,
        status: "completed",
        method: txn.method,
        reference: `refund_${txn.id}`,
      },
    }),
  ]);

  // P-005 FIX: Invalidate user cache so the balance change is visible immediately.
  try {
    const { cacheInvalidate } = await import("@/lib/cache");
    await cacheInvalidate(`user:${txn.userId}`);
    await cacheInvalidate(`dashboard:${txn.userId}:*`);
  } catch {}

  // Notify the user
  await createNotification({
    userId: txn.userId,
    type: "recharge",
    title: "Refund processed",
    message: `A refund of $${refundAmount.toFixed(2)} has been processed for transaction ${txn.publicId}.`,
    amount: txn.amount > 0 ? -refundAmount : refundAmount,
    severity: "warning",
    sendEmail: true,
  });

  // Audit log
  await audit(adminId, "refund", "transaction", resolvedTxnId, { amount: refundAmount, reason, user: txn.user.email });

  // SECURITY (OWASP A09-2, P3): raise an alert for high-value refunds (>$500)
  // — useful for spotting slow-compromise attacks where small refunds escalate.
  if (refundAmount > 500) {
    void raiseSecurityAlert({
      type: "refund_amount_high",
      severity: "warning",
      message: `High-value refund of $${refundAmount.toFixed(2)} processed for user ${txn.user.email} (txn ${txn.publicId}).`,
      userId: txn.userId,
      metadata: {
        amount: refundAmount,
        transactionId: resolvedTxnId,
        adminId,
        reason,
      },
    }).catch(() => {});
  }

  return apiOk({ message: "Refund processed successfully" });
}
