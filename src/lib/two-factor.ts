import {
  generateSecret as otplibGenerateSecret,
  generate,
  verify,
  generateURI,
} from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import { encrypt, decrypt } from "./crypto-utils";

/**
 * 2FA / TOTP utilities.
 * Uses otplib v13 for secret generation + token verification.
 *
 * Security:
 * - TOTP secrets are encrypted at rest with AES-256-GCM (crypto-utils)
 * - Backup codes are generated with crypto.randomBytes (CSPRNG, not Math.random)
 * - Backup codes are hashed with bcrypt before storage
 *
 * otplib v13 API notes:
 * - generate({ secret }) → returns 6-digit token (async)
 * - verify({ token, secret }) → returns { valid: boolean } (async)
 * - generateSecret() → returns base32 secret string (sync)
 * - generateURI({ secret, accountName, issuer }) → returns otpauth:// URI (async)
 */

const ISSUER = "NOVSMM";

/**
 * Generate a new TOTP secret.
 */
export function generate2FASecret(): string {
  return otplibGenerateSecret();
}

/**
 * Encrypt a TOTP secret for storage at rest.
 * Returns the AES-256-GCM encrypted string (iv:authTag:encrypted, all base64).
 */
export function encrypt2FASecret(secret: string): string {
  return encrypt(secret);
}

/**
 * Decrypt a TOTP secret before verification.
 * Returns the plaintext secret, or empty string on failure.
 */
export function decrypt2FASecret(encryptedSecret: string): string {
  try {
    return decrypt(encryptedSecret);
  } catch {
    return "";
  }
}

/**
 * Generate the otpauth:// URI for QR code scanning.
 */
export async function generateOTPUri(email: string, secret: string): Promise<string> {
  return await generateURI({ secret, label: email, issuer: ISSUER });
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
 * Returns true if the token is valid for the current time window.
 */
export async function verify2FAToken(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verify({ token, secret });
    return result?.valid === true;
  } catch {
    return false;
  }
}

/**
 * Generate backup codes (one-time use) using a CSPRNG.
 * Replaces the previous Math.random()-based generator which was not cryptographically secure.
 * Format: XXXX-XXXX (8 chars, uppercase alphanumeric, ambiguous chars removed).
 */
export function generateBackupCodes(count: number = 8): string[] {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(8);
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j] % chars.length];
    }
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}
