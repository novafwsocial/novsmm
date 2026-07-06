import { db } from "@/lib/db";
import { createNotification } from "@/lib/notify";

/**
 * Loyalty service — extracted from src/app/api/me/loyalty/route.ts
 * to eliminate the cross-route import anti-pattern.
 *
 * This module contains the business logic for loyalty points, achievements,
 * and tier resolution. The API route (me/loyalty/route.ts) imports from here
 * instead of defining the logic inline.
 *
 * Phase 5: Backend Architecture Refactor
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  bonus: number;
}

export interface Tier {
  id: string;
  name: string;
  label: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  emoji: string;
  benefits: string;
  multiplier: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  { type: "first_order",    label: "First Order",     description: "Place your first order",          icon: "🎯", bonus: 100 },
  { type: "10_orders",      label: "Getting Started", description: "Place 10 orders",                 icon: "📦", bonus: 50  },
  { type: "100_orders",     label: "Order Master",    description: "Place 100 orders",                icon: "🏆", bonus: 500 },
  { type: "100_spent",      label: "First $100",      description: "Spend $100 total",                icon: "💵", bonus: 100 },
  { type: "1000_spent",     label: "Big Spender",     description: "Spend $1000 total",               icon: "💸", bonus: 500 },
  { type: "big_spender",    label: "Whale",           description: "Spend $5000 total",               icon: "🐋", bonus: 1000 },
  { type: "first_referral", label: "Network Builder", description: "Get your first referral",         icon: "🤝", bonus: 100 },
  { type: "10_referrals",   label: "Influencer",      description: "Get 10 referrals",                icon: "👥", bonus: 300 },
  { type: "early_adopter",  label: "Early Adopter",   description: "Account created before 2025",     icon: "🚀", bonus: 200 },
  { type: "loyal_customer", label: "Loyal Customer",  description: "Active for 30+ days",             icon: "💚", bonus: 200 },
];

export const PLAN_MULTIPLIERS: Record<string, number> = {
  free: 1,
  starter: 1.5,
  growth: 2,
  enterprise: 3,
};

export const TIERS: Tier[] = [
  {
    id: "bronze",
    name: "Bronze",
    label: "Bronze",
    minPoints: 0,
    maxPoints: 500,
    color: "#b45309",
    emoji: "🥉",
    benefits: "5% loyalty bonus on every order + access to weekly deals",
    multiplier: 1,
  },
  {
    id: "silver",
    name: "Silver",
    label: "Silver",
    minPoints: 500,
    maxPoints: 2000,
    color: "#64748b",
    emoji: "🥈",
    benefits: "7% loyalty bonus + priority support + early marketplace access",
    multiplier: 1.1,
  },
  {
    id: "gold",
    name: "Gold",
    label: "Gold",
    minPoints: 2000,
    maxPoints: 5000,
    color: "#ca8a04",
    emoji: "🥇",
    benefits: "10% loyalty bonus + exclusive premium services + dedicated support",
    multiplier: 1.25,
  },
  {
    id: "platinum",
    name: "Platinum",
    label: "Platinum",
    minPoints: 5000,
    maxPoints: 20000,
    color: "#0891b2",
    emoji: "💎",
    benefits: "15% loyalty bonus + early feature access + personal account manager",
    multiplier: 1.5,
  },
  {
    id: "diamond",
    name: "Diamond",
    label: "Diamond",
    minPoints: 20000,
    maxPoints: Number.POSITIVE_INFINITY,
    color: "#7c3aed",
    emoji: "💠",
    benefits: "20% loyalty bonus + white-glove support + custom integrations",
    multiplier: 2,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve the current tier + next tier + progress for a given point total. */
export function resolveTier(totalPoints: number) {
  let idx = TIERS.findIndex(
    (t) => totalPoints >= t.minPoints && totalPoints < t.maxPoints,
  );
  if (idx < 0) idx = TIERS.length - 1; // clamp to top tier
  const current = TIERS[idx];
  const next = idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  let progress = 1;
  let pointsToNext = 0;
  if (next) {
    const range = next.minPoints - current.minPoints;
    const have = totalPoints - current.minPoints;
    progress = range > 0 ? Math.min(1, have / range) : 1;
    pointsToNext = Math.max(0, next.minPoints - totalPoints);
  }
  return { current, next, progress, pointsToNext };
}

/**
 * Reconcile achievements for a user. Checks every achievement condition against
 * current DB state and unlocks any that are newly satisfied (atomic create +
 * bonus-point award per achievement). Returns the list of newly unlocked types.
 *
 * Safe to call repeatedly — already-unlocked achievements are skipped silently.
 */
export async function reconcileAchievements(userId: string): Promise<string[]> {
  const [user, orderCount, spendAgg, referralCount, existing] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, createdAt: true },
    }),
    db.order.count({ where: { userId, status: "completed" } }),
    db.order.aggregate({
      where: { userId, status: "completed" },
      _sum: { totalPrice: true },
    }),
    db.referral.count({
      where: {
        referrerId: userId,
        status: { in: ["completed", "rewarded"] },
      },
    }),
    db.achievement.findMany({
      where: { userId },
      select: { type: true },
    }),
  ]);

  if (!user) return [];

  const existingTypes = new Set(existing.map((a) => a.type));
  const totalSpent = spendAgg._sum.totalPrice ?? 0;
  const accountAgeDays =
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const isEarlyAdopter = user.createdAt.getFullYear() < 2025;

  const checks: { type: string; condition: boolean }[] = [
    { type: "first_order",    condition: orderCount >= 1 },
    { type: "10_orders",      condition: orderCount >= 10 },
    { type: "100_orders",     condition: orderCount >= 100 },
    { type: "100_spent",      condition: totalSpent >= 100 },
    { type: "1000_spent",     condition: totalSpent >= 1000 },
    { type: "big_spender",    condition: totalSpent >= 5000 },
    { type: "first_referral", condition: referralCount >= 1 },
    { type: "10_referrals",   condition: referralCount >= 10 },
    { type: "early_adopter",  condition: isEarlyAdopter },
    { type: "loyal_customer", condition: accountAgeDays >= 30 },
  ];

  const newlyUnlocked: string[] = [];
  for (const check of checks) {
    if (!check.condition || existingTypes.has(check.type)) continue;
    const def = ACHIEVEMENTS.find((a) => a.type === check.type);
    if (!def) continue;
    try {
      await db.$transaction([
        db.achievement.create({
          data: { userId, type: check.type },
        }),
        db.loyaltyPoint.create({
          data: {
            userId,
            points: def.bonus,
            reason: "achievement",
            orderId: null,
          },
        }),
      ]);
      newlyUnlocked.push(check.type);
    } catch (e: any) {
      // P2002 = unique constraint violation (already unlocked by a concurrent
      // call). Safe to ignore.
      if (e?.code !== "P2002") throw e;
    }
  }

  // Notify the user about each newly unlocked achievement.
  for (const type of newlyUnlocked) {
    const def = ACHIEVEMENTS.find((a) => a.type === type);
    if (!def) continue;
    await createNotification({
      userId,
      type: "system",
      title: `${def.icon} Achievement unlocked: ${def.label}`,
      message: `${def.description} — +${def.bonus} loyalty points awarded.`,
      severity: "success",
      sendEmail: false,
    }).catch(() => {
      /* notifications are best-effort */
    });
  }

  return newlyUnlocked;
}

/**
 * Award loyalty points for a completed order.
 * Points = floor(amount × planMultiplier).
 * Returns the points awarded and the multiplier used.
 */
export async function awardOrderPoints(
  userId: string,
  orderId: string,
  amount: number,
  plan: string,
): Promise<{ points: number; multiplier: number }> {
  const multiplier = PLAN_MULTIPLIERS[plan] ?? 1;
  const points = Math.max(0, Math.floor(amount * multiplier));
  if (points <= 0) return { points: 0, multiplier };
  await db.loyaltyPoint.create({
    data: { userId, points, reason: "order_completed", orderId },
  });
  return { points, multiplier };
}
