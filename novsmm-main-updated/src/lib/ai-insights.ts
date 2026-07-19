import ZAI from "z-ai-web-dev-sdk";

/**
 * AI-powered insights for the NOVSMM dashboard.
 *
 * Backend-only module. Never import this from a client component —
 * the z-ai-web-dev-sdk reads credentials from /etc/.z-ai-config and
 * must run on the server.
 *
 * All functions are defensive: they catch SDK errors and return a
 * localized fallback string so a flaky AI gateway never breaks the
 * dashboard.
 */

const SPENDING_FALLBACK =
  "Aún no tienes suficientes pedidos para generar recomendaciones personalizadas. Sigue realizando órdenes y pronto verás análisis automáticos aquí.";

const RECOMMENDATIONS_FALLBACK =
  "Explora nuevos servicios en el marketplace para encontrar mejores oportunidades de crecimiento.";

/** Generate personalized service recommendations based on order history. */
export async function generateServiceRecommendations(
  userOrders: any[],
  availableServices: any[],
): Promise<string> {
  if (!userOrders.length || !availableServices.length) {
    return RECOMMENDATIONS_FALLBACK;
  }
  try {
    const zai = await ZAI.create();
    const prompt = `Based on the user's order history (${JSON.stringify(
      userOrders.slice(0, 10),
    )}) and available services (${JSON.stringify(
      availableServices.slice(0, 20),
    )}), recommend 3 services the user should try next. Explain why in 1-2 sentences each. Be concise and practical.`;
    const response = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "disabled" },
    });
    return response.choices[0]?.message?.content ?? RECOMMENDATIONS_FALLBACK;
  } catch (err) {
    console.error("[ai-insights] generateServiceRecommendations failed:", err);
    return RECOMMENDATIONS_FALLBACK;
  }
}

/** Generate spending insights (Spanish, max 150 words). */
export async function generateSpendingInsights(stats: any): Promise<string> {
  if (!stats) return SPENDING_FALLBACK;
  try {
    const zai = await ZAI.create();
    const prompt = `Analyze these user stats and provide 3 actionable insights in Spanish: ${JSON.stringify(
      stats,
    )}. Focus on: 1) spending optimization, 2) best performing platforms, 3) growth opportunity. Be concise (max 150 words total).`;
    const response = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "disabled" },
    });
    return response.choices[0]?.message?.content ?? SPENDING_FALLBACK;
  } catch (err) {
    console.error("[ai-insights] generateSpendingInsights failed:", err);
    return SPENDING_FALLBACK;
  }
}

// ── Referral tier system ──
export interface ReferralTier {
  id: "bronze" | "silver" | "gold" | "platinum";
  label: string;
  minReferrals: number;
  maxReferrals: number; // inclusive upper bound (Infinity for platinum)
  commissionRate: number; // 0..1
  color: string;
  emoji: string;
}

export const REFERRAL_TIERS: ReferralTier[] = [
  {
    id: "bronze",
    label: "Bronze",
    minReferrals: 0,
    maxReferrals: 10,
    commissionRate: 0.05,
    color: "#b45309",
    emoji: "🥉",
  },
  {
    id: "silver",
    label: "Silver",
    minReferrals: 11,
    maxReferrals: 50,
    commissionRate: 0.07,
    color: "#64748b",
    emoji: "🥈",
  },
  {
    id: "gold",
    label: "Gold",
    minReferrals: 51,
    maxReferrals: 200,
    commissionRate: 0.1,
    color: "#d4af37",
    emoji: "🥇",
  },
  {
    id: "platinum",
    label: "Platinum",
    minReferrals: 201,
    maxReferrals: Infinity,
    commissionRate: 0.12,
    color: "#7c3aed",
    emoji: "💎",
  },
];

/** Resolve the active tier + next tier for a referral count. */
export function resolveTier(
  referralCount: number,
): {
  current: ReferralTier;
  next: ReferralTier | null;
  progressToNext: number; // 0..1 (1 if no next tier)
  remainingToNext: number; // referrals needed to reach next tier
} {
  const current =
    REFERRAL_TIERS.find(
      (t) => referralCount >= t.minReferrals && referralCount <= t.maxReferrals,
    ) ?? REFERRAL_TIERS[0];

  const idx = REFERRAL_TIERS.findIndex((t) => t.id === current.id);
  const next = idx >= 0 && idx < REFERRAL_TIERS.length - 1 ? REFERRAL_TIERS[idx + 1] : null;

  if (!next) {
    return { current, next: null, progressToNext: 1, remainingToNext: 0 };
  }

  const span = next.minReferrals - current.minReferrals;
  const done = referralCount - current.minReferrals;
  const progressToNext = span > 0 ? Math.min(1, Math.max(0, done / span)) : 1;
  const remainingToNext = Math.max(0, next.minReferrals - referralCount);

  return { current, next, progressToNext, remainingToNext };
}
