import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk, apiError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

// ─────────────────────────────────────────────────────────────────────────────
// Loyalty tiers — Bronze → Silver → Gold → Platinum → Diamond
// ─────────────────────────────────────────────────────────────────────────────

export interface LoyaltyTier {
  id: string;
  label: string;
  minPoints: number;
  maxPoints: number; // exclusive upper bound (Infinity for top tier)
  color: string;
  emoji: string;
  benefits: string;
}

export const TIERS: LoyaltyTier[] = [
  {
    id: "bronze",
    label: "Bronze",
    minPoints: 0,
    maxPoints: 500,
    color: "#b45309",
    emoji: "🥉",
    benefits: "5% loyalty bonus on every order + access to weekly deals",
  },
  {
    id: "silver",
    label: "Silver",
    minPoints: 500,
    maxPoints: 2000,
    color: "#64748b",
    emoji: "🥈",
    benefits: "7% loyalty bonus + priority support + early marketplace access",
  },
  {
    id: "gold",
    label: "Gold",
    minPoints: 2000,
    maxPoints: 5000,
    color: "#ca8a04",
    emoji: "🥇",
    benefits: "10% loyalty bonus + exclusive premium services + dedicated support",
  },
  {
    id: "platinum",
    label: "Platinum",
    minPoints: 5000,
    maxPoints: 20000,
    color: "#0891b2",
    emoji: "💎",
    benefits: "15% loyalty bonus + early feature access + personal account manager",
  },
  {
    id: "diamond",
    label: "Diamond",
    minPoints: 20000,
    maxPoints: Number.POSITIVE_INFINITY,
    color: "#7c3aed",
    emoji: "💠",
    benefits: "20% loyalty bonus + white-glove support + custom integrations",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Achievement catalog — type, label, description, icon, bonus points
// ─────────────────────────────────────────────────────────────────────────────

export interface AchievementDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  bonus: number;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Plan multipliers — points per $1 spent on a completed order
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_MULTIPLIERS: Record<string, number> = {
  free: 1,
  starter: 1.5,
  growth: 2,
  enterprise: 3,
};

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

/**
 * Compute the live progress for a locked achievement (e.g. "7/10 orders").
 * Returns { current, target } where target may be a date or count.
 */
function achievementProgress(
  type: string,
  ctx: { orderCount: number; totalSpent: number; referralCount: number; accountAgeDays: number; isEarlyAdopter: boolean },
): { current: number; target: number } | null {
  switch (type) {
    case "first_order":    return { current: Math.min(ctx.orderCount, 1),         target: 1 };
    case "10_orders":      return { current: Math.min(ctx.orderCount, 10),        target: 10 };
    case "100_orders":     return { current: Math.min(ctx.orderCount, 100),       target: 100 };
    case "100_spent":      return { current: Math.min(ctx.totalSpent, 100),       target: 100 };
    case "1000_spent":     return { current: Math.min(ctx.totalSpent, 1000),      target: 1000 };
    case "big_spender":    return { current: Math.min(ctx.totalSpent, 5000),      target: 5000 };
    case "first_referral": return { current: Math.min(ctx.referralCount, 1),      target: 1 };
    case "10_referrals":   return { current: Math.min(ctx.referralCount, 10),     target: 10 };
    case "loyal_customer": return { current: Math.min(Math.floor(ctx.accountAgeDays), 30), target: 30 };
    // early_adopter is binary (account age < 2025) — no progress bar.
    default:               return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/me/loyalty
// Returns the user's loyalty summary: total points, tier, progress to next tier,
// recent point entries, and all achievements (unlocked + locked with progress).
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    // Reconcile achievements first so the response is always up-to-date
    // (handles age-based and referral-based achievements that aren't triggered
    // by the order completion flow).
    await reconcileAchievements(userId);

    const [user, pointsAgg, recentPoints, unlockedAchievements] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, plan: true, createdAt: true },
      }),
      db.loyaltyPoint.aggregate({
        where: { userId },
        _sum: { points: true },
      }),
      db.loyaltyPoint.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, points: true, reason: true, orderId: true, createdAt: true },
      }),
      db.achievement.findMany({
        where: { userId },
        select: { id: true, type: true, unlockedAt: true },
        orderBy: { unlockedAt: "desc" },
      }),
    ]);

    if (!user) return apiError("User not found", 404);

    const totalPoints = pointsAgg._sum.points ?? 0;
    const tierInfo = resolveTier(totalPoints);
    const planMultiplier = PLAN_MULTIPLIERS[user.plan] ?? 1;

    // Build the achievements list (unlocked + locked).
    const unlockedMap = new Map(unlockedAchievements.map((a) => [a.type, a]));

    // Stats for locked achievement progress bars.
    const [orderCount, spendAgg, referralCount] = await Promise.all([
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
    ]);
    const totalSpent = spendAgg._sum.totalPrice ?? 0;
    const accountAgeDays =
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const isEarlyAdopter = user.createdAt.getFullYear() < 2025;
    const progressCtx = {
      orderCount,
      totalSpent,
      referralCount,
      accountAgeDays,
      isEarlyAdopter,
    };

    const unlocked: any[] = [];
    const locked: any[] = [];
    for (const def of ACHIEVEMENTS) {
      const record = unlockedMap.get(def.type);
      if (record) {
        unlocked.push({
          type: def.type,
          label: def.label,
          description: def.description,
          icon: def.icon,
          bonus: def.bonus,
          unlockedAt: record.unlockedAt,
        });
      } else {
        const prog = achievementProgress(def.type, progressCtx);
        locked.push({
          type: def.type,
          label: def.label,
          description: def.description,
          icon: def.icon,
          bonus: def.bonus,
          current: prog?.current ?? 0,
          target: prog?.target ?? 0,
          progress: prog && prog.target > 0 ? prog.current / prog.target : 0,
        });
      }
    }

    return apiOk({
      totalPoints,
      tier: {
        current: tierInfo.current,
        next: tierInfo.next,
        progress: tierInfo.progress,
        pointsToNext: tierInfo.pointsToNext,
      },
      planMultiplier,
      plan: user.plan,
      recentPoints,
      achievements: {
        unlocked,
        locked,
        total: ACHIEVEMENTS.length,
        unlockedCount: unlocked.length,
      },
      stats: {
        totalSpent,
        completedOrders: orderCount,
        referralCount,
        accountAgeDays: Math.floor(accountAgeDays),
      },
    });
  } catch (e: any) {
    console.error("[loyalty] error:", e);
    return NextResponse.json(
      { error: "Failed to load loyalty data" },
      { status: 500 },
    );
  }
}
