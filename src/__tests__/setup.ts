/**
 * Vitest setup — runs before all tests.
 *
 * Switches the Prisma schema to SQLite for testing (no PostgreSQL needed),
 * pushes the schema to a temp DB, and provides cleanup helpers.
 */
import { execFileSync } from "child_process";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { resolve } from "path";

// Use a temp SQLite DB for tests
const TEST_DIR = resolve(process.cwd(), ".vitest-tmp");
const TEST_DB_PATH = `${TEST_DIR}/novsmm-test.db`;
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;
const TEST_SCHEMA_PATH = `${TEST_DIR}/schema.prisma`;
const TEST_CLIENT_PATH = `${TEST_DIR}/client`;

// Set env vars BEFORE any imports that use them
(process.env as any).DATABASE_URL = TEST_DATABASE_URL;
(process.env as any).NODE_ENV = "test";
(process.env as any).NEXTAUTH_SECRET = "test-secret-at-least-16-chars-long";
(process.env as any).NEXTAUTH_URL = "http://localhost:3000";
(process.env as any).LICENSE_ENCRYPTION_KEY = "a".repeat(64);

// Delete old test DB
try {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  rmSync(TEST_DB_PATH, { force: true });
} catch {}

// Build a private SQLite schema/client. The production schema and generated
// @prisma/client are never modified by the test suite.
const productionSchemaPath = resolve(process.cwd(), "prisma/schema.prisma");
const originalSchema = readFileSync(productionSchemaPath, "utf8");
const testSchema = originalSchema.replace(
  'provider = "postgresql"',
  'provider = "sqlite"',
).replace(
  'generator client {\n  provider = "prisma-client-js"\n}',
  `generator client {\n  provider = "prisma-client-js"\n  output = "${TEST_CLIENT_PATH}"\n}`,
);
writeFileSync(TEST_SCHEMA_PATH, testSchema);

const prismaEnv = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
const prismaBin = resolve(process.cwd(), "node_modules/.bin/prisma");
execFileSync(prismaBin, [
  "db",
  "push",
  "--schema",
  TEST_SCHEMA_PATH,
  "--force-reset",
  "--accept-data-loss",
  "--skip-generate",
], { stdio: "pipe", env: prismaEnv });
execFileSync(prismaBin, ["generate", "--schema", TEST_SCHEMA_PATH], {
  stdio: "pipe",
  env: prismaEnv,
});

const require = createRequire(import.meta.url);
const { PrismaClient } = require(`${TEST_CLIENT_PATH}/index.js`);
export const db = new PrismaClient({ log: ["error"] });

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
