import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { generate2FASecret, generateOTPUri, generateQRCode, generateBackupCodes, encrypt2FASecret, write2FAPayload } from "@/lib/two-factor";
import bcrypt from "bcryptjs";

/**
 * POST /api/me/2fa/setup
 * Generates a new TOTP secret + QR code.
 * The secret is stored TEMPORARILY in the Setting table (encrypted with AES-256-GCM)
 * until the user verifies with a token (then it's confirmed).
 * Backup codes are hashed with bcrypt.
 *
 * SECURITY FIX (S-C-002): the whole payload is now encrypted with
 * `write2FAPayload` (encryptJSON) so the login flow — which uses
 * `decryptJSON` — can read it. Previously this stored plain JSON, which
 * caused every 2FA user to be locked out at the next login.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;
  const email = (session!.user as any).email;

  // Check if 2FA is already enabled
  const existing = await db.setting.findUnique({
    where: { key: `2fa:${userId}` },
  });
  if (existing) {
    return apiError("2FA is already enabled. Disable it first.", 400);
  }

  // Generate secret
  const secret = generate2FASecret();
  const backupCodes = generateBackupCodes();

  // Store in a temporary setting (pending verification).
  // The TOTP secret is encrypted at rest with AES-256-GCM (crypto-utils).
  // Backup codes are hashed with bcrypt (one-way).
  // The WHOLE payload is then encrypted with write2FAPayload (encryptJSON)
  // so the login flow can decrypt it consistently.
  const encryptedSecret = encrypt2FASecret(secret);
  const hashedBackupCodes = await Promise.all(
    backupCodes.map((c) => bcrypt.hash(c, 10))
  );

  const payloadValue = write2FAPayload({
    secret: encryptedSecret,
    backupCodes: hashedBackupCodes,
  });

  await db.setting.upsert({
    where: { key: `2fa:pending:${userId}` },
    update: { value: payloadValue },
    create: {
      key: `2fa:pending:${userId}`,
      value: payloadValue,
    },
  });

  // Generate QR code
  const uri = await generateOTPUri(email, secret);
  const qrCode = await generateQRCode(uri);

  return apiOk({
    secret,
    qrCode,
    backupCodes, // shown once — user must save them
    message: "Scan the QR code with your authenticator app, then verify with a token.",
  });
}
