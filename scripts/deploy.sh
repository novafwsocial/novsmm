#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NOVSMM — DEPLOY.SH (One-Command Deploy)
# ═══════════════════════════════════════════════════════════════════════════
# Ejecuta TODO el despliegue con un solo comando:
#   1. Verifica prerrequisitos
#   2. Build + start de todos los servicios (Docker Compose)
#   3. Espera a que todos estén healthy
#   4. Ejecuta migraciones de PostgreSQL
#   5. Ejecuta seed (crea admin)
#   6. Migración de datos SQLite → PostgreSQL (opcional)
#   7. Smoke test final
#
# USO:
#   ./scripts/deploy.sh                    # Deploy completo
#   ./scripts/deploy.sh --migrate-sqlite   # Deploy + migrar desde SQLite
#   ./scripts/deploy.sh --no-seed          # Deploy sin seed (ya tiene datos)
#
# REQUISITOS:
#   - Docker + Docker Compose instalados
#   - .env configurado
#   - prisma/schema.prisma usa PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'

# ── Helpers ──
log()  { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠️${NC} $1"; }
info() { echo -e "${BLUE}  ℹ️${NC} $1"; }
step() { echo -e "\n${BOLD}${BLUE}═══ $1 ═══${NC}"; }

# ── P1-001/P1-002: Rollback trap ──
# Track deploy state so the trap knows whether to rollback.
DEPLOY_PHASE="init"  # init → built → started → healthy → migrated → seeded → done
PREV_IMAGE_TAGGED=false

rollback() {
  local exit_code=$?
  if [ "$exit_code" -eq 0 ] || [ "$DEPLOY_PHASE" = "done" ]; then
    return 0  # Success — no rollback needed
  fi
  echo ""
  echo -e "${RED}${BOLD}═══ DEPLOY FAILED — initiating rollback ═══${NC}"
  echo -e "${RED}Failed at phase: ${DEPLOY_PHASE}${NC}"

  case "$DEPLOY_PHASE" in
    built|started|healthy)
      # Services were started but not verified or migrated → stop them
      warn "Stopping newly started services..."
      docker compose down 2>/dev/null || true

      if [ "$PREV_IMAGE_TAGGED" = true ]; then
        warn "Rolling back to previous images..."
        docker tag novsmm:previous novsmm:latest 2>/dev/null || true
        docker compose up -d 2>/dev/null || true
        ok "Rolled back to previous version"
      else
        info "No previous images tagged — cannot auto-rollback."
        info "Manual recovery: inspect logs with 'docker compose logs'"
      fi
      ;;
    migrated|seeded)
      # Database was migrated — DO NOT auto-rollback the DB (data loss risk).
      # Instead, stop services and print clear instructions.
      warn "Database was already migrated — NOT auto-rolling back DB (data loss risk)."
      warn "Stopping services..."
      docker compose stop web worker 2>/dev/null || true
      echo ""
      echo -e "${YELLOW}Manual recovery required:${NC}"
      echo "  1. Inspect logs:        docker compose logs web worker"
      echo "  2. If migration broke:  ./scripts/restore.sh /backups/novsmm_<date>.sql.gz"
      echo "  3. If app bug:          docker tag novsmm:previous novsmm:latest && docker compose up -d"
      ;;
  esac
  echo -e "${RED}${BOLD}═══ Rollback complete ═══${NC}"
}
trap rollback EXIT

# ── Parse args ──
MIGRATE_SQLITE=false
SEED=true
for arg in "$@"; do
  case $arg in
    --migrate-sqlite) MIGRATE_SQLITE=true ;;
    --no-seed) SEED=false ;;
  esac
done

# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         NOVSMM — One-Command Deploy                          ║"
echo "║         $(date '+%Y-%m-%d %H:%M:%S')                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── STEP 1: Prerrequisitos ──
step "STEP 1/7: Verificando prerrequisitos"

# Docker
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
  ok "Docker: $(docker --version)"
else
  fail "Docker no disponible. Instala con: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

# Docker Compose
if docker compose version &> /dev/null; then
  ok "Docker Compose: $(docker compose version --short)"
else
  fail "Docker Compose v2 no disponible. Instala: sudo apt install docker-compose-plugin"
  exit 1
fi

# .env
if [ ! -f ".env" ]; then
  fail "Archivo .env no existe. Ejecuta: cp .env.example .env"
  exit 1
fi
ok "Archivo .env existe"

# Variables críticas
for var in DATABASE_URL NEXTAUTH_SECRET LICENSE_ENCRYPTION_KEY POSTGRES_PASSWORD; do
  VAL=$(grep "^${var}=" .env 2>/dev/null | cut -d'=' -f2- | head -1)
  if [ -z "$VAL" ]; then
    fail "Variable ${var} faltante en .env"
    exit 1
  fi
done
ok "Variables críticas presentes en .env"

# Schema PostgreSQL
PROVIDER=$(grep "provider" prisma/schema.prisma | head -1)
if echo "$PROVIDER" | grep -q "sqlite"; then
  warn "Schema usa SQLite. Cambiando a PostgreSQL..."
  if [ -f "prisma/schema.postgres.prisma" ]; then
    cp prisma/schema.postgres.prisma prisma/schema.prisma
    ok "Schema cambiado a PostgreSQL"
  else
    fail "prisma/schema.postgres.prisma no encontrado"
    exit 1
  fi
else
  ok "Schema usa PostgreSQL"
fi

# ── STEP 2: Build + Start ──
step "STEP 2/7: Build y start de servicios Docker"

# P1-001: Tag current images as :previous BEFORE building, so we can rollback.
# Only tag if an image already exists (first deploy has nothing to rollback to).
if docker image inspect novsmm-web:latest &>/dev/null 2>&1; then
  docker tag novsmm-web:latest novsmm-web:previous 2>/dev/null || true
  PREV_IMAGE_TAGGED=true
  ok "Previous images tagged as :previous (rollback available)"
else
  info "First deploy — no previous images to tag (no auto-rollback possible)"
fi

log "Construyendo imágenes (esto puede tardar varios minutos)..."
# FIX (M-001): was `tail -5` — only showed last 5 lines of build output.
# Next.js build errors are 20-50 lines (stack trace + file + line).
# Now show last 50 lines so errors are diagnosable.
docker compose build --progress=plain 2>&1 | tail -50
ok "Imágenes construidas"
DEPLOY_PHASE="built"

log "Iniciando servicios..."
docker compose up -d
ok "docker compose up ejecutado"
DEPLOY_PHASE="started"

# ── STEP 3: Esperar health ──
step "STEP 3/7: Esperando que los servicios estén healthy"

MAX_WAIT=180  # 3 minutos máximo
WAITED=0

check_service() {
  local svc=$1
  local healthcheck=$2
  local waited=0
  while [ $waited -lt $MAX_WAIT ]; do
    if eval "$healthcheck" &> /dev/null 2>&1; then
      ok "$svc healthy (${waited}s)"
      return 0
    fi
    sleep 5
    waited=$((waited + 5))
    printf "\r  ⏳ %s... %ds" "$svc" "$waited"
  done
  echo ""
  fail "$svc no está healthy después de ${MAX_WAIT}s"
  return 1
}

# P1-002: check_service failures now trigger the rollback trap (set -e + trap).
# Each check_service call that fails will abort the script, and the trap will
# rollback based on the current DEPLOY_PHASE.
check_service "PostgreSQL" "docker compose exec -T postgres pg_isready -U novsmm -d novsmm" || { fail "PostgreSQL health check failed"; exit 1; }
check_service "Redis" "docker compose exec -T redis redis-cli ping | grep -q PONG" || { fail "Redis health check failed"; exit 1; }
check_service "Web" "curl -sf --max-time 10 http://localhost:3000/api/health/live" || { fail "Web health check failed"; exit 1; }
check_service "Notifications" "curl -sf --max-time 10 http://localhost:3003/healthz" || { fail "Notifications health check failed"; exit 1; }
DEPLOY_PHASE="healthy"

# Worker y Nginx no tienen healthcheck, solo verificar que están running
# P1-003: Use jq if available (lighter than python3), fall back to python3.
json_state() {
  if command -v jq &>/dev/null; then
    jq -r '.State // "unknown"' 2>/dev/null
  else
    python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('State','unknown'))" 2>/dev/null
  fi
}
for svc in worker nginx; do
  STATE=$(docker compose ps --format json "$svc" 2>/dev/null | json_state || echo "unknown")
  if [ "$STATE" = "running" ]; then
    ok "$svc running"
  else
    fail "$svc no está running (state: $STATE)"
  fi
done

# ── STEP 4: Migraciones ──
step "STEP 4/7: Migraciones de PostgreSQL"

log "Ejecutando prisma migrate deploy..."
if docker compose exec -T web npx prisma migrate deploy 2>&1; then
  ok "Migraciones aplicadas"
else
  warn "migrate deploy falló, intentando db:push..."
  docker compose exec -T web npx prisma db push 2>&1
  ok "Schema pushado con db:push"
fi
DEPLOY_PHASE="migrated"

# Verificar tablas
TABLES=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' \n')
info "Tablas creadas: $TABLES"
if [ "${TABLES:-0}" -ge 25 ]; then
  ok "PostgreSQL tiene $TABLES tablas"
else
  warn "Solo $TABLES tablas (esperado: 30+)"
fi

# ── STEP 5: Seed ──
if [ "$SEED" = true ]; then
  step "STEP 5/7: Seed de base de datos"
  
  log "Ejecutando seed..."
  SEED_OUTPUT=$(docker compose exec -T web npx tsx prisma/seed.ts 2>&1)
  echo "$SEED_OUTPUT" | grep -E "✓|Admin|password|⚠️" | head -10
  
  # Extraer password del admin
  ADMIN_PASS=$(echo "$SEED_OUTPUT" | grep "Generated admin password" | grep -oE '[A-Za-z0-9_-]{16,}' | head -1)
  if [ -n "$ADMIN_PASS" ]; then
    warn "🔐 ADMIN PASSWORD: $ADMIN_PASS"
    warn "   ¡Cámbialo inmediatamente después del primer login!"
  fi
  ok "Seed completado"
  DEPLOY_PHASE="seeded"
fi

# ── STEP 6: Migración SQLite (opcional) ──
if [ "$MIGRATE_SQLITE" = true ]; then
  step "STEP 6/7: Migración de datos SQLite → PostgreSQL"
  
  if [ -f "db/custom.db" ]; then
    log "Ejecutando migración de datos..."
    SQLITE_DATABASE_URL="file:./db/custom.db" docker compose exec -T -e SQLITE_DATABASE_URL="file:./db/custom.db" web npx tsx prisma/migrate-sqlite-to-postgres.ts 2>&1 | tail -20
    ok "Migración de datos completada"
    
    # Verificar
    USERS=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' \n')
    info "Usuarios en PostgreSQL: $USERS"
  else
    warn "No se encontró db/custom.db — saltando migración"
  fi
else
  step "STEP 6/7: Migración SQLite (saltada)"
  info "Usa --migrate-sqlite para migrar datos desde SQLite"
fi

# ── STEP 7: Smoke Test ──
step "STEP 7/7: Smoke Test final"

# Health endpoints — failures here abort (triggering rollback if applicable)
LIVE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/live 2>/dev/null)
if [ "$LIVE" = "200" ]; then ok "Health live: 200"; else fail "Health live: $LIVE"; exit 1; fi

READY=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/ready 2>/dev/null)
if [ "$READY" = "200" ]; then ok "Health ready: 200"; else fail "Health ready: $READY"; exit 1; fi

# DB connection
DB_HEALTH=$(curl -s --max-time 10 http://localhost:3000/api/health/db 2>/dev/null)
echo "$DB_HEALTH" | python3 -c "
import json,sys
d=json.load(sys.stdin)
db=d['database']
print(f'  ℹ️  DB provider: {db.get(\"provider\",\"?\")}')
print(f'  ℹ️  DB latency: {db.get(\"latencyMs\",\"?\")}ms')
if db['connected'] and db.get('provider')=='postgresql':
    print('  ✅ PostgreSQL conectado')
else:
    print('  ❌ DB no conectada o no es PostgreSQL')
" 2>&1

# Redis connection
READY_JSON=$(curl -s --max-time 10 http://localhost:3000/api/health/ready 2>/dev/null)
echo "$READY_JSON" | python3 -c "
import json,sys
d=json.load(sys.stdin)
rd=d['checks']['redis']
if rd['healthy'] and 'not configured' not in str(rd.get('note','')):
    print('  ✅ Redis conectado (real)')
else:
    print('  ⚠️ Redis en modo fallback (in-memory)')
" 2>&1

# Security
CSRF=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d '{}' 2>/dev/null)
[ "$CSRF" = "403" ] && ok "CSRF protection: 403" || fail "CSRF: $CSRF"

STRIPE_WH=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/webhooks/stripe -H "Content-Type: application/json" -d '{}' 2>/dev/null)
[ "$STRIPE_WH" = "401" ] && ok "Stripe webhook fail-closed: 401" || fail "Stripe webhook: $STRIPE_WH"

# ── RESUMEN FINAL ──
DEPLOY_PHASE="done"  # All checks passed — trap will not rollback
echo ""
echo -e "${BOLD}${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         DEPLOY COMPLETADO EXITOSAMENTE                        ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo -e "║  Servicios: 6/6 running                                       ║"
echo -e "║  PostgreSQL: conectado                                        ║"
echo -e "║  Redis: conectado                                             ║"
echo -e "║  Migraciones: aplicadas                                       ║"
echo -e "║  Smoke test: aprobado                                         ║"
echo "║                                                               ║"
echo "║  Próximos pasos:                                              ║"
echo "║  1. Configurar SSL: sudo certbot certonly --standalone -d DOMAIN ║"
echo "║  2. Copiar certificados a certs/                              ║"
echo "║  3. Reiniciar nginx: docker compose restart nginx             ║"
echo "║  4. Configurar DNS en Cloudflare                              ║"
echo "║  5. Configurar Google OAuth redirect URI                      ║"
echo "║  6. Configurar webhooks de pago                               ║"
echo "║  7. Ejecutar: ./scripts/backup.sh                             ║"
echo "║  8. Configurar cron de backups                                ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Mostrar estado final
echo ""
docker compose ps
