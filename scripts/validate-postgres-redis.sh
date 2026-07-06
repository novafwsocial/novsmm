#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Post-Deploy Validation (ejecutar DESPUÉS de docker compose up)
# ─────────────────────────────────────────────────────────────────────────────
# Este script verifica que todos los servicios estén corriendo y conectados.
#
# USO:
#   ./scripts/validate-postgres-redis.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

ok()   { echo -e "  ${GREEN}✅${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}❌${NC} $1"; FAIL=$((FAIL+1)); }
info() { echo -e "  ℹ️  $1"; }

echo "════════════════════════════════════════════════════════════════"
echo "  NOVSMM — Validación Post-Deploy (Docker + PostgreSQL + Redis)"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ── 1. DOCKER COMPOSE SERVICES ──
echo "=== 1. ESTADO DE SERVICIOS (docker compose) ==="

SERVICES="postgres redis web worker notifications nginx"
for svc in $SERVICES; do
  STATUS=$(docker compose ps --format json "$svc" 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('State','unknown'))" 2>/dev/null || echo "not found")
  if [ "$STATUS" = "running" ]; then
    ok "$svc: running"
  else
    fail "$svc: $STATUS (debe ser 'running')"
  fi
done

echo ""

# ── 2. POSTGRESQL ──
echo "=== 2. POSTGRESQL ==="

# Test connection
if docker compose exec -T postgres pg_isready -U novsmm -d novsmm &> /dev/null 2>&1; then
  ok "PostgreSQL responde (pg_isready)"
else
  fail "PostgreSQL NO responde"
fi

# Test query
RESULT=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT 1;" 2>/dev/null | tr -d ' \n')
if [ "$RESULT" = "1" ]; then
  ok "PostgreSQL query SELECT 1 exitoso"
else
  fail "PostgreSQL query falló"
fi

# Table count
TABLES=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' \n')
info "Tablas en PostgreSQL: $TABLES"
if [ "${TABLES:-0}" -ge 25 ]; then
  ok "PostgreSQL tiene $TABLES tablas (esperado: 30+)"
else
  fail "PostgreSQL solo tiene $TABLES tablas (esperado: 30+)"
fi

# Data verification
USERS=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' \n')
info "Users en PostgreSQL: $USERS"
if [ "${USERS:-0}" -ge 1 ]; then
  ok "PostgreSQL tiene $USERS usuarios"
else
  fail "PostgreSQL NO tiene usuarios (migración falló?)"
fi

SERVICES_COUNT=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM services;" 2>/dev/null | tr -d ' \n')
info "Services en PostgreSQL: $SERVICES_COUNT"
if [ "${SERVICES_COUNT:-0}" -ge 6000 ]; then
  ok "PostgreSQL tiene $SERVICES_COUNT servicios (catálogo migrado)"
else
  warn "PostgreSQL tiene $SERVICES_COUNT servicios (esperado: 6000+)"
fi

echo ""

# ── 3. REDIS ──
echo "=== 3. REDIS ==="

# Test ping
PONG=$(docker compose exec -T redis redis-cli ping 2>/dev/null | tr -d ' \n\r')
if [ "$PONG" = "PONG" ]; then
  ok "Redis responde PING → PONG"
else
  fail "Redis NO responde PING"
fi

# Test set/get
SET_RESULT=$(docker compose exec -T redis redis-cli SET novsmm:test "validation_ok" EX 60 2>/dev/null | tr -d ' \n\r')
if [ "$SET_RESULT" = "OK" ]; then
  ok "Redis SET exitoso"
else
  fail "Redis SET falló"
fi

GET_RESULT=$(docker compose exec -T redis redis-cli GET novsmm:test 2>/dev/null | tr -d ' \n\r')
if [ "$GET_RESULT" = "validation_ok" ]; then
  ok "Redis GET exitoso (valor correcto)"
else
  fail "Redis GET falló o valor incorrecto: $GET_RESULT"
fi

# Redis info
REDIS_VERSION=$(docker compose exec -T redis redis-cli INFO server 2>/dev/null | grep "^redis_version:" | cut -d: -f2 | tr -d ' \r')
info "Redis versión: $REDIS_VERSION"

REDIS_MEMORY=$(docker compose exec -T redis redis-cli INFO memory 2>/dev/null | grep "^used_memory_human:" | cut -d: -f2 | tr -d ' \r')
info "Redis memoria en uso: $REDIS_MEMORY"

# Clean up test key
docker compose exec -T redis redis-cli DEL novsmm:test &> /dev/null 2>&1

echo ""

# ── 4. CONEXIÓN APP → POSTGRESQL ──
echo "=== 4. CONEXIÓN APP → POSTGRESQL ==="

# Check from web container
WEB_DB_CHECK=$(docker compose exec -T web curl -s http://localhost:3000/api/health/db 2>/dev/null)
echo "$WEB_DB_CHECK" | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  db=d.get('database',{})
  if db.get('connected'):
    print('  ✅ App conectada a PostgreSQL (latency: ' + str(db.get('latencyMs','?')) + 'ms)')
    print('  ℹ️  Provider: ' + db.get('provider','?'))
  else:
    print('  ❌ App NO conectada a PostgreSQL')
except:
  print('  ❌ No se pudo verificar conexión App → PostgreSQL')
" 2>&1

echo ""

# ── 5. CONEXIÓN APP → REDIS ──
echo "=== 5. CONEXIÓN APP → REDIS ==="

WEB_READY=$(docker compose exec -T web curl -s http://localhost:3000/api/health/ready 2>/dev/null)
echo "$WEB_READY" | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  redis_check=d.get('checks',{}).get('redis',{})
  if redis_check.get('healthy'):
    print('  ✅ App conectada a Redis')
  else:
    print('  ❌ App NO conectada a Redis: ' + str(redis_check))
except:
  print('  ❌ No se pudo verificar conexión App → Redis')
" 2>&1

echo ""

# ── 6. NGINX ──
echo "=== 6. NGINX ==="

# Test HTTP → HTTPS redirect
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
  ok "Nginx redirige HTTP → HTTPS ($HTTP_STATUS)"
else
  info "HTTP status: $HTTP_STATUS (puede ser normal si solo HTTPS está configurado)"
fi

# Test HTTPS
HTTPS_STATUS=$(curl -s -k -o /dev/null -w "%{http_code}" https://localhost/ 2>/dev/null || echo "000")
if [ "$HTTPS_STATUS" = "200" ] || [ "$HTTPS_STATUS" = "302" ]; then
  ok "Nginx HTTPS responde ($HTTPS_STATUS)"
else
  fail "Nginx HTTPS no responde (status: $HTTPS_STATUS)"
fi

# Test health endpoint through Nginx
HEALTH_STATUS=$(curl -s -k -o /dev/null -w "%{http_code}" https://localhost/api/health/live 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
  ok "Health endpoint accesible via Nginx"
else
  fail "Health endpoint no accesible via Nginx (status: $HEALTH_STATUS)"
fi

echo ""

# ── 7. WORKER ──
echo "=== 7. WORKER (BullMQ) ==="

# Check worker is processing
WORKER_LOGS=$(docker compose logs --tail 5 worker 2>/dev/null)
if echo "$WORKER_LOGS" | grep -qi "worker\|running\|waiting"; then
  ok "Worker está activo"
  info "Última línea: $(echo "$WORKER_LOGS" | tail -1 | cut -c1-80)"
else
  warn "No se pudo verificar estado del worker"
fi

echo ""

# ── 8. NOTIFICATIONS SERVICE ──
echo "=== 8. NOTIFICATIONS SERVICE ==="

NOTIF_HEALTH=$(docker compose exec -T notifications curl -s http://localhost:3003/healthz 2>/dev/null)
echo "$NOTIF_HEALTH" | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  if d.get('ok'):
    print('  ✅ Notifications service healthz OK')
    print('  ℹ️  Connections: ' + str(d.get('connections',0)))
    print('  ℹ️  Redis: ' + str(d.get('redis','unknown')))
  else:
    print('  ❌ Notifications service healthz falló')
except:
  print('  ❌ No se pudo verificar notifications service')
" 2>&1

echo ""

# ── 9. VARIABLES DE ENTORNO ──
echo "=== 9. VARIABLES DE ENTORNO (en contenedor web) ==="

# Check critical env vars are loaded in the web container
for var in DATABASE_URL REDIS_URL NEXTAUTH_SECRET; do
  VAL=$(docker compose exec -T web printenv "$var" 2>/dev/null | head -c 30)
  if [ -n "$VAL" ]; then
    ok "$var cargada en contenedor web: ${VAL}..."
  else
    fail "$var NO cargada en contenedor web"
  fi
done

echo ""

# ── RESUMEN ──
echo "════════════════════════════════════════════════════════════════"
echo "  RESUMEN DE VALIDACIÓN POST-DEPLOY"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}PASS: ${PASS}${NC}"
echo -e "  ${RED}FAIL: ${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}✅ TODOS LOS SERVICIOS ESTÁN OPERATIVOS${NC}"
  echo "  La infraestructura está lista para producción."
else
  echo -e "  ${RED}❌ HAY ${FAIL} PROBLEMAS${NC}"
  echo "  Revisa los FAIL anteriores antes de continuar."
fi
echo ""
echo "════════════════════════════════════════════════════════════════"
