import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * GET /api/admin/withdrawals — list all pending withdrawals.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const transactions = await db.transaction.findMany({
    where: { type: "withdrawal", status },
    include: {
      user: { select: { name: true, email: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiOk({ withdrawals: transactions });
}

/**
 * PATCH /api/admin/withdrawals — approve or reject a withdrawal.
 * Body: { id, action: "approve" | "reject" }
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const { id, action } = body;

  if (!id || !["approve", "reject"].includes(action)) {
    return apiError("Valid id and action (approve/reject) required", 422);
  }

  const txn = await db.transaction.findUnique({ where: { id } });
  if (!txn || txn.type !== "withdrawal") {
    return apiError("Withdrawal not found", 404);
  }
  if (txn.status !== "pending") {
    return apiError(`Withdrawal already ${txn.status}`, 422);
  }

  if (action === "approve") {
    // Mark as completed
    await db.transaction.update({
      where: { id },
      data: { status: "completed" },
    });

    await createNotification({
      userId: txn.userId,
      type: "withdrawal",
      title: "Withdrawal approved ✅",
      message: `$${Math.abs(txn.amount).toFixed(2)} withdrawal has been processed and sent to your destination.`,
      amount: txn.amount,
      severity: "success",
      sendEmail: true,
    });
  } else {
    // Reject — refund the balance
    await db.$transaction([
      db.transaction.update({
        where: { id },
        data: { status: "failed" },
      }),
      db.user.update({
        where: { id: txn.userId },
        data: { balance: { increment: Math.abs(txn.amount) } },
      }),
    ]);

    await createNotification({
      userId: txn.userId,
      type: "withdrawal",
      title: "Withdrawal rejected",
      message: `Your withdrawal of $${Math.abs(txn.amount).toFixed(2)} was rejected. Funds returned to your balance.`,
      amount: Math.abs(txn.amount),
      severity: "warning",
      sendEmail: true,
    });
  }

  await audit(adminId, action === "approve" ? "approve_withdrawal" : "reject_withdrawal", "transaction", id, { amount: txn.amount, user: txn.userId });

  return apiOk({ message: `Withdrawal ${action}d` });
}
