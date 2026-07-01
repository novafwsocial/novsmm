import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api-utils";
import { z } from "zod";

const resetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/auth/reset-password
 * Validates the token, resets the password.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { token, password } = parsed.data;

    // Find the token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return apiError("Invalid or expired token", 400);
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({ where: { token } });
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

    // Update the user's password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete the used token
    await db.verificationToken.delete({ where: { token } });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "password_reset",
        entity: "user",
        entityId: user.id,
      },
    });

    return apiOk({ message: "Password reset successfully. You can now sign in." });
  } catch (e: any) {
    console.error("[reset-password] error:", e);
    return apiError("Failed to reset password", 500);
  }
}
