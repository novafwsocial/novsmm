/**
 * Production server entry point that loads .env before next start.
 *
 * PROBLEM: Next.js only auto-loads .env files in DEV mode (next dev).
 * In PRODUCTION (next start), the process inherits env vars from its
 * parent (PM2). If PM2 doesn't pass them (or npm strips them), the app
 * runs without DATABASE_URL, GOOGLE_CLIENT_ID, etc. → Prisma fails with
 * "Environment variable not found: DATABASE_URL" and OAuth providers
 * are not registered.
 *
 * SOLUTION: This script uses @next/env (bundled with Next.js) to load
 * the .env file EXPLICITLY into process.env BEFORE requiring next start.
 * This works regardless of how the process was launched (PM2, systemd,
 * Docker, direct node, etc.).
 *
 * Usage in ecosystem.config.js:
 *   script: "node",
 *   args: "start.js",
 *
 * Or in package.json:
 *   "start:prod": "node start.js"
 */
const { loadEnvConfig } = require("@next/env");

// Load .env, .env.local, .env.production, .env.production.local
// from the current working directory.
loadEnvConfig(process.cwd());

// Log which env vars were loaded (for debugging — safe because it only
// logs the KEY names, never the values).
const loadedKeys = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "LICENSE_ENCRYPTION_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "FACEBOOK_CLIENT_ID",
  "GITHUB_CLIENT_ID",
  "TWITTER_CLIENT_ID",
  "AUTH_TRUST_HOST",
  "NODE_ENV",
];
console.log("[start] Environment loaded. Present vars:");
for (const key of loadedKeys) {
  console.log(`  ${key}: ${process.env[key] ? "✓ set" : "✗ NOT SET"}`);
}

// Now spawn next start with the loaded env
const { spawn } = require("child_process");
const args = ["start", "-p", process.env.PORT || "3000"];
console.log(`[start] Spawning: next ${args.join(" ")}`);

const child = spawn("npx", ["next", ...args], {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});

child.on("error", (err) => {
  console.error("[start] Failed to spawn next:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  console.log(`[start] next exited with code ${code} signal ${signal}`);
  process.exit(code ?? 1);
});

// Forward signals to the child
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
