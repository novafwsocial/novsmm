#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NOVSMM — MONITOR-SETUP.SH
# ═══════════════════════════════════════════════════════════════════════════
# Levanta Prometheus + Grafana + AlertManager + Node Exporter.
# Configura el datasource de Prometheus en Grafana.
#
# USO:
#   ./scripts/monitor-setup.sh
#   GRAFANA_PASSWORD=mypassword ./scripts/monitor-setup.sh
#
# DESPUÉS:
#   Grafana:    http://localhost:3001 (admin / tu_password)
#   Prometheus: http://localhost:9090
#   AlertManager: http://localhost:9093
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
info() { echo -e "${CYAN}  ℹ️${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠️${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; }

# ── Validate Grafana credentials BEFORE starting any containers ──
# P0-010: Default password "admin" is a critical security risk.
# P0-011: Never print the password to stdout (logs/cron/journal).
GRAFANA_USER="${GRAFANA_USER:-admin}"
if [ -z "${GRAFANA_PASSWORD:-}" ]; then
  fail "GRAFANA_PASSWORD no está configurada."
  echo "  Setéala en .env o pásala como env var:"
  echo "    GRAFANA_PASSWORD='tu_password_segura' ./scripts/monitor-setup.sh"
  echo "  No debe ser 'admin' (default inseguro)."
  exit 1
fi
if [ "$GRAFANA_PASSWORD" = "admin" ]; then
  fail "GRAFANA_PASSWORD='admin' no está permitido (password por defecto inseguro)."
  echo "  Genera una password segura: openssl rand -base64 24"
  exit 1
fi
if [ "${#GRAFANA_PASSWORD}" -lt 8 ]; then
  fail "GRAFANA_PASSWORD demasiado corta (mínimo 8 caracteres)."
  exit 1
fi

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM — Monitoring Setup                                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Verificar que docker compose está corriendo
if ! docker compose ps &>/dev/null; then
  echo "❌ Docker Compose no está corriendo. Ejecuta ./scripts/deploy.sh primero."
  exit 1
fi

# Verificar que la red novsmm-network existe
if ! docker network inspect novsmm-network &>/dev/null 2>&1; then
  echo "❌ La red novsmm-network no existe. Ejecuta ./scripts/deploy.sh primero."
  exit 1
fi

info "Levantando servicios de monitoreo..."

# P1-023: Verify docker-compose.monitoring.yml exists BEFORE trying to use it.
# Previously, a missing file would produce a confusing docker compose error.
if [ ! -f "docker-compose.monitoring.yml" ]; then
  fail "docker-compose.monitoring.yml no encontrado en el directorio actual."
  echo "  Asegúrate de ejecutar este script desde la raíz del proyecto NOVSMM."
  exit 1
fi
ok "docker-compose.monitoring.yml existe"

# P1-025: Also verify the alertmanager config + prometheus config exist
for cfg in monitoring/prometheus.yml monitoring/alerts.yml monitoring/alertmanager.yml; do
  if [ ! -f "$cfg" ]; then
    fail "Config file faltante: $cfg"
    exit 1
  fi
done
ok "Archivos de configuración de monitoreo presentes"

# Levantar monitoring stack (now includes blackbox-exporter + exporters)
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d \
  prometheus alertmanager grafana node-exporter postgres-exporter redis-exporter blackbox-exporter

ok "Servicios de monitoreo iniciados"

# Esperar a que estén listos
echo ""
info "Esperando a que los servicios estén listos..."

# P1-025: Also check AlertManager health (was missing)
for i in $(seq 1 12); do
  sleep 5

  PROM_OK=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" http://localhost:9090/-/healthy 2>/dev/null || echo "000")
  GRAFANA_OK=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
  AM_OK=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" http://localhost:9093/-/healthy 2>/dev/null || echo "000")

  if [ "$PROM_OK" = "200" ] && [ "$GRAFANA_OK" = "200" ] && [ "$AM_OK" = "200" ]; then
    ok "Prometheus: healthy"
    ok "Grafana: healthy"
    ok "AlertManager: healthy"
    break
  fi

  printf "\r  ⏳ Esperando... %ds (Prom:%s Grafana:%s AM:%s)" $((i*5)) "$PROM_OK" "$GRAFANA_OK" "$AM_OK"
done

# P1-025: Explicit AlertManager health check after the loop
AM_FINAL=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" http://localhost:9093/-/healthy 2>/dev/null || echo "000")
if [ "$AM_FINAL" != "200" ]; then
  fail "AlertManager no está healthy (HTTP $AM_FINAL). Las alertas NO se entregarán."
  echo "  Inspecciona logs: docker compose -f docker-compose.monitoring.yml logs alertmanager"
  echo "  Verifica que SLACK_WEBHOOK_URL esté seteada en .env"
  exit 1
fi

echo ""

# ── Configurar Grafana datasource ──
echo ""
info "Configurando datasource de Prometheus en Grafana..."

# GRAFANA_USER/GRAFANA_PASSWORD already validated above (non-default, >= 8 chars)

# Verify Grafana credentials actually work before configuring datasource
# FIX (H-005): previously used /api/health which is a PUBLIC endpoint in
# Grafana — it returns 200 regardless of credentials, so the "validation"
# was a no-op. Now we use /api/user which requires authentication.
# Also use 127.0.0.1 instead of localhost to avoid DNS resolution delays.
if ! curl -sf -o /dev/null --max-time 5 -u "${GRAFANA_USER}:${GRAFANA_PASSWORD}" http://127.0.0.1:3001/api/user 2>/dev/null; then
  fail "No se pudo autenticar a Grafana con las credenciales proporcionadas."
  echo "  Verifica GRAFANA_USER y GRAFANA_PASSWORD en .env."
  exit 1
fi
ok "Credenciales de Grafana verificadas"

curl -s --max-time 10 -X POST "http://localhost:3001/api/datasources" \
  -H "Content-Type: application/json" \
  -u "${GRAFANA_USER}:${GRAFANA_PASSWORD}" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "access": "proxy",
    "url": "http://prometheus:9090",
    "isDefault": true,
    "editable": true
  }' 2>/dev/null | {
    # P1-024: Use jq if available, fall back to python3
    if command -v jq &>/dev/null; then
      jq -r '
        if .id then "  ✅ Datasource Prometheus creado (ID: \(.id))"
        elif (.message // "") | contains("already exists") then "  ℹ️  Datasource Prometheus ya existe"
        else "  ⚠️  Respuesta: \(.message // "unknown")"
        end
      ' 2>/dev/null || echo "  ⚠️  No se pudo crear datasource (respuesta no-JSON)"
    else
      python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  if d.get('id'):
    print('  ✅ Datasource Prometheus creado (ID: ' + str(d['id']) + ')')
  elif d.get('message','').find('already exists') >= 0:
    print('  ℹ️  Datasource Prometheus ya existe')
  else:
    print('  ⚠️  Respuesta: ' + str(d.get('message','unknown')))
except:
  print('  ⚠️  No se pudo crear datasource (probablemente ya existe)')
" 2>&1
    fi
  }

# ── Verificar que Prometheus scrapea NOVSMM ──
echo ""
info "Verificando que Prometheus scrapea NOVSMM..."

sleep 5

# P1-024: Use jq if available, fall back to python3
if command -v jq &>/dev/null; then
  TARGETS=$(curl -s --max-time 10 http://localhost:9090/api/v1/targets 2>/dev/null | jq -r '
    .data.activeTargets[] |
    "  " + (if .health == "up" then "✅" else "❌" end) + " " +
    (.labels.job // "?") + ": " + .health + " (" + .scrapeUrl + ")"
  ' 2>&1)
else
  TARGETS=$(curl -s --max-time 10 http://localhost:9090/api/v1/targets 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
active = d['data']['activeTargets']
for t in active:
  job = t['labels'].get('job','?')
  health = t['health']
  url = t['scrapeUrl']
  print(f'  {\"✅\" if health==\"up\" else \"❌\"} {job}: {health} ({url})')
" 2>&1)
fi

echo "$TARGETS"

# ── Resumen ──
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  MONITOREO ACTIVO                                             ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "│                                                               │"
echo "│  Grafana:     http://localhost:3001"
echo "│               User: ${GRAFANA_USER} | Pass: ******** (oculta — ver .env)"
echo "│  Prometheus:  http://localhost:9090"
echo "│  AlertManager: http://localhost:9093"
echo "│  NodeExporter: http://localhost:9100/metrics"
echo "│                                                               │"
echo "│  Próximos pasos:                                              │"
echo "│  1. Abre Grafana en http://localhost:3001                     │"
echo "│  2. Importa un dashboard (Import → ID: 1860 para Node Exporter)│"
echo "│  3. Crea dashboards personalizados con las métricas novsmm_*  │"
echo "│  4. Configura alertmanager.yml con tu webhook de Slack        │"
echo "│  5. Reinicia alertmanager: docker compose -f                  │"
echo "│     docker-compose.yml -f docker-compose.monitoring.yml        │"
echo "│     restart alertmanager                                      │"
echo "│                                                               │"
echo "╚═══════════════════════════════════════════════════════════════╝"

# ── Métricas disponibles ──
echo ""
echo "═══ Métricas NOVSMM disponibles en Prometheus ═══"
echo ""
echo "  novsmm_http_requests_total          — Total HTTP requests (by method, route, status)"
echo "  novsmm_http_request_duration_seconds — HTTP request latency histogram"
echo "  novsmm_db_query_duration_seconds     — Database query latency"
echo "  novsmm_cache_operations_total        — Cache hit/miss"
echo "  novsmm_queue_jobs_total              — Queue jobs processed"
echo "  novsmm_queue_job_duration_seconds    — Queue job latency"
echo "  novsmm_ws_connections                — WebSocket connections"
echo "  novsmm_active_orders                 — Active orders"
echo ""
echo "  Node metrics:"
echo "  node_cpu_seconds_total               — CPU usage"
echo "  node_memory_MemAvailable_bytes       — Memory available"
echo "  node_filesystem_avail_bytes          — Disk space available"
echo ""

# ── Queries útiles para Grafana ──
echo "═══ Queries útiles para Grafana ═══"
echo ""
echo "  HTTP Request Rate:"
echo "    rate(novsmm_http_requests_total[5m])"
echo ""
echo "  Error Rate (5xx):"
echo "    rate(novsmm_http_requests_total{status=~\"5..\"}[5m])"
echo ""
echo "  p95 Latency:"
echo "    histogram_quantile(0.95, rate(novsmm_http_request_duration_seconds_bucket[5m]))"
echo ""
echo "  Cache Hit Rate:"
echo "    rate(novsmm_cache_operations_total{result=\"hit\"}[5m]) / rate(novsmm_cache_operations_total[5m])"
echo ""
echo "  Active WebSocket Connections:"
echo "    novsmm_ws_connections"
echo ""
echo "  Queue Jobs/min:"
echo "    rate(novsmm_queue_jobs_total[5m]) * 60"
echo ""
