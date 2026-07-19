import { audit } from "@/lib/api-utils";
import { safeFetch } from "@/lib/outbound-webhook";
import { db } from "@/lib/db";

/**
 * Lightweight security-event alerting layer (OWASP A09-2, P3).
 *
 * Hooks into the same audit() infrastructure used everywhere else. When a
 * high-severity security event fires (mass refund, admin password change,
 * 2FA disable on admin account, multiple failed logins, etc.) this module
 * can ALSO dispatch an immediate alert to operators via:
 *
 *   1. An outbound webhook (Slack incoming webhook, Telegram bot, Discord
 *      webhook, generic JSON-to-URL) — configured via SECURITY_ALERT_WEBHOOK_URL.
 *   2. A persistent Setting row keyed `security.alerts.unread` for in-app
 *      surfacing on the admin dashboard.
 *
 * The webhook URL is validated through `validateUrlSafe()` (same SSRF
 * guard as outbound webhooks). Alerts are best-effort: a failed dispatch
 * is logged but never blocks the calling request.
 *
 * Alert rules (extend as needed):
 *   - admin_password_change
 *   - admin_2fa_disable
 *   - refund_amount_high   (>$500)
 *   - bulk_refund          (>5 refunds in 10 min by same admin)
 *   - impersonate_long     (>1h)
 *   - mass_2fa_disable     (>2 in 1h from same IP)
 *
 * Usage from anywhere:
 *   import { raiseSecurityAlert } from "@/lib/security-alert";
 *   await raiseSecurityAlert({ type: "refund_amount_high", userId, severity: "high",
 *     message: "...", metadata: { amount, transactionId } });
 */

const ALERT_WEBHOOK_URL = process.env.SECURITY_ALERT_WEBHOOK_URL;

export interface SecurityAlert {
  type: string;
  severity: "info" | "warning" | "high" | "critical";
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Raise a security alert. Best-effort — never throws.
 *
 * Side effects:
 *   1. Writes a Setting row keyed `security.alert:${timestamp}:${type}`
 *      so the admin UI can show a badge.
 *   2. Dispatches an outbound webhook (if SECURITY_ALERT_WEBHOOK_URL is
 *      configured) via safeFetch (SSRF-protected).
 *   3. Falls back to console.warn if no webhook is configured.
 */
export async function raiseSecurityAlert(alert: SecurityAlert): Promise<void> {
  const ts = Date.now();
  const alertId = `${ts}:${alert.type}`;

  // 1. Persist to the Setting table so the admin UI can surface unread alerts.
  try {
    await db.setting.upsert({
      where: { key: `security.alert:${alertId}` },
      update: {
        value: JSON.stringify({
          id: alertId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          userId: alert.userId,
          metadata: alert.metadata,
          timestamp: new Date(ts).toISOString(),
          acknowledged: false,
        }),
      },
      create: {
        key: `security.alert:${alertId}`,
        value: JSON.stringify({
          id: alertId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          userId: alert.userId,
          metadata: alert.metadata,
          timestamp: new Date(ts).toISOString(),
          acknowledged: false,
        }),
      },
    });
  } catch (e) {
    // DB might be unavailable — fall through to webhook + console.
  }

  // 2. Dispatch webhook (best-effort).
  if (ALERT_WEBHOOK_URL) {
    const payload = JSON.stringify({
      text: `🚨 NOVSMM Security Alert [${alert.severity.toUpperCase()}]: ${alert.message}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `🚨 ${alert.type} (${alert.severity})` },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: alert.message },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Time:*\n${new Date(ts).toISOString()}` },
            { type: "mrkdwn", text: `*User:*\n${alert.userId ?? "—"}` },
          ],
        },
      ],
      metadata: {
        type: alert.type,
        severity: alert.severity,
        userId: alert.userId,
        ...alert.metadata,
      },
    });
    try {
      // safeFetch re-validates the URL through the SSRF guard at fetch time.
      const res = await safeFetch(ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      // Drain (and discard) the response body to free the socket.
      try { await res.body?.cancel(); } catch {}
    } catch (e: any) {
      console.error("[security-alert] webhook dispatch failed:", e?.message ?? e);
    }
  } else {
    // No webhook configured — log to stderr so the APM/Sentry picks it up.
    console.warn(`[security-alert] ${alert.severity.toUpperCase()} ${alert.type}: ${alert.message}`, {
      userId: alert.userId,
      metadata: alert.metadata,
    });
  }

  // 3. Always write to the audit log too (so the alert shows up in the
  // regular audit-log admin view).
  try {
    if (alert.userId) {
      await audit(alert.userId, `security_alert_${alert.type}`, "security_alert", alertId, {
        severity: alert.severity,
        message: alert.message,
        ...alert.metadata,
      });
    }
  } catch {
    // best-effort
  }
}
