import { db } from "./db";

/**
 * NOVSMM notification service.
 * Creates in-app notifications in the DB + sends email when configured.
 * The WebSocket mini-service polls/broadcasts new notifications to clients.
 */

type NotifInput = {
  userId?: string;
  type: "order" | "sale" | "marketplace" | "ticket" | "recharge" | "withdrawal" | "referral" | "system";
  title: string;
  message: string;
  amount?: number;
  severity?: "info" | "success" | "warning";
  sendEmail?: boolean;
};

export async function createNotification(input: NotifInput) {
  const notif = await db.notification.create({
    data: {
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      amount: input.amount,
      severity: input.severity ?? "info",
    },
  });

  // Broadcast to WebSocket mini-service for real-time push
  // (fire-and-forget — don't block the request)
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

  // Send email if requested and user has email
  if (input.sendEmail && input.userId) {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    });
    if (user) {
      await sendEmail({
        to: user.email,
        subject: input.title,
        text: `Hi ${user.name ?? "there"},\n\n${input.message}\n\n— NOVSMM Team`,
      }).catch((e) => console.error("[email] send failed:", e));
    }
  }

  return notif;
}

/**
 * Email sender — uses Nodemailer if SMTP env vars are set,
 * otherwise logs to console (sandbox mode).
 *
 * To enable real email, set in .env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=...
 *   SMTP_PASS=...
 *   EMAIL_FROM="NOVSMM <noreply@novsmm.io>"
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER) {
    // Sandbox mode — log the email
    console.log(`\n📧 [EMAIL · sandbox] ────────────────────`);
    console.log(`  To:      ${opts.to}`);
    console.log(`  From:    ${EMAIL_FROM ?? "noreply@novsmm.io"}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`  Body:    ${opts.text.slice(0, 200)}...`);
    console.log(`  ────────────────────────────────────────\n`);
    return { sandbox: true, delivered: false };
  }

  // Real SMTP delivery
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? "587"),
    secure: parseInt(SMTP_PORT ?? "587") === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const info = await transporter.sendMail({
    from: EMAIL_FROM ?? "NOVSMM <noreply@novsmm.io>",
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  return { sandbox: false, delivered: true, messageId: info.messageId };
}

/**
 * Broadcast a notification to the WebSocket mini-service for real-time push.
 * Server-side fetch uses localhost:3003 directly (XTransformPort is browser-only).
 *
 * SECURITY: Includes NOTIFICATIONS_SERVICE_SECRET bearer token for auth.
 * The notifications service rejects unauthenticated /broadcast calls.
 *
 * Exported so admin broadcast can push to WS without creating duplicate DB rows.
 */
export async function broadcastToWs(payload: any): Promise<void> {
  const WS_SERVICE_URL =
    process.env.WS_SERVICE_URL ?? "http://localhost:3003/broadcast";
  const serviceSecret = process.env.NOTIFICATIONS_SERVICE_SECRET;

  await fetch(WS_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(serviceSecret ? { Authorization: `Bearer ${serviceSecret}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3000), // don't hang if service is down
  });
}

/**
 * Notify all admins (used for system-level events: new withdrawal request,
 * new license issued, payment failure, etc.)
 */
export async function notifyAdmins(input: Omit<NotifInput, "userId">) {
  const admins = await db.user.findMany({
    where: { role: "admin", status: "active" },
    select: { id: true, email: true, name: true },
  });
  for (const admin of admins) {
    await createNotification({ ...input, userId: admin.id, sendEmail: true });
  }
}

