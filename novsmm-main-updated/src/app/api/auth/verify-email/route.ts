import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api-utils";
import crypto from "crypto";

/**
 * Hash a verification token with SHA-256 for lookup.
 * SECURITY (OWASP A02-3, P2): never look up by plaintext token.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * POST /api/auth/verify-email
 * Verifies an email using a token from VerificationToken.
 * Sets emailVerified on the user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return apiError("Token is required", 422);
    }

    // SECURITY (OWASP A02-3, P2): look up by HASH of token, not plaintext.
    const tokenHash = hashToken(token);
    const verificationToken = await db.verificationToken.findUnique({
      where: { token: tokenHash },
    });

    if (!verificationToken) {
      return apiError("Invalid verification token", 400);
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token: tokenHash } });
      return apiError("Token has expired. Please request a new verification link.", 400);
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    // Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Delete the used token (by hash, not plaintext)
    await db.verificationToken.delete({ where: { token: tokenHash } });

    return apiOk({ message: "Email verified successfully!" });
  } catch (e: any) {
    console.error("[verify-email] error:", e);
    return apiError("Failed to verify email", 500);
  }
}
