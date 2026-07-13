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
#
# EXIT CODES (P1-037):
#   0 — All checks passed
#   1 — One or more checks failed
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

# P1-039: Use a secure temp directory with random name (mktemp) instead of
# the predictable /tmp/smoke.txt. The old path was a symlink attack vector
# and could collide with concurrent smoke test runs.
SMOKE_COOKIE_JAR=$(mktemp /tmp/novsmm-smoke-XXXXXX.cookies)
trap 'rm -f "$SMOKE_COOKIE_JAR"' EXIT

echo "════════════════════════════════════════════════════════════════"
echo "  NOVSMM — Smoke Test"
echo "  URL: $BASE_URL"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
echo ""

# P1-038: All curl calls now use --max-time 10 to prevent indefinite hangs.

# ── 1. Health ──
echo "=== 1. HEALTH ==="
STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health/live" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Health live: 200" || fail "Health live: $STATUS"

STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health/ready" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Health ready: 200" || fail "Health ready: $STATUS"

READY=$(curl -s --max-time 10 "${BASE_URL}/api/health/ready" 2>/dev/null)
# P1-024 (applied here too): jq with python3 fallback
if command -v jq &>/dev/null; then
  # FIX (M-003): Redis line was using .checks.database.healthy (copy-paste
  # bug) instead of .checks.redis.healthy. Now shows the correct Redis status.
  echo "$READY" | jq -r '"  DB: \(.checks.database.healthy) (\(.checks.database.latencyMs // "?")ms)\n  Redis: \(.checks.redis.healthy // "n/a") (\(.checks.redis.latencyMs // "?")ms)"' 2>/dev/null || echo "  ⚠️ No se pudo parsear health/ready"
else
  echo "$READY" | python3 -c "
import json,sys
d=json.load(sys.stdin)
db=d['checks']['database']
rd=d['checks']['redis']
print(f'  DB: {db[\"healthy\"]} ({db.get(\"latencyMs\",\"?\")}ms)')
print(f'  Redis: {rd[\"healthy\"]}')
" 2>&1
fi

echo ""

# ── 2. Public APIs ──
echo "=== 2. PUBLIC APIS ==="
STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/public/settings" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Public settings: 200" || fail "Public settings: $STATUS"

STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/status" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Status: 200" || fail "Status: $STATUS"

STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/payment-methods" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Payment methods: 200" || fail "Payment methods: $STATUS"

STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/services?page=1&limit=5" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Services: 200" || fail "Services: $STATUS"

echo ""

# ── 3. Security ──
echo "=== 3. SECURITY ==="
STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/orders" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
[ "$STATUS" = "403" ] && ok "CSRF (sin Origin): 403" || fail "CSRF (sin Origin): $STATUS (esperado 403)"

STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/webhooks/nowpayments" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
[ "$STATUS" = "401" ] && ok "NowPayments webhook fail-closed: 401" || fail "NowPayments webhook: $STATUS (esperado 401)"

STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/webhooks/mercadopago" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
[ "$STATUS" = "401" ] && ok "MP webhook fail-closed: 401" || fail "MP webhook: $STATUS (esperado 401)"

echo ""

# ── 4. Auth ──
echo "=== 4. AUTH ==="
STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/auth/session" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Session endpoint: 200" || fail "Session: $STATUS"

PROVIDERS=$(curl -s --max-time 10 "${BASE_URL}/api/auth/providers" 2>/dev/null)
if command -v jq &>/dev/null; then
  echo "$PROVIDERS" | jq -r 'keys | "  Providers: \(.)"' 2>/dev/null || echo "  ⚠️ No se pudo parsear providers"
  echo "$PROVIDERS" | jq -e 'has("google")' >/dev/null 2>&1 && ok "Google OAuth disponible" || echo "  ⚠️ Google OAuth NO disponible (configura credenciales)"
else
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
fi

echo ""

# ── 5. Metrics ──
echo "=== 5. METRICS ==="
STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/metrics" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && ok "Prometheus metrics: 200" || fail "Metrics: $STATUS"

echo ""

# ── 6. Login + Authenticated APIs ──
echo "=== 6. LOGIN + APIs AUTENTICADAS ==="

# Get CSRF (P1-039: use secure cookie jar)
CSRF=$(curl -s --max-time 10 -c "$SMOKE_COOKIE_JAR" "${BASE_URL}/api/auth/csrf" 2>/dev/null | {
  if command -v jq &>/dev/null; then
    jq -r '.csrfToken // ""' 2>/dev/null
  else
    python3 -c "import json,sys;print(json.load(sys.stdin).get('csrfToken',''))" 2>/dev/null
  fi
})

# Login (esto fallará si las credenciales no son correctas — eso es esperado en smoke test)
LOGIN_STATUS=$(curl -s --max-time 10 -b "$SMOKE_COOKIE_JAR" -c "$SMOKE_COOKIE_JAR" -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/auth/callback/credentials" -H "Content-Type: application/x-www-form-urlencoded" -H "Origin: ${BASE_URL}" -d "email=admin@novsmm.io&password=test&csrfToken=${CSRF}&callbackUrl=%2F&json=true" 2>/dev/null || echo "000")

if [ "$LOGIN_STATUS" = "200" ]; then
  ok "Login endpoint: 200"

  # Test authenticated APIs
  for endpoint in "dashboard" "orders" "wallet" "notifications"; do
    STATUS=$(curl -s --max-time 10 -b "$SMOKE_COOKIE_JAR" -o /dev/null -w "%{http_code}" "${BASE_URL}/api/${endpoint}" 2>/dev/null || echo "000")
    [ "$STATUS" = "200" ] && ok "API /api/${endpoint}: 200" || fail "API /api/${endpoint}: $STATUS"
  done
else
  echo "  ⚠️ Login con credenciales de prueba falló (esperado si no configuraste admin)"
  echo "  ℹ️ Configura el admin con: docker compose exec web bun run prisma/seed.ts"
fi

echo ""

# ── 7. FLUJOS CRÍTICOS (M-004) ──
echo "=== 7. FLUJOS CRÍTICOS ==="

# Register: should reject invalid email
REG_STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/auth/register" -H "Content-Type: application/json" -H "Origin: ${BASE_URL}" -d '{"email":"invalid","password":"short","username":"x"}' 2>/dev/null || echo "000")
[ "$REG_STATUS" = "422" ] && ok "Register rejects invalid email: 422" || fail "Register invalid email: expected 422, got $REG_STATUS"

# Order: should reject unauthenticated
ORDER_STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/orders" -H "Content-Type: application/json" -H "Origin: ${BASE_URL}" -d '{"serviceId":"test","quantity":1}' 2>/dev/null || echo "000")
[ "$ORDER_STATUS" = "401" ] && ok "Order requires auth: 401" || fail "Order unauthenticated: expected 401, got $ORDER_STATUS"

# Wallet topup: should reject unauthenticated
WALLET_STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/wallet/topup" -H "Content-Type: application/json" -H "Origin: ${BASE_URL}" -d '{"amount":10,"method":"paypal"}' 2>/dev/null || echo "000")
[ "$WALLET_STATUS" = "401" ] && ok "Wallet topup requires auth: 401" || fail "Wallet topup unauthenticated: expected 401, got $WALLET_STATUS"

# Public API v1: should reject missing API key
API_STATUS=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/services" 2>/dev/null || echo "000")
[ "$API_STATUS" = "401" ] && ok "API v1 requires key: 401" || fail "API v1 no key: expected 401, got $API_STATUS"

echo ""

# ── RESUMEN ──
echo "════════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}PASS: ${PASS}${NC}  ${RED}FAIL: ${FAIL}${NC}"
if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}✅ SMOKE TEST APROBADO${NC}"
  exit 0
else
  echo -e "  ${RED}❌ HAY ${FAIL} FALLOS${NC}"
  exit 1  # P1-037: explicit non-zero exit on failure
fi
