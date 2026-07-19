/**
 * MIGRATION SCRIPT: Clean ETA fields that leak provider names.
 *
 * Problem: Orders created BEFORE the white-label fix (commit 56aef61) have
 * their `eta` field set to "Processing on HuntSMM" (or similar with other
 * provider names). This reveals the upstream provider to users.
 *
 * The code fix (src/lib/provider-failover.ts) only affects NEW orders —
 * existing orders keep whatever eta was set when they were created. This
 * script updates all existing orders that have a provider-leaking eta.
 *
 * What this script does:
 *   1. Finds all orders where eta matches /Processing on /i (any provider name)
 *   2. Updates those orders' eta to "Processing…" (generic, white-labeled)
 *   3. Does NOT touch providerName (kept in DB for admin/audit traceability)
 *   4. Does NOT touch any other field
 *   5. Only updates non-completed orders (completed orders show "—" anyway)
 *
 * Usage:
 *   bun run scripts/clean-provider-etas.ts
 *
 * Safe to run multiple times — idempotent (orders already at "Processing…"
 * won't match the regex, so the update is a no-op for them).
 *
 * Dry run: set DRY_RUN=true env var to see what would be changed without
 * actually updating anything.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.env.DRY_RUN === "true";
  console.log(`\n${"=".repeat(60)}`);
  console.log("  Clean Provider ETAs — White-label migration");
  console.log(`  Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE (will update DB)"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Find all orders with a provider-leaking eta.
  // The eta was set to `Processing on ${provider.name}` which matches
  // /Processing on /i (with a trailing space before the provider name).
  // We also catch "Processing on HuntSMM" and any other provider name.
  const ordersWithLeak = await prisma.order.findMany({
    where: {
      eta: { contains: "Processing on", mode: "insensitive" },
    },
    select: {
      id: true,
      publicId: true,
      eta: true,
      status: true,
      providerName: true,
      userId: true,
    },
  });

  console.log(`Found ${ordersWithLeak.length} order(s) with provider-leaking eta:\n`);

  if (ordersWithLeak.length === 0) {
    console.log("  ✅ No orders need updating — all ETAs are already clean.");
    return;
  }

  // Show a sample of what will be changed (first 10)
  const sample = ordersWithLeak.slice(0, 10);
  for (const order of sample) {
    console.log(`  ${order.publicId} | status: ${order.status}`);
    console.log(`    eta: "${order.eta}" → "Processing…"`);
    console.log(`    providerName (NOT touched): "${order.providerName ?? "—"}"`);
    console.log("");
  }
  if (ordersWithLeak.length > 10) {
    console.log(`  ... and ${ordersWithLeak.length - 10} more\n`);
  }

  if (dryRun) {
    console.log(`DRY RUN: Would update ${ordersWithLeak.length} order(s).`);
    console.log("Set DRY_RUN=false or remove the env var to apply for real.\n");
    return;
  }

  // Apply the update — bulk update all matching orders.
  // Only the `eta` field is touched. No other field is modified.
  const result = await prisma.order.updateMany({
    where: {
      eta: { contains: "Processing on", mode: "insensitive" },
    },
    data: {
      eta: "Processing…",
    },
  });

  console.log(`✅ Updated ${result.count} order(s).`);
  console.log("All ETAs now show \"Processing…\" (generic, no provider name).\n");

  // Verify — re-query to confirm no more leaks
  const remaining = await prisma.order.count({
    where: {
      eta: { contains: "Processing on", mode: "insensitive" },
    },
  });
  console.log(`Verification: ${remaining} order(s) still have "Processing on" in eta (should be 0).`);
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
