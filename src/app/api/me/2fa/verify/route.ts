import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { verify2FAToken, decrypt2FASecret } from "@/lib/two-factor";

/**
 * POST /api/me/2fa/verify
 * Confirms 2FA setup by verifying a token from the user's authenticator app.
 * Moves the secret from "pending" to "active".
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { token } = body;

  if (!token) {
    return apiError("Verification token is required", 422);
  }

  // Get the pending 2FA setup
  const pending = await db.setting.findUnique({
    where: { key: `2fa:pending:${userId}` },
  });

  if (!pending) {
    return apiError("No pending 2FA setup. Call /api/me/2fa/setup first.", 400);
  }

  const { secret: encryptedSecret, backupCodes } = JSON.parse(pending.value);
  const secret = decrypt2FASecret(encryptedSecret);
  if (!secret) {
    return apiError("2FA secret could not be decrypted. Please restart setup.", 500);
  }

  // Verify the token
  if (!(await verify2FAToken(token, secret))) {
    return apiError("Invalid verification code. Please try again.", 400);
  }

  // Move from pending to active
  await db.setting.upsert({
    where: { key: `2fa:${userId}` },
    update: { value: pending.value },
    create: { key: `2fa:${userId}`, value: pending.value },
  });

  // Delete the pending entry
  await db.setting.delete({
    where: { key: `2fa:pending:${userId}` },
  });

  // Audit log
  await audit(userId, "enable_2fa", "user", userId);

  return apiOk({ message: "2FA enabled successfully! Keep your backup codes safe." });
}
