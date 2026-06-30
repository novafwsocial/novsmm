import crypto from "crypto";

/**
 * Encryption utility for sensitive data (payment credentials, API keys).
 * Uses AES-256-GCM with a key derived from the LICENSE_ENCRYPTION_KEY env var.
 *
 * The encrypted format is: iv:authTag:encrypted (all base64)
 */

const ENCRYPTION_KEY =
  process.env.LICENSE_ENCRYPTION_KEY ||
  "novsmm-default-encryption-key-change!";

function getKey(): Buffer {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt a string for secure storage.
 */
export function encrypt(data: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt an encrypted string.
 */
export function decrypt(encryptedData: string): string {
  const [ivB64, authTagB64, encB64] = encryptedData.split(":");
  if (!ivB64 || !authTagB64 || !encB64) return "";
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Encrypt a JSON object (for payment method configs).
 */
export function encryptJSON(obj: Record<string, any>): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt a JSON object.
 */
export function decryptJSON(encryptedStr: string): Record<string, any> | null {
  try {
    const json = decrypt(encryptedStr);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Mask a sensitive value for display (show only last 4 chars).
 */
export function maskValue(value: string): string {
  if (!value || value.length <= 4) return "••••";
  return "••••••••" + value.slice(-4);
}
