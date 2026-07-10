#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Start Notifications Service (WebSocket on port 3003)
# ─────────────────────────────────────────────────────────────────────────────
# This script starts the real-time notifications mini-service.
# It uses PM2 for process management (auto-restart on crash/reboot).
#
# Usage: bash scripts/start-notifications.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

NOTIFICATIONS_DIR="$HOME/novsmm/mini-services/notifications-service"
PORT=3003

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM — Notifications Service Setup                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check if already running
if pm2 describe novsmm-notifications > /dev/null 2>&1; then
  echo "⚠️  novsmm-notifications is already in PM2. Restarting..."
  pm2 restart novsmm-notifications
  echo "✅ Restarted."
  pm2 status
  exit 0
fi

# Step 2: Check directory exists
if [ ! -d "$NOTIFICATIONS_DIR" ]; then
  echo "❌ Notifications service directory not found: $NOTIFICATIONS_DIR"
  echo "   Make sure you're in the novsmm project root."
  exit 1
fi

# Step 3: Install dependencies if needed
if [ ! -d "$NOTIFICATIONS_DIR/node_modules" ]; then
  echo "📋 Installing dependencies..."
  cd "$NOTIFICATIONS_DIR"
  npm install 2>&1 | tail -3
fi

# Step 4: Generate secret if not in .env
ENV_FILE="$HOME/novsmm/.env"
if ! grep -q "NOTIFICATIONS_SERVICE_SECRET" "$ENV_FILE" 2>/dev/null; then
  echo "🔐 Generating NOTIFICATIONS_SERVICE_SECRET..."
  SECRET=$(openssl rand -hex 32)
  echo "" >> "$ENV_FILE"
  echo "# Notifications service" >> "$ENV_FILE"
  echo "NOTIFICATIONS_SERVICE_SECRET=$SECRET" >> "$ENV_FILE"
  echo "NOTIFICATIONS_SERVICE_PORT=$PORT" >> "$ENV_FILE"
  echo "✅ Secret added to .env"
else
  echo "✅ NOTIFICATIONS_SERVICE_SECRET already in .env"
fi

# Step 5: Start with PM2
echo "🚀 Starting notifications service with PM2..."
cd "$NOTIFICATIONS_DIR"
pm2 start "bun run dev" --name novsmm-notifications --cwd "$NOTIFICATIONS_DIR"
pm2 save

# Step 6: Verify
sleep 3
echo ""
echo "📋 Status:"
pm2 status

echo ""
echo "🏥 Health check:"
if curl -s "http://localhost:$PORT/healthz" > /dev/null 2>&1; then
  echo "✅ Notifications service is healthy on port $PORT"
else
  echo "⚠️  Service may still be starting. Check logs:"
  echo "   pm2 logs novsmm-notifications"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ Notifications Service Started!                           ║"
echo "║                                                              ║"
echo "║  The WebSocket is now running on port $PORT.                 ║"
echo "║  Dashboard 'Analytics' tab should now show live notifications║"
echo "║  instead of 'Connecting…'                                    ║"
echo "║                                                              ║"
echo "║  To view logs: pm2 logs novsmm-notifications                 ║"
echo "║  To stop: pm2 stop novsmm-notifications                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
