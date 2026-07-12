#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NOVSMM — DEPLOY LOW MEMORY (2GB RAM VPS)
# ═══════════════════════════════════════════════════════════════════════════
# Deploys NOVSMM on a VPS with only 2GB RAM using the optimized low-memory
# configuration (SQLite + no Redis + no monitoring stack).
#
# USAGE:
#   chmod +x scripts/deploy-lowmem.sh
#   ./scripts/deploy-lowmem.sh
#
# PREREQUISITES:
#   - Docker + Docker Compose installed
#   - .env file configured (see .env.example)
#   - SSL certificates in certs/ (or run certbot after deploy)
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; exit 1; }
info() { echo -e "${CYAN}  ℹ️${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠️${NC} $1"; }

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM — Deploy LOW MEMORY (2GB VPS)                         ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Check RAM ──
echo "═══ Step 1: System Check ═══"
TOTAL_RAM=$(free -m | awk '/^Mem:/ {print $2}')
info "Total RAM: ${TOTAL_RAM}MB"
if [ "$TOTAL_RAM" -lt 1800 ]; then
  warn "Less than 2GB RAM detected — swap file is critical"
fi
ok "System check passed"

# ── 2. Create swap file (CRITICAL for 2GB VPS) ──
echo ""
echo "═══ Step 2: Swap File (prevents OOM kills) ═══"
if swapon --show | grep -q "/swapfile"; then
  ok "Swap file already exists"
else
  info "Creating 2GB swap file..."
  if [ "$(id -u)" -eq 0 ]; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    # Persist across reboots
    if ! grep -q "/swapfile" /etc/fstab; then
      echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
    # Lower swappiness (use swap only when necessary)
    echo 10 > /proc/sys/vm/swappiness 2>/dev/null || true
    if ! grep -q "swappiness" /etc/sysctl.conf; then
      echo "vm.swappiness=10" >> /etc/sysctl.conf
    fi
    ok "2GB swap file created and activated"
  else
    warn "Not root — skipping swap file creation"
    warn "Run as root: fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile"
  fi
fi
info "Swap status: $(swapon --show 2>/dev/null | tail -n +2 | wc -l) swap devices active"

# ── 3. Check Docker ──
echo ""
echo "═══ Step 3: Docker Check ═══"
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
  ok "Docker: $(docker --version)"
else
  fail "Docker not available. Install: curl -fsSL https://get.docker.com | sh"
fi
if docker compose version &> /dev/null; then
  ok "Docker Compose: $(docker compose version --short)"
else
  fail "Docker Compose v2 not available. Install: sudo apt install docker-compose-plugin"
fi

# ── 4. Check .env ──
echo ""
echo "═══ Step 4: Environment Variables ═══"
if [ ! -f ".env" ]; then
  fail ".env not found. Run: cp .env.example .env"
fi

for var in NEXTAUTH_SECRET NEXTAUTH_URL LICENSE_ENCRYPTION_KEY; do
  VAL=$(grep "^${var}=" .env 2>/dev/null | cut -d'=' -f2- | head -1)
  if [ -z "$VAL" ]; then
    fail "${var} missing in .env"
  fi
  ok "${var} configured"
done

# ── 5. Build + Start ──
echo ""
echo "═══ Step 5: Build + Start (low-memory mode) ═══"
info "Building NOVSMM with low-memory Docker Compose..."
info "This uses SQLite (no PostgreSQL) + in-memory cache (no Redis)"
info "Expected RAM usage: ~800MB-1GB total"

docker compose -f docker-compose.lowmem.yml up -d --build

ok "Containers started"

# ── 6. Wait for health ──
echo ""
echo "═══ Step 6: Health Check ═══"
info "Waiting for app to be ready..."
# FIX (L-011): use wall-clock time instead of counting iterations.
# Previously WAITED counted +5 per iteration, but each iteration could
# take up to 10s (5s curl + 5s sleep). MAX_WAIT=120 could be 240s real.
MAX_WAIT=120
START_TIME=$(date +%s)
while true; do
  ELAPSED=$(($(date +%s) - START_TIME))
  if [ $ELAPSED -ge $MAX_WAIT ]; then
    break
  fi
  if curl -sf --max-time 5 http://localhost:3000/api/health/live &>/dev/null; then
    ok "App healthy (${ELAPSED}s)"
    break
  fi
  sleep 5
  printf "\r  ⏳ Waiting... %ds" "$ELAPSED"
done
WAITED=$(($(date +%s) - START_TIME))
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
  # FIX (H-004): abort the deploy instead of just warning. Previously
  # this continued to run migrations + seed on a broken deploy, which
  # could corrupt the DB or leave the system in an inconsistent state.
  fail "App not responding after ${MAX_WAIT}s — aborting deploy."
  echo "  Check logs: docker compose -f docker-compose.lowmem.yml logs web"
  echo "  Rollback: docker compose -f docker-compose.lowmem.yml down"
  exit 1
fi

# ── 7. Run migrations ──
echo ""
echo "═══ Step 7: Database Setup ═══"
info "Running Prisma migrations..."
docker compose -f docker-compose.lowmem.yml exec -T web bun run prisma migrate deploy 2>/dev/null || {
  warn "migrate deploy failed, trying db:push..."
  docker compose -f docker-compose.lowmem.yml exec -T web bun run db:push
}
ok "Database ready"

# ── 8. Seed (optional) ──
echo ""
echo "═══ Step 8: Seed (admin account) ═══"
if [ "${SKIP_SEED:-false}" != "true" ]; then
  info "Running seed (creates admin account)..."
  SEED_OUTPUT=$(docker compose -f docker-compose.lowmem.yml exec -T web bun run prisma/seed.ts 2>&1)
  ADMIN_PASS=$(echo "$SEED_OUTPUT" | grep "Generated admin password" | grep -oE '[A-Za-z0-9_-]{16,}' | head -1)
  if [ -n "$ADMIN_PASS" ]; then
    warn "🔐 ADMIN PASSWORD: $ADMIN_PASS"
    warn "   ¡Cámbialo inmediatamente después del primer login!"
  fi
  ok "Seed completed"
else
  info "Skipping seed (SKIP_SEED=true)"
fi

# ── 9. Memory report ──
echo ""
echo "═══ Step 9: Memory Report ═══"
info "Container memory usage:"
docker stats --no-stream --format "  {{.Name}}: {{.MemUsage}} ({{.MemPerc}})" 2>/dev/null | head -5
echo ""
info "System memory:"
free -h | head -3

# ── 10. Summary ──
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOY COMPLETADO (LOW MEMORY MODE)                       ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  App:          http://localhost:3000                          ║"
echo "║  Database:     SQLite (file:/app/db/custom.db)                ║"
echo "║  Cache:        In-memory (no Redis)                           ║"
echo "║  Monitoring:   Disabled (add later with bigger VPS)           ║"
echo "║  Workers:      In-process (no separate process)               ║"
echo "║                                                               ║"
echo "║  RAM usage:    ~800MB-1GB (leaves ~1GB headroom)              ║"
echo "║  Swap:         2GB (prevents OOM kills)                       ║"
echo "║                                                               ║"
echo "║  Próximos pasos:                                              ║"
echo "║  1. Configurar SSL: sudo certbot certonly --standalone -d DOMAIN ║"
echo "║  2. Copiar certificados a certs/                              ║"
echo "║  3. Reiniciar nginx: docker compose -f docker-compose.lowmem.yml restart nginx ║"
echo "║  4. Configurar DNS                                             ║"
echo "║  5. Configurar cron de backups                                ║"
echo "║                                                               ║"
echo "║  ⚠️  Cuando compres un VPS más grande (8GB+):                  ║"
echo "║     Cambia a: docker compose up -d --build                     ║"
echo "║     (usa PostgreSQL + Redis + monitoring completo)             ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
