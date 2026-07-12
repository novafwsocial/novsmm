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
 * This config now uses the SAME approach: `script: "npm"`, `args:
 * "run start"`. That way `pm2 start ecosystem.config.js` is equivalent
 * to the user's manual command, and survives `npm`/`bun` differences
 * (the npm wrapper just calls `next start -p 3000` from package.json).
 *
 * To use bun explicitly (faster startup, less memory), set:
 *   interpreter: "/usr/bin/bun", script: "node_modules/.bin/next", args: "start -p 3000"
 * — but require bun >= 1.1.258 which supports `bun next`. For maximum
 * compatibility we default to npm.
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = {
  apps: [
    {
      name: "novsmm",
      // Run `next start` via npm so it picks up the same binary the user's
      // manual `pm2 start "npm run start"` uses. This is the most portable
      // setup — works whether the host has node, bun, or both.
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env: {
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
      // The worker is a TypeScript file — use tsx (via npx) so PM2 doesn't
      // need a separate bun install. Equivalent to `npm run worker:prod`.
      script: "npm",
      args: "run worker:prod",
      cwd: __dirname,
      env: {
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
      // Notifications mini-service — also run via npm script for portability.
      // Reads NOTIFICATIONS_SERVICE_PORT from env (default 3003).
      script: "npm",
      args: "run notifications:prod",
      cwd: __dirname,
      env: {
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
