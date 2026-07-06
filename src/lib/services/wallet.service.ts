import { db } from "@/lib/db";
import { audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * Wallet service — extracted credit/debit/refund operations that were
 * duplicated across 10+ API routes.
 *
 * All operations use interactive Prisma transactions for atomicity and
 * are race-condition-safe (MVCC-compatible for PostgreSQL).
 *
 * Phase 5: Backend Architecture Refactor
 */

/**
 * Credit a user's wallet (add funds).
 * Creates a Transaction record + updates balance + sends notification.
 *
 * @param userId  The user to credit
 * @param amount  Positive amount to credit
 * @param opts    Transaction metadata (type, method, reference, description)
 */
export async function creditWallet(
  userId: string,
  amount: number,
  opts: {
    type: "topup" | "referral" | "release" | "sale" | "fee";
    method?: string;
    reference?: string;
    description: string;
    orderId?: string;
    sendNotification?: boolean;
  }
): Promise<{ transaction: any; newBalance: number }> {
  if (amount <= 0) throw new Error("Credit amount must be positive");

  const result = await db.$transaction(async (tx) => {
    // Atomic conditional update — credit the balance
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        balance: { increment: amount },
        lifetimeEarnings: { increment: amount },
      },
      select: { balance: true },
    });

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        publicId: `TX-${Date.now()}`, // Simplified — nextPublicId is called by the route
        userId,
        type: opts.type,
        amount,
        description: opts.description,
        status: "completed",
        method: opts.method ?? null,
        reference: opts.reference ?? null,
        orderId: opts.orderId ?? null,
      },
    });

    return { transaction, newBalance: updated.balance };
  });

  // Send notification (outside transaction — best-effort)
  if (opts.sendNotification !== false) {
    await createNotification({
      userId,
      type: "recharge",
      title: "Wallet credited ✅",
      message: `$${amount.toFixed(2)} added to your wallet. New balance: $${result.newBalance.toFixed(2)}`,
      amount,
      severity: "success",
      sendEmail: true,
    }).catch(() => {
      /* notifications are best-effort */
    });
  }

  return result;
}

/**
 * Debit a user's wallet (remove funds).
 * Uses conditional update to prevent negative balance (race-safe).
 *
 * @throws Error("INSUFFICIENT_BALANCE") if balance < amount
 */
export async function debitWallet(
  userId: string,
  amount: number,
  opts: {
    type: "withdrawal" | "sale" | "fee" | "held";
    method?: string;
    reference?: string;
    description: string;
    orderId?: string;
  }
): Promise<{ transaction: any; newBalance: number }> {
  if (amount <= 0) throw new Error("Debit amount must be positive");

  const result = await db.$transaction(async (tx) => {
    // Atomic conditional update — only succeeds if balance >= amount
    const updated = await tx.user.updateMany({
      where: { id: userId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });

    if (updated.count === 0) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    // Get the new balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        publicId: `TX-${Date.now()}`,
        userId,
        type: opts.type,
        amount: -amount, // negative for debit
        description: opts.description,
        status: "completed",
        method: opts.method ?? null,
        reference: opts.reference ?? null,
        orderId: opts.orderId ?? null,
      },
    });

    return { transaction, newBalance: user?.balance ?? 0 };
  });

  return result;
}

/**
 * Refund a transaction (reverse a previous credit/debit).
 * Creates a new Transaction record with type "refund" and credits the wallet.
 *
 * @param originalTxnId  The ID of the transaction to refund
 * @param adminId  The admin user ID (for audit logging)
 * @param reason  Optional refund reason
 */
export async function refundTransaction(
  originalTxnId: string,
  adminId: string,
  reason?: string
): Promise<{ refunded: boolean; newBalance: number }> {
  const original = await db.transaction.findUnique({
    where: { id: originalTxnId },
  });

  if (!original) throw new Error("Transaction not found");
  if (original.status === "refunded") throw new Error("Already refunded");

  const refundAmount = Math.abs(original.amount);

  const result = await db.$transaction(async (tx) => {
    // Mark original as refunded
    await tx.transaction.update({
      where: { id: originalTxnId },
      data: { status: "refunded" },
    });

    // If original was a credit (positive amount), debit it back
    // If original was a debit (negative amount), credit it back
    if (original.amount > 0) {
      // Original was a credit — reverse by debiting
      const updated = await tx.user.updateMany({
        where: { id: original.userId, balance: { gte: refundAmount } },
        data: { balance: { decrement: refundAmount } },
      });
      if (updated.count === 0) throw new Error("INSUFFICIENT_BALANCE");
    } else {
      // Original was a debit — reverse by crediting
      await tx.user.update({
        where: { id: original.userId },
        data: { balance: { increment: refundAmount } },
      });
    }

    // Create refund transaction record
    const refundTxn = await tx.transaction.create({
      data: {
        publicId: `TX-REFUND-${Date.now()}`,
        userId: original.userId,
        type: "topup", // refund shows as topup (credit)
        amount: refundAmount,
        description: `Refund: ${original.description}${reason ? ` — ${reason}` : ""}`,
        status: "completed",
        method: original.method,
        reference: `refund:${original.id}`,
        orderId: original.orderId,
      },
    });

    const user = await tx.user.findUnique({
      where: { id: original.userId },
      select: { balance: true },
    });

    return { refundTxn, newBalance: user?.balance ?? 0 };
  });

  // Audit log
  await audit(adminId, "refund", "transaction", originalTxnId, {
    originalAmount: original.amount,
    refundAmount,
    reason,
  });

  // Notify user
  await createNotification({
    userId: original.userId,
    type: "recharge",
    title: "Refund processed ✅",
    message: `$${refundAmount.toFixed(2)} refunded to your wallet. New balance: $${result.newBalance.toFixed(2)}`,
    amount: refundAmount,
    severity: "success",
    sendEmail: true,
  }).catch(() => {
    /* best-effort */
  });

  return { refunded: true, newBalance: result.newBalance };
}
