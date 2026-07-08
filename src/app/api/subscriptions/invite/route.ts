import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, getBaseUrl } from "@/lib/api-utils";
import { createNotification, sendEmail } from "@/lib/notify";
import { generateOpaqueToken } from "@/lib/outbound-webhook";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email().max(256),
  message: z.string().max(2000).optional(),
});

/** Invite tokens expire after 7 days. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/subscriptions/invite
 *
 * Body: { email, message? }
 *
 * Creates a pending TeamInvite owned by the caller (subscription owner).
 * Sends an email to the invitee with an accept link that includes the
 * opaque `token`. The link points at the dashboard so the SPA can POST
 * to /api/subscriptions/accept-invite — but we also accept the token
 * directly here for headless consumers.
 *
 * Preconditions:
 *   - caller has an active subscription
 *   - subscription has at least one free seat (seatsUsed < seatsLimit)
 *   - no existing pending invite for the same email
 *
 * Auth: session-based.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Invalid input",
        422,
      );
    }
    const email = parsed.data.email.toLowerCase().trim();
    const message = parsed.data.message?.trim() || null;

    // Must have an active subscription.
    const subscription = await db.subscription.findFirst({
      where: { userId, status: { in: ["active", "trialing"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!subscription) {
      return apiError(
        "Subscribe to a plan first to invite teammates.",
        403,
      );
    }

    // Caller is the subscription owner (their userId is on the row).
    // Seat check: include pending invites in the "used" count so the
    // owner can't invite more people than their plan allows.
    const pendingInvites = await db.teamInvite.count({
      where: { inviterId: userId, status: "pending" },
    });
    const totalUsed = subscription.seatsUsed + pendingInvites;
    if (totalUsed >= subscription.seatsLimit) {
      return apiError(
        `Seat limit reached (${subscription.seatsLimit}). Revoke a pending invite or upgrade your plan.`,
        403,
      );
    }

    // Block re-inviting the same email while a pending invite exists.
    const existing = await db.teamInvite.findFirst({
      where: { email, inviterId: userId, status: "pending" },
    });
    if (existing) {
      return apiError(
        "An invite is already pending for this email. Revoke it first to resend.",
        409,
      );
    }

    // Don't allow inviting yourself.
    const me = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (me?.email?.toLowerCase() === email) {
      return apiError("You can't invite yourself.", 422);
    }

    const token = generateOpaqueToken(24);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

    const invite = await db.teamInvite.create({
      data: {
        email,
        inviterId: userId,
        token,
        status: "pending",
        message,
        expiresAt,
      },
    });

    // Build the accept link — points at the dashboard so the SPA handles
    // the flow, but it works for headless consumers too since the token
    // is also accepted directly by the accept-invite endpoint.
    const baseUrl = await getBaseUrl();
    const acceptUrl = `${baseUrl}/?invite=${token}`;

    // Best-effort: send the invite email. Sandbox mode logs it.
    const inviterName = me?.name ?? me?.email ?? "Your NOVSMM teammate";
    await sendEmail({
      to: email,
      subject: `${inviterName} invited you to join NOVSMM`,
      text: `${inviterName} has invited you to join their NOVSMM team.\n\n${
        message ? `Personal message: ${message}\n\n` : ""
      }Click the link below to accept the invitation. The invite expires in 7 days.\n\n${acceptUrl}\n\nIf you weren't expecting this invitation, you can safely ignore this email.\n\n— NOVSMM Team`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0A0A0B;margin:0 0 12px">You've been invited to NOVSMM</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6"><strong>${escapeHtml(inviterName)}</strong> has invited you to join their team on NOVSMM.</p>
        ${message ? `<blockquote style="border-left:3px solid #0052ff;margin:16px 0;padding:8px 16px;color:#475569;font-style:italic">"${escapeHtml(message)}"</blockquote>` : ""}
        <p style="color:#475569;font-size:15px;line-height:1.6">Click the button below to accept. The invite expires in 7 days.</p>
        <p style="margin:24px 0">
          <a href="${acceptUrl}" style="display:inline-block;background:#0052ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">If you weren't expecting this invitation, you can safely ignore this email.</p>
      </div>`,
    }).catch((e) => console.error("[invite] email send failed:", e));

    // Notify the inviter in-app too.
    await createNotification({
      userId,
      type: "system",
      title: `Team invite sent to ${email}`,
      message: `They'll receive an email with an accept link. The invite expires in 7 days.`,
      severity: "info",
      sendEmail: false,
    });

    return apiOk(
      {
        status: "success",
        invite: {
          id: invite.id,
          email: invite.email,
          status: invite.status,
          expiresAt: invite.expiresAt.toISOString(),
          createdAt: invite.createdAt.toISOString(),
        },
        message: `Invite sent to ${email}`,
      },
      201,
    );
  } catch (e: any) {
    console.error("[subscriptions/invite] error:", e);
    return apiError("Failed to send invite", 500);
  }
}

/**
 * DELETE /api/subscriptions/invite?id=<inviteId>
 * Revoke a pending invite. Only the inviter can revoke.
 */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return apiError("id is required", 422);

  const invite = await db.teamInvite.findUnique({
    where: { id },
    select: { id: true, inviterId: true, status: true },
  });
  if (!invite) return apiError("Invite not found", 404);
  if (invite.inviterId !== userId) {
    return apiError("Invite not found", 404);
  }
  if (invite.status !== "pending") {
    return apiError(`Invite is already ${invite.status}`, 422);
  }

  await db.teamInvite.update({
    where: { id },
    data: { status: "revoked" },
  });

  return apiOk({ message: "Invite revoked" });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
