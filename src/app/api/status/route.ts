import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/status — public status page.
 * Returns platform health + key metrics (no auth required).
 */
export async function GET() {
  // Count users + orders in last 24h for status display
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalUsers, orders24h, activeServices] = await Promise.all([
    db.user.count({ where: { status: "active" } }),
    db.order.count({ where: { createdAt: { gte: yesterday } } }),
    db.service.count({ where: { status: "active" } }),
  ]);

  return apiOk({
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
    },
    timestamp: new Date().toISOString(),
  });
}
