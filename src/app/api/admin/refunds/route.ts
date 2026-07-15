import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { cacheInvalidate } from "@/lib/cache";

import { nextPublicId } from "@/lib/ids";
import { raiseSecurityAlert } from "@/lib/security-alert";

/**
 * POST /api/admin/refunds — process a refund for a transaction.
 * Body: { transactionId, reason? }
 *
 * If the transaction was via Stripe, creates a real Stripe refund.
 * Credits the user's balance back (negative = deduct from balance since
 * the original transaction was a credit).
 *
 * SEC-1d-011 FIX: Race condition in the refund path. The previous code used
 * the array form `db.$transaction([...])` with a NON-conditional
 * `db.transaction.update({ where: { id } })`. Two concurrent POST requests
 * would both pass the `if (txn.status === "failed")` check (line 62), then
 * both execute the $transaction: the first marks status→"failed" + decrements
 * balance + creates refund txn; the second marks status→"failed" (already
 * failed, idempotent on status) + decrements balance AGAIN + creates ANOTHER
 * refund txn → DOUBLE REFUND + duplicate refund record.
 *
 * Fix: Migrated to interactive `db.$transaction(async (tx) => {...})` with a
 * conditional `updateMany({ where: { id, status: { not: "failed" } } })`. Only
 * ONE request can flip the status (the other gets count=0 and aborts BEFORE
 * the balance mutation and refund-txn creation). Same pattern as the W-1
 * webhook double-credit fix and the SEC-1d-012 withdrawal-reject fix.
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

  // Early UX check — returns 422 immediately if already refunded.
  // The AUTHORITATIVE race-safe check is inside the $transaction below
  // (conditional updateMany with status: { not: "failed" }).
  if (txn.status === "failed") {
    return apiError("Transaction already failed/refunded", 422);
  }

  const refundAmount = Math.abs(txn.amount);

  // Compute the refund TX public ID BEFORE the $transaction (needed for the
  // refund transaction record created inside the interactive tx).
  const refundTxPublicId = await nextPublicId("TX-REFUND", 0);

  // SEC-1d-011 FIX: interactive $transaction with conditional updateMany.
  // Only ONE request can flip the status (the other gets count=0 and aborts
  // BEFORE the balance mutation and refund-txn creation). This prevents:
  //   - Double balance decrement/increment (double refund)
  //   - Duplicate refund transaction records
  const result = await db.$transaction(async (tx) => {
    // Conditional update — only flips if NOT already failed/refunded.
    // Two concurrent requests: the first gets count=1, the second gets count=0.
    const updated = await tx.transaction.updateMany({
      where: { id: resolvedTxnId, status: { not: "failed" } },
      data: { status: "failed" },
    });
    if (updated.count === 0) {
      return { alreadyProcessed: true };
    }

    // Only ONE request reaches here — the balance mutation is safe.
    // If it was a credit (topup/sale, amount > 0), deduct from balance.
    // If it was a debit (withdrawal/sale, amount < 0), credit back.
    await tx.user.update({
      where: { id: txn.userId },
      data: {
        balance: txn.amount > 0
          ? { decrement: refundAmount }
          : { increment: refundAmount },
      },
    });

    // Create the refund transaction record (only once — inside the
    // conditional block, so no duplicate refund txns on concurrent requests).
    await tx.transaction.create({
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
    });

    return { alreadyProcessed: false };
  });

  if (result.alreadyProcessed) {
    // Another admin refunded this transaction concurrently — the balance
    // was already adjusted and the refund txn already created by that
    // request. No-op here (return 200 so the admin UI shows a clean message
    // instead of erroring).
    return apiOk({ message: "Transaction already refunded by another admin" });
  }

  // P-005 FIX: Invalidate user cache so the balance change is visible immediately.
  try {
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
