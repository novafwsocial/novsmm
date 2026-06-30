"use client";

/**
 * Currency conversion utilities.
 * Prices are stored in USD in the DB. The user's preferred currency
 * determines the display price, converted using the rate from the
 * Currency model (rate vs USD).
 */

// In-memory cache of currency rates (refreshed on app load)
let currencyCache: Record<string, { rate: number; symbol: string; name: string }> = {
  USD: { rate: 1.0, symbol: "$", name: "US Dollar" },
  MXN: { rate: 17.2, symbol: "$", name: "Mexican Peso" },
  EUR: { rate: 0.92, symbol: "€", name: "Euro" },
  GBP: { rate: 0.79, symbol: "£", name: "British Pound" },
  BRL: { rate: 5.05, symbol: "R$", name: "Brazilian Real" },
  ARS: { rate: 880, symbol: "$", name: "Argentine Peso" },
  COP: { rate: 4100, symbol: "$", name: "Colombian Peso" },
  INR: { rate: 83.5, symbol: "₹", name: "Indian Rupee" },
  JPY: { rate: 150, symbol: "¥", name: "Japanese Yen" },
};

export async function loadCurrencyRates() {
  try {
    const res = await fetch("/api/public/currencies");
    if (!res.ok) return;
    const data = await res.json();
    const currencies: any[] = data.currencies ?? [];
    const newCache: Record<string, { rate: number; symbol: string; name: string }> = {};
    for (const c of currencies) {
      newCache[c.code] = { rate: c.rate ?? 1.0, symbol: c.symbol, name: c.name };
    }
    if (Object.keys(newCache).length > 0) {
      currencyCache = newCache;
    }
  } catch (e) {
    // Use defaults
  }
}

/**
 * Convert a USD amount to the user's currency.
 */
export function convertFromUSD(usdAmount: number, currency: string): number {
  const c = currencyCache[currency];
  if (!c) return usdAmount; // fallback to USD
  return usdAmount * c.rate;
}

/**
 * Format a price in the user's currency.
 */
export function formatPrice(usdAmount: number, currency: string): string {
  const converted = convertFromUSD(usdAmount, currency);
  const c = currencyCache[currency];
  const symbol = c?.symbol ?? "$";

  // For currencies with large denominations (JPY, COP, ARS), don't show decimals
  const noDecimals = ["JPY", "COP", "ARS", "INR"].includes(currency);

  if (noDecimals) {
    return `${symbol}${Math.round(converted).toLocaleString()}`;
  }
  return `${symbol}${converted.toFixed(2)}`;
}

/**
 * Get the currency symbol.
 */
export function getCurrencySymbol(currency: string): string {
  return currencyCache[currency]?.symbol ?? "$";
}
