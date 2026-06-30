import { authenticator } from "otplib";
import QRCode from "qrcode";

/**
 * 2FA / TOTP utilities.
 * Uses otplib for secret generation + token verification.
 */

const ISSUER = "NOVSMM";

/**
 * Generate a new TOTP secret.
 */
export function generate2FASecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate the otpauth:// URI for QR code scanning.
 */
export function generateOTPUri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

/**
 * Generate a QR code as a data URL.
 */
export async function generateQRCode(uri: string): Promise<string> {
  return await QRCode.toDataURL(uri, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Verify a TOTP token against a secret.
 */
export function verify2FAToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Generate backup codes (one-time use).
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX (8 chars, alphanumeric)
    const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}
