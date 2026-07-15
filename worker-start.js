/**
 * Worker entry point that loads .env before running the worker.
 *
 * Same problem as start.js — Next.js only auto-loads .env in dev mode.
 * The worker (tsx src/workers/worker.ts) doesn't load .env at all in
 * production. This script fixes that.
 */
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

console.log("[worker-start] Environment loaded. Present vars:");
for (const key of ["DATABASE_URL", "NEXTAUTH_URL", "LICENSE_ENCRYPTION_KEY"]) {
  console.log(`  ${key}: ${process.env[key] ? "✓ set" : "✗ NOT SET"}`);
}

const { spawn } = require("child_process");
const args = ["tsx", "src/workers/worker.ts"];
console.log(`[worker-start] Spawning: npx ${args.join(" ")}`);

const child = spawn("npx", args, {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});

child.on("error", (err) => {
  console.error("[worker-start] Failed to spawn worker:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  console.log(`[worker-start] worker exited with code ${code} signal ${signal}`);
  process.exit(code ?? 1);
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
