import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";

/**
 * GET /api/notifications — current user's notifications + broadcast (system) ones.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const notifications = await db.notification.findMany({
    where: {
      OR: [{ userId }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await db.notification.count({
    where: {
      userId,
      read: false,
    },
  });

  return apiOk({ notifications, unreadCount });
}

/**
 * POST /api/notifications — mark notifications as read.
 * Body: { ids?: string[], all?: boolean }
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { ids, all } = body;

  if (all) {
    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } else if (Array.isArray(ids) && ids.length > 0) {
    await db.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { read: true },
    });
  }

  return apiOk({ message: "Notifications marked as read" });
}
