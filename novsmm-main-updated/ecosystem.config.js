/**
 * PM2 Ecosystem Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Alternative to Docker — run NOVSMM with PM2 process manager.
 *
 * USAGE:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.js
 *   pm2 status
 *   pm2 logs
 *   pm2 restart all
 *   pm2 stop all
 *
 * AUTO-RESTART ON BOOT:
 *   pm2 startup
 *   pm2 save
 *
 * This is an ALTERNATIVE to Docker. Use one or the other, not both.
 * Docker (docker-compose.yml) is recommended for production.
 *
 * FIX (C-003): previously this file pointed `script` at
 * `.next/standalone/server.js`, but `next.config.ts` does NOT set
 * `output: 'standalone'` — so that file never exists and `pm2 start
 * ecosystem.config.js` crashed immediately. The user's working command
 * `pm2 start "npm run start" --name novsmm` runs `next start -p 3000`
 * via npm, which works because `next start` only needs the standard
 * `.next/` build output (BUILD_ID + server/ + static/).
 *
 * FIX (env vars): This config now loads ALL variables from the .env file
 * and passes them to each PM2 process. Previously, only NODE_ENV/PORT were
 * set in the `env:` block, which meant DATABASE_URL, GOOGLE_CLIENT_ID,
 * NEXTAUTH_SECRET, LICENSE_ENCRYPTION_KEY, etc. were NOT available to the
 * running processes — causing Prisma to fail with "Environment variable
 * not found: DATABASE_URL" and OAuth providers to not be registered.
 *
 * Next.js only auto-loads .env in dev mode (`next dev`). In production
 * (`next start`), the process inherits env vars from its parent (PM2),
 * so PM2 MUST explicitly pass them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");

/**
 * Parse a .env file into a key=value object.
 * Supports:
 *   - Comments (lines starting with #)
 *   - Empty lines (skipped)
 *   - Quotes around values (stripped)
 *   - Inline comments after values (# ...)
 *   - KEY=value syntax
 * Does NOT support:
 *   - Variable expansion (FOO=${BAR}) — values are literal
 *   - Multi-line values — each line is a separate var
 */
function loadEnvFile(filePath) {
  const env = {};
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) continue;
      // Must contain = to be a valid env var
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Strip inline comments (but not # inside quotes)
      if (!value.startsWith('"') && !value.startsWith("'")) {
        const hashIndex = value.indexOf(" #");
        if (hashIndex !== -1) value = value.slice(0, hashIndex).trim();
      }
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Skip shell command substitution like $(openssl...) — these should
      // have been resolved before writing to .env. If present, the value
      // is invalid and we skip it (the var won't be set, which is better
      // than passing the literal "$(openssl...)" string).
      if (value.includes("$(") || value.includes("`")) {
        console.warn(`[ecosystem] WARNING: .env var ${key} contains shell substitution "${value}" — please resolve it to a literal value in .env`);
        continue;
      }
      env[key] = value;
    }
  } catch (e) {
    console.warn(`[ecosystem] WARNING: could not load ${filePath}: ${e.message}`);
  }
  return env;
}

// Load the .env file from the project root
const envFile = path.join(__dirname, ".env");
const dotenvVars = loadEnvFile(envFile);

module.exports = {
  apps: [
    {
      name: "novsmm",
      // FIX: use node start.js instead of npm run start. The start.js
      // script explicitly loads .env via @next/env BEFORE spawning next
      // start. This ensures DATABASE_URL, GOOGLE_CLIENT_ID, etc. are
      // available regardless of how PM2 launches the process (npm strips
      // env vars in some configurations).
      script: "node",
      args: "start.js",
      cwd: __dirname,
      // FIX: pass ALL .env vars + process env + explicit overrides to PM2.
      // This ensures DATABASE_URL, GOOGLE_CLIENT_ID, NEXTAUTH_SECRET, etc.
      // are available to the Next.js production server.
      env: {
        ...dotenvVars,
        ...process.env,
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      instances: 1, // Next.js handles concurrency internally; cluster mode would
      // duplicate the build cache + DB pool — not needed.
      exec_mode: "fork",
      max_memory_restart: "1G",
      error_file: "./logs/web-error.log",
      out_file: "./logs/web-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      listen_timeout: 10000,
      health_check_grace_period: 30000,
    },
    {
      name: "novsmm-worker",
      // FIX: use node worker-start.js to load .env before running the worker.
      script: "node",
      args: "worker-start.js",
      cwd: __dirname,
      env: {
        ...dotenvVars,
        ...process.env,
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
    },
    {
      name: "novsmm-notifications",
      // FIX: use node notifications-start.js to load .env before running.
      script: "node",
      args: "notifications-start.js",
      cwd: __dirname,
      env: {
        ...dotenvVars,
        ...process.env,
        NODE_ENV: "production",
        NOTIFICATIONS_SERVICE_PORT: 3003,
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "256M",
      error_file: "./logs/notifications-error.log",
      out_file: "./logs/notifications-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      kill_timeout: 3000,
    },
  ],
};
