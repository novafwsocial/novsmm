import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { cacheInvalidate } from "@/lib/cache";

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
    // FIX (OAuth nullable username): coerce null → "" on each included user
    // so the admin table's `username: string` typing stays honest.
    withdrawals: transactions.map((t) => ({
      ...t,
      user: t.user
        ? { ...t.user, username: t.user.username ?? "" }
        : t.user,
    })),
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
 *
 * SEC-1d-012 FIX: Race condition in the reject path. The previous code used
 * the array form `db.$transaction([...])` with a NON-conditional
 * `db.transaction.update({ where: { id } })`. Two concurrent PATCH requests
 * would both pass the `if (txn.status !== "pending")` check (line 74), then
 * both execute the $transaction: the first sets status→"failed" + increments
 * balance; the second sets status→"failed" (already failed, idempotent on
 * status) + increments balance AGAIN → DOUBLE REFUND.
 *
 * Fix: Migrated to interactive `db.$transaction(async (tx) => {...})` with a
 * conditional `updateMany({ where: { id, status: "pending" } })`. Only ONE
 * request can flip the status (the other gets count=0 and aborts BEFORE the
 * balance increment). Same pattern as the W-1 webhook double-credit fix.
 *
 * The approve path is also migrated for consistency (though it has no
 * dollar-flow race, the conditional updateMany prevents double-notification
 * if two admins approve simultaneously).
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
    // SEC-1d-012 FIX: conditional updateMany — only ONE request can flip
    // status to "completed". Concurrent requests get count=0 and skip
    // the notification (prevents double-email to the user).
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.updateMany({
        where: { id, status: "pending" },
        data: { status: "completed" },
      });
      if (updated.count === 0) {
        return { alreadyProcessed: true };
      }
      return { alreadyProcessed: false };
    });

    if (result.alreadyProcessed) {
      // Another admin approved this withdrawal concurrently — no-op.
      return apiOk({ message: "Withdrawal already approved by another admin" });
    }

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
    // SEC-1d-012 FIX: conditional updateMany with status:"pending" inside an
    // interactive $transaction. Only ONE request can flip the status; the
    // other gets count=0 and aborts BEFORE the balance increment. Prevents
    // double-refund when two admins reject simultaneously, or when a retry
    // fires after a network timeout.
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.updateMany({
        where: { id, status: "pending" },
        data: { status: "failed" },
      });
      if (updated.count === 0) {
        return { alreadyProcessed: true };
      }
      // Only ONE request reaches here — the balance increment is safe.
      await tx.user.update({
        where: { id: txn.userId },
        data: { balance: { increment: Math.abs(txn.amount) } },
      });
      return { alreadyProcessed: false };
    });

    if (result.alreadyProcessed) {
      // Another admin rejected this withdrawal concurrently — the balance
      // was already refunded by that request. No-op here.
      return apiOk({ message: "Withdrawal already rejected by another admin" });
    }

    // P-005 FIX: Invalidate user cache so the balance update is visible
    // immediately in the navbar/dashboard (not stale for 15-30s).
    try {
      await cacheInvalidate(`user:${txn.userId}`);
      await cacheInvalidate(`dashboard:${txn.userId}:*`);
    } catch {}

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
