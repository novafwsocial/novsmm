import { db } from "@/lib/db";
import { requireAuth, apiOk, apiError } from "@/lib/api-utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/me — current authenticated user's full profile + dashboard stats.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return apiError("Authentication required", 401);
  const userId = (session.user as any).id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      country: true,
      currency: true,
      language: true,
      balance: true,
      heldBalance: true,
      lifetimeEarnings: true,
      status: true,
      createdAt: true,
    },
  });

  if (!user) return apiError("User not found", 404);

  const [activeOrders, completedOrders, openTickets, unreadNotifs] =
    await Promise.all([
      db.order.count({ where: { userId, status: { in: ["processing", "in_progress"] } } }),
      db.order.count({ where: { userId, status: "completed" } }),
      db.ticket.count({ where: { userId, status: { in: ["open", "waiting"] } } }),
      db.notification.count({ where: { userId, read: false } }),
    ]);

  return apiOk({
    user,
    stats: {
      activeOrders,
      completedOrders,
      openTickets,
      unreadNotifs,
    },
  });
}
