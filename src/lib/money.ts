import { Prisma } from "@prisma/client";

/**
 * Money / Decimal-safe helpers for monetary arithmetic.
 *
 * DESIGN: These helpers work with BOTH SQLite (Float — JS number) and
 * PostgreSQL (Decimal — Prisma.Decimal object) without code changes.
 *
 * On SQLite, Prisma returns monetary values as JS `number` (Float).
 * On PostgreSQL, Prisma returns them as `Prisma.Decimal` objects.
 * JS `number` arithmetic (`+`, `-`, `>=`) doesn't work on Decimal objects,
 * so all monetary comparisons and arithmetic MUST go through these helpers.
 *
 * Usage:
 *   import { moneyGte, moneySub, toMoneyNumber } from "@/lib/money";
 *
 *   // Comparison
 *   if (moneyGte(user.balance, totalPrice)) { ... }
 *
 *   // Arithmetic
 *   const newBalance = moneySub(user.balance, totalPrice);
 *
 *   // Convert to JS number for display (never for arithmetic)
 *   const displayBalance = toMoneyNumber(user.balance);
 */

type Money = number | Prisma.Decimal | string | null | undefined;

/**
 * Convert a Money value to a JS number.
 * Use this ONLY for display, logging, or API responses — never for arithmetic.
 */
export function toMoneyNumber(value: Money): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return parseFloat(String(value));
}

/**
 * Convert a Money value to a Prisma.Decimal.
 * Use this when writing to the database.
 */
export function toMoneyDecimal(value: Money): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(typeof value === "number" ? value : String(value));
}

/**
 * Add two money values.
 */
export function moneyAdd(a: Money, b: Money): Prisma.Decimal {
  return toMoneyDecimal(a).plus(toMoneyDecimal(b));
}

/**
 * Subtract b from a.
 */
export function moneySub(a: Money, b: Money): Prisma.Decimal {
  return toMoneyDecimal(a).minus(toMoneyDecimal(b));
}

/**
 * Multiply money by a factor.
 */
export function moneyMul(a: Money, factor: number | Money): Prisma.Decimal {
  return toMoneyDecimal(a).mul(typeof factor === "number" ? factor : toMoneyDecimal(factor));
}

/**
 * Divide money by a divisor.
 */
export function moneyDiv(a: Money, divisor: number | Money): Prisma.Decimal {
  const div = typeof divisor === "number" ? divisor : toMoneyDecimal(divisor).toNumber();
  if (div === 0) return new Prisma.Decimal(0);
  return toMoneyDecimal(a).div(div);
}

/**
 * Check if a >= b.
 */
export function moneyGte(a: Money, b: Money): boolean {
  return toMoneyDecimal(a).gte(toMoneyDecimal(b));
}

/**
 * Check if a > b.
 */
export function moneyGt(a: Money, b: Money): boolean {
  return toMoneyDecimal(a).gt(toMoneyDecimal(b));
}

/**
 * Check if a <= b.
 */
export function moneyLte(a: Money, b: Money): boolean {
  return toMoneyDecimal(a).lte(toMoneyDecimal(b));
}

/**
 * Check if a < b.
 */
export function moneyLt(a: Money, b: Money): boolean {
  return toMoneyDecimal(a).lt(toMoneyDecimal(b));
}

/**
 * Check if a === b (exact equality).
 * For money comparisons, prefer moneyGte/moneyLte to avoid floating-point issues.
 */
export function moneyEq(a: Money, b: Money): boolean {
  return toMoneyDecimal(a).eq(toMoneyDecimal(b));
}

/**
 * Format money for display with 2 decimal places.
 * Example: toMoneyDisplay(42.5) → "42.50"
 */
export function toMoneyDisplay(value: Money): string {
  return toMoneyDecimal(value).toFixed(2);
}

/**
 * Calculate profit (price - cost).
 */
export function calculateProfit(price: Money, cost: Money): Prisma.Decimal {
  return moneySub(price, cost);
}

/**
 * Calculate margin percentage ((price - cost) / price * 100).
 */
export function calculateMargin(price: Money, cost: Money): Prisma.Decimal {
  const profit = calculateProfit(price, cost);
  const priceDec = toMoneyDecimal(price);
  if (priceDec.isZero()) return new Prisma.Decimal(0);
  return profit.div(priceDec).mul(100);
}

/**
 * Calculate total price for a quantity (unitPrice * quantity / 1000).
 * SMM services price per 1000 units.
 */
export function calculateTotal(unitPrice: Money, quantity: number): Prisma.Decimal {
  return toMoneyDecimal(unitPrice).mul(quantity).div(1000);
}
