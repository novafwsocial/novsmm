#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NOVSMM — DEPLOY WSL2 (PM2 + SQLite, no Docker)
# ═══════════════════════════════════════════════════════════════════════════
# Deploys NOVSMM on a WSL2 instance using PM2 + SQLite (the simplest
# production setup — no Docker, no Redis, no PostgreSQL).
#
# This is the script the NOVSMM operator actually uses on their WSL2
# development machine that fronts novsmm.shop via Cloudflare.
#
# USAGE:
#   chmod +x scripts/deploy-wsl2.sh
#   ./scripts/deploy-wsl2.sh                 # full deploy
#   ./scripts/deploy-wsl2.sh --no-pull       # skip git pull (use local changes)
#   ./scripts/deploy-wsl2.sh --no-build      # skip rebuild (just restart pm2)
#   ./scripts/deploy-wsl2.sh --no-seed       # skip prisma seed
#
# PREREQUISITES:
#   - Node.js 22+ (https://nodejs.org/)
#   - npm or bun installed
#   - PM2 installed globally: npm install -g pm2
#   - .env file configured (DATABASE_URL=file:./db/custom.db for SQLite)
#   - git remote 'origin' pointing to the novsmm repo
#
# WHAT THIS SCRIPT DOES:
#   1. Pre-flight checks (node, pm2, .env, git remote)
#   2. git pull origin main (unless --no-pull)
#   3. Install deps (bun install or npm install --legacy-peer-deps)
#   4. prisma generate + db push (apply schema to SQLite)
#   5. next build (production build)
#   6. pm2 restart (or pm2 start ecosystem.config.js if not running)
#   7. Health check (curl http://localhost:3000)
#   8. Print Cloudflare cache purge reminder
#
# ROLLBACK:
#   If the build fails, the script aborts BEFORE touching pm2 — the old
#   build keeps serving. To roll back to a previous commit after a bad
#   deploy:
#     git reset --hard <previous-commit-sha>
#     npm run build && pm2 restart novsmm
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors (works in WSL2 default terminal) ──
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

log()  { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}  ⚠️${NC} $1"; }
info() { echo -e "${BLUE}  ℹ️${NC} $1"; }
step() { echo -e "\n${BOLD}${BLUE}═══ $1 ═══${NC}"; }

# ── Parse args ──
DO_PULL=true
DO_BUILD=true
DO_SEED=true
for arg in "$@"; do
  case "$arg" in
    --no-pull)  DO_PULL=false ;;
    --no-build) DO_BUILD=false; DO_PULL=false; DO_SEED=false ;;
    --no-seed)  DO_SEED=false ;;
    *) warn "Unknown arg: $arg" ;;
  esac
done

# ── Resolve project root (script is in scripts/) ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║  NOVSMM — Deploy WSL2 (PM2 + SQLite)                          ║${NC}"
echo -e "${BOLD}${CYAN}║  $(date '+%Y-%m-%d %H:%M:%S')                                      ║${NC}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"

# ── 1. Pre-flight checks ──
step "1. Pre-flight checks"

if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install from https://nodejs.org/ (LTS 22+)"
fi
ok "Node.js: $(node --version)"

# Pick package manager: prefer bun (project uses bun.lock), fall back to npm
if command -v bun &>/dev/null; then
  PKG_MGR="bun"
  ok "Package manager: bun $(bun --version)"
elif command -v npm &>/dev/null; then
  PKG_MGR="npm"
  ok "Package manager: npm $(npm --version)"
  warn "bun not found — using npm. Consider installing bun: curl -fsSL https://bun.sh/install | bash"
else
  fail "Neither bun nor npm found. Install one of them."
fi

if ! command -v pm2 &>/dev/null; then
  fail "PM2 not found. Install with: $PKG_MGR install -g pm2"
fi
ok "PM2: $(pm2 --version)"

if [ ! -f ".env" ]; then
  fail ".env file not found. Copy .env.example to .env and configure it first."
fi
ok ".env found"

if [ ! -f "ecosystem.config.js" ]; then
  fail "ecosystem.config.js not found. Are you in the project root?"
fi
ok "ecosystem.config.js found"

if ! git remote get-url origin &>/dev/null; then
  warn "No git remote 'origin' — git pull will fail. Set it with: git remote add origin <url>"
fi

# ── 2. git pull ──
if [ "$DO_PULL" = true ]; then
  step "2. Pull latest code"
  log "Fetching from origin main..."
  if git pull origin main; then
    ok "Code updated"
  else
    warn "git pull failed — continuing with local code"
    warn "If you have local changes, stash them: git stash && git pull && git stash drop"
  fi
else
  step "2. Pull latest code (skipped via --no-pull)"
fi

# ── 3. Install dependencies ──
step "3. Install dependencies"
if [ "$PKG_MGR" = "bun" ]; then
  log "Running bun install..."
  bun install
else
  log "Running npm install --legacy-peer-deps..."
  npm install --legacy-peer-deps
fi
ok "Dependencies installed"

# ── 4. Prisma generate + db push ──
step "4. Prisma generate + db push"
log "Generating Prisma client..."
npx prisma generate
ok "Prisma client generated"

log "Pushing schema to database..."
npx prisma db push --accept-data-loss
ok "Schema applied"

# ── 5. Seed (optional) ──
if [ "$DO_SEED" = true ]; then
  step "5. Seed database"
  log "Running prisma seed..."
  if bun run seed; then
    ok "Seed completed"
  else
    warn "Seed failed — if this is a re-deploy on an existing DB, this is normal"
  fi
else
  step "5. Seed database (skipped via --no-seed)"
fi

# ── 6. Build ──
if [ "$DO_BUILD" = true ]; then
  step "6. Production build"
  log "Running next build (this takes 1-3 min on WSL2)..."

  # WSL2 often has less RAM than a real VPS — cap Node's heap to avoid OOM kills
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1024"

  if npm run build; then
    ok "Build successful"
  else
    fail "Build failed — aborting deploy (old build still serving)"
  fi

  # Verify the build produced the expected output
  if [ ! -f ".next/BUILD_ID" ]; then
    fail ".next/BUILD_ID not found — build did not complete correctly"
  fi
  ok "BUILD_ID present: $(cat .next/BUILD_ID)"
else
  step "6. Production build (skipped via --no-build)"
fi

# ── 7. PM2 restart ──
step "7. Restart PM2 processes"

# Ensure logs directory exists (ecosystem.config.js writes to ./logs/)
mkdir -p logs

# Check if novsmm is already running
if pm2 describe novsmm &>/dev/null; then
  log "novsmm is already running — restarting..."
  pm2 restart novsmm
  ok "novsmm restarted"
else
  log "novsmm not running — starting via ecosystem.config.js..."
  pm2 start ecosystem.config.js --only novsmm
  ok "novsmm started"
fi

# Save PM2 process list so it survives reboots (if pm2 startup is configured)
pm2 save &>/dev/null || true
ok "PM2 process list saved"

# ── 8. Health check ──
step "8. Health check"
log "Waiting 5s for server to start..."
sleep 5

MAX_RETRIES=6
RETRY=0
HTTP_CODE=000
while [ $RETRY -lt $MAX_RETRIES ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 10 || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    ok "Server healthy (HTTP 200)"
    break
  fi
  RETRY=$((RETRY + 1))
  warn "Attempt $RETRY/$MAX_RETRIES: got HTTP $HTTP_CODE, retrying in 5s..."
  sleep 5
done

if [ "$HTTP_CODE" != "200" ]; then
  fail "Server not responding after $MAX_RETRIES attempts (last: HTTP $HTTP_CODE)"
  info "Check logs: pm2 logs novsmm --lines 50"
  exit 1
fi

# ── 9. Done ──
step "9. Deploy complete 🎉"
echo ""
ok "NOVSMM is live at http://localhost:3000"
ok "PM2 status:"
pm2 list
echo ""
echo -e "${BOLD}${YELLOW}═══ Cloudflare cache purge (CRITICAL) ═══${NC}"
echo -e "${YELLOW}If you deploy to novsmm.shop via Cloudflare, purge the cache${NC}"
echo -e "${YELLOW}so users see the new build:${NC}"
echo ""
echo -e "  1. https://dash.cloudflare.com → novsmm.shop"
echo -e "  2. Caching → Configuration → Purge Everything"
echo -e "  3. Confirm"
echo ""
echo -e "${YELLOW}Or verify if purge is needed:${NC}"
echo -e "  curl -sI https://novsmm.shop/ | grep -i 'cf-cache-status'"
echo -e "  (HIT = cached, may need purge; MISS/DYNAMIC = already fresh)"
echo ""
ok "Done at $(date '+%Y-%m-%d %H:%M:%S')"
