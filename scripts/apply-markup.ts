/**
 * NOVSMM — Apply 150% Markup to All Services
 *
 * Sets price = cost × 2.5 for all services in the database.
 * This gives NOVSMM a 150% profit on the provider cost.
 *
 * USAGE:
 *   bun run scripts/apply-markup.ts              # Apply 150% markup (default)
 *   bun run scripts/apply-markup.ts --markup=200 # Apply 200% markup (price = cost × 3)
 *   bun run scripts/apply-markup.ts --dry-run     # Preview without saving
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const markupArg = args.find((a) => a.startsWith("--markup="));
  const dryRun = args.includes("--dry-run");

  const markupPercent = markupArg ? parseFloat(markupArg.split("=")[1]) : 150;
  const multiplier = 1 + markupPercent / 100;

  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║  NOVSMM — Apply Markup to All Services            ║");
  console.log("╠═══════════════════════════════════════════════════╣");
  console.log(`║  Markup: ${markupPercent}% (price = cost × ${multiplier})`);
  console.log(`║  Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE (will update DB)"}`);
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log("");

  // Fetch all services
  const services = await db.service.findMany({
    select: { id: true, name: true, cost: true, price: true },
  });

  console.log(`Total services: ${services.length}`);
  console.log("");

  // Calculate new prices
  let totalOldRevenue = 0;
  let totalNewRevenue = 0;
  let totalOldProfit = 0;
  let totalNewProfit = 0;

  const updates: { id: string; name: string; oldPrice: number; newPrice: number; cost: number; oldMargin: number; newMargin: number }[] = [];

  for (const s of services) {
    const newPrice = parseFloat((s.cost * multiplier).toFixed(4));
    const oldMargin = s.price > 0 ? ((s.price - s.cost) / s.price) * 100 : 0;
    const newMargin = newPrice > 0 ? ((newPrice - s.cost) / newPrice) * 100 : 0;

    totalOldRevenue += s.price;
    totalNewRevenue += newPrice;
    totalOldProfit += s.price - s.cost;
    totalNewProfit += newPrice - s.cost;

    updates.push({
      id: s.id,
      name: s.name.slice(0, 50),
      oldPrice: s.price,
      newPrice,
      cost: s.cost,
      oldMargin: parseFloat(oldMargin.toFixed(1)),
      newMargin: parseFloat(newMargin.toFixed(1)),
    });
  }

  // Show sample (first 10)
  console.log("Sample (first 10 services):");
  console.log("Service".padEnd(52) + " | Cost    | Old Price | New Price | Old Margin | New Margin");
  console.log("-".repeat(120));
  for (const u of updates.slice(0, 10)) {
    console.log(
      u.name.padEnd(52) +
        " | $" +
        u.cost.toFixed(4).padStart(7) +
        " | $" +
        u.oldPrice.toFixed(4).padStart(8) +
        " | $" +
        u.newPrice.toFixed(4).padStart(8) +
        " | " +
        (u.oldMargin + "%").padStart(10) +
        " | " +
        (u.newMargin + "%").padStart(10)
    );
  }
  console.log("  ... (" + (updates.length - 10) + " more)");
  console.log("");

  // Summary
  console.log("═══ SUMMARY ═══");
  console.log(`  Services:        ${updates.length}`);
  console.log(`  Old avg price:   $${(totalOldRevenue / updates.length).toFixed(4)}`);
  console.log(`  New avg price:   $${(totalNewRevenue / updates.length).toFixed(4)}`);
  console.log(`  Old avg profit:  $${(totalOldProfit / updates.length).toFixed(4)}`);
  console.log(`  New avg profit:  $${(totalNewProfit / updates.length).toFixed(4)}`);
  console.log(`  Old avg margin:  ${((totalOldProfit / totalOldRevenue) * 100).toFixed(1)}%`);
  console.log(`  New avg margin:  ${((totalNewProfit / totalNewRevenue) * 100).toFixed(1)}%`);
  console.log("");

  // Profit split explanation
  console.log("═══ PROFIT SPLIT (per $1.00 cost) ═══");
  const sampleCost = 1.0;
  const samplePrice = sampleCost * multiplier;
  const sampleProfit = samplePrice - sampleCost;
  const resellerShare = sampleProfit * 0.5;
  const novsmmShare = sampleProfit * 0.5;
  console.log(`  Provider cost:      $${sampleCost.toFixed(2)}`);
  console.log(`  Sale price:         $${samplePrice.toFixed(2)} (${markupPercent}% markup)`);
  console.log(`  Total profit:       $${sampleProfit.toFixed(2)}`);
  console.log(`  `);
  console.log(`  Direct sale:        NOVSMM keeps $${sampleProfit.toFixed(2)} (100%)`);
  console.log(`  Marketplace sale:   Reseller gets $${resellerShare.toFixed(2)} (50%) + NOVSMM gets $${novsmmShare.toFixed(2)} (50%) + $${sampleCost.toFixed(2)} cost`);
  console.log(`  Child Panel sale:   Child owner gets $${resellerShare.toFixed(2)} (50%) + NOVSMM gets $${novsmmShare.toFixed(2)} (50%) + $${sampleCost.toFixed(2)} cost`);
  console.log("");

  if (dryRun) {
    console.log("⚠️  DRY RUN — no changes saved. Run without --dry-run to apply.");
    return;
  }

  // Apply updates
  console.log("Applying updates...");
  let updated = 0;
  for (const u of updates) {
    await db.service.update({
      where: { id: u.id },
      data: { price: u.newPrice },
    });
    updated++;
    if (updated % 1000 === 0) {
      console.log(`  Updated ${updated}/${updates.length}...`);
    }
  }

  console.log(`✅ Updated ${updated} services with ${markupPercent}% markup`);
  console.log("");
  console.log("Profit structure:");
  console.log("  Direct sales:    NOVSMM keeps 100% of profit (150% of cost)");
  console.log("  Marketplace:     50/50 split — reseller gets 75% of cost, NOVSMM keeps 75% + cost");
  console.log("  Child Panel:     50/50 split — child owner gets 75% of cost, NOVSMM keeps 75% + cost");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
