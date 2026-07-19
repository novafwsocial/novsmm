import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk, apiError } from "@/lib/api-utils";

// Import for local use in the GET handler
import {
  ACHIEVEMENTS,
  TIERS,
  resolveTier,
  reconcileAchievements,
  awardOrderPoints,
} from "@/lib/services/loyalty.service";

// ─────────────────────────────────────────────────────────────────────────────
// Legacy types (kept for backward compat — new code should import from service)
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

// ─────────────────────────────────────────────────────────────────────────────
// GET handler + progress helpers
// ─────────────────────────────────────────────────────────────────────────────

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
        select: { id: true, createdAt: true },
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
