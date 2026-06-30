import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiOk } from "@/lib/api-utils";

/**
 * GET /api/referrals — user's referral dashboard.
 * Returns their referral code, stats, and list of referrals.
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  // Get or create referral code for this user
  let referral = await db.referral.findFirst({
    where: { referrerId: userId },
  });

  if (!referral) {
    // Generate a unique code based on username
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const code = `NOV-${(user?.username ?? "user").slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    referral = await db.referral.create({
      data: {
        referrerId: userId,
        referredEmail: "", // will be set when someone uses the code
        code,
        status: "pending",
      },
    });
  }

  // Get all referrals made by this user
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

  // Get referral earnings from transactions
  const referralTxns = await db.transaction.aggregate({
    where: { userId, type: "referral" },
    _sum: { amount: true },
    _count: true,
  });

  return apiOk({
    code: referral.code,
    referrals,
    totalEarnings: Math.abs(referralTxns._sum.amount ?? 0),
    totalReferrals: referralTxns._count,
    commissionRate: 0.05, // 5%
  });
}
