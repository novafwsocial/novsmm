import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { withdrawSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/wallet/withdraw — withdraw funds to an external destination.
 * Debits balance immediately, creates a "pending" withdrawal transaction
 * that an admin approves.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = withdrawSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Invalid input", 422);
    }

    const { amount, method, destination } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true, status: true },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);
    if (user.balance < amount) {
      return apiError(
        `Insufficient balance. Requested $${amount.toFixed(2)}, available $${user.balance.toFixed(2)}`,
        402
      );
    }

    const txnCount = await db.transaction.count();
    const publicId = `TX-${8842 + txnCount}`;

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
      }),
      db.transaction.create({
        data: {
          publicId,
          userId,
          type: "withdrawal",
          amount: -amount,
          description: `Withdrawal to ${method} · ${destination}`,
          status: "pending",
          method: method.toLowerCase(),
          reference: `wd_${Date.now()}`,
        },
      }),
    ]);

    await createNotification({
      userId,
      type: "withdrawal",
      title: "Withdrawal requested",
      message: `$${amount.toFixed(2)} withdrawal to ${method} is pending approval. You'll be notified once processed.`,
      amount: -amount,
      severity: "info",
      sendEmail: true,
    });

    return apiOk({ message: "Withdrawal requested. Pending admin approval." });
  } catch (e: any) {
    console.error("[wallet/withdraw] error:", e);
    return apiError("Withdrawal failed", 500);
  }
}
