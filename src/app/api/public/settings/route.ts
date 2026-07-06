import { db } from "@/lib/db";
import { apiOk } from "@/lib/api-utils";

// Hardcoded plan definitions — matches dashboard-profile BillingSection + plans.tsx
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 29,
    priceYearly: 290,
    amount: 29,
    features: [
      "1K orders/mo",
      "5 platforms",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 89,
    priceYearly: 890,
    amount: 89,
    features: [
      "25K orders/mo",
      "Unlimited platforms",
      "Priority support",
      "Crypto payouts",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 299,
    priceYearly: 2990,
    amount: 299,
    features: [
      "Unlimited orders",
      "Dedicated infra",
      "SSO + audit logs",
      "Custom SLA",
    ],
  },
];

/**
 * GET /api/public/settings — non-sensitive platform settings for public consumption.
 * Used by the WhatsApp widget, landing page, and pre-auth UX.
 *
 * CACHE: 60s browser, 300s CDN (s-maxage) — settings rarely change.
 */
export async function GET() {
  // Read all settings — filter to public-safe keys only
  const settings = await db.setting.findMany();
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
    siteName: map["platform.siteName"] ?? "NOVSMM",
    whatsappNumber: map["platform.whatsapp"] ?? "5215512345678",
    supportEmail: map["platform.supportEmail"] ?? "support@novsmm.io",
    plans: PLANS,
    currencies,
    languages,
  });

  // Cache-Control: browser 60s, CDN 300s
  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
}
