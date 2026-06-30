import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api-utils";
import { sendEmail } from "@/lib/notify";
import { sanitizeEmail } from "@/lib/sanitize";
import crypto from "crypto";

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

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send the reset email
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/?reset=${token}`;
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
