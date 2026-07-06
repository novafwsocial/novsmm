import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { createRefund } from "@/lib/stripe";
import { nextPublicId } from "@/lib/ids";

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

  const body = await req.json();
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

  // If it's a Stripe payment, create a real refund
  if (txn.method === "stripe" && txn.reference?.startsWith("pi_")) {
    const stripeRefund = await createRefund(txn.reference).catch(() => null);
    if (!stripeRefund) {
      return apiError("Failed to process Stripe refund. Check STRIPE_SECRET_KEY.", 500);
    }
  }

  // Reverse the transaction in DB
  const refundAmount = Math.abs(txn.amount);

  // Compute the refund TX public ID BEFORE the $transaction([...]) call —
  // nextPublicId() runs its own atomic Prisma transaction internally.
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
          ? { decrement: refundAmount } // was a credit, now deduct
          : { increment: refundAmount }, // was a debit, now credit back
      },
    }),
    // Create a refund transaction record
    db.transaction.create({
      data: {
        publicId: refundTxPublicId,
        userId: txn.userId,
        type: "fee", // using fee type for refunds
        amount: txn.amount > 0 ? -refundAmount : refundAmount,
        description: `Refund for ${txn.publicId}${reason ? ` — ${reason}` : ""}`,
        status: "completed",
        method: txn.method,
        reference: `refund_${txn.id}`,
      },
    }),
  ]);

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

  return apiOk({ message: "Refund processed successfully" });
}
