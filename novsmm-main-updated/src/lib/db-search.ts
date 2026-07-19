/**
 * Database search helper for provider-agnostic case-insensitive search.
 *
 * DESIGN: SQLite's `contains` is case-insensitive by default. PostgreSQL is
 * case-sensitive and requires `mode: "insensitive"` for CI search.
 *
 * This helper detects the database provider at runtime and returns the
 * correct Prisma query fragment, so the same code works on both databases.
 *
 * On SQLite: returns `{ contains: search }` (default CI behavior)
 * On PostgreSQL: returns `{ contains: search, mode: "insensitive" }`
 *
 * Usage:
 *   import { ciContains } from "@/lib/db-search";
 *
 *   const users = await db.user.findMany({
 *     where: { email: ciContains("gmail") }
 *   });
 *
 *   // Multi-field search:
 *   const orders = await db.order.findMany({
 *     where: {
 *       OR: [
 *         { publicId: ciContains(search) },
 *         { serviceName: ciContains(search) },
 *         { platform: ciContains(search) },
 *       ]
 *     }
 *   });
 */

// Detect provider once at module load
// On SQLite, `mode: "insensitive"` would cause a Prisma runtime error,
// so we only add it when running on PostgreSQL.
const isPostgreSQL = process.env.DATABASE_URL?.startsWith("postgresql") ?? false;

/**
 * Returns a Prisma string filter fragment for case-insensitive `contains`.
 *
 * Example:
 *   { email: ciContains("gmail") }
 *   → SQLite:     { email: { contains: "gmail" } }
 *   → PostgreSQL: { email: { contains: "gmail", mode: "insensitive" } }
 */
export function ciContains(
  search: string
): { contains: string; mode?: "insensitive" } {
  if (isPostgreSQL) {
    return { contains: search, mode: "insensitive" as const };
  }
  return { contains: search };
}

/**
 * Returns a Prisma string filter fragment for case-insensitive `startsWith`.
 *
 * Example:
 *   { username: ciStartsWith("admin") }
 *   → SQLite:     { username: { startsWith: "admin" } }
 *   → PostgreSQL: { username: { startsWith: "admin", mode: "insensitive" } }
 */
export function ciStartsWith(
  search: string
): { startsWith: string; mode?: "insensitive" } {
  if (isPostgreSQL) {
    return { startsWith: search, mode: "insensitive" as const };
  }
  return { startsWith: search };
}

/**
 * Returns a Prisma string filter fragment for case-insensitive `endsWith`.
 */
export function ciEndsWith(
  search: string
): { endsWith: string; mode?: "insensitive" } {
  if (isPostgreSQL) {
    return { endsWith: search, mode: "insensitive" as const };
  }
  return { endsWith: search };
}

/**
 * Returns a Prisma string filter fragment for case-insensitive equality.
 *
 * Example:
 *   { email: ciEquals("user@example.com") }
 *   → SQLite:     { email: "user@example.com" }  (SQLite is CI by default)
 *   → PostgreSQL: { email: { equals: "user@example.com", mode: "insensitive" } }
 */
export function ciEquals(
  search: string
): string | { equals: string; mode: "insensitive" } {
  if (isPostgreSQL) {
    return { equals: search, mode: "insensitive" as const };
  }
  return search;
}

/**
 * Is the app currently running on PostgreSQL?
 */
export function isPostgres(): boolean {
  return isPostgreSQL;
}
