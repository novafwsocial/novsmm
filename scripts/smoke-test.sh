#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Smoke Test Post-Deploy
# ─────────────────────────────────────────────────────────────────────────────
# Pruebas rápidas para verificar que la app funciona correctamente
# después del deploy. Ejecutar DESPUÉS de validate-postgres-redis.sh.
#
# USO:
#   ./scripts/smoke-test.sh https://novsmm.com
#   ./scripts/smoke-test.sh http://localhost
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BASE_URL="${1:-http://localhost}"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

ok()   { echo -e "  ${GREEN}✅${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}❌${NC} $1"; FAIL=$((FAIL+1)); }

echo "════════════════════════════════════════════════════════════════"
echo "  NOVSMM — Smoke Test"
echo "  URL: $BASE_URL"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ── 1. Health ──
echo "=== 1. HEALTH ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health/live" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "Health live: 200" || fail "Health live: $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health/ready" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "Health ready: 200" || fail "Health ready: $STATUS"

READY=$(curl -s "${BASE_URL}/api/health/ready" 2>/dev/null)
echo "$READY" | python3 -c "
import json,sys
d=json.load(sys.stdin)
db=d['checks']['database']
rd=d['checks']['redis']
print(f'  DB: {db[\"healthy\"]} ({db.get(\"latencyMs\",\"?\")}ms)')
print(f'  Redis: {rd[\"healthy\"]}')
" 2>&1

echo ""

# ── 2. Public APIs ──
echo "=== 2. PUBLIC APIS ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/public/settings" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "Public settings: 200" || fail "Public settings: $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/status" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "Status: 200" || fail "Status: $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/payment-methods" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "Payment methods: 200" || fail "Payment methods: $STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/services?page=1&limit=5" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "Services: 200" || fail "Services: $STATUS"

echo ""

# ── 3. Security ──
echo "=== 3. SECURITY ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/orders" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
[ "$STATUS" = "403" ] && ok "CSRF (sin Origin): 403" || fail "CSRF (sin Origin): $STATUS (esperado 403)"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/webhooks/stripe" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
[ "$STATUS" = "401" ] && ok "Stripe webhook fail-closed: 401" || fail "Stripe webhook: $STATUS (esperado 401)"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/webhooks/mercadopago" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
[ "$STATUS" = "401" ] && ok "MP webhook fail-closed: 401" || fail "MP webhook: $STATUS (esperado 401)"

echo ""

# ── 4. Auth ──
echo "=== 4. AUTH ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/auth/session" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "Session endpoint: 200" || fail "Session: $STATUS"

PROVIDERS=$(curl -s "${BASE_URL}/api/auth/providers" 2>/dev/null)
echo "$PROVIDERS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
providers=list(d.keys())
print(f'  Providers: {providers}')
if 'google' in providers:
  print('  ✅ Google OAuth disponible')
else:
  print('  ⚠️ Google OAuth NO disponible (configura credenciales)')
" 2>&1

echo ""

# ── 5. Metrics ──
echo "=== 5. METRICS ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/metrics" 2>/dev/null)
[ "$STATUS" = "200" ] && ok "Prometheus metrics: 200" || fail "Metrics: $STATUS"

echo ""

# ── 6. Login + Authenticated APIs ──
echo "=== 6. LOGIN + APIs AUTENTICADAS ==="

# Get CSRF
CSRF=$(curl -s -c /tmp/smoke.txt "${BASE_URL}/api/auth/csrf" 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null)

# Login (esto fallará si las credenciales no son correctas — eso es esperado en smoke test)
LOGIN_STATUS=$(curl -s -b /tmp/smoke.txt -c /tmp/smoke.txt -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/auth/callback/credentials" -H "Content-Type: application/x-www-form-urlencoded" -H "Origin: ${BASE_URL}" -d "email=admin@novsmm.io&password=test&csrfToken=${CSRF}&callbackUrl=%2F&json=true" 2>/dev/null)

if [ "$LOGIN_STATUS" = "200" ]; then
  ok "Login endpoint: 200"
  
  # Test authenticated APIs
  for endpoint in "dashboard" "orders" "wallet" "notifications"; do
    STATUS=$(curl -s -b /tmp/smoke.txt -o /dev/null -w "%{http_code}" "${BASE_URL}/api/${endpoint}" 2>/dev/null)
    [ "$STATUS" = "200" ] && ok "API /api/${endpoint}: 200" || fail "API /api/${endpoint}: $STATUS"
  done
else
  echo "  ⚠️ Login con credenciales de prueba falló (esperado si no configuraste admin)"
  echo "  ℹ️ Configura el admin con: docker compose exec web bun run prisma/seed.ts"
fi

echo ""

# ── RESUMEN ──
echo "════════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}PASS: ${PASS}${NC}  ${RED}FAIL: ${FAIL}${NC}"
if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}✅ SMOKE TEST APROBADO${NC}"
else
  echo -e "  ${RED}❌ HAY ${FAIL} FALLOS${NC}"
fi
echo "════════════════════════════════════════════════════════════════"
