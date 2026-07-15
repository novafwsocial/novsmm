/**
 * Notifications service entry point that loads .env before running.
 */
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

console.log("[notifications-start] Environment loaded. Present vars:");
for (const key of ["DATABASE_URL", "NOTIFICATIONS_SERVICE_PORT", "NOTIFICATIONS_SERVICE_SECRET"]) {
  console.log(`  ${key}: ${process.env[key] ? "✓ set" : "✗ NOT SET"}`);
}

const { spawn } = require("child_process");
const args = ["tsx", "mini-services/notifications-service/index.ts"];
console.log(`[notifications-start] Spawning: npx ${args.join(" ")}`);

const child = spawn("npx", args, {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});

child.on("error", (err) => {
  console.error("[notifications-start] Failed to spawn:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  console.log(`[notifications-start] exited with code ${code} signal ${signal}`);
  process.exit(code ?? 1);
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
