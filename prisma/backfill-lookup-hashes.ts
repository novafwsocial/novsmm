/**
 * Backfill `lookupHash` (SHA-256 of the plaintext key) on existing ApiKey + License rows.
 *
 * Run: `bun prisma/backfill-lookup-hashes.ts`
 *
 * Background:
 * - The new validateApiKey() / validateLicense() use lookupHash for O(1) index lookups.
 * - New keys/licenses get lookupHash set at creation time (see admin route handlers).
 * - Legacy rows have lookupHash = null. They use the bcrypt-scan fallback until backfilled.
 *
 * What can be backfilled:
 * - LICENSES: ✅ Yes. The `licenseKey` column stores an AES-256-GCM-encrypted copy of the
 *   plaintext (via crypto-utils.encrypt). We decrypt it, compute SHA-256, and persist it.
 * - API KEYS: ❌ No. The `keyHash` column is a bcrypt hash — one-way and not reversible.
 *   Legacy API keys will keep using the bcrypt-scan fallback at validation time, which
 *   *also* backfills lookupHash on the first successful match. Over time, all legacy
 *   API keys migrate themselves to O(1) lookup as they're used.
 *
 * Idempotent: only touches rows where lookupHash IS NULL.
 */
import crypto from "crypto";
import { db } from "../src/lib/db";
import { decryptLicenseKey } from "../src/lib/license";

async function backfillLicenses(): Promise<{ ok: number; skipped: number; failed: number }> {
  const licenses = await db.license.findMany({ where: { lookupHash: null } });
  console.log(`[licenses] Found ${licenses.length} row(s) with lookupHash = null.`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const lic of licenses) {
    try {
      const plaintext = decryptLicenseKey(lic.licenseKey);
      if (!plaintext) {
        // Decryption returned empty string — key corrupted or env mismatch
        console.warn(
          `[licenses] SKIP ${lic.id}: decryptLicenseKey returned empty (corrupted or key mismatch)`
        );
        skipped++;
        continue;
      }
      const lookupHash = crypto.createHash("sha256").update(plaintext).digest("hex");
      await db.license.update({ where: { id: lic.id }, data: { lookupHash } });
      ok++;
      console.log(`[licenses] ✓ ${lic.id} (${lic.customerEmail}) — backfilled`);
    } catch (e) {
      failed++;
      console.error(`[licenses] ✗ ${lic.id}:`, e);
    }
  }

  console.log(
    `[licenses] Done: ${ok} backfilled, ${skipped} skipped, ${failed} failed (${licenses.length} total)`
  );
  return { ok, skipped, failed };
}

async function reportApiKeys(): Promise<void> {
  const stale = await db.apiKey.count({ where: { lookupHash: null } });
  console.log("");
  console.log(`[api-keys] ${stale} row(s) have lookupHash = null.`);
  console.log(
    "[api-keys] NOTE: API keys CANNOT be backfilled from a bcrypt hash (bcrypt is one-way)."
  );
  console.log(
    "[api-keys] Legacy API keys will use the bcrypt-scan fallback on first use, which backfills lookupHash automatically."
  );
  console.log(
    "[api-keys] To force immediate migration, regenerate legacy API keys via the admin panel."
  );
}

async function main() {
  console.log("=== Backfilling lookupHash (SHA-256) for O(1) key/license lookup ===\n");

  const licStats = await backfillLicenses();
  await reportApiKeys();

  console.log("");
  console.log("=== Summary ===");
  console.log(`Licenses backfilled: ${licStats.ok} ok / ${licStats.skipped} skipped / ${licStats.failed} failed`);
  console.log("API keys: cannot be backfilled (bcrypt one-way); self-heal on first use");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
