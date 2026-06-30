import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { createNotificationSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";

/**
 * POST /api/admin/notifications — broadcast a notification to all users.
 * Admin can compose the title, message, type, and severity.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = createNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid input", 422);
  }

  const { broadcast, userId, ...notifData } = parsed.data;

  if (broadcast) {
    // Broadcast to all users
    const users = await db.user.findMany({
      where: { status: "active" },
      select: { id: true, email: true, name: true },
    });

    await db.notification.createMany({
      data: users.map((u) => ({ ...notifData, userId: u.id })),
    });

    // Email all users
    for (const u of users) {
      await createNotification({
        ...notifData,
        userId: u.id,
        sendEmail: true,
      }).catch(() => {});
    }

    await db.auditLog.create({
      data: {
        userId: adminId,
        action: "create",
        entity: "notification",
        metadata: JSON.stringify({ broadcast: true, ...notifData }),
      },
    });

    return apiOk({ message: `Broadcast sent to ${users.length} users` }, 201);
  }

  // Single user
  const notif = await createNotification({
    ...notifData,
    userId,
    sendEmail: true,
  });

  await db.auditLog.create({
    data: {
      userId: adminId,
      action: "create",
      entity: "notification",
      entityId: notif.id,
    },
  });

  return apiOk({ notification: notif, message: "Notification sent" }, 201);
}
