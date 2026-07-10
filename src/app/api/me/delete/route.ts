import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

/**
 * POST /api/me/delete
 * GDPR self-service account deletion.
 *
 * The user must re-enter their password to confirm. The account is ANONYMIZED
 * (not hard-deleted) to preserve financial audit trail (orders, transactions).
 * Personal data (email, name, username, password) is irreversibly changed.
 *
 * Flow:
 * 1. Verify password matches
 * 2. Check no held balance (must withdraw first)
 * 3. Anonymize user: email, name, username, passwordHash, status, image
 * 4. Revoke all API keys
 * 5. Audit log
 * 6. Return success (frontend calls signOut)
 *
 * Auth: Session (requireAuth)
 */
export async function POST(req: NextRequest) {
  const { user, session, error } = await requireAuth();
  if (error) return error;
  const userId = user.id;

  try {
    // M-5 fix: Use Zod validation
    const body = await req.json();
    const schema = z.object({ confirmPassword: z.string().min(1).max(1024) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }
    const { confirmPassword } = parsed.data;

    // Fetch the user's password hash + balance
    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, heldBalance: true, balance: true, email: true, name: true, username: true },
    });

    if (!userRecord) {
      return apiError("User not found", 404);
    }

    // M-4 fix: Block deletion if user has positive balance (prevent fund loss)
    if (userRecord.balance > 0) {
      return apiError(
        `Cannot delete account — you have $${userRecord.balance.toFixed(2)} in your wallet. Please withdraw your funds first.`,
        422
      );
    }

    // Verify password
    if (!userRecord.passwordHash) {
      return apiError("Cannot delete account — no password set (OAuth-only account). Contact support.", 422);
    }

    const passwordMatch = await bcrypt.compare(confirmPassword, userRecord.passwordHash);
    if (!passwordMatch) {
      return apiError("Password incorrect", 403);
    }

    // Check held balance — must be 0 to delete (avoid loss of held funds)
    if (userRecord.heldBalance > 0) {
      return apiError(
        `Cannot delete account — you have $${userRecord.heldBalance.toFixed(2)} in held balance. Please wait for held funds to be released or contact support.`,
        422,
      );
    }

    // Anonymize the user (GDPR-compliant: personal data destroyed, financial records kept)
    const timestamp = Date.now();
    const anonymizedEmail = `deleted_${userId.slice(-8)}@deleted.local`;
    const anonymizedName = "Deleted User";
    const anonymizedUsername = `deleted_${timestamp}`;
    const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

    // SECURITY (OWASP A04-5 + A07-1, P2): bump `passwordChangedAt` to "now"
    // when anonymizing. The NextAuth `jwt` callback in auth.ts kills any
    // session token whose `iat` predates this timestamp — so the deleted
    // user's existing JWT cookie (still in their browser) immediately
    // stops working, instead of remaining valid until its 30-day TTL.
    await db.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        name: anonymizedName,
        username: anonymizedUsername,
        passwordHash: randomPasswordHash,
        image: null,
        status: "deleted",
        balance: 0,
        lifetimeEarnings: 0,
        country: "",
        currency: "",
        language: "",
        passwordChangedAt: new Date(),
      },
    });

    // Revoke all API keys for this user
    await db.apiKey.updateMany({
      where: { userId, status: "active" },
      data: { status: "revoked", revokedAt: new Date() },
    });

    // Delete all sessions (NextAuth Session table — though JWT strategy means
    // sessions are in cookies, not DB; this clears any DB sessions if they exist)
    await db.session.deleteMany({ where: { userId } });

    // Audit log (before the user data is gone, we still have the ID)
    await audit(userId, "delete_account", "user", userId, {
      reason: "gdpr_self_service",
      originalEmail: userRecord.email,
      originalUsername: userRecord.username,
      anonymizedEmail,
      sessionRevoked: true,
    });

    return apiOk({
      success: true,
      message: "Account deleted. Your personal data has been anonymized. Financial records retained for audit. All sessions have been revoked.",
    });
  } catch (e: any) {
    console.error("[me/delete] error:", e);
    return apiError("Failed to delete account", 500);
  }
}
