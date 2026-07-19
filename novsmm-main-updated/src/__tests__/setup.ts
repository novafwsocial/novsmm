/**
 * Vitest setup — runs before all tests.
 *
 * Switches the Prisma schema to SQLite for testing (no PostgreSQL needed),
 * pushes the schema to a temp DB, and provides cleanup helpers.
 */
import { execFileSync } from "child_process";
import { rmSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Use a project-local SQLite DB for tests. A relative URL works on both
// Windows and Linux runners and keeps the test artifact inside the workspace.
const TEST_SCHEMA_PATH = "prisma/schema.test.prisma";
const TEST_DB_PATH = "test.db";
const TEST_DATABASE_URL = `file:./${TEST_DB_PATH}`;

// Set env vars BEFORE any imports that use them
(process.env as any).DATABASE_URL = TEST_DATABASE_URL;
(process.env as any).NODE_ENV = "test";
(process.env as any).NEXTAUTH_SECRET = "test-secret-at-least-16-chars-long";
(process.env as any).NEXTAUTH_URL = "http://localhost:3000";
(process.env as any).LICENSE_ENCRYPTION_KEY = "a".repeat(64);

// Delete old test DB
try {
  rmSync(TEST_DB_PATH, { force: true });
} catch {}

// Generate a separate SQLite schema instead of mutating the production
// PostgreSQL schema. This avoids races with parallel tooling and guarantees
// the source schema is restored even if Prisma exits with an error.
const SCHEMA_PATH = "prisma/schema.prisma";
const originalSchema = readFileSync(SCHEMA_PATH, "utf8");
const testSchema = originalSchema.replace(
  'provider = "postgresql"',
  'provider = "sqlite"'
);
writeFileSync(TEST_SCHEMA_PATH, testSchema);

try {
  const prismaCli = resolve("node_modules/prisma/build/index.js");
  const runPrisma = (args: string[]) => execFileSync(process.execPath, [prismaCli, ...args], {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  // Push schema to SQLite. Some restricted Windows runners cannot start the
  // Prisma schema engine. In that case, generate the same SQLite DDL offline
  // and apply it with Node's built-in SQLite driver instead of skipping setup.
  try {
    runPrisma(["db", "push", "--schema", TEST_SCHEMA_PATH, "--force-reset", "--accept-data-loss", "--skip-generate"]);
  } catch (error: any) {
    const message = String(error?.stderr ?? error?.message ?? error);
    if (!message.includes("Schema engine error")) throw error;

    const sql = execFileSync(process.execPath, [
      prismaCli,
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      TEST_SCHEMA_PATH,
      "--script",
    ], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    });
    const nodeRequire = eval("require") as (moduleName: string) => any;
    let DatabaseSync: any;
    try {
      ({ DatabaseSync } = nodeRequire("node:sqlite"));
    } catch {
      throw new Error("Prisma schema engine is unavailable and this Node runtime has no node:sqlite fallback; use Node 22+ or CI/Linux");
    }
    const sqliteDb = new DatabaseSync(TEST_DB_PATH);
    sqliteDb.exec(sql);
    sqliteDb.close();
  }

  // Generate Prisma client for SQLite
  runPrisma(["generate", "--schema", TEST_SCHEMA_PATH]);
} finally {
  // Never leave the generated test schema in the repository.
  rmSync(TEST_SCHEMA_PATH, { force: true });
}

// Import the db module only after env/schema/client setup has completed.
// A static import would be evaluated before the SQLite client is generated.
const { db } = await import("@/lib/db");

/**
 * Create a test user with a known password.
 */
export async function createTestUser(opts: {
  email: string;
  name?: string;
  username?: string;
  passwordHash?: string;
  role?: string;
  balance?: number;
  status?: string;
}) {
  return db.user.create({
    data: {
      email: opts.email,
      name: opts.name ?? "Test User",
      username: opts.username ?? opts.email.split("@")[0],
      passwordHash: opts.passwordHash ?? "$2a$10$dummyhash",
      role: opts.role ?? "user",
      status: opts.status ?? "active",
      balance: opts.balance ?? 0,
    },
  });
}

/**
 * Clean up all test data after each test.
 */
export async function cleanupTestData() {
  await db.notification.deleteMany({});
  await db.auditLog.deleteMany({});
  await db.order.deleteMany({});
  await db.transaction.deleteMany({});
  await db.account.deleteMany({});
  await db.session.deleteMany({});
  await db.verificationToken.deleteMany({});
  await db.setting.deleteMany({});
  await db.user.deleteMany({});
}

export { db };
