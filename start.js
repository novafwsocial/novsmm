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
 * FIX: Also adds a manual .env parser as fallback in case @next/env
 * fails to load certain vars (e.g. if the .env has Windows line
 * endings or unusual quoting).
 */
const fs = require("fs");
const path = require("path");

// ── Method 1: @next/env (the official Next.js env loader) ──
try {
  const { loadEnvConfig } = require("@next/env");
  loadEnvConfig(process.cwd());
} catch (e) {
  console.warn("[start] @next/env failed, falling back to manual parser:", e.message);
}

// ── Method 2: Manual .env parser (fallback) ──
// This catches vars that @next/env might miss (e.g. if the .env file has
// Windows line endings \r\n or unusual quoting that confuses the parser).
function loadEnvManually(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/); // handle both \n and \r\n
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Strip inline comments (but not # inside quotes — already handled)
      if (!value.startsWith('"') && !value.startsWith("'")) {
        const hashIndex = value.indexOf(" #");
        if (hashIndex !== -1) value = value.slice(0, hashIndex).trim();
      }
      // Only set if not already in process.env (don't override existing)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (e) {
    console.warn(`[start] manual .env load failed: ${e.message}`);
  }
}

loadEnvManually(path.join(process.cwd(), ".env"));

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
  const isSet = Boolean(process.env[key]);
  console.log(`  ${key}: ${isSet ? "set" : "NOT SET"}`);
}

// CRITICAL CHECK: DATABASE_URL is required for Prisma to work.
// If it's still not set, log a clear error with debugging instructions.
if (!process.env.DATABASE_URL) {
  console.error("[start] ═══════════════════════════════════════════════════════");
  console.error("[start] ❌ CRITICAL: DATABASE_URL is NOT SET!");
  console.error("[start]");
  console.error("[start] The app will start but Prisma will fail with:");
  console.error("[start]   'Environment variable not found: DATABASE_URL'");
  console.error("[start]");
  console.error("[start] Debugging steps:");
  console.error("[start]   1. Check that ~/novsmm/.env exists and has DATABASE_URL=...");
  console.error("[start]   2. Check for Windows line endings: file .env  (should say ASCII, not CRLF)");
  console.error("[start]   3. Check for hidden characters: cat -A .env | grep DATABASE_URL");
  console.error("[start]   4. Convert if needed: dos2unix .env  OR  sed -i 's/\\r$//' .env");
  console.error("[start] ═══════════════════════════════════════════════════════");
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
