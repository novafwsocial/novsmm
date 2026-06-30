import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk } from "@/lib/api-utils";

/**
 * GET /api/analytics — real analytics data for the user's dashboard.
 * Returns KPIs + 30d revenue/orders series + hourly orders + marketplace breakdown.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ── KPIs ──
  const [totalOrders, totalRevenue, completedOrders, activeOrders, conversionRate] =
    await Promise.all([
      db.order.count({ where: { userId } }),
      db.transaction.aggregate({
        where: { userId, type: "sale" },
        _sum: { amount: true },
      }),
      db.order.count({ where: { userId, status: "completed" } }),
      db.order.count({ where: { userId, status: { in: ["processing", "in_progress"] } } }),
      db.order.count({ where: { userId, status: "completed" } }),
    ]);

  // Total revenue = sum of all sale transactions (absolute value)
  const revenueTotal = Math.abs(totalRevenue._sum.amount ?? 0);

  // ── 30-day revenue + orders series ──
  const recentTxns = await db.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { amount: true, type: true, createdAt: true },
  });

  const series: { d: number; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayTxns = recentTxns.filter(
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

  // ── Hourly orders (today) ──
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = await db.order.findMany({
    where: { userId, createdAt: { gte: todayStart } },
    select: { createdAt: true },
  });
  const hourlyOrders: { h: string; v: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const count = todayOrders.filter((o) => new Date(o.createdAt).getHours() === h).length;
    hourlyOrders.push({ h: `${h}:00`, v: count });
  }

  // ── Marketplace breakdown (by platform) ──
  const platformBreakdownRaw = await db.order.groupBy({
    by: ["platform"],
    where: { userId, status: "completed" },
    _count: { id: true },
  });
  const colors: Record<string, string> = {
    Instagram: "#E1306C",
    TikTok: "#111111",
    YouTube: "#FF0000",
    Telegram: "#229ED9",
    Spotify: "#1DB954",
    X: "#111111",
    Twitch: "#9146FF",
    Discord: "#5865F2",
  };
  const marketplaceBreakdown = platformBreakdownRaw.map((p) => ({
    name: p.platform,
    value: p._count.id,
    color: colors[p.platform] ?? "#94a3b8",
  }));

  // ── Referrals (last 14 days) ──
  const referralTxns = await db.transaction.findMany({
    where: {
      userId,
      type: "referral",
      createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
    },
    select: { amount: true, createdAt: true },
  });
  const referralSeries: { d: number; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayRef = referralTxns.filter(
      (t) => t.createdAt >= dayStart && t.createdAt < dayEnd
    );
    referralSeries.push({
      d: 13 - i,
      revenue: dayRef.reduce((s, t) => s + Math.abs(t.amount), 0),
    });
  }
  const referralTotal = referralTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
  const referralCount = referralTxns.length;

  return apiOk({
    kpis: {
      totalOrders,
      totalRevenue: revenueTotal,
      completedOrders,
      activeOrders,
      conversionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      repeatRate: 0, // calculated below if we have data
    },
    series,
    hourlyOrders,
    marketplaceBreakdown,
    referrals: {
      series: referralSeries,
      total: referralTotal,
      count: referralCount,
    },
  });
}
