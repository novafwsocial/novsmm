import { db } from "@/lib/db";
import { requireAdmin, apiOk } from "@/lib/api-utils";

/** GET /api/admin/overview — platform-wide stats. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    orders24h,
    revenue30dTxns,
    services,
    providers,
    paymentMethods,
    openTickets,
    recentOrders,
    recentTransactions,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: "active" } }),
    db.order.count({ where: { createdAt: { gte: yesterday } } }),
    db.transaction.findMany({
      where: {
        type: "sale",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { amount: true, createdAt: true },
    }),
    db.service.count({ where: { status: "active" } }),
    db.provider.count(),
    db.paymentMethod.count({ where: { status: "active" } }),
    db.ticket.count({ where: { status: { in: ["open", "waiting"] } } }),
    // Recent orders (last 25) joined with the owning user's name/email
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    // Recent completed transactions (last 25) joined with user
    db.transaction.findMany({
      where: { status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  // Revenue 30d series
  const series: { d: number; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayTxns = revenue30dTxns.filter(
      (t) => t.createdAt >= dayStart && t.createdAt < dayEnd
    );
    series.push({
      d: 29 - i,
      revenue: dayTxns.reduce((s, t) => s + Math.abs(t.amount), 0),
      orders: dayTxns.length,
    });
  }

  const revenue24h = series[series.length - 1]?.revenue ?? 0;
  const revenue30d = series.reduce((s, d) => s + d.revenue, 0);

  return apiOk({
    stats: {
      totalUsers,
      activeUsers,
      orders24h,
      revenue24h,
      revenue30d,
      services,
      providers,
      paymentMethods,
      openTickets,
    },
    series,
    recentOrders,
    recentTransactions,
    health: [
      { label: "API gateway", val: "99.99%", ok: true },
      { label: "Order processor", val: "99.98%", ok: true },
      { label: "Payment gateway", val: "100%", ok: true },
      { label: "WebSocket relay", val: "99.95%", ok: true },
      {
        label: "Provider sync (P-03)",
        val: "degraded",
        ok: false,
      },
    ],
  });
}
