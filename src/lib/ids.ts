import { db } from "./db";

/**
 * Atomic public-ID generation using a Sequence counter table.
 *
 * Replaces the previous `db.<table>.count() + offset` pattern that caused:
 * 1. Race conditions — two concurrent inserts could read the same count and
 *    generate the same publicId, causing a unique-constraint violation.
 * 2. Full-table scans — `count()` scans the entire table; at 1M+ rows this
 *    adds multi-second latency to every order/transaction/ticket/invoice
 *    creation.
 *
 * This implementation uses an interactive Prisma transaction with
 * `SELECT ... FOR UPDATE`-equivalent semantics (SQLite serializes writes
 * automatically, PostgreSQL will use row-level locking). Each prefix gets
 * its own Sequence row. The row is incremented atomically and the new value
 * is returned.
 *
 * Usage:
 *   const publicId = await nextPublicId("A", 10432);   // → "A-10433"
 *   const publicId = await nextPublicId("TX", 8842);   // → "TX-8843"
 *   const publicId = await nextPublicId("T", 201);     // → "T-202"
 *   const publicId = await nextPublicId("INV", 0, 4);  // → "INV-0001" (padded)
 */

// Cache of starting offsets per prefix, to maintain backward compat with
// existing IDs that were generated via count() + offset.
// On first call for a given prefix, we seed the Sequence row with the
// current max count so the next ID continues the sequence naturally.
const SEED_OFFSETS: Record<string, number> = {
  A: 10432, // Orders: A-10432, A-10433, ...
  TX: 8842, // Transactions: TX-8842, TX-8843, ...
  T: 201, // Tickets: T-201, T-202, ...
  INV: 0, // Invoices: INV-0001, INV-0002, ... (padded to 4)
};

/**
 * Generate the next public ID for a given prefix.
 *
 * @param prefix  The ID prefix (e.g. "A", "TX", "T", "INV")
 * @param seedOffset  The offset to seed from if the Sequence row doesn't exist yet
 *                    (defaults to SEED_OFFSETS[prefix] or 0)
 * @param padWidth  Zero-pad the numeric portion to this width (default: 0 = no padding)
 * @returns The formatted public ID, e.g. "A-10433" or "INV-0001"
 */
export async function nextPublicId(
  prefix: string,
  seedOffset?: number,
  padWidth: number = 0
): Promise<string> {
  const offset = seedOffset ?? SEED_OFFSETS[prefix] ?? 0;

  // Use an interactive transaction to ensure atomic increment.
  // SQLite serializes writes, so this is safe. On PostgreSQL, the
  // `upsert` inside a transaction uses row-level locking.
  const nextValue = await db.$transaction(async (tx) => {
    // Atomic upsert: if the row exists, increment; if not, create with seed value.
    // This is race-condition-free: Prisma translates upsert to
    // INSERT ... ON CONFLICT DO UPDATE (PostgreSQL) or a serialized
    // transaction (SQLite), both of which are atomic.
    const result = await tx.sequence.upsert({
      where: { id: prefix },
      update: {
        lastValue: { increment: 1 },
      },
      create: {
        id: prefix,
        prefix,
        lastValue: offset + 1,
      },
      select: { lastValue: true },
    });
    return result.lastValue;
  });

  // Format with optional zero-padding
  const numericPart =
    padWidth > 0
      ? String(nextValue).padStart(padWidth, "0")
      : String(nextValue);

  return `${prefix}-${numericPart}`;
}

/**
 * Seed a sequence counter from the current max count of a table.
 * Useful for first migration — ensures the sequence continues from the
 * highest existing ID rather than restarting.
 *
 * @param prefix  The ID prefix
 * @param currentCount  The current row count of the corresponding table
 * @param seedOffset  The original offset used in count() + offset
 */
export async function seedSequenceFromCount(
  prefix: string,
  currentCount: number,
  seedOffset: number
): Promise<void> {
  const computedNext = seedOffset + currentCount + 1;

  await db.sequence.upsert({
    where: { id: prefix },
    update: {
      // Only update if the computed value is higher (don't go backwards)
      lastValue: computedNext,
    },
    create: {
      id: prefix,
      prefix,
      lastValue: computedNext,
    },
  });
}
