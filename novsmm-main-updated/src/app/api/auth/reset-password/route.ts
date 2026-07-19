import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { apiError, apiOk, audit } from "@/lib/api-utils";
import { z } from "zod";
import crypto from "crypto";

/**
 * Hash a verification token with SHA-256 for lookup.
 * SECURITY (OWASP A02-3, P2): never look up by plaintext token.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

// SECURITY (OWASP A07-2, P2): same strong password policy as /api/me/password.
const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(1024, "Password is too long")
  .refine((pw) => /[A-Z]/.test(pw), "Password must contain an uppercase letter")
  .refine((pw) => /[a-z]/.test(pw), "Password must contain a lowercase letter")
  .refine((pw) => /[0-9]/.test(pw), "Password must contain a digit")
  .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Password must contain a special character");

const resetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: strongPasswordSchema,
});

/**
 * POST /api/auth/reset-password
 * Validates the token (by SHA-256 hash lookup), resets the password.
 *
 * SECURITY (OWASP A07-1, P1): on success, `passwordChangedAt` is bumped
 * to "now", which invalidates ALL existing JWT sessions for this user
 * (the `jwt` callback in auth.ts kills any token whose `iat` predates
 * this timestamp). This closes the "stolen-session-cookie persists after
 * password reset" hole.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { token, password } = parsed.data;

    // SECURITY (OWASP A02-3, P2): look up by HASH of token, not plaintext.
    const tokenHash = hashToken(token);
    const verificationToken = await db.verificationToken.findUnique({
      where: { token: tokenHash },
    });

    if (!verificationToken) {
      return apiError("Invalid or expired token", 400);
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token: tokenHash } });
      return apiError("Token has expired. Please request a new reset link.", 400);
    }

    // Find the user by email (identifier)
    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update the user's password — bump passwordChangedAt to invalidate
    // all existing JWT sessions (any stolen session cookie stops working).
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Delete the used token (by hash, not plaintext)
    await db.verificationToken.delete({ where: { token: tokenHash } });

    // Audit log
    await audit(user.id, "password_reset", "user", user.id, {
      strength: "strong",
      source: "reset_token",
    });

    return apiOk({
      message: "Password reset successfully. You can now sign in. Any existing sessions have been signed out.",
    });
  } catch (e: any) {
    console.error("[reset-password] error:", e);
    return apiError("Failed to reset password", 500);
  }
}
