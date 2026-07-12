import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

/**
 * GET /api/public/settings — non-sensitive platform settings for public consumption.
 * Used by the WhatsApp widget, landing page, and pre-auth UX.
 *
 * SECURITY FIX (S-L-006): previously this route read ALL settings from the DB
 * (db.setting.findMany() with no where clause) and then filtered to public-safe
 * keys in JS. That meant every request loaded ALL settings into memory —
 * including sensitive ones like 2fa:*, payment credentials, api.cors_allowlist,
 * notif_prefs:*, etc. If a future code change accidentally exposed the raw
 * map, it would leak everything.
 * Now we only query the specific public-safe keys we need.
 *
 * CACHE: 60s browser, 300s CDN (s-maxage) — settings rarely change.
 */

// Allowlist of public-safe setting keys
const PUBLIC_SETTING_KEYS = [
  "platform.name",
  "platform.tagline",
  "platform.description",
  "platform.supportEmail",
  "platform.supportUrl",
  "platform.helpUrl",
  "platform.whatsapp",
  "maintenance.enabled",
  "maintenance.message",
];

export async function GET() {
  // SECURITY (S-L-006): only fetch public-safe keys — never load ALL settings.
  const settings = await db.setting.findMany({
    where: { key: { in: PUBLIC_SETTING_KEYS } },
  });
  const map: Record<string, string> = {};
  settings.forEach((s) => (map[s.key] = s.value));

  // Fetch active currencies + languages in parallel
  const [currencies, languages] = await Promise.all([
    db.currency.findMany({
      where: { status: "active" },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true, symbol: true, rate: true },
    }),
    db.language.findMany({
      where: { status: "active" },
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true, nativeName: true, flag: true },
    }),
  ]);

  const response = apiOk({
    siteName: map["platform.name"] ?? "NOVSMM",
    whatsappNumber: map["platform.whatsapp"] ?? "5215512345678",
    supportEmail: map["platform.supportEmail"] ?? "support@novsmm.shop",
    currencies,
    languages,
  });

  // Cache-Control: browser 60s, CDN 300s
  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
}
