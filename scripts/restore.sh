#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NOVSMM — RESTORE.SH
# ═══════════════════════════════════════════════════════════════════════════
# Restore interactivo desde un backup de PostgreSQL.
#
# USO:
#   ./scripts/restore.sh                                    # Lista backups
#   ./scripts/restore.sh /backups/novsmm_db_20250115.sql.gz # Restore específico
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; }
info() { echo -e "${CYAN}  ℹ️${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠️${NC} $1"; }

BACKUP_DIR="${BACKUP_DIR:-/backups}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM — Restore                                            ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# ── Seleccionar backup ──
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Backups disponibles en $BACKUP_DIR:"
  echo ""
  
  BACKUPS=$(find "$BACKUP_DIR" -name "novsmm_db_*.sql.gz" -type f | sort -r)
  
  if [ -z "$BACKUPS" ]; then
    fail "No hay backups en $BACKUP_DIR"
    exit 1
  fi
  
  PS3="Selecciona un backup (número): "
  select BACKUP_FILE in $BACKUPS; do
    if [ -n "$BACKUP_FILE" ]; then
      break
    fi
    echo "Selección inválida."
  done
fi

if [ ! -f "$BACKUP_FILE" ]; then
  fail "Archivo no encontrado: $BACKUP_FILE"
  exit 1
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
info "Backup seleccionado: $BACKUP_FILE ($FILE_SIZE)"

# ── Verificar integridad ──
echo ""
echo "═══ Verificación de integridad ═══"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  ok "Integridad: OK"
else
  fail "Archivo corrupto"
  exit 1
fi

TABLE_COUNT=$(gunzip -c "$BACKUP_FILE" 2>/dev/null | grep -c "CREATE TABLE" || echo "0")
info "Tablas en backup: $TABLE_COUNT"

# ── Confirmación ──
echo ""
echo -e "${RED}${BOLD}⚠️  ADVERTENCIA: Esto ELIMINARÁ todos los datos actuales.${NC}"
echo -e "${RED}   Se recomienda hacer un backup del estado actual primero.${NC}"
echo ""
echo "  Backup a restaurar: $BACKUP_FILE"
echo "  Tamaño: $FILE_SIZE"
echo "  Tablas: $TABLE_COUNT"
echo ""

read -p "¿Quieres hacer un backup del estado actual primero? (y/n): " DO_BACKUP
if [ "$DO_BACKUP" = "y" ] || [ "$DO_BACKUP" = "Y" ]; then
  echo "Haciendo backup del estado actual..."
  ./scripts/backup.sh
  echo ""
fi

read -p "Escribe 'RESTORE' para confirmar: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Cancelado."
  exit 0
fi

# ── Stop web + worker ──
echo ""
echo "═══ Deteniendo servicios ═══"
docker compose stop web worker notifications 2>/dev/null
ok "Servicios web/worker/notifications detenidos"

# ── Drop + recreate database ──
echo ""
echo "═══ Recreando base de datos ═══"
# Terminate active connections before dropping — otherwise DROP DATABASE
# fails with "database is being accessed by other users" and the script
# aborts AFTER dropping, causing total data loss.
docker compose exec -T postgres psql -U novsmm -d postgres <<'SQL'
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'novsmm' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS novsmm;
CREATE DATABASE novsmm;
SQL
ok "Base de datos recreada"

# ── Restore ──
echo ""
echo "═══ Restaurando desde backup ═══"
if gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres pg_restore -U novsmm -d novsmm --no-owner --no-privileges --clean --if-exists --verbose 2>&1 | tail -5; then
  ok "Restore completado"
else
  # pg_restore puede dar warnings no fatales, verificar si hay datos
  warn "pg_restore tuvo warnings (puede ser normal)"
fi

# ── Verify ──
echo ""
echo "═══ Verificación post-restore ═══"

TABLES=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' \n')
info "Tablas: $TABLES"

USERS=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' \n')
info "Usuarios: $USERS"

ORDERS=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM orders;" 2>/dev/null | tr -d ' \n')
info "Órdenes: $ORDERS"

SERVICES=$(docker compose exec -T postgres psql -U novsmm -d novsmm -t -c "SELECT count(*) FROM services;" 2>/dev/null | tr -d ' \n')
info "Servicios: $SERVICES"

if [ "${USERS:-0}" -ge 1 ]; then
  ok "Restore verificado: datos presentes"
else
  fail "Restore falló: no hay usuarios"
  exit 1
fi

# ── Start services ──
echo ""
echo "═══ Reiniciando servicios ═══"
docker compose start web worker notifications 2>/dev/null
ok "Servicios reiniciados"

# Esperar a que web esté listo
sleep 10
if curl -sf http://localhost:3000/api/health/live &>/dev/null; then
  ok "App respondiendo"
else
  warn "App no responde aún — espera 30s más"
fi

# ── Resumen ──
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  RESTORE COMPLETADO                                           ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "│                                                               │"
echo "│  Backup: $BACKUP_FILE"
echo "│  Tablas: $TABLES"
echo "│  Users:  $USERS"
echo "│  Orders: $ORDERS"
echo "│  Svcs:   $SERVICES"
echo "│                                                               │"
echo "╚═══════════════════════════════════════════════════════════════╝"
