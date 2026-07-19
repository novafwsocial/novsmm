import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";
import { createNotificationSchema } from "@/lib/validations";
import { createNotification, sendEmail, broadcastToWs } from "@/lib/notify";
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

    // ── Create notifications for all recipients in a single batch ──
    // createMany is O(1) round-trip regardless of user count.
    // NOTE: We do NOT call createNotification() in a loop here — that would
    // create DUPLICATE DB rows (createMany already inserted them). The previous
    // implementation had this bug: it called createMany AND looped createNotification,
    // resulting in 2× notifications per user + 10K sequential SMTP sends per broadcast.
    const created = await db.notification.createMany({
      data: users.map((u) => ({ ...cleanData, userId: u.id })),
    });

    // ── Send emails in parallel (not sequential) ──
    // We fetch the created notifications to get their IDs for WS broadcast.
    // Since createMany doesn't return the created rows, we query the latest
    // batch by userId + createdAt window.
    const recentNotifs = await db.notification.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        title: cleanData.title,
        message: cleanData.message,
        createdAt: { gte: new Date(Date.now() - 60_000) }, // last 60s
      },
      select: { id: true, userId: true, type: true, title: true, message: true, amount: true, severity: true, createdAt: true },
    });

    // Send emails in parallel batches of 50 to avoid overwhelming SMTP
    const EMAIL_BATCH = 50;
    for (let i = 0; i < users.length; i += EMAIL_BATCH) {
      const batch = users.slice(i, i + EMAIL_BATCH);
      await Promise.all(
        batch.map((u) =>
          sendEmail({
            to: u.email,
            subject: cleanData.title,
            text: cleanData.message,
          }).catch(() => {})
        )
      );
    }

    // Broadcast to WebSocket mini-service (single broadcast, not per-user)
    // The WS service will route to each user's room based on the notification list
    for (const notif of recentNotifs) {
      broadcastToWs({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        amount: notif.amount,
        severity: notif.severity,
        timestamp: notif.createdAt.toISOString(),
        userId: notif.userId,
      }).catch((e) => console.error("[ws broadcast] failed:", e));
    }

    await audit(adminId, "create", "notification", null, { broadcast: true, audience: audience ?? "all", recipientCount: users.length, ...notifData });

    return apiOk({ message: `Broadcast sent to ${users.length} ${audience === "admins" ? "admins" : "users"} (${created.count} notifications)`, count: created.count }, 201);
  }

  // Single user
  const notif = await createNotification({
    ...cleanData,
    userId,
    sendEmail: true,
  });

  await audit(adminId, "create", "notification", notif.id);

  return apiOk({ notification: notif, message: "Notification sent" }, 201);
}
