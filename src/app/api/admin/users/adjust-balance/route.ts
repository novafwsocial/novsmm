import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextPublicId } from "@/lib/ids";
import { z } from "zod";

const adjustSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().refine((v) => v !== 0, "Amount must be non-zero"),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/admin/users/adjust-balance
 * Manually add or subtract balance from a user's wallet.
 * Creates a transaction record + audit log + notification.
 *
 * M-1/M-2 fix: Uses nextPublicId (atomic) + conditional updateMany for subtractions
 * to prevent race conditions on concurrent adjustments.
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
    const isAdd = amount > 0;
    const absAmount = Math.abs(amount);

    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, balance: true } });
    if (!user) return apiError("User not found", 404);

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
              balance: { increment: amount },
              lifetimeEarnings: { increment: amount },
            },
          });
        } else {
          // Subtractions need conditional check inside transaction
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
            amount,
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
        return apiError(`User only has $${user.balance.toFixed(2)} balance. Cannot subtract $${absAmount.toFixed(2)}.`, 422);
      }
      throw e;
    }

    await db.auditLog.create({
      data: {
        userId: adminId,
        action: isAdd ? "create" : "delete",
        entity: "transaction",
        entityId: userId,
        metadata: JSON.stringify({ targetUserId: userId, amount, reason, type: isAdd ? "add" : "subtract" }),
      },
    });

    await createNotification({
      userId,
      type: "recharge",
      title: isAdd ? "Balance credited 💰" : "Balance adjusted",
      message: `${isAdd ? "Added" : "Subtracted"} $${absAmount.toFixed(2)} ${reason ? `· ${reason}` : ""}. New balance available immediately.`,
      amount,
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
