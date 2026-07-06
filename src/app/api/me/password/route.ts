import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { sanitizeMessage } from "@/lib/sanitize";

/**
 * POST /api/me/password — change the current user's password.
 * Body: { currentPassword, newPassword }
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return apiError("Current password and new password are required", 422);
  }

  if (newPassword.length < 8) {
    return apiError("New password must be at least 8 characters", 422);
  }

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
}
