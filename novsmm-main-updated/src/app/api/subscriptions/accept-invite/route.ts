import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { z } from "zod";

const acceptSchema = z.object({
  token: z.string().min(10).max(128),
});

/**
 * POST /api/subscriptions/accept-invite
 *
 * Body: { token }
 *
 * Accepts a team invite. The caller becomes a teammate on the inviter's
 * subscription: the inviter's `seatsUsed` is incremented atomically.
 * The invite's status flips to "accepted" and the `inviteeId` is set
 * to the caller's user id so we can list team members.
 *
 * Preconditions:
 *   - invite exists + is pending
 *   - invite has not expired
 *   - inviter still has an active subscription with a free seat
 *   - caller's email matches the invite email (so invites can't be
 *     hijacked by other registered users)
 *
 * Auth: session-based (caller must be signed in).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Invalid input",
        422,
      );
    }
    const { token } = parsed.data;

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: {
        inviter: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!invite) return apiError("Invite not found", 404);
    if (invite.status !== "pending") {
      return apiError(`This invite has already been ${invite.status}`, 422);
    }
    if (invite.expiresAt < new Date()) {
      // Mark expired so it stops showing as pending.
      await db.teamInvite.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });
      return apiError("This invite has expired", 422);
    }

    // Caller must be signed in with an account whose email matches the
    // invitee email. This prevents a malicious registered user from
    // accepting someone else's invite by stealing the token.
    const caller = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!caller) return apiError("Account not found", 404);
    if (caller.email.toLowerCase() !== invite.email.toLowerCase()) {
      return apiError(
        `This invite was sent to ${invite.email}. Sign in with that email to accept it.`,
        403,
      );
    }

    // Inviter must still have an active subscription with a free seat.
    const subscription = await db.subscription.findFirst({
      where: { userId: invite.inviterId, status: { in: ["active", "trialing"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!subscription) {
      return apiError(
        "The inviter's subscription is no longer active. Ask them to resubscribe.",
        422,
      );
    }
    if (subscription.seatsUsed >= subscription.seatsLimit) {
      return apiError(
        "The team is currently full. Ask the inviter to upgrade their plan.",
        422,
      );
    }

    // Atomic: bump seatsUsed + mark invite accepted + link invitee.
    await db.$transaction([
      db.subscription.update({
        where: { id: subscription.id },
        data: { seatsUsed: { increment: 1 } },
      }),
      db.teamInvite.update({
        where: { id: invite.id },
        data: {
          status: "accepted",
          inviteeId: userId,
          acceptedAt: new Date(),
        },
      }),
    ]);

    // Notify both parties.
    await createNotification({
      userId,
      type: "system",
      title: `You joined ${invite.inviter.name ?? invite.inviter.email}'s team`,
      message: `You're now a teammate on their ${subscription.plan} plan. Their order/billing dashboard is shared with you.`,
      severity: "success",
      sendEmail: true,
    });
    await createNotification({
      userId: invite.inviterId,
      type: "system",
      title: `${caller.name ?? caller.email} accepted your invite`,
      message: `${subscription.seatsUsed + 1}/${subscription.seatsLimit} seats now in use.`,
      severity: "success",
      sendEmail: true,
    });

    return apiOk({
      status: "success",
      plan: subscription.plan,
      inviter: {
        name: invite.inviter.name,
        email: invite.inviter.email,
      },
      seatsUsed: subscription.seatsUsed + 1,
      seatsLimit: subscription.seatsLimit,
      message: "Invite accepted — you're now a team member.",
    });
  } catch (e: any) {
    console.error("[subscriptions/accept-invite] error:", e);
    return apiError("Failed to accept invite", 500);
  }
}
