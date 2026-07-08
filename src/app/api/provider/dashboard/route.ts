import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * Provider Dashboard API.
 *
 * Returns aggregated stats + recent orders for the services owned by
 * the calling provider. A provider is any user with role "provider" or
 * "admin". Admins see provider-zero (unassigned) services so they can
 * still use the dashboard when no providers exist.
 *
 * The provider↔service link is `Service.providerId → Provider.id`. We
 * resolve the caller's providers via `Provider.name === user.username`
 * (the convention used by /api/admin/providers when seeding a provider
 * row for a user) OR by matching the provider's `apiKey` against the
 * user's id (defensive — falls back to a wildcard match for admins).
 *
 * GET /api/provider/dashboard
 *   → { stats: { totalServices, activeServices, totalOrders, pendingOrders, revenue },
 *       recentOrders: Order[] }
 */

/** Returns the Provider rows owned by the caller. */
async function resolveProviderIdsForUser(
  userId: string,
  role: string,
): Promise<{ providerIds: string[]; isAdmin: boolean }> {
  // Admins see every provider (full platform visibility).
  if (role === "admin") {
    const all = await db.provider.findMany({ select: { id: true } });
    return { providerIds: all.map((p) => p.id), isAdmin: true };
  }
  // Provider role: match by name (= username convention) OR by apiKey
  // field that may store the userId. We also pull the user record so we
  // can match on email/name as a fallback.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, email: true, name: true },
  });
  if (!user) return { providerIds: [], isAdmin: false };

  const matches = await db.provider.findMany({
    where: {
      OR: [
        { name: user.username },
        { name: user.email },
        { name: user.name ?? "" },
        { apiKey: userId },
      ],
    },
    select: { id: true },
  });
  return { providerIds: matches.map((p) => p.id), isAdmin: false };
}

/** GET /api/provider/dashboard — provider stats + recent orders. */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const role = (session!.user as any).role as string;

  if (role !== "provider" && role !== "admin") {
    return apiError("Provider access required", 403);
  }

  const { providerIds, isAdmin } = await resolveProviderIdsForUser(userId, role);

  // Admins with no providers yet, or providers with no services — return
  // an empty dashboard rather than 404 so the UI can render the shell.
  if (providerIds.length === 0) {
    return apiOk({
      stats: {
        totalServices: 0,
        activeServices: 0,
        totalOrders: 0,
        pendingOrders: 0,
        revenue: 0,
        completedOrders: 0,
      },
      recentOrders: [],
      isAdmin,
    });
  }

  // ── Fetch services for this provider ──
  const services = await db.service.findMany({
    where: { providerId: { in: providerIds } },
    select: { id: true, status: true, name: true, platform: true, price: true },
  });
  const serviceIds = services.map((s) => s.id);
  const activeServices = services.filter((s) => s.status === "active").length;

  // ── Aggregate order stats ──
  // totalOrders counts every order on the provider's services (any status).
  // pendingOrders counts orders still in pre-fulfillment states.
  // revenue is the sum of totalPrice for completed orders.
  const [totalOrders, pendingOrders, completedOrders, completedAgg, recentOrders] = await Promise.all([
    db.order.count({ where: { serviceId: { in: serviceIds } } }),
    db.order.count({
      where: {
        serviceId: { in: serviceIds },
        status: { in: ["pending", "processing", "in_progress"] },
      },
    }),
    db.order.count({
      where: { serviceId: { in: serviceIds }, status: "completed" },
    }),
    db.order.aggregate({
      where: {
        serviceId: { in: serviceIds },
        status: "completed",
      },
      _sum: { totalPrice: true, profit: true },
    }),
    db.order.findMany({
      where: { serviceId: { in: serviceIds } },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, platform: true } },
      },
    }),
  ]);

  return apiOk({
    stats: {
      totalServices: services.length,
      activeServices,
      totalOrders,
      pendingOrders,
      completedOrders,
      revenue: completedAgg._sum.totalPrice ?? 0,
      profit: completedAgg._sum.profit ?? 0,
    },
    recentOrders,
    isAdmin,
  });
}
