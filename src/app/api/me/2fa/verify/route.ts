import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { verify2FAToken, decrypt2FASecret, read2FAPayload, write2FAPayload } from "@/lib/two-factor";

/**
 * POST /api/me/2fa/verify
 * Confirms 2FA setup by verifying a token from the user's authenticator app.
 * Moves the secret from "pending" to "active".
 *
 * SECURITY FIX (S-C-002): uses `read2FAPayload` (which calls `decryptJSON`)
 * instead of raw `JSON.parse` so the format matches what the login flow
 * expects. The pending value — already encrypted by setup via
 * `write2FAPayload` — is copied as-is to the active key, so login can
 * decrypt it. Also handles legacy plain-JSON entries transparently.
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

  // SECURITY (OWASP A08-2, P3): use read2FAPayload which handles both the
  // new encrypted format (write2FAPayload) and the legacy plain-JSON format
  // transparently. Returns null on corruption — caller fails closed.
  const payload = read2FAPayload(pending.value);
  if (!payload || !payload.secret) {
    return apiError("2FA setup is corrupted. Please restart setup.", 500);
  }

  // SECURITY (S-L-003): reject pending setups older than 10 minutes.
  // Prevents an attacker who compromised a session from completing a
  // stale 2FA setup. The createdAt field was added in the setup route;
  // legacy entries without it are allowed (backward compat).
  const PENDING_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const createdAt = (payload as any).createdAt as number | undefined;
  if (createdAt && Date.now() - createdAt > PENDING_TTL_MS) {
    // Delete the expired pending entry
    await db.setting.delete({ where: { key: `2fa:pending:${userId}` } }).catch(() => {});
    return apiError("2FA setup expired. Please restart setup.", 400);
  }

  const secret = decrypt2FASecret(payload.secret);
  if (!secret) {
    return apiError("2FA secret could not be decrypted. Please restart setup.", 500);
  }

  // Verify the token
  if (!(await verify2FAToken(token, secret))) {
    return apiError("Invalid verification code. Please try again.", 400);
  }

  // Move from pending to active.
  // The pending value is already in the encrypted format (written by setup
  // via write2FAPayload), so we copy it as-is. If it was a legacy plain-JSON
  // entry, we upgrade it to encrypted format now.
  const activeValue = write2FAPayload(payload);

  await db.setting.upsert({
    where: { key: `2fa:${userId}` },
    update: { value: activeValue },
    create: { key: `2fa:${userId}`, value: activeValue },
  });

  // Delete the pending entry
  await db.setting.delete({
    where: { key: `2fa:pending:${userId}` },
  });

  // SECURITY (OWASP A07-1, P1): bump passwordChangedAt so any pre-existing
  // session is forced to re-authenticate through the new 2FA flow. This
  // closes the "attacker steals session cookie, then victim enables 2FA,
  // attacker keeps using the cookie" hole.
  await db.user.update({
    where: { id: userId },
    data: { passwordChangedAt: new Date() },
  });

  // Audit log
  await audit(userId, "enable_2fa", "user", userId);

  return apiOk({ message: "2FA enabled successfully! Keep your backup codes safe." });
}
