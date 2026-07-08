import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { verify2FAToken, decrypt2FASecret } from "@/lib/two-factor";
import { encrypt, decryptJSON } from "@/lib/crypto-utils";

/**
 * POST /api/auth/verify-2fa
 * Verifies a TOTP token (or backup code) AFTER credentials login.
 *
 * Flow:
 *   1. Client calls signIn("credentials", {redirect:false}) — NextAuth issues
 *      a session cookie. Session is technically valid at this point.
 *   2. Client fetches /api/me. If `twoFactorEnabled` is true, the login
 *      screen renders the 6-digit (or backup-code) input instead of reloading.
 *   3. Client POSTs { token } or { backupCode } here.
 *   4. We look up the user's 2FA secret in the Setting table
 *      (key: `2fa:${userId}`) and verify.
 *   5. On success: stamp a `2fa:verified:${userId}` Setting with a 24h
 *      timestamp so middleware / API routes can distinguish "fully
 *      authenticated" from "credentials-only". Client then reloads.
 *   6. On failure: return 400. Client may retry or sign out.
 *
 * Backup codes: stored bcrypt-hashed in the Setting payload. Each successful
 * backup-code use is rotated out (removed) so it's single-use.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 422);
  }

  const { token, backupCode } = body ?? {};
  if (!token && !backupCode) {
    return apiError("Provide a 6-digit token or a backup code", 422);
  }

  // Load the user's active 2FA setting (encrypted at rest).
  const active = await db.setting.findUnique({
    where: { key: `2fa:${userId}` },
  });
  if (!active) {
    return apiError("2FA is not enabled for this account", 400);
  }

  // Decrypt in-memory only.
  const payload = decryptJSON(active.value);
  if (!payload) {
    return apiError("2FA setup is corrupted — please disable and re-enable 2FA", 500);
  }

  // ── Backup-code verification (single-use) ──
  if (backupCode) {
    const normalized = String(backupCode).trim().toUpperCase();
    let matchedIndex = -1;
    for (let i = 0; i < payload.backupCodes.length; i++) {
      try {
        if (await bcrypt.compare(normalized, payload.backupCodes[i])) {
          matchedIndex = i;
          break;
        }
      } catch {
        // malformed hash — skip
      }
    }
    if (matchedIndex === -1) {
      return apiError("Invalid backup code", 400);
    }
    // Rotate: remove the used code so it can never be used again.
    const remaining = payload.backupCodes.filter((_, i) => i !== matchedIndex);
    const newPayload = {
      secret: payload.secret,
      backupCodes: remaining,
    };
    // Re-encrypt the rotated payload before storing.
    await db.setting.update({
      where: { key: `2fa:${userId}` },
      data: { value: encrypt(JSON.stringify(newPayload)) },
    });
  } else {
    // ── TOTP token verification ──
    const ok = verify2FAToken(String(token).replace(/\s+/g, ""), payload.secret);
    if (!ok) {
      return apiError("Invalid verification code. Please try again.", 400);
    }
  }

  // ── Stamp 2FA-verified marker (24h validity) ──
  const verifiedAt = Date.now();
  await db.setting.upsert({
    where: { key: `2fa:verified:${userId}` },
    update: { value: String(verifiedAt) },
    create: { key: `2fa:verified:${userId}`, value: String(verifiedAt) },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      userId,
      action: "login",
      entity: "user",
      entityId: userId,
      metadata: JSON.stringify({ method: backupCode ? "2fa_backup" : "2fa_totp" }),
    },
  });

  return apiOk({
    message: "2FA verification successful",
    verifiedAt,
  });
}
