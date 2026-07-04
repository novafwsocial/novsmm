import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk, getBaseUrl } from "@/lib/api-utils";
import { REFERRAL_TIERS, resolveTier } from "@/lib/ai-insights";

/**
 * GET /api/referrals — user's referral dashboard.
 * Returns the user's referral code/link, tier system (Bronze → Platinum),
 * commission rate, progress to the next tier, recent payouts, and the
 * global top-10 referrer leaderboard.
 *
 * Backward-compatible: still returns `code`, `referrals`, `totalEarnings`,
 * `totalReferrals`, and `commissionRate` at the top level.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  // ── Get or create the user's referral code (single allocation record) ──
  let referral = await db.referral.findFirst({
    where: { referrerId: userId },
  });

  if (!referral) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const code = `NOV-${(user?.username ?? "user").slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    referral = await db.referral.create({
      data: {
        referrerId: userId,
        referredEmail: "", // placeholder until someone uses the code
        code,
        status: "pending",
      },
    });
  }

  const code = referral.code;
  const baseUrl = await getBaseUrl();
  const referralLink = `${baseUrl}/?ref=${code}`;

  // ── Successful referrals (from the Referral table) ──
  // Exclude the placeholder allocation record (empty email / null referredId).
  const successfulReferrals = await db.referral.findMany({
    where: {
      referrerId: userId,
      referredEmail: { not: "" },
    },
    select: {
      id: true,
      referredEmail: true,
      referredId: true,
      status: true,
      earnings: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalSuccessful = successfulReferrals.length;
  const activeReferrals = successfulReferrals.filter((r) => r.status === "rewarded").length;
  const pendingReferrals = successfulReferrals.filter((r) => r.status === "pending").length;

  // ── Tier resolution ──
  const tier = resolveTier(totalSuccessful);
  const commissionRate = tier.current.commissionRate;

  // ── Legacy referral list (includes placeholder) ──
  const referrals = await db.referral.findMany({
    where: { referrerId: userId },
    select: {
      id: true,
      referredEmail: true,
      status: true,
      earnings: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Referral earnings from transactions + recent payouts ──
  const [referralTxnsAgg, recentPayoutTxns] = await Promise.all([
    db.transaction.aggregate({
      where: { userId, type: "referral" },
      _sum: { amount: true },
      _count: true,
    }),
    db.transaction.findMany({
      where: { userId, type: "referral" },
      select: {
        id: true,
        publicId: true,
        amount: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const totalEarnings = Math.abs(referralTxnsAgg._sum.amount ?? 0);

  const recentPayouts = recentPayoutTxns.map((t) => ({
    id: t.id,
    publicId: t.publicId,
    amount: Math.abs(t.amount),
    description: t.description,
    createdAt: t.createdAt.toISOString(),
  }));

  // ── Leaderboard (top 10 referrers by successful referral count) ──
  const leaderboardRows = await db.referral.groupBy({
    by: ["referrerId"],
    where: { referredEmail: { not: "" } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const topReferrerIds = leaderboardRows.map((r) => r.referrerId);
  const topReferrerUsers = topReferrerIds.length
    ? await db.user.findMany({
        where: { id: { in: topReferrerIds } },
        select: { id: true, username: true, name: true, image: true },
      })
    : [];

  // Earnings per top referrer
  const topReferrerEarnings = topReferrerIds.length
    ? await db.transaction.groupBy({
        by: ["userId"],
        where: { userId: { in: topReferrerIds }, type: "referral" },
        _sum: { amount: true },
      })
    : [];

  const earningsMap = new Map<string, number>();
  for (const e of topReferrerEarnings) {
    earningsMap.set(e.userId, Math.abs(e._sum.amount ?? 0));
  }
  const userMap = new Map<string, { username: string; name: string | null; image: string | null }>();
  for (const u of topReferrerUsers) {
    userMap.set(u.id, { username: u.username, name: u.name, image: u.image });
  }

  const leaderboard = leaderboardRows.map((row, i) => {
    const u = userMap.get(row.referrerId);
    const lbTier = resolveTier(row._count.id);
    return {
      rank: i + 1,
      userId: row.referrerId,
      username: u?.username ?? "anonymous",
      name: u?.name ?? null,
      image: u?.image ?? null,
      referralCount: row._count.id,
      earnings: earningsMap.get(row.referrerId) ?? 0,
      tier: lbTier.current.id,
      tierLabel: lbTier.current.label,
      tierEmoji: lbTier.current.emoji,
    };
  });

  // ── Current user's rank (if not in top 10) ──
  let myRank: number | null = null;
  if (totalSuccessful > 0) {
    const myEntry = leaderboard.find((l) => l.userId === userId);
    if (myEntry) {
      myRank = myEntry.rank;
    } else {
      // Count how many referrers have strictly more referrals than me.
      const higherCount = await db.referral.groupBy({
        by: ["referrerId"],
        where: { referredEmail: { not: "" } },
        _count: { id: true },
        having: { id: { _count: { gt: totalSuccessful } } },
      });
      myRank = higherCount.length + 1;
    }
  }

  return apiOk({
    // Legacy fields (kept for backward compatibility)
    code,
    referrals,
    totalEarnings,
    totalReferrals: referralTxnsAgg._count, // legacy = payout count
    commissionRate,

    // Enhanced fields
    referralLink,
    stats: {
      totalReferrals: totalSuccessful,
      activeReferrals,
      pendingReferrals,
      totalEarnings,
      payoutCount: referralTxnsAgg._count,
    },
    tier: {
      current: {
        id: tier.current.id,
        label: tier.current.label,
        commissionRate: tier.current.commissionRate,
        minReferrals: tier.current.minReferrals,
        maxReferrals:
          tier.current.maxReferrals === Infinity ? null : tier.current.maxReferrals,
        color: tier.current.color,
        emoji: tier.current.emoji,
      },
      next: tier.next
        ? {
            id: tier.next.id,
            label: tier.next.label,
            commissionRate: tier.next.commissionRate,
            minReferrals: tier.next.minReferrals,
            color: tier.next.color,
            emoji: tier.next.emoji,
          }
        : null,
      progressToNext: tier.progressToNext,
      remainingToNext: tier.remainingToNext,
    },
    tierTable: REFERRAL_TIERS.map((t) => ({
      id: t.id,
      label: t.label,
      minReferrals: t.minReferrals,
      maxReferrals: t.maxReferrals === Infinity ? null : t.maxReferrals,
      commissionRate: t.commissionRate,
      color: t.color,
      emoji: t.emoji,
    })),
    recentPayouts,
    leaderboard,
    myRank,
  });
}
