import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError, apiOk } from "@/lib/api-utils";
import { generate2FASecret, generateOTPUri, generateQRCode, generateBackupCodes } from "@/lib/two-factor";
import bcrypt from "bcryptjs";

/**
 * POST /api/me/2fa/setup
 * Generates a new TOTP secret + QR code.
 * The secret is stored TEMPORARILY in the Setting table (encrypted via bcrypt for backup codes)
 * until the user verifies with a token (then it's confirmed).
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

  // Store in a temporary setting (pending verification)
  // The secret is stored as-is (it's a TOTP secret, not a password)
  // Backup codes are hashed with bcrypt
  const hashedBackupCodes = await Promise.all(
    backupCodes.map((c) => bcrypt.hash(c, 10))
  );

  await db.setting.upsert({
    where: { key: `2fa:pending:${userId}` },
    update: {
      value: JSON.stringify({
        secret,
        backupCodes: hashedBackupCodes,
      }),
    },
    create: {
      key: `2fa:pending:${userId}`,
      value: JSON.stringify({
        secret,
        backupCodes: hashedBackupCodes,
      }),
    },
  });

  // Generate QR code
  const uri = generateOTPUri(email, secret);
  const qrCode = await generateQRCode(uri);

  return apiOk({
    secret,
    qrCode,
    backupCodes, // shown once — user must save them
    message: "Scan the QR code with your authenticator app, then verify with a token.",
  });
}
