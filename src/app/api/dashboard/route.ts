import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk } from "@/lib/api-utils";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache";

/** GET /api/dashboard — aggregate data for the dashboard home tab.
 *
 * Query params:
 *  - range: "7d" | "30d" | "90d" (default "30d") — controls revenue series
 *           window. Other stats (balance, active/completed counts, recent
 *           orders) are always all-time / live.
 *
 * Fix: Redis cache (15s TTL) to reduce DB load on frequent dashboard polling.
 * Cache is per-user + per-range. Invalidated on order/wallet mutations.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const rangeParam = new URL(req.url).searchParams.get("range") ?? "30d";

  // Fix: Check Redis cache first (15s TTL — short enough for near-real-time,
  // long enough to deduplicate rapid polling from multiple components)
  const cacheKey = `dashboard:${userId}:${rangeParam}`;
  const cached = await cacheGet<any>(cacheKey);
  if (cached) {
    return apiOk(cached);
  }
  const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = RANGE_DAYS[rangeParam] ?? 30;

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
        select: {
          id: true,
          publicId: true,
          serviceName: true,
          platform: true,
          quantity: true,
          status: true,
          progress: true,
          eta: true,
          flag: true,
          totalPrice: true,
          createdAt: true,
        },
      }),
      db.ticket.count({
        where: { userId, status: { in: ["open", "waiting"] } },
      }),
      db.notification.findMany({
        where: { OR: [{ userId }, { userId: null }] },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          amount: true,
          severity: true,
          read: true,
          createdAt: true,
        },
      }),
    ]);

  // Revenue series (last N days from transactions)
  const N = days;
  const NdaysAgo = new Date(Date.now() - N * 24 * 60 * 60 * 1000);
  const txns = await db.transaction.findMany({
    where: { userId, createdAt: { gte: NdaysAgo } },
    select: { amount: true, type: true, createdAt: true },
  });

  const series: { d: number; revenue: number; orders: number }[] = [];
  for (let i = N - 1; i >= 0; i--) {
    const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayTxns = txns.filter(
      (t) => t.createdAt >= dayStart && t.createdAt < dayEnd
    );
    series.push({
      d: N - 1 - i,
      revenue: dayTxns
        .filter((t) => t.type === "sale" || t.type === "topup")
        .reduce((s, t) => s + Math.abs(t.amount), 0),
      orders: dayTxns.filter((t) => t.type === "sale").length,
    });
  }

  const revenueToday = series[series.length - 1]?.revenue ?? 0;
  // Sum over the selected range — used by the home tab "Revenue · last N days" headline.
  const revenueRange = series.reduce((s, d) => s + d.revenue, 0);
  // Backward compat: keep revenueMonth as an alias for revenueRange so any
  // existing consumers that read stats.revenueMonth (e.g. the sidebar's
  // useDashboard() call) continue to receive a sensible value.
  const revenueMonth = revenueRange;

  const responseData = {
    // FIX (OAuth nullable username): coerce null → "" so the frontend's
    // `user.username: string` typing stays honest. After the signIn
    // callback generates a username this is a no-op; before it does
    // (brief OAuth window) the empty string avoids a null crash.
    user: user ? { ...user, username: user.username ?? "" } : user,
    stats: {
      balance: user?.balance ?? 0,
      heldBalance: user?.heldBalance ?? 0,
      activeOrders,
      completedOrders,
      revenueToday,
      revenueMonth,
      revenueRange,
      range: rangeParam,
      rangeDays: N,
      lifetimeEarnings: user?.lifetimeEarnings ?? 0,
      openTickets,
    },
    series,
    recentOrders,
    recentNotifications: recentNotifs,
  };

  // Fix: Cache for 15 seconds
  await cacheSet(cacheKey, responseData, 15);

  return apiOk(responseData);
}
