import { db } from "@/lib/db";
import { requireAuth, apiOk } from "@/lib/api-utils";

/** GET /api/dashboard — aggregate data for the dashboard home tab. */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      heldBalance: true,
      lifetimeEarnings: true,
      name: true,
      username: true,
      role: true,
    },
  });

  const [activeOrders, completedOrders, recentOrders, openTickets, recentNotifs] =
    await Promise.all([
      db.order.count({
        where: { userId, status: { in: ["processing", "in_progress"] } },
      }),
      db.order.count({ where: { userId, status: "completed" } }),
      db.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.ticket.count({
        where: { userId, status: { in: ["open", "waiting"] } },
      }),
      db.notification.findMany({
        where: { OR: [{ userId }, { userId: null }] },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  // Revenue series (last 30 days from transactions)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const txns = await db.transaction.findMany({
    where: { userId, createdAt: { gte: thirtyDaysAgo } },
    select: { amount: true, type: true, createdAt: true },
  });

  const series: { d: number; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayTxns = txns.filter(
      (t) => t.createdAt >= dayStart && t.createdAt < dayEnd
    );
    series.push({
      d: 29 - i,
      revenue: dayTxns
        .filter((t) => t.type === "sale" || t.type === "topup")
        .reduce((s, t) => s + Math.abs(t.amount), 0),
      orders: dayTxns.filter((t) => t.type === "sale").length,
    });
  }

  const revenueToday = series[series.length - 1]?.revenue ?? 0;
  const revenueMonth = series.reduce((s, d) => s + d.revenue, 0);

  return apiOk({
    user,
    stats: {
      balance: user?.balance ?? 0,
      heldBalance: user?.heldBalance ?? 0,
      activeOrders,
      completedOrders,
      revenueToday,
      revenueMonth,
      lifetimeEarnings: user?.lifetimeEarnings ?? 0,
      openTickets,
    },
    series,
    recentOrders,
    recentNotifications: recentNotifs,
  });
}
