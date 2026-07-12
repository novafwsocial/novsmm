import crypto from "crypto";
import bcrypt from "bcryptjs";
import { encrypt, decrypt } from "./crypto-utils";

/**
 * License key generation + validation system.
 *
 * Security model:
 * - License keys are generated server-side using crypto.randomBytes
 * - The FULL key is returned to the admin ONCE at creation time (to share with customer)
 * - Only a BCRYPT HASH is stored in the DB (licenseHash) — the plaintext is never persisted
 * - Validation: client sends license key → server hashes with bcrypt.compare → matches DB
 * - Anti-replication: each license is bound to a domain + IP allowlist + max users
 * - The licenseKey column stores an AES-encrypted version for audit/display (never the raw key)
 *
 * NOTE: License encryption now uses the shared crypto-utils.encrypt/decrypt helpers,
 * which read LICENSE_ENCRYPTION_KEY from env (fail-closed, no hardcoded fallback).
 * This eliminates the second hardcoded key that previously diverged from crypto-utils.
 */

/**
 * Generate a new license key: NOVSMM-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let seg = "";
    for (let i = 0; i < 4; i++) {
      seg += chars[crypto.randomInt(0, chars.length)];
    }
    segments.push(seg);
  }
  return `NOVSMM-${segments.join("-")}`;
}

/**
 * Hash a license key with bcrypt for secure DB storage.
 */
export async function hashLicenseKey(key: string): Promise<string> {
  return bcrypt.hash(key, 12);
}

/**
 * Validate a license key against a bcrypt hash.
 */
export async function validateLicenseKey(
  key: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

/**
 * Encrypt a license key for storage/display (reversible, for audit).
 * Delegates to the shared AES-256-GCM crypto-utils (single source of truth for the key).
 */
export function encryptLicenseKey(key: string): string {
  return encrypt(key);
}

/**
 * Decrypt a license key (admin-only, for display).
 */
export function decryptLicenseKey(encryptedInput: string): string {
  try {
    return decrypt(encryptedInput);
  } catch {
    return "";
  }
}

/**
 * Validate a license against domain + IP constraints.
 * Returns { valid, reason }.
 *
 * Lookup strategy (O(1) when possible):
 * 1. Compute SHA-256(plaintext key) → lookupHash
 * 2. findFirst by { lookupHash, status: "active" } — single indexed lookup
 * 3. validateLicenseKey (bcrypt.compare) against the single result to confirm
 * 4. Fall back to bcrypt-scan over legacy licenses (lookupHash: null).
 *    Backfill lookupHash on the matched legacy license for future O(1) lookups.
 */
export async function validateLicense(
  licenseKey: string,
  options: { domain?: string; ip?: string } = {}
): Promise<{ valid: boolean; reason?: string; license?: any }> {
  const { db } = await import("./db");

  // Compute SHA-256 lookup hash (hex) for O(1) index lookup
  const lookupHash = crypto
    .createHash("sha256")
    .update(licenseKey)
    .digest("hex");

  // 1. O(1) lookup by lookupHash (new licenses)
  let lic: any = await db.license.findFirst({
    where: { lookupHash, status: "active" },
  });

  // 2. Fall back to bcrypt-scan over legacy licenses (lookupHash: null).
  //    Backfill lookupHash on the matched legacy license.
  //
  // SECURITY FIX (S-C-005): cap the scan at MAX_LEGACY_SCAN licenses.
  // Previously this loop scanned ALL legacy licenses — with cost-12 bcrypt
  // (~100ms each), N legacy licenses meant N×100ms of CPU per request. A
  // botnet hitting the public /api/public/validate-license endpoint could
  // saturate the event loop (each request blocks the single-threaded JS
  // runtime for seconds).
  //
  // The route-level rate limit (10/min/IP in middleware.ts) caps the
  // request rate, and this scan cap caps the per-request work. Together
  // they bound the worst-case CPU burn to: 10 req/min × 3 bcrypt = 30
  // bcrypt ops/min per IP — well within capacity.
  //
  // Long-term fix: run a one-time migration script that backfills
  // lookupHash for ALL legacy licenses, then delete this fallback entirely.
  const MAX_LEGACY_SCAN = 3;
  if (!lic) {
    const legacyLicenses = await db.license.findMany({
      where: { status: "active", lookupHash: null },
      take: MAX_LEGACY_SCAN,
    });
    for (const l of legacyLicenses) {
      if (await validateLicenseKey(licenseKey, l.licenseHash)) {
        lic = l;
        // Best-effort backfill — never let a backfill failure block validation
        try {
          await db.license.update({
            where: { id: l.id },
            data: { lookupHash },
          });
        } catch (e) {
          console.error(
            `[license] Failed to backfill lookupHash for ${l.id}:`,
            e
          );
        }
        break;
      }
    }
  }

  if (!lic) return { valid: false, reason: "Invalid license key" };

  // Confirm the lookupHash hit actually matches the bcrypt hash (defence in depth)
  const bcryptMatch = await validateLicenseKey(licenseKey, lic.licenseHash);
  if (!bcryptMatch) {
    return { valid: false, reason: "Invalid license key" };
  }

  // Check domain
  if (lic.domain && options.domain && !options.domain.includes(lic.domain)) {
    return { valid: false, reason: "Domain not allowed for this license" };
  }
  // Check IP allowlist
  if (lic.ipAllowlist && options.ip) {
    const allowed = lic.ipAllowlist.split(",").map((s: string) => s.trim());
    if (!allowed.includes(options.ip)) {
      return { valid: false, reason: "IP not allowed for this license" };
    }
  }
  // Check expiry
  if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
    return { valid: false, reason: "License expired" };
  }
  return { valid: true, license: lic };
}

/**
 * Generate a secure API key: nvsk_live_xxxxxxxxxxxx
 */
export function generateApiKey(): string {
  const bytes = crypto.randomBytes(24);
  const key = bytes.toString("base64url");
  return `nvsk_live_${key}`;
}

/**
 * Generate the public ID (non-secret) for an API key: nvsk_pub_xxxx
 */
export function generateApiPublicId(): string {
  const bytes = crypto.randomBytes(6);
  return `nvsk_pub_${bytes.toString("hex")}`;
}
