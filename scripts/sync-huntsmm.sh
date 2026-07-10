#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Sync HuntSMM Services
# ─────────────────────────────────────────────────────────────────────────────
# Fetches the real service catalog from HuntSMM API and imports it into
# the NOVSMM database. This replaces the 12 seed services with the real
# 6,000+ services from HuntSMM.
#
# Usage: bash scripts/sync-huntsmm.sh
#
# IMPORTANT: This DELETES all existing services and providers, then imports
# fresh from HuntSMM. Run this only on a fresh install or when you want to
# refresh the entire catalog.
# ─────────────────────────────────────────────────────────────────────────────

set -e

PROJECT_DIR="$HOME/novsmm"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM — HuntSMM Catalog Sync                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check HUNTSMM_API_KEY
if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "❌ .env file not found at $PROJECT_DIR/.env"
  exit 1
fi

if ! grep -q "HUNTSMM_API_KEY" "$PROJECT_DIR/.env"; then
  echo "❌ HUNTSMM_API_KEY not found in .env"
  echo "   Add your HuntSMM API key to .env:"
  echo "   HUNTSMM_API_KEY=your_api_key_here"
  exit 1
fi

API_KEY=$(grep "HUNTSMM_API_KEY" "$PROJECT_DIR/.env" | cut -d'=' -f2)
if [ -z "$API_KEY" ] || [ "$API_KEY" = "your_api_key_here" ]; then
  echo "❌ HUNTSMM_API_KEY is empty or placeholder"
  exit 1
fi

echo "✅ HUNTSMM_API_KEY found: ${API_KEY:0:8}..."
echo ""

# Step 2: Confirm
echo "⚠️  WARNING: This will DELETE all existing services and providers,"
echo "   then import fresh from HuntSMM."
echo ""
read -p "Continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "🚀 Starting sync..."
echo ""

# Step 3: Run the sync script
cd "$PROJECT_DIR"
npx tsx prisma/sync-huntsmm.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ HuntSMM Sync Complete!                                   ║"
echo "║                                                              ║"
echo "║  Your catalog now has the real services from HuntSMM.        ║"
echo "║  Admin → Services should show thousands of services.         ║"
echo "║  Admin → Providers → HuntSMM should show the real count.     ║"
echo "║                                                              ║"
echo "║  Next: Restart NOVSMM to refresh the cache:                  ║"
echo "║    pm2 restart novsmm                                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
