import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk, getBaseUrl } from "@/lib/api-utils";
import { sendEmail } from "@/lib/notify";
import { sanitizeEmail } from "@/lib/sanitize";
import crypto from "crypto";

/**
 * Hash a verification token with SHA-256 before storing or looking up.
 *
 * SECURITY (OWASP A02-3, P2): we never store the plaintext reset token
 * in the DB. The user-supplied token (from the email link) is hashed on
 * lookup, so anyone with read access to the DB (DBA, backup snapshot,
 * replica, SQL injection) can't recover valid tokens.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * POST /api/auth/forgot-password
 * Generates a reset token, stores it in VerificationToken, sends email.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeEmail(body.email);

    if (!email) {
      return apiError("Valid email is required", 422);
    }

    // Find user (don't reveal if email exists — security best practice)
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Return success even if user doesn't exist (prevents email enumeration)
      return apiOk({ message: "If that email exists, a reset link has been sent." });
    }

    // Delete any existing tokens for this email
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Generate a secure token (plaintext — only sent via email, never stored)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the SHA-256 HASH of the token, not the plaintext.
    await db.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(token),
        expires,
      },
    });

    // Send the reset email
    const baseUrl = await getBaseUrl();
    const resetUrl = `${baseUrl}/?reset=${token}`;
    await sendEmail({
      to: email,
      subject: "NOVSMM — Password Reset",
      text: `Hi ${user.name ?? "there"},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.\n\n— NOVSMM Team`,
    }).catch((e) => console.error("[forgot-password] email error:", e));

    return apiOk({ message: "If that email exists, a reset link has been sent." });
  } catch (e: any) {
    console.error("[forgot-password] error:", e);
    return apiError("Failed to process request", 500);
  }
}
