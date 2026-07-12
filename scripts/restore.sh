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

# FIX (M-006): acquire exclusive lock to prevent catastrophic race
# condition. If two restore operations run simultaneously, they could
# corrupt the database (one drops tables while the other is restoring).
# flock blocks (waiting) until the lock is released — restore is a
# critical operation and should never be skipped.
LOCK_FILE="/tmp/novsmm-restore.lock"
exec 200>"$LOCK_FILE"
flock 200

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
  
  BACKUPS=$(find "$BACKUP_DIR" -name "novsmm_db_*.sql.gz*" -type f | sort -r)
  
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

# ── P1-005: Decrypt if encrypted (.enc extension) ──
# Encrypted backups use AES-256-GCM (see backup.sh). We decrypt to a temp
# file, then proceed with the normal gunzip + pg_restore flow.
DECRYPTED_FILE=""
case "$BACKUP_FILE" in
  *.enc)
    if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
      fail "Backup está encriptado (.enc) pero BACKUP_ENCRYPTION_KEY no está seteada"
      echo "  Setéala en .env o pásala como env var:"
      echo "    BACKUP_ENCRYPTION_KEY='tu_key' ./scripts/restore.sh $BACKUP_FILE"
      exit 1
    fi
    echo ""
    echo "═══ Decrypting backup (AES-256-GCM) ═══"
    DECRYPTED_FILE=$(mktemp /tmp/novsmm_restore_XXXXXX.sql.gz)
    if openssl enc -d -aes-256-gcm -pbkdf2 -in "$BACKUP_FILE" -out "$DECRYPTED_FILE" -pass env:BACKUP_ENCRYPTION_KEY 2>/dev/null; then
      ok "Backup desencriptado → $DECRYPTED_FILE"
      BACKUP_FILE="$DECRYPTED_FILE"
    else
      fail "Desencriptación falló — key incorrecta o archivo corrupto"
      rm -f "$DECRYPTED_FILE"
      exit 1
    fi
    ;;
esac

# Cleanup decrypted temp file on exit
cleanup_decrypted() {
  if [ -n "$DECRYPTED_FILE" ] && [ -f "$DECRYPTED_FILE" ]; then
    rm -f "$DECRYPTED_FILE"
  fi
}
trap cleanup_decrypted EXIT

# ── Verificar integridad ──
echo ""
echo "═══ Verificación de integridad ═══"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  ok "Integridad: OK"
else
  fail "Archivo corrupto"
  exit 1
fi

# ── Verificar contenido del backup ──
# pg_dump --format=custom produce un dump BINARIO comprimido con gzip.
# grep "CREATE TABLE" sobre binario devuelve 0 o basura (P0-008).
# pg_restore --list no puede leer gzip directamente, así que descomprimimos
# en el host y pipeamos el stream binario al contenedor vía stdin.
TABLE_COUNT=$(gunzip -c "$BACKUP_FILE" 2>/dev/null | docker compose exec -T postgres pg_restore --list 2>/dev/null | grep -c "TABLE DATA" || echo "0")
info "Tablas en backup: $TABLE_COUNT"
if [ "${TABLE_COUNT:-0}" -lt 1 ]; then
  fail "El backup no contiene tablas (¿archivo corrupto o vacío?)"
  exit 1
fi

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
# P1-011: pg_restore returns non-zero for non-fatal warnings (e.g., "DROP TABLE"
# on a fresh DB with --clean). We capture the exit code explicitly and only
# treat it as fatal if the data verification (next step) fails. The pipe to
# `tail` would mask the exit code without PIPESTATUS.
set +e
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres pg_restore -U novsmm -d novsmm --no-owner --no-privileges --clean --if-exists --verbose 2>&1 | tail -5
RESTORE_EXIT=${PIPESTATUS[1]}
set -e

if [ "$RESTORE_EXIT" -eq 0 ]; then
  ok "Restore completado (pg_restore exit 0)"
elif [ "$RESTORE_EXIT" -eq 1 ]; then
  # Exit code 1 from pg_restore = non-fatal warnings (objects already exist, etc.)
  warn "pg_restore exit code 1 (warnings no fatales — verificando datos...)"
else
  # Exit code 2+ = fatal error
  fail "pg_restore falló con exit code $RESTORE_EXIT (error fatal)"
  exit 1
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

if [ "${USERS:-0}" -ge 1 ] 2>/dev/null; then
  ok "Restore verificado: datos presentes ($USERS usuarios)"
else
  fail "Restore falló: no hay usuarios (value: '$USERS')"
  fail "El backup puede estar corrupto o incompleto. NO reinicies servicios."
  fail "Recupera de otro backup: ./scripts/restore.sh /backups/novsmm_<otra_fecha>.sql.gz"
  exit 1
fi

# ── Start services ──
echo ""
echo "═══ Reiniciando servicios ═══"
docker compose start web worker notifications 2>/dev/null
ok "Servicios reiniciados"

# P1-012: Verify app actually reconnects to the restored DB (not just that it
# responds). A stale connection pool could return 200 on /health/live (which
# only checks the process is up) while DB queries fail. We check /health/ready
# which includes a DB round-trip, and /health/db for explicit DB connectivity.
echo ""
echo "═══ Verificación de reconexión de la app ═══"
APP_READY=false
for i in $(seq 1 12); do
  sleep 5
  READY_CODE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" http://localhost:3000/api/health/ready 2>/dev/null || echo "000")
  if [ "$READY_CODE" = "200" ]; then
    ok "App respondiendo (health/ready: 200 tras $((i*5))s)"
    APP_READY=true
    break
  fi
  printf "\r  ⏳ Esperando app... %ds (health/ready: %s)" $((i*5)) "$READY_CODE"
done
echo ""

if [ "$APP_READY" != true ]; then
  fail "App no responde en /health/ready después de 60s"
  warn "El restore de DB fue exitoso, pero la app no reconectó."
  warn "Inspecciona logs: docker compose logs web --tail 50"
  warn "Prueba reiniciar: docker compose restart web"
  exit 1
fi

# Double-check DB connectivity through the app
DB_HEALTH=$(curl -s --max-time 10 http://localhost:3000/api/health/db 2>/dev/null)
if echo "$DB_HEALTH" | grep -q '"connected":true' 2>/dev/null; then
  ok "App conectada a PostgreSQL (verificado vía /api/health/db)"
else
  warn "No se pudo verificar DB connectivity vía /api/health/db"
  warn "Respuesta: $DB_HEALTH"
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
