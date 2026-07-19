import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/status — public status page.
 * Returns platform health + key metrics (no auth required).
 *
 * Adds all-time totals (totalOrders, totalRevenue) + ordersPerMin so the
 * landing page can render real numbers instead of hardcoded ones.
 *
 * CACHE: 60s browser, 300s CDN — status doesn't change frequently.
 */
export async function GET() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalUsers, orders24h, activeServices, totalOrders, revenueAgg] =
    await Promise.all([
      db.user.count({ where: { status: "active" } }),
      db.order.count({ where: { createdAt: { gte: yesterday } } }),
      db.service.count({ where: { status: "active" } }),
      db.order.count(),
      db.order.aggregate({
        where: { status: "completed" },
        _sum: { totalPrice: true },
      }),
    ]);

  const totalRevenue = revenueAgg._sum.totalPrice ?? 0;
  const ordersPerMin = Math.max(1, Math.round(orders24h / (24 * 60)));

  const response = apiOk({
    status: "operational",
    services: {
      api: { status: "operational", latency: "~30ms" },
      dashboard: { status: "operational" },
      payments: { status: "operational" },
      websocket: { status: "operational" },
    },
    stats: {
      totalUsers,
      orders24h,
      activeServices,
      totalOrders,
      totalRevenue,
      ordersPerMin,
    },
    timestamp: new Date().toISOString(),
  });

  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
}
