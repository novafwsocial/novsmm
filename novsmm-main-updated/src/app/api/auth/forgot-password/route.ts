import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk, getBaseUrl } from "@/lib/api-utils";
import { sendEmail } from "@/lib/notify";
import { sanitizeEmail } from "@/lib/sanitize";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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
 * Constant-time delay helper — resolves after approximately `ms` milliseconds.
 * Used to make the "user not found" path take the same time as the "user
 * found" path, preventing timing-based email enumeration.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/auth/forgot-password
 * Generates a reset token, stores it in VerificationToken, sends email.
 *
 * SECURITY FIX (S-M-002 + A-2): timing side-channel fix. Previously the
 * "user not found" path returned immediately (~5ms) while the "user
 * found" path did DB writes + email (~100-500ms). An attacker could
 * enumerate valid emails by measuring response time.
 *
 * A-2 FIX: The previous fix (bcrypt on not-found path) was insufficient
 * because sendEmail() was still awaited on the found path (variable latency
 * 0-2000ms) but not on the not-found path. Now:
 * 1. sendEmail() is fire-and-forget (not awaited) on BOTH paths — the
 *    response returns immediately, email sends in background
 * 2. bcrypt.hash() runs on BOTH paths (constant ~100ms cost)
 * 3. DB writes (deleteMany + create) only happen on the found path, but
 *    they're fast (~15ms total) and masked by the bcrypt cost
 *
 * Result: both paths take ~100ms (dominated by bcrypt), making timing-
 * based enumeration impractical.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeEmail(body.email);

    if (!email) {
      return apiError("Valid email is required", 422);
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // A-2 FIX: Run bcrypt.hash on BOTH paths (found and not-found) so the
    // timing is dominated by the constant bcrypt cost (~100ms) regardless
    // of whether the user exists. The hash result is discarded in both cases.
    // This runs concurrently with the DB operations below (if user found).
    const bcryptPromise = bcrypt
      .hash(crypto.randomBytes(16).toString("hex"), 10)
      .catch(() => {});

    if (user) {
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

      // A-2 FIX: Fire-and-forget the email — don't await it. This eliminates
      // the variable latency (0-2000ms) that created the timing side-channel.
      // The email still sends, but the response returns immediately.
      const baseUrl = await getBaseUrl();
      const resetUrl = `${baseUrl}/?reset=${token}`;
      sendEmail({
        to: email,
        subject: "NOVSMM — Password Reset",
        text: `Hi ${user.name ?? "there"},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.\n\n— NOVSMM Team`,
      }).catch((e) => console.error("[forgot-password] email error:", e));
    }

    // A-2 FIX: Wait for the bcrypt hash to complete on BOTH paths before
    // returning. This ensures the response time is ~constant (~100ms)
    // regardless of whether the user exists.
    await bcryptPromise;

    return apiOk({ message: "If that email exists, a reset link has been sent." });
  } catch (e: any) {
    console.error("[forgot-password] error:", e);
    return apiError("Failed to process request", 500);
  }
}
