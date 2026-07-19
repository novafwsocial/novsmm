import crypto from "crypto";
import { db } from "./db";
import { sendEmail } from "./notify";
import { getBaseUrl } from "./api-utils";

/**
 * Shared team-invite helpers used by both:
 *   - POST /api/subscriptions/seats     (legacy + dashboard hook entry point)
 *   - POST /api/subscriptions/invite    (canonical invite endpoint)
 *
 * The flow:
 *   1. Validate the inviter has a paid subscription.
 *   2. Enforce the seat limit (used + pending invites).
 *   3. Create a TeamInvite row with a unique token (7-day expiry).
 *   4. Send the invitation email.
 *
 * `seatsUsed` is NOT incremented here — that happens when the invitee
 * accepts via /api/subscriptions/accept-invite.
 */

/** Invitations expire 7 days after they're sent. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateInviteResult =
  | { ok: true; invite: any; acceptUrl: string }
  | { ok: false; status: number; error: string; extra?: Record<string, any> };

/**
 * Create a team invitation for `email` on behalf of `inviterId`.
 * Returns a discriminated union so callers can map errors directly to
 * `NextResponse.json(...)` without re-parsing strings.
 */
export async function createTeamInvite(
  inviterId: string,
  email: string
): Promise<CreateInviteResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, status: 422, error: "A valid email is required" };
  }

  const inviter = await db.user.findUnique({
    where: { id: inviterId },
    select: { id: true, email: true, name: true },
  });
  if (!inviter) {
    return { ok: false, status: 404, error: "User not found" };
  }
  if (normalizedEmail === inviter.email.toLowerCase()) {
    return { ok: false, status: 422, error: "You can't invite yourself" };
  }

  const subscription = await db.subscription.findFirst({
    where: { userId: inviterId, status: { in: ["active", "trialing"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) {
    return {
      ok: false,
      status: 403,
      error: "Upgrade to a paid plan to invite teammates",
    };
  }

  const pendingCount = await db.teamInvite.count({
    where: { inviterId, status: "pending" },
  });
  if (subscription.seatsUsed + pendingCount >= subscription.seatsLimit) {
    return {
      ok: false,
      status: 403,
      error: "Seat limit reached for your plan",
      extra: {
        seatsUsed: subscription.seatsUsed,
        pendingInvites: pendingCount,
        seatsLimit: subscription.seatsLimit,
        upgradeUrl: "/?upgrade=true",
      },
    };
  }

  const existing = await db.teamInvite.findFirst({
    where: { inviterId, email: normalizedEmail, status: "pending" },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: `An invitation is already pending for ${normalizedEmail}`,
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const invite = await db.teamInvite.create({
    data: {
      email: normalizedEmail,
      inviterId,
      token,
      status: "pending",
      expiresAt,
    },
    select: {
      id: true,
      email: true,
      token: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  const baseUrl = await getBaseUrl();
  const acceptUrl = `${baseUrl}/?invite=${token}`;
  const inviterName = inviter.name ?? inviter.email;

  // Fire the invitation email — non-blocking.
  sendEmail({
    to: normalizedEmail,
    subject: `${inviterName} invited you to join NOVSMM`,
    text: `Hi,\n\n${inviterName} has invited you to join their team on NOVSMM.\n\nClick the link below to accept the invitation:\n${acceptUrl}\n\nThis invitation expires on ${expiresAt.toLocaleString()}.\n\n— NOVSMM Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0A0A0B;">You've been invited to NOVSMM</h2>
        <p style="color: #475569; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join their team on NOVSMM — the all-in-one SMM panel.
        </p>
        <p style="margin: 32px 0;">
          <a href="${acceptUrl}" style="display: inline-block; background: #0052FF; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600;">Accept invitation</a>
        </p>
        <p style="color: #94a3b8; font-size: 12px;">
          This invitation expires on ${expiresAt.toLocaleString()}.<br/>
          Or paste this link into your browser: ${acceptUrl}
        </p>
      </div>
    `,
  }).catch((e) => {
    console.error("[team-invite] email send failed:", e);
  });

  return { ok: true, invite, acceptUrl };
}
