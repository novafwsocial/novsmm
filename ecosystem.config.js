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
 */

module.exports = {
  apps: [
    {
      name: "novsmm-web",
      script: ".next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      instances: "max", // One per CPU core
      exec_mode: "cluster",
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
      script: "src/workers/worker.ts",
      interpreter: "bun",
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
      script: "mini-services/notifications-service/index.ts",
      interpreter: "bun",
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
