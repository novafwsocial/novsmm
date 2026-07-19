import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, apiError, apiOk, audit } from "@/lib/api-utils";

/**
 * Allowlist of setting keys that admins can update via this endpoint.
 *
 * SECURITY FIX (S-H-001): previously the PATCH route accepted ANY key
 * without validation. An admin (or attacker with a stolen admin session)
 * could overwrite critical system settings by sending:
 *   { "2fa:<userId>": "<malicious-encrypted-payload>" }   → bypass 2FA
 *   { "notif_prefs:<userId>": "{}" }                       → disable notifs
 *   { "payment_method:<id>:credentials": "<encrypted>" }   → swap payment creds
 *   { "api.cors_allowlist": "https://evil.com" }           → open CORS
 *
 * The allowlist below is the complete set of admin-configurable platform
 * settings. Anything NOT on this list is rejected with 422. Settings
 * that contain user-specific data (like `2fa:*`, `notif_prefs:*`) are
 * intentionally NOT in this list — they must only be mutated by the
 * user themselves via the dedicated /api/me/* endpoints.
 */
const ADMIN_SETTINGS_ALLOWLIST = new Set([
  // Platform branding
  "platform.name",
  "platform.tagline",
  "platform.description",
  "platform.supportEmail",
  "platform.supportUrl",
  "platform.helpUrl",

  // Feature flags
  "feature.marketplace.enabled",
  "feature.childPanels.enabled",
  "feature.affiliates.enabled",
  "feature.subscriptions.enabled",

  // Public API (v1) CORS allowlist
  // SECURITY: changing this is audited — it controls which origins can
  // call the public API. Adding an attacker origin here would let them
  // make authenticated API calls from the browser.
  "api.cors_allowlist",

  // Maintenance mode
  "maintenance.enabled",
  "maintenance.message",

  // Default currency / language
  "defaults.currency",
  "defaults.language",

  // Signup settings
  "signup.enabled",
  "signup.requireEmailVerification",
  "signup.defaultBalance",

  // Order settings
  "orders.minQuantity",
  "orders.maxQuantity",
  "orders.cancelWindowSeconds",

  // Wallet settings
  "wallet.minTopup",
  "wallet.maxTopup",
  "wallet.minWithdrawal",
  "wallet.withdrawalFee",

  // Rate limits (display only — actual limits are in middleware.ts)
  "ratelimit.api.perMin",
  "ratelimit.auth.per15Min",
]);

/** GET /api/admin/settings — all platform settings. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const settings = await db.setting.findMany({ orderBy: { key: "asc" } });
  const map: Record<string, string> = {};
  settings.forEach((s) => (map[s.key] = s.value));
  return apiOk({ settings: map });
}

/** PATCH /api/admin/settings — update one or more settings.
 *
 * SECURITY (S-H-001): only keys in ADMIN_SETTINGS_ALLOWLIST are accepted.
 * Keys with `:` (user-scoped settings like `2fa:`, `notif_prefs:`,
 * `payment_method:`) are always rejected — they must go through their
 * dedicated endpoints.
 */
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const adminId = (session!.user as any).id;

  const body = await req.json();
  // body is { key: value, key2: value2, ... }
  const updates = Object.entries(body);
  if (updates.length === 0) return apiError("No settings to update", 422);

  // Validate every key against the allowlist.
  const rejected: string[] = [];
  const allowed: [string, string][] = [];
  for (const [key, value] of updates) {
    if (!ADMIN_SETTINGS_ALLOWLIST.has(key)) {
      rejected.push(key);
      continue;
    }
    allowed.push([key, String(value)]);
  }

  if (rejected.length > 0) {
    return apiError(
      `The following keys are not admin-configurable via this endpoint: ${rejected.join(", ")}. ` +
        "User-scoped settings (2fa:*, notif_prefs:*, etc.) must go through their dedicated /api/me/* endpoints.",
      422
    );
  }

  for (const [key, value] of allowed) {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  await audit(adminId, "update", "settings", null, body);

  return apiOk({ message: `${allowed.length} settings updated` });
}
