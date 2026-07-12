import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * GET /api/admin/withdrawals — paginated list of withdrawals.
 *
 * PERF FIX (P-H-004): added server-side pagination. Query params:
 * status (default "pending"), page (default 1), limit (default 50, max 200).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

  const where = { type: "withdrawal" as const, status };

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.transaction.count({ where }),
  ]);

  return apiOk({
    withdrawals: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
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
