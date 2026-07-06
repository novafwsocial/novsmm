#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Pre-Deployment Validation Script
# ─────────────────────────────────────────────────────────────────────────────
# Ejecuta este script en tu VPS ANTES de hacer el deploy.
# Verifica que todo el entorno esté listo para recibir NOVSMM.
#
# USO:
#   chmod +x scripts/pre-deploy-check.sh
#   ./scripts/pre-deploy-check.sh
#
# REQUISITOS:
#   - VPS con Ubuntu 22.04+ o Debian 12+
#   - Acceso root o sudo
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

ok()   { echo -e "${GREEN}✅ PASS${NC} — $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; FAIL=$((FAIL+1)); }
warn() { echo -e "${YELLOW}⚠️  WARN${NC} — $1"; WARN=$((WARN+1)); }
info() { echo -e "${BLUE}ℹ️  INFO${NC} — $1"; }

echo "════════════════════════════════════════════════════════════════"
echo "  NOVSMM — Pre-Deployment Validation"
echo "  Host: $(hostname)"
echo "  IP:   $(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 'unknown')"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ── 1. SISTEMA ──
echo "=== 1. SISTEMA ==="

OS=$(cat /etc/os-release 2>/dev/null | grep "^PRETTY_NAME" | cut -d'"' -f2 || echo "unknown")
info "OS: $OS"
info "Kernel: $(uname -r)"
info "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
info "Disk: $(df -h / | awk 'NR==2 {print $4}') available"

# RAM mínima 4GB
RAM_MB=$(free -m | awk '/^Mem:/ {print $2}')
if [ "$RAM_MB" -ge 4096 ]; then
  ok "RAM: ${RAM_MB}MB (>= 4GB)"
else
  warn "RAM: ${RAM_MB}MB (< 4GB recomendado)"
fi

# Disco mínimo 20GB
# P0-012: `df -g` is a BSD/macOS flag, NOT available on Linux. The previous
# fallback `df -h | tr -d 'G'` breaks on TB-scale disks (leaves 'T' suffix,
# causing integer comparison failure). Use `df --output=avail -BG` which is
# GNU-only but always returns an integer GB value on Linux.
DISK_GB=$(df --output=avail -BG / 2>/dev/null | awk 'NR==2 {gsub(/G/,""); print}')
if [ -z "${DISK_GB:-}" ]; then
  # Fallback for non-GNU df (BSD/macOS) — parse human-readable output
  DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
  case "$DISK_AVAIL" in
    *G) DISK_GB="${DISK_AVAIL%G}" ;;
    *T) DISK_GB=$(awk "BEGIN {printf \"%d\", ${DISK_AVAIL%T} * 1024}") ;;
    *M) DISK_GB=0 ;;  # < 1GB → definitely fails the 20GB check
    *)  DISK_GB=0 ;;
  esac
fi
DISK_GB=$(printf '%d' "${DISK_GB:-0}" 2>/dev/null || echo 0)
if [ "$DISK_GB" -ge 20 ]; then
  ok "Disk: ${DISK_GB}GB available (>= 20GB)"
else
  warn "Disk: ${DISK_GB}GB available (< 20GB recomendado)"
fi

echo ""

# ── 2. DOCKER ──
echo "=== 2. DOCKER ==="

if command -v docker &> /dev/null; then
  ok "Docker instalado: $(docker --version)"
  
  if systemctl is-active --quiet docker 2>/dev/null; then
    ok "Docker daemon activo"
  else
    fail "Docker daemon NO activo — ejecuta: sudo systemctl start docker"
  fi
  
  if docker info &> /dev/null; then
    ok "Docker responde a comandos"
  else
    fail "Docker no responde — verifica permisos del usuario"
  fi
else
  fail "Docker NO instalado — ejecuta: curl -fsSL https://get.docker.com | sh"
fi

if docker compose version &> /dev/null; then
  ok "Docker Compose v2 disponible: $(docker compose version)"
else
  fail "Docker Compose v2 NO disponible — instala: sudo apt install docker-compose-plugin"
fi

echo ""

# ── 3. POSTGRESQL (via Docker) ──
echo "=== 3. POSTGRESQL (verificación de imagen) ==="

# P1-029: `docker pull` downloads hundreds of MB and is slow. Check if the
# image already exists locally first (instant). Only pull if missing.
if docker image inspect postgres:16-alpine &>/dev/null 2>&1; then
  ok "Imagen postgres:16-alpine ya descargada localmente"
else
  info "Imagen postgres:16-alpine no encontrada localmente — verificando disponibilidad..."
  # Just check if the image CAN be pulled (manifest check), don't download layers.
  if docker manifest inspect postgres:16-alpine &>/dev/null 2>&1; then
    ok "Imagen postgres:16-alpine disponible en registry (se descargará en docker compose up)"
  else
    warn "No se pudo verificar postgres:16-alpine (registry inaccesible o sin red)"
  fi
fi

# Verificar que no hay PostgreSQL local conflicting
if command -v psql &> /dev/null; then
  warn "psql instalado localmente — posible conflicto con Docker PostgreSQL"
else
  ok "No hay PostgreSQL local instalado (sin conflictos)"
fi

echo ""

# ── 4. REDIS (via Docker) ──
echo "=== 4. REDIS (verificación de imagen) ==="

# P1-029: Check local first, manifest inspect if missing (avoids slow pull)
if docker image inspect redis:7-alpine &>/dev/null 2>&1; then
  ok "Imagen redis:7-alpine ya descargada localmente"
else
  info "Imagen redis:7-alpine no encontrada localmente — verificando disponibilidad..."
  if docker manifest inspect redis:7-alpine &>/dev/null 2>&1; then
    ok "Imagen redis:7-alpine disponible en registry (se descargará en docker compose up)"
  else
    warn "No se pudo verificar redis:7-alpine (registry inaccesible o sin red)"
  fi
fi

echo ""

# ── 5. NGINX (via Docker) ──
echo "=== 5. NGINX (verificación de imagen) ==="

# P1-029: Check local first, manifest inspect if missing
if docker image inspect nginx:alpine &>/dev/null 2>&1; then
  ok "Imagen nginx:alpine ya descargada localmente"
else
  info "Imagen nginx:alpine no encontrada localmente — verificando disponibilidad..."
  if docker manifest inspect nginx:alpine &>/dev/null 2>&1; then
    ok "Imagen nginx:alpine disponible en registry (se descargará en docker compose up)"
  else
    warn "No se pudo verificar nginx:alpine (registry inaccesible o sin red)"
  fi
fi

echo ""

# ── 6. PUERTOS ──
echo "=== 6. PUERTOS ==="

for port in 80 443 3000 5432 6379; do
  if ss -tlnp 2>/dev/null | grep -q ":${port} " ; then
    fail "Puerto ${port} ya está en uso"
  else
    ok "Puerto ${port} disponible"
  fi
done

echo ""

# ── 7. CERTBOT / SSL ──
echo "=== 7. SSL / CERTBOT ==="

if command -v certbot &> /dev/null; then
  ok "Certbot instalado: $(certbot --version 2>&1)"
else
  info "Certbot no instalado — se instalará durante el deployment"
fi

echo ""

# ── 8. FIREWALL ──
echo "=== 8. FIREWALL ==="

if command -v ufw &> /dev/null; then
  if ufw status | grep -q "active"; then
    ok "UFW activo"
    info "Reglas: $(ufw status | grep -c '^Allow')"
    # Verificar puertos abiertos
    for port in 80 443 22; do
      if ufw status | grep -q "${port}"; then
        ok "Puerto ${port} abierto en UFW"
      else
        warn "Puerto ${port} NO abierto en UFW — ejecuta: sudo ufw allow ${port}"
      fi
    done
  else
    warn "UFW no activo — recomendado: sudo ufw enable"
  fi
else
  info "UFW no instalado"
fi

echo ""

# ── 9. ARCHIVOS DEL PROYECTO ──
echo "=== 9. ARCHIVOS DEL PROYECTO ==="

for file in docker-compose.yml Dockerfile nginx.conf .env prisma/schema.prisma prisma/schema.postgres.prisma; do
  if [ -f "$file" ]; then
    ok "Archivo existe: $file"
  else
    fail "Archivo FALTANTE: $file"
  fi
done

echo ""

# ── 10. VARIABLES DE ENTORNO ──
echo "=== 10. VARIABLES DE ENTORNO (.env) ==="

if [ -f ".env" ]; then
  ok "Archivo .env existe"
  
  # Verificar variables críticas
  for var in DATABASE_URL NEXTAUTH_SECRET LICENSE_ENCRYPTION_KEY NOTIFICATIONS_SERVICE_SECRET POSTGRES_PASSWORD; do
    VAL=$(grep "^${var}=" .env 2>/dev/null | cut -d'=' -f2- | head -1)
    if [ -n "$VAL" ] && [ "$VAL" != "" ]; then
      ok "Variable ${var} configurada"
    else
      fail "Variable ${var} FALTANTE o vacía en .env"
    fi
  done
  
  # Verificar REDIS_URL (debe apuntar a Redis de Docker)
  REDIS_VAL=$(grep "^REDIS_URL=" .env 2>/dev/null | cut -d'=' -f2- | head -1)
  if echo "$REDIS_VAL" | grep -q "redis://"; then
    ok "REDIS_URL apunta a Redis: $REDIS_VAL"
  else
    warn "REDIS_URL no apunta a Redis — debe ser: redis://redis:6379"
  fi
  
  # Verificar DATABASE_URL (debe apuntar a PostgreSQL de Docker)
  DB_VAL=$(grep "^DATABASE_URL=" .env 2>/dev/null | cut -d'=' -f2- | head -1)
  if echo "$DB_VAL" | grep -q "postgresql://"; then
    ok "DATABASE_URL apunta a PostgreSQL"
  else
    fail "DATABASE_URL NO apunta a PostgreSQL — debe ser: postgresql://novsmm:PASS@postgres:5432/novsmm"
  fi
else
  fail "Archivo .env NO existe — ejecuta: cp .env.example .env"
fi

echo ""

# ── 11. SCHEMA POSTGRESQL ──
echo "=== 11. SCHEMA POSTGRESQL ==="

if [ -f "prisma/schema.prisma" ]; then
  PROVIDER=$(grep "provider" prisma/schema.prisma | head -1)
  if echo "$PROVIDER" | grep -q "postgresql"; then
    ok "Schema activo usa PostgreSQL"
  elif echo "$PROVIDER" | grep -q "sqlite"; then
    warn "Schema activo usa SQLite — ejecuta: cp prisma/schema.postgres.prisma prisma/schema.prisma"
  else
    warn "Provider desconocido: $PROVIDER"
  fi
else
  fail "prisma/schema.prisma no existe"
fi

if [ -f "prisma/schema.postgres.prisma" ]; then
  ok "schema.postgres.prisma existe (backup)"
else
  fail "prisma/schema.postgres.prisma FALTANTE"
fi

echo ""

# ── RESUMEN ──
echo "════════════════════════════════════════════════════════════════"
echo "  RESUMEN DE VALIDACIÓN PRE-DEPLOYMENT"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}PASS: ${PASS}${NC}"
echo -e "  ${RED}FAIL: ${FAIL}${NC}"
echo -e "  ${YELLOW}WARN: ${WARN}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}✅ ENTORNO LISTO PARA DEPLOYMENT${NC}"
  echo "  Ejecuta: docker compose up -d --build"
else
  echo -e "  ${RED}❌ HAY ${FAIL} PROBLEMAS QUE DEBES RESOLVER ANTES DEL DEPLOYMENT${NC}"
  echo "  Revisa los FAIL anteriores."
fi
echo ""
echo "════════════════════════════════════════════════════════════════"
