import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { cacheInvalidate } from "@/lib/cache";
import { nextPublicId } from "@/lib/ids";
import { z } from "zod";

/**
 * Zod schema for manual balance adjustment.
 *
 * SECURITY:
 * - amount: must be non-zero, bounded to [-100000, 100000] to prevent
 *   catastrophic typos (e.g. admin types 1000000 instead of 1000).
 *   100k USD is the max single adjustment — larger credits need multiple
 *   calls (which creates multiple audit entries, useful for paper trail).
 * - reason: OPTIONAL for additions (admin credit), but REQUIRED for
 *   subtractions (admin debit). A debit without a reason is a red flag
 *   — the audit log entry would have no context for why the balance
 *   was reduced. Force the admin to explain.
 * - userId: non-empty string (cuid format expected by Prisma).
 */
const adjustSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z
    .number()
    .refine((v) => v !== 0, "Amount must be non-zero")
    .refine((v) => Math.abs(v) <= 100000, "Amount must be between -100000 and 100000")
    .refine((v) => {
      // Round to 2 decimals — prevent floating-point dust like 10.00000001
      return Math.round(v * 100) / 100 === v;
    }, "Amount must have at most 2 decimal places"),
  reason: z.string().max(500).optional(),
}).refine(
  (data) => data.amount > 0 || (data.amount < 0 && data.reason && data.reason.trim().length >= 3),
  {
    message: "A reason (min 3 chars) is required when subtracting balance",
    path: ["reason"],
  }
);

/**
 * POST /api/admin/users/adjust-balance
 * Manually add or subtract balance from a user's wallet.
 * Creates a transaction record + audit log + notification.
 *
 * SECURITY:
 * - requireAdmin() gates the endpoint (only role: "admin" can call)
 * - Zod schema validates amount bounds + reason requirement for debits
 * - Race-safe: uses interactive $transaction + conditional updateMany
 *   for subtractions (prevents balance going negative on concurrent debits)
 * - All adjustments logged to AuditLog with admin ID + reason + amount
 * - User receives a notification immediately after adjustment
 * - Cache invalidated so the new balance is visible in navbar/dashboard
 *   without the 15-30s staleness window
 *
 * M-1/M-2 fix: Uses nextPublicId (atomic) + conditional updateMany for
 * subtractions to prevent race conditions on concurrent adjustments.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { userId, amount, reason } = parsed.data;
    // Round to 2 decimals to prevent floating-point dust
    const cleanAmount = Math.round(amount * 100) / 100;
    const isAdd = cleanAmount > 0;
    const absAmount = Math.abs(cleanAmount);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, balance: true, role: true, status: true },
    });
    if (!user) return apiError("User not found", 404);

    // Defense-in-depth: refuse to adjust balance of suspended users
    // (prevents accidental credit to abandoned/compromised accounts)
    if (user.status !== "active") {
      return apiError(`User is ${user.status} — cannot adjust balance`, 422);
    }

    // M-1 fix: Use atomic nextPublicId instead of count()-based ID
    const publicId = await nextPublicId("TX", 8842);

    // M-2 fix: Use conditional updateMany for subtractions to prevent race
    let newBalance: number;
    try {
      newBalance = await db.$transaction(async (tx) => {
        if (isAdd) {
          // Additions are always safe — just increment
          await tx.user.update({
            where: { id: userId },
            data: {
              balance: { increment: cleanAmount },
              lifetimeEarnings: { increment: cleanAmount },
            },
          });
        } else {
          // Subtractions need conditional check inside transaction
          // to prevent balance going negative on concurrent debits
          const updated = await tx.user.updateMany({
            where: { id: userId, balance: { gte: absAmount } },
            data: { balance: { decrement: absAmount } },
          });
          if (updated.count === 0) {
            throw new Error("INSUFFICIENT_BALANCE");
          }
        }

        await tx.transaction.create({
          data: {
            publicId,
            userId,
            type: isAdd ? "topup" : "withdrawal",
            amount: cleanAmount,
            description: reason || `Manual ${isAdd ? "credit" : "debit"} by admin`,
            status: "completed",
            method: "admin_manual",
            reference: `admin:${adminId}:${Date.now()}`,
          },
        });

        // Read fresh balance
        const fresh = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
        return fresh?.balance ?? 0;
      });
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_BALANCE") {
        return apiError(
          `User only has $${user.balance.toFixed(2)} balance. Cannot subtract $${absAmount.toFixed(2)}.`,
          422
        );
      }
      throw e;
    }

    // P-005 FIX: Invalidate user cache so the balance change is visible immediately
    // in the navbar and dashboard (not stale for 15-30s).
    try {
      await cacheInvalidate(`user:${userId}`);
      await cacheInvalidate(`dashboard:${userId}:*`);
    } catch {}

    // Audit log — records admin ID, target user, amount, reason
    await audit(adminId, isAdd ? "create" : "delete", "transaction", userId, {
      targetUserId: userId,
      targetEmail: user.email,
      amount: cleanAmount,
      reason: reason || `Manual ${isAdd ? "credit" : "debit"}`,
      type: isAdd ? "manual_credit" : "manual_debit",
      previousBalance: user.balance,
      newBalance,
    });

    await createNotification({
      userId,
      type: "recharge",
      title: isAdd ? "Balance credited 💰" : "Balance adjusted",
      message: `${isAdd ? "Added" : "Subtracted"} $${absAmount.toFixed(2)} ${reason ? `· ${reason}` : ""}. New balance available immediately.`,
      amount: cleanAmount,
      severity: isAdd ? "success" : "info",
    });

    return apiOk({
      message: `Balance ${isAdd ? "increased" : "decreased"} by $${absAmount.toFixed(2)}`,
      newBalance,
    });
  } catch (e: any) {
    console.error("[admin/users/adjust-balance] error:", e);
    return apiError("Failed to adjust balance", 500);
  }
}
