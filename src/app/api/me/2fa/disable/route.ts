import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { verify2FAToken, decrypt2FASecret, read2FAPayload, write2FAPayload } from "@/lib/two-factor";
import { raiseSecurityAlert } from "@/lib/security-alert";

/**
 * POST /api/me/2fa/disable
 * Disables 2FA after verifying the current token (or a backup code).
 *
 * SECURITY (OWASP A04-3, P1): accepts a backup code as an alternative to
 * the TOTP, so a user with a lost TOTP device can still disable 2FA without
 * support intervention.
 *
 * SECURITY FIX (S-C-002): uses `read2FAPayload`/`write2FAPayload` for
 * consistent encrypted format, matching the login flow. Previously this
 * route read plain JSON but wrote encrypted JSON on backup-code rotation —
 * an inconsistency that contributed to the 2FA lockout bug.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const body = await req.json();
  const { token, backupCode } = body ?? {};

  if (!token && !backupCode) {
    return apiError("Verification token or backup code is required to disable 2FA", 422);
  }

  // Get the active 2FA setup
  const active = await db.setting.findUnique({
    where: { key: `2fa:${userId}` },
  });

  if (!active) {
    return apiError("2FA is not enabled", 400);
  }

  // SECURITY (OWASP A08-2, P3): use read2FAPayload which handles both the
  // new encrypted format and legacy plain-JSON format transparently.
  const payload = read2FAPayload(active.value);
  if (!payload || !payload.secret) {
    return apiError("2FA setup is corrupted. Contact support.", 500);
  }

  const secret = decrypt2FASecret(payload.secret);
  if (!secret) {
    return apiError("2FA secret could not be decrypted. Contact support.", 500);
  }

  // Try TOTP first, fall back to backup code (single-use rotation).
  let verified = false;
  if (token) {
    if (await verify2FAToken(String(token), secret)) {
      verified = true;
    }
  }
  if (!verified && backupCode) {
    const bcrypt = await import("bcryptjs");
    const normalized = String(backupCode).trim().toUpperCase();
    const codes: string[] = payload.backupCodes;
    let matchedIndex = -1;
    for (let i = 0; i < codes.length; i++) {
      try {
        if (await bcrypt.compare(normalized, codes[i])) {
          matchedIndex = i;
          break;
        }
      } catch {
        // malformed hash — skip
      }
    }
    if (matchedIndex !== -1) {
      verified = true;
      // Rotate the used backup code out (single-use).
      const remaining = codes.filter((_, i) => i !== matchedIndex);
      try {
        const rotatedValue = write2FAPayload({
          secret: payload.secret,
          backupCodes: remaining,
        });
        await db.setting.update({
          where: { key: `2fa:${userId}` },
          data: { value: rotatedValue },
        });
      } catch {
        // best-effort — disable below still proceeds
      }
    }
  }

  if (!verified) {
    return apiError("Invalid verification code or backup code.", 400);
  }

  // Delete the 2FA setup
  await db.setting.delete({
    where: { key: `2fa:${userId}` },
  });

  // Also delete any pending setup
  await db.setting.deleteMany({
    where: { key: `2fa:pending:${userId}` },
  });

  // SECURITY (OWASP A07-1, P1): bump passwordChangedAt so any pre-existing
  // session is forced to re-authenticate without 2FA. This closes the
  // "attacker disables 2FA, then continues using the existing session"
  // hole (although the disable itself requires TOTP/backup, the bump is
  // still defense-in-depth against session-fixation after takeover).
  await db.user.update({
    where: { id: userId },
    data: { passwordChangedAt: new Date() },
  });

  // Audit log
  await audit(userId, "disable_2fa", "user", userId, {
    method: backupCode ? "backup_code" : "totp",
  });

  // SECURITY (OWASP A09-2, P3): raise an alert if an admin disabled 2FA —
  // this is a common precursor to account takeover.
  if ((session!.user as any).role === "admin") {
    void raiseSecurityAlert({
      type: "admin_2fa_disable",
      severity: "critical",
      message: `Admin ${userId} disabled 2FA on their account.`,
      userId,
      metadata: { method: backupCode ? "backup_code" : "totp" },
    }).catch(() => {});
  }

  return apiOk({ message: "2FA disabled successfully. All sessions have been signed out — please log in again." });
}
