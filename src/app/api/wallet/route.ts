import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

/**
 * GET /api/wallet — balance + recent transactions.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      heldBalance: true,
      lifetimeEarnings: true,
      currency: true,
    },
  });

  const transactions = await db.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      publicId: true,
      type: true,
      amount: true,
      description: true,
      status: true,
      method: true,
      reference: true,
      createdAt: true,
    },
  });

  // Aggregate for chart (last 30 days, daily net)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentTxns = await db.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { amount: true, createdAt: true, type: true },
  });

  // Build daily series
  const series: { d: number; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(day.setHours(0, 0, 0, 0));
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayTxns = recentTxns.filter(
      (t) => t.createdAt >= dayStart && t.createdAt < dayEnd
    );
    const revenue = dayTxns
      .filter((t) => t.type === "sale" || t.type === "topup")
      .reduce((s, t) => s + t.amount, 0);
    const orders = dayTxns.filter((t) => t.type === "sale").length;
    series.push({ d: 29 - i, revenue, orders });
  }

  return apiOk({
    balance: user?.balance ?? 0,
    heldBalance: user?.heldBalance ?? 0,
    lifetimeEarnings: user?.lifetimeEarnings ?? 0,
    currency: user?.currency ?? "USD",
    transactions,
    series,
  });
}
