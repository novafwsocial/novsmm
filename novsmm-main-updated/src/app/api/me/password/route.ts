import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { raiseSecurityAlert } from "@/lib/security-alert";
import { z } from "zod";

// SECURITY (OWASP A07-2, P2): password policy requires 3 of 4 character
// classes (uppercase, lowercase, digit, special) AND ≥8 chars. This is
// applied at registration, password-change, and password-reset.
const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(1024, "Password is too long")
  .refine((pw) => /[A-Z]/.test(pw), "Password must contain an uppercase letter")
  .refine((pw) => /[a-z]/.test(pw), "Password must contain a lowercase letter")
  .refine((pw) => /[0-9]/.test(pw), "Password must contain a digit")
  .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Password must contain a special character")
  .refine((pw) => !/(.)\1{2,}/.test(pw), "Password must not contain 3+ repeated characters");

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(1024),
  newPassword: strongPasswordSchema,
});

/**
 * POST /api/me/password — change the current user's password.
 * Body: { currentPassword, newPassword }
 *
 * SECURITY (OWASP A07-1, P1): on success, `passwordChangedAt` is bumped
 * to "now", which invalidates ALL existing JWT sessions for this user
 * (the `jwt` callback in auth.ts kills any token whose `iat` predates
 * this timestamp). This closes the "stolen-session-cookie persists after
 * password rotation" hole.
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

    // Don't allow no-op password changes
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return apiError("New password must be different from the current password", 422);
    }

    // Hash and update — bump passwordChangedAt to invalidate old sessions.
    const newHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
      },
    });

    // SECURITY (OWASP A09-1, P2): audit with rich metadata so forensics
    // can tell defensive password changes from takeover-driven ones.
    await audit(userId, "password_change", "user", userId, {
      reauth: "password",
      strength: "strong", // policy enforces 3-of-4 char classes
    });

    // SECURITY (OWASP A09-2, P3): raise an alert if an admin changed their
    // password (high-severity — admins are high-value targets).
    if ((session!.user as any).role === "admin") {
      void raiseSecurityAlert({
        type: "admin_password_change",
        severity: "high",
        message: `Admin ${userId} changed their password.`,
        userId,
        metadata: { role: "admin" },
      }).catch(() => {});
    }

    return apiOk({
      message: "Password changed successfully. All other sessions have been signed out.",
    });
  } catch (e: any) {
    console.error("[me/password] error:", e);
    return apiError("Failed to change password", 500);
  }
}
