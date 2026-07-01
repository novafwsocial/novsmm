import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk } from "@/lib/api-utils";
import { createNotificationSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notify";
import { sanitizeMessage } from "@/lib/sanitize";

/**
 * POST /api/admin/notifications — broadcast a notification to all users.
 * Admin can compose the title, message, type, severity, and audience.
 * audience: "all" | "users" | "admins" — filters recipients by role.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  const parsed = createNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
  }

  const { broadcast, userId, audience, ...notifData } = parsed.data as any;

  // Sanitize title and message
  const cleanData = {
    ...notifData,
    title: sanitizeMessage(notifData.title),
    message: sanitizeMessage(notifData.message),
  };

  if (broadcast) {
    // Build the recipient filter from the audience field
    // audience: "all" (default) — every active user
    //          "users" — non-admin active users
    //          "admins" — admin users only
    const where: any = { status: "active" };
    if (audience === "users") {
      where.role = { not: "admin" };
    } else if (audience === "admins") {
      where.role = "admin";
    }

    const users = await db.user.findMany({
      where,
      select: { id: true, email: true, name: true },
    });

    await db.notification.createMany({
      data: users.map((u) => ({ ...cleanData, userId: u.id })),
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
        metadata: JSON.stringify({ broadcast: true, audience: audience ?? "all", ...notifData }),
      },
    });

    return apiOk({ message: `Broadcast sent to ${users.length} ${audience === "admins" ? "admins" : audience === "users" ? "users" : "users"}` }, 201);
  }

  // Single user
  const notif = await createNotification({
    ...cleanData,
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
