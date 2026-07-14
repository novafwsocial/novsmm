import {
  generateSecret as otplibGenerateSecret,
  generate,
  verify,
  generateURI,
} from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import { encrypt, decrypt, encryptJSON, decryptJSON } from "./crypto-utils";

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

// ─────────────────────────────────────────────────────────────────────────────
// 2FA Setting payload read/write helpers
//
// SECURITY FIX (S-C-002 from security audit):
// Previously, setup/verify stored the 2FA payload as PLAIN JSON
// (`JSON.stringify({ secret, backupCodes })`) while the login flow
// expected the WHOLE payload to be AES-256-GCM encrypted (via
// `decryptJSON`). This mismatch caused every user who enabled 2FA to
// be locked out at the next login with "2FA setup is corrupted".
//
// These helpers enforce a single consistent format:
//   - WRITE: always `encryptJSON(payload)` — the whole object is encrypted.
//   - READ:  try `decryptJSON` first (new format); fall back to plain
//            `JSON.parse` (legacy format) so existing entries that were
//            written before this fix still work. On the next write
//            (e.g. backup-code rotation), the entry is transparently
//            upgraded to the encrypted format.
// ─────────────────────────────────────────────────────────────────────────────

export interface TwoFactorPayload {
  /** AES-256-GCM encrypted TOTP secret (output of encrypt2FASecret). */
  secret: string;
  /** Bcrypt-hashed backup codes (one-way). */
  backupCodes: string[];
}

/**
 * Read a 2FA payload from a Setting value.
 * Handles BOTH formats:
 *   - New (encrypted): the whole payload is AES-256-GCM encrypted via
 *     `encryptJSON()`.
 *   - Legacy (plain JSON): `JSON.stringify({ secret, backupCodes })` —
 *     written by the old setup/verify routes before this fix.
 * Returns null on failure (corrupted / unknown format) — caller MUST
 * treat null as fail-closed.
 */
export function read2FAPayload(
  value: string | null | undefined
): TwoFactorPayload | null {
  if (!value || typeof value !== "string") return null;

  // Try new format: whole payload encrypted with encryptJSON.
  try {
    const decrypted = decryptJSON(value);
    if (
      decrypted &&
      typeof decrypted === "object" &&
      typeof decrypted.secret === "string"
    ) {
      return {
        secret: decrypted.secret,
        backupCodes: Array.isArray(decrypted.backupCodes)
          ? decrypted.backupCodes
          : [],
      };
    }
  } catch {
    // Not encrypted — fall through to legacy plain-JSON parse.
  }

  // Legacy format: plain JSON.stringify({ secret, backupCodes }).
  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.secret === "string"
    ) {
      return {
        secret: parsed.secret,
        backupCodes: Array.isArray(parsed.backupCodes)
          ? parsed.backupCodes
          : [],
      };
    }
  } catch {
    // Not plain JSON either — corrupted.
  }

  return null;
}

/**
 * Write a 2FA payload as an encrypted string (for Setting.value).
 * Always uses `encryptJSON` — the whole payload is AES-256-GCM encrypted,
 * matching what `read2FAPayload` and the login flow expect.
 */
export function write2FAPayload(payload: TwoFactorPayload): string {
  return encryptJSON(payload);
}
