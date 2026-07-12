#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NOVSMM — HEALTHCHECK.SH (Continuous Monitoring)
# ═══════════════════════════════════════════════════════════════════════════
# Monitorea todos los servicios y envía alertas si algo falla.
#
# USO:
#   ./scripts/healthcheck.sh                    # Check una vez
#   ./scripts/healthcheck.sh --watch            # Monitoreo continuo (cada 60s)
#   ./scripts/healthcheck.sh --watch --interval=30  # Cada 30s
#
# CRON (cada 5 min):
#   */5 * * * * /opt/novsmm/scripts/healthcheck.sh >> /var/log/novsmm-health.log 2>&1
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; }
info() { echo -e "${CYAN}  ℹ️${NC} $1"; }

WATCH=false
INTERVAL=60

for arg in "$@"; do
  case $arg in
    --watch) WATCH=true ;;
    --interval=*) INTERVAL="${arg#*=}" ;;
  esac
done

# Webhook de alertas (Slack, Discord, etc.)
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

send_alert() {
  local message="$1"
  echo -e "${RED}🚨 ALERT: ${message}${NC}"

  if [ -n "$ALERT_WEBHOOK" ]; then
    # P1-018: Add --max-time to prevent indefinite hang if webhook endpoint is unreachable
    curl -s --max-time 10 -X POST "$ALERT_WEBHOOK" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"🚨 NOVSMM Alert: ${message}\"}" \
      &>/dev/null || true
  fi
}

# P1-017: Use jq if available (lighter than python3), fall back to python3
json_state() {
  if command -v jq &>/dev/null; then
    jq -r '.State // "unknown"' 2>/dev/null
  else
    python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('State','unknown'))" 2>/dev/null
  fi
}

run_check() {
  local CHECKS_PASS=0
  local CHECKS_FAIL=0
  local ALERTS=""

  echo "╔═══════════════════════════════════════════════════════════════╗"
  echo "║  NOVSMM Healthcheck — $(date '+%Y-%m-%d %H:%M:%S')              ║"
  echo "╚═══════════════════════════════════════════════════════════════╝"

  # ── Docker services ──
  for svc in postgres redis web worker notifications nginx; do
    STATE=$(docker compose ps --format json "$svc" 2>/dev/null | json_state || echo "not found")
    if [ "$STATE" = "running" ]; then
      ok "$svc: running"
      CHECKS_PASS=$((CHECKS_PASS+1))
    else
      fail "$svc: $STATE"
      CHECKS_FAIL=$((CHECKS_FAIL+1))
      ALERTS="${ALERTS}Service $svc is $STATE. "
    fi
  done
  
  # ── PostgreSQL ──
  if docker compose exec -T --timeout 10 postgres pg_isready -U novsmm -d novsmm &>/dev/null 2>&1; then
    ok "PostgreSQL: ready"
    CHECKS_PASS=$((CHECKS_PASS+1))
    
    # Connection count
    CONNS=$(docker compose exec -T --timeout 10 postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' \n')
    info "PostgreSQL connections: $CONNS"
  else
    fail "PostgreSQL: NOT ready"
    CHECKS_FAIL=$((CHECKS_FAIL+1))
    ALERTS="${ALERTS}PostgreSQL is not ready. "
  fi
  
  # ── Redis ──
  PONG=$(docker compose exec -T --timeout 10 redis redis-cli ping 2>/dev/null | tr -d ' \n\r')
  if [ "$PONG" = "PONG" ]; then
    ok "Redis: PONG"
    CHECKS_PASS=$((CHECKS_PASS+1))
    
    # Memory
    REDIS_MEM=$(docker compose exec -T --timeout 10 redis redis-cli INFO memory 2>/dev/null | grep "^used_memory:" | cut -d: -f2 | tr -d ' \r')
    REDIS_MAX=256000000  # 256MB
    if [ "${REDIS_MEM:-0}" -gt "$REDIS_MAX" ]; then
      warn "Redis memory: $((REDIS_MEM/1024/1024))MB (> 256MB limit)"
      ALERTS="${ALERTS}Redis memory at $((REDIS_MEM/1024/1024))MB. "
    fi
  else
    fail "Redis: NOT responding"
    CHECKS_FAIL=$((CHECKS_FAIL+1))
    ALERTS="${ALERTS}Redis is not responding. "
  fi
  
  # ── Web app ──
  WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/api/health/live 2>/dev/null || echo "000")
  if [ "$WEB_STATUS" = "200" ]; then
    ok "Web: alive (200)"
    CHECKS_PASS=$((CHECKS_PASS+1))
  else
    fail "Web: $WEB_STATUS"
    CHECKS_FAIL=$((CHECKS_FAIL+1))
    ALERTS="${ALERTS}Web app returning $WEB_STATUS. "
  fi
  
  # ── Health ready ──
  READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/api/health/ready 2>/dev/null || echo "000")
  if [ "$READY_STATUS" = "200" ]; then
    ok "Health ready: 200"
    CHECKS_PASS=$((CHECKS_PASS+1))
  else
    fail "Health ready: $READY_STATUS"
    CHECKS_FAIL=$((CHECKS_FAIL+1))
    ALERTS="${ALERTS}Health ready returning $READY_STATUS. "
  fi
  
  # ── Disk space ──
  DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
  if [ "$DISK_USAGE" -gt 90 ]; then
    fail "Disk usage: ${DISK_USAGE}% (> 90%)"
    ALERTS="${ALERTS}Disk usage at ${DISK_USAGE}%. "
  elif [ "$DISK_USAGE" -gt 80 ]; then
    warn "Disk usage: ${DISK_USAGE}%"
  else
    ok "Disk usage: ${DISK_USAGE}%"
    CHECKS_PASS=$((CHECKS_PASS+1))
  fi
  
  # ── Memory ──
  MEM_USAGE=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2*100}')
  if [ "$MEM_USAGE" -gt 90 ]; then
    fail "Memory usage: ${MEM_USAGE}% (> 90%)"
    ALERTS="${ALERTS}Memory usage at ${MEM_USAGE}%. "
  elif [ "$MEM_USAGE" -gt 80 ]; then
    warn "Memory usage: ${MEM_USAGE}%"
  else
    ok "Memory usage: ${MEM_USAGE}%"
    CHECKS_PASS=$((CHECKS_PASS+1))
  fi
  
  # ── Resumen ──
  echo ""
  echo "  Pass: $CHECKS_PASS | Fail: $CHECKS_FAIL"
  
  if [ $CHECKS_FAIL -gt 0 ]; then
    send_alert "$ALERTS"
    return 1
  else
    echo -e "${GREEN}  ✅ All systems operational${NC}"
    return 0
  fi
}

# ── Ejecutar ──
if [ "$WATCH" = true ]; then
  info "Modo watch activo (interval: ${INTERVAL}s). Ctrl+C para detener."
  while true; do
    echo ""
    run_check || true
    sleep "$INTERVAL"
  done
else
  run_check
fi
