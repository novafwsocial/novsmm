import crypto from "crypto";

/**
 * Encryption utility for sensitive data (payment credentials, API keys).
 * Uses AES-256-GCM with a key derived from the LICENSE_ENCRYPTION_KEY env var.
 *
 * The encrypted format is: iv:authTag:encrypted (all base64)
 */

/**
 * Resolve the encryption key from env. Fail-closed: throw if missing.
 * NEVER fall back to a hardcoded default — that would silently encrypt
 * production secrets with a publicly-known key.
 *
 * SECURITY (OWASP A02-2, P2): the minimum key length is now 32 chars AND
 * the value must be hex or base64 encoded (matching what `openssl rand
 * -hex 32` produces). The previous 16-char minimum accepted weak pass-
 * phrases like "password1234567" which only provided ~96 bits of entropy
 * before SHA-256 key derivation. NIST SP 800-131A recommends ≥128 bits
 * for AES-256 keys.
 */
function resolveEncryptionKey(): string {
  const key = process.env.LICENSE_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "LICENSE_ENCRYPTION_KEY environment variable is not set or is too short (min 32 chars). " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  // Accept hex (64 chars from `openssl rand -hex 32`) or base64 (44 chars
  // from `openssl rand -base64 32`). Both formats are produced by standard
  // tooling and give ≥128 bits of entropy.
  const isHex = /^[0-9a-fA-F]+$/.test(key);
  const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(key);
  if (!isHex && !isBase64) {
    throw new Error(
      "LICENSE_ENCRYPTION_KEY must be hex or base64 encoded. " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  return key;
}

function getKey(): Buffer {
  return crypto.createHash("sha256").update(resolveEncryptionKey()).digest();
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
 *
 * Accepts `unknown` so callers can pass the raw Prisma `JsonValue | null`
 * from a Json column directly — when the column stores an encrypted string
 * (the only thing `encryptJSON` ever writes), Prisma returns it as a JS
 * string at runtime and this function decrypts it. Non-string values
 * (e.g. legacy objects/arrays) return null safely.
 */
export function decryptJSON(encryptedStr: unknown): Record<string, any> | null {
  if (typeof encryptedStr !== "string") return null;
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
