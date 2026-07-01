import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiOk } from "@/lib/api-utils";

/**
 * GET /api/admin/search?q=query
 * Global search across users, orders, services, tickets.
 * Returns grouped results. SQLite is already case-insensitive for `contains`
 * on ASCII strings, so we don't pass `mode: "insensitive"` (which would error).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return apiOk({ users: [], orders: [], services: [], tickets: [] });
  }

  const [users, orders, services, tickets] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { email: { contains: q } },
          { name: { contains: q } },
          { username: { contains: q } },
        ],
      },
      take: 10,
      select: {
        id: true, email: true, name: true, username: true,
        role: true, status: true, balance: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    db.order.findMany({
      where: {
        OR: [
          { publicId: { contains: q } },
          { serviceName: { contains: q } },
          { platform: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, publicId: true, serviceName: true, platform: true, status: true, totalPrice: true, createdAt: true },
    }),
    db.service.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { platform: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, name: true, platform: true, price: true, status: true },
    }),
    db.ticket.findMany({
      where: {
        OR: [
          { publicId: { contains: q } },
          { subject: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, publicId: true, subject: true, status: true, priority: true, createdAt: true },
    }),
  ]);

  return apiOk({
    users,
    orders,
    services,
    tickets,
    total: users.length + orders.length + services.length + tickets.length,
  });
}
