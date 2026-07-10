import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { createRefund } from "@/lib/stripe";
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
  const { transactionId, reason } = body;

  if (!transactionId) {
    return apiError("Transaction ID is required", 422);
  }

  const txn = await db.transaction.findUnique({
    where: { id: transactionId },
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
      where: { id: transactionId },
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

  // Fix: Process Stripe refund AFTER successful DB commit.
  // If this fails, the DB is correct (refund recorded) but Stripe still
  // has the charge. Log for manual reconciliation.
  if (txn.method === "stripe" && txn.reference?.startsWith("pi_")) {
    const stripeRefund = await createRefund(txn.reference).catch((err: any) => {
      console.error("[refunds] Stripe refund FAILED after DB commit — manual reconciliation needed:", {
        transactionId: txn.id,
        reference: txn.reference,
        error: err?.message,
      });
      return null;
    });
    if (!stripeRefund) {
      // DB refund succeeded but Stripe refund failed — don't return error
      // (the user's balance is already correct). Log for admin follow-up.
      await audit(adminId, "refund_stripe_failed", "transaction", transactionId, {
        amount: refundAmount,
        reason,
        user: txn.user.email,
        note: "DB refund succeeded but Stripe refund failed — manual reconciliation needed",
      });
    }
  }

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
  await audit(adminId, "refund", "transaction", transactionId, { amount: refundAmount, reason, user: txn.user.email });

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
        transactionId,
        adminId,
        reason,
      },
    }).catch(() => {});
  }

  return apiOk({ message: "Refund processed successfully" });
}
