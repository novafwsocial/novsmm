import { db } from "../src/lib/db";

/**
 * Updates currency exchange rates from a free API.
 * Run daily via cron: `bun prisma/update-fx-rates.ts`
 *
 * Uses exchangerate-api.com (free tier, no key needed for open rates)
 * Falls back to the ECB (European Central Bank) reference rates.
 *
 * In production, set FX_API_KEY for exchangerate-api.com for higher limits.
 */

const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  MXN: 17.2,
  BRL: 5.05,
  ARS: 880,
  COP: 4100,
  GBP: 0.79,
  INR: 83.5,
  JPY: 150,
};

async function fetchRates(): Promise<Record<string, number>> {
  try {
    const apiKey = process.env.FX_API_KEY;
    const url = apiKey
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`
      : "https://open.er-api.com/v6/latest/USD";

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`FX API returned ${res.status}`);
    const data = await res.json();
    return data.rates ?? FALLBACK_RATES;
  } catch (e) {
    console.error("[fx-rates] Failed to fetch, using fallback:", e);
    return FALLBACK_RATES;
  }
}

async function main() {
  console.log("💱 Updating currency exchange rates...");

  const rates = await fetchRates();
  const currencies = await db.currency.findMany({
    where: { status: "active" },
  });

  let updated = 0;
  for (const currency of currencies) {
    const rate = rates[currency.code];
    if (rate && rate > 0) {
      await db.currency.update({
        where: { id: currency.id },
        data: { rate },
      });
      console.log(`  ✓ ${currency.code}: ${rate}`);
      updated++;
    }
  }

  console.log(`\n✅ Updated ${updated}/${currencies.length} currency rates!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
