import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk } from "@/lib/api-utils";
import { generateSpendingInsights } from "@/lib/ai-insights";

/** Cache lifetime for AI insights (1 hour). */
const AI_INSIGHTS_TTL_MS = 60 * 60 * 1000;

interface CachedInsight {
  content: string;
  generatedAt: string; // ISO
  refreshed: boolean;
}

/** Read cached AI insights for a user (returns null if missing/expired). */
async function readCachedInsight(userId: string): Promise<CachedInsight | null> {
  const row = await db.setting.findUnique({
    where: { key: `ai_insights:${userId}` },
  });
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as CachedInsight;
    if (!parsed?.generatedAt || !parsed?.content) return null;
    const age = Date.now() - new Date(parsed.generatedAt).getTime();
    if (age > AI_INSIGHTS_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist AI insights for a user (upsert). */
async function writeCachedInsight(userId: string, content: string): Promise<void> {
  const payload: CachedInsight = {
    content,
    generatedAt: new Date().toISOString(),
    refreshed: true,
  };
  await db.setting.upsert({
    where: { key: `ai_insights:${userId}` },
    create: { key: `ai_insights:${userId}`, value: JSON.stringify(payload) },
    update: { value: JSON.stringify(payload) },
  });
}

/**
 * GET /api/analytics — real analytics data for the user's dashboard.
 * Returns KPIs + 30d revenue/orders series + hourly orders + marketplace
 * breakdown + AI-generated spending insights (cached for 1 hour, only
 * generated for users with >5 orders).
 *
 * Query params:
 *   - refresh=1  → bypass the cache and regenerate insights now.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

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

  // todayStart needed by the hourlyOrders query in the Promise.all below
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // PERF FIX (P-M-003): the 4 data-fetching queries below were sequential
  // (4 round-trips to the DB). They're all independent — they only need
  // `userId` and `now`, not each other's results. Running them in parallel
  // via Promise.all cuts latency from ~4x query time to ~1x.
  const [recentTxns, todayOrders, platformBreakdownRaw, referralTxns] =
    await Promise.all([
      // 30-day revenue + orders series
      db.transaction.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { amount: true, type: true, createdAt: true },
      }),
      // Hourly orders (today)
      db.order.findMany({
        where: { userId, createdAt: { gte: todayStart } },
        select: { createdAt: true },
      }),
      // Marketplace breakdown (by platform)
      db.order.groupBy({
        by: ["platform"],
        where: { userId, status: "completed" },
        _count: { id: true },
      }),
      // Referrals (last 14 days)
      db.transaction.findMany({
        where: {
          userId,
          type: "referral",
          createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        },
        select: { amount: true, createdAt: true },
      }),
    ]);

  // ── 30-day revenue + orders series ──
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
  const hourlyOrders: { h: string; v: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const count = todayOrders.filter((o) => new Date(o.createdAt).getHours() === h).length;
    hourlyOrders.push({ h: `${h}:00`, v: count });
  }

  // ── Marketplace breakdown (by platform) ──
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

  // ── AI insights (cached 1h, only for users with >5 orders) ──
  let aiInsights: { content: string; generatedAt: string | null; refreshed: boolean; eligible: boolean } = {
    content: "",
    generatedAt: null,
    refreshed: false,
    eligible: totalOrders > 5,
  };

  if (aiInsights.eligible) {
    if (!forceRefresh) {
      const cached = await readCachedInsight(userId);
      if (cached) {
        aiInsights = {
          content: cached.content,
          generatedAt: cached.generatedAt,
          refreshed: false,
          eligible: true,
        };
      }
    }

    // Either no cache or forceRefresh → regenerate.
    if (!aiInsights.content) {
      const statsPayload = {
        totalOrders,
        totalRevenue: revenueTotal,
        completedOrders,
        activeOrders,
        conversionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        referralEarnings: referralTotal,
        topPlatform: marketplaceBreakdown[0]?.name ?? null,
        platformBreakdown: marketplaceBreakdown.slice(0, 5),
        series30d: series.map((s) => ({ revenue: s.revenue, orders: s.orders })),
      };
      const content = await generateSpendingInsights(statsPayload);
      await writeCachedInsight(userId, content);
      aiInsights = {
        content,
        generatedAt: new Date().toISOString(),
        refreshed: true,
        eligible: true,
      };
    }
  }

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
    aiInsights,
  });
}
