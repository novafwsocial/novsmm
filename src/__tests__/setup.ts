/**
 * Vitest setup — runs before all tests.
 *
 * Switches the Prisma schema to SQLite for testing (no PostgreSQL needed),
 * pushes the schema to a temp DB, and provides cleanup helpers.
 */
import { execSync } from "child_process";
import { rmSync, readFileSync, writeFileSync } from "fs";

// Use a temp SQLite DB for tests
const TEST_DB_PATH = "/tmp/novsmm-test.db";
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

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

// Temporarily switch schema to SQLite for testing
const SCHEMA_PATH = "prisma/schema.prisma";
const originalSchema = readFileSync(SCHEMA_PATH, "utf8");
const testSchema = originalSchema.replace(
  'provider = "postgresql"',
  'provider = "sqlite"'
);
writeFileSync(SCHEMA_PATH, testSchema);

try {
  // Push schema to SQLite
  execSync("npx prisma db push --force-reset --accept-data-loss --skip-generate", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  // Generate Prisma client for SQLite
  execSync("npx prisma generate", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
} finally {
  // Restore the original schema (postgresql)
  writeFileSync(SCHEMA_PATH, originalSchema);
}

// Re-import the db module after env setup
import { db } from "@/lib/db";

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
