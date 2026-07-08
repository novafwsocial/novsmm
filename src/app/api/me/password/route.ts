import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(1024),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(1024),
});

/**
 * POST /api/me/password — change the current user's password.
 * Body: { currentPassword, newPassword }
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
    // H-1 fix: try/catch + Zod validation (was manual, no max-length)
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { currentPassword, newPassword } = parsed.data;

    // Verify current password
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return apiError("Password change not available for this account", 400);
    }

    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return apiError("Current password is incorrect", 403);
    }

    // Hash and update
    const newHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Audit log
    await audit(userId, "password_change", "user", userId);

    return apiOk({ message: "Password changed successfully" });
  } catch (e: any) {
    console.error("[me/password] error:", e);
    return apiError("Failed to change password", 500);
  }
}
