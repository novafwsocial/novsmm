import { db } from "./db";
import { sendEmail } from "./notify";

/**
 * Default email templates seeded on first boot.
 * Each template's subject/body supports {{variable}} interpolation.
 * Variables are filled in by `renderTemplate()` at send time.
 */
export const DEFAULT_TEMPLATES = [
  {
    key: "welcome",
    name: "Welcome Email",
    subject: "Welcome to NOVSMM, {{name}}!",
    body: "Hi {{name}},\n\nWelcome to NOVSMM — the infrastructure for social media marketing at scale.\n\nYour account is ready. Start by exploring our marketplace of 6,300+ services.\n\n— NOVSMM Team",
  },
  {
    key: "order_completed",
    name: "Order Completed",
    subject: "Order #{{orderId}} completed ✓",
    body: "Hi {{name}},\n\nYour order #{{orderId}} for {{serviceName}} has been completed.\n\nQuantity: {{quantity}}\nTotal: ${{total}}\n\nThank you for your business!\n\n— NOVSMM Team",
  },
  {
    key: "order_failed",
    name: "Order Failed",
    subject: "Order #{{orderId}} could not be completed",
    body: "Hi {{name}},\n\nUnfortunately, your order #{{orderId}} for {{serviceName}} could not be completed. A full refund of ${{total}} has been credited to your balance.\n\nIf you have questions, please open a support ticket.\n\n— NOVSMM Team",
  },
  {
    key: "ticket_reply",
    name: "Support Ticket Reply",
    subject: "[Ticket #{{ticketId}}] {{ticketSubject}}",
    body: "Hi {{name}},\n\nYou have a new reply on your support ticket #{{ticketId}}: {{ticketSubject}}\n\n{{replyText}}\n\nView the full conversation in your dashboard.\n\n— NOVSMM Team",
  },
  {
    key: "low_balance",
    name: "Low Balance Warning",
    subject: "Your balance is running low",
    body: "Hi {{name}},\n\nYour NOVSMM balance is ${{balance}}. Top up to keep your orders running.\n\n— NOVSMM Team",
  },
  {
    key: "referral_earned",
    name: "Referral Earning",
    subject: "You earned ${{amount}} from a referral!",
    body: "Hi {{name}},\n\nYou earned ${{amount}} from your referral {{referredName}}. The commission has been added to your balance.\n\n— NOVSMM Team",
  },
];

/**
 * Render a template string by replacing {{variable}} placeholders with values.
 * Unknown variables resolve to empty string (graceful degradation).
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables[key] ?? ""));
}

/**
 * Fetch an email template by key from the DB.
 * Returns null if the template doesn't exist.
 */
export async function getEmailTemplate(key: string) {
  try {
    const template = await db.emailTemplate.findUnique({ where: { key } });
    return template;
  } catch {
    // DB might not be ready during build — return null gracefully
    return null;
  }
}

/**
 * Send an email using a DB-backed template.
 * If the template doesn't exist or is inactive, returns null (caller
 * should fall back to the hardcoded message in createNotification).
 *
 * Variables: a flat record of {{key}} → value substitutions.
 */
export async function sendTemplatedEmail(
  key: string,
  to: string,
  variables: Record<string, string | number>
) {
  const template = await getEmailTemplate(key);
  if (!template || !template.isActive) {
    return null;
  }
  const subject = renderTemplate(template.subject, variables);
  const body = renderTemplate(template.body, variables);
  return sendEmail({ to, subject, text: body });
}

/**
 * Seed default email templates into the DB if they don't exist.
 * Called once on app boot (idempotent — skips templates that already exist).
 * Admin can edit the seeded templates via /api/admin/email-templates; this
 * function only creates them on first run.
 */
export async function seedEmailTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    try {
      await db.emailTemplate.upsert({
        where: { key: t.key },
        update: {}, // don't overwrite admin edits
        create: {
          key: t.key,
          name: t.name,
          subject: t.subject,
          body: t.body,
          isActive: true,
        },
      });
    } catch {
      // Ignore — DB may not be ready during build
    }
  }
}

/**
 * Map a notification type + metadata to an email template key.
 * Returns null if no template applies (caller falls back to hardcoded text).
 *
 * Examples:
 *   type="order", meta.status="completed" → "order_completed"
 *   type="order", meta.status="failed"    → "order_failed"
 *   type="ticket"                         → "ticket_reply"
 *   type="referral"                       → "referral_earned"
 *   type="recharge"                       → null (no template)
 */
export function notifTypeToTemplateKey(
  type: string,
  meta?: Record<string, any>
): string | null {
  if (type === "order") {
    if (meta?.status === "failed" || meta?.status === "cancelled") return "order_failed";
    if (meta?.status === "completed") return "order_completed";
    return null;
  }
  if (type === "ticket") return "ticket_reply";
  if (type === "referral") return "referral_earned";
  return null;
}
