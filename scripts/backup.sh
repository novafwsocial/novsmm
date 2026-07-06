#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NOVSMM — BACKUP.SH
# ═══════════════════════════════════════════════════════════════════════════
# Backup completo: PostgreSQL + uploads + configuración
#
# USO:
#   ./scripts/backup.sh                          # Backup local
#   ./scripts/backup.sh --s3                     # Backup + upload a S3
#   S3_BACKUP_BUCKET=mibucket ./scripts/backup.sh --s3
#
# CRON (nightly 2 AM):
#   0 2 * * * /opt/novsmm/scripts/backup.sh >> /var/log/novsmm-backup.log 2>&1
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; }
info() { echo -e "${CYAN}  ℹ️${NC} $1"; }

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
UPLOAD_S3=false

for arg in "$@"; do
  case $arg in
    --s3) UPLOAD_S3=true ;;
  esac
done

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM — Backup                                              ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

mkdir -p "$BACKUP_DIR"

# ── 1. PostgreSQL Backup ──
echo "═══ PostgreSQL Backup ═══"
PG_FILE="$BACKUP_DIR/novsmm_db_${DATE}.sql.gz"

if docker compose exec -T postgres pg_dump -U novsmm -d novsmm --format=custom --no-owner --no-privileges 2>/dev/null | gzip > "$PG_FILE"; then
  PG_SIZE=$(du -h "$PG_FILE" | cut -f1)
  ok "PostgreSQL backup: $PG_FILE ($PG_SIZE)"
else
  fail "PostgreSQL backup falló"
  exit 1
fi

# ── 2. Verify backup ──
echo ""
echo "═══ Verificación ═══"
if gunzip -t "$PG_FILE" 2>/dev/null; then
  ok "Backup integrity: OK (gunzip -t passed)"
else
  fail "Backup integrity: FALLÓ (archivo corrupto)"
  exit 1
fi

# Verificar que el backup tiene datos
TABLE_COUNT=$(gunzip -c "$PG_FILE" 2>/dev/null | grep -c "CREATE TABLE" || echo "0")
info "Tablas en backup: $TABLE_COUNT"
if [ "$TABLE_COUNT" -ge 25 ]; then
  ok "Backup contiene $TABLE_COUNT tablas"
else
  warn "Backup solo tiene $TABLE_COUNT tablas (esperado: 30+)"
fi

# ── 3. Uploads Backup ──
echo ""
echo "═══ Uploads Backup ═══"
UPLOADS_DIR="uploads"
if [ -d "$UPLOADS_DIR" ]; then
  UPLOADS_FILE="$BACKUP_DIR/novsmm_uploads_${DATE}.tar.gz"
  tar -czf "$UPLOADS_FILE" "$UPLOADS_DIR" 2>/dev/null
  UPLOADS_SIZE=$(du -h "$UPLOADS_FILE" | cut -f1)
  ok "Uploads backup: $UPLOADS_FILE ($UPLOADS_SIZE)"
else
  info "No hay directorio uploads/ — saltando"
fi

# ── 4. Config Backup ──
echo ""
echo "═══ Config Backup ═══"
CONFIG_FILE="$BACKUP_DIR/novsmm_config_${DATE}.tar.gz"
tar -czf "$CONFIG_FILE" \
  docker-compose.yml \
  nginx.conf \
  .env \
  prisma/schema.prisma \
  2>/dev/null
ok "Config backup: $CONFIG_FILE"

# ── 5. S3 Upload ──
if [ "$UPLOAD_S3" = true ] && [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo ""
  echo "═══ S3 Upload ═══"
  
  if command -v aws &> /dev/null; then
    for f in "$PG_FILE" "$UPLOADS_FILE" "$CONFIG_FILE"; do
      if [ -f "$f" ]; then
        aws s3 cp "$f" "s3://$S3_BACKUP_BUCKET/$(basename $f)" --storage-class STANDARD_IA --only-show-errors 2>/dev/null
        ok "Uploadado: $(basename $f) → s3://$S3_BACKUP_BUCKET/"
      fi
    done
  else
    fail "AWS CLI no instalado — instala: sudo apt install awscli"
  fi
fi

# ── 6. Cleanup old backups ──
echo ""
echo "═══ Cleanup (retención: $RETENTION_DAYS días) ═══"
find "$BACKUP_DIR" -name "novsmm_*" -mtime +$RETENTION_DAYS -delete 2>/dev/null
REMAINING=$(find "$BACKUP_DIR" -name "novsmm_*" | wc -l)
info "Backups restantes: $REMAINING"

# ── Resumen ──
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  BACKUP COMPLETADO                                            ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "│                                                               │"
echo "│  DB:      $PG_FILE"
echo "│  Uploads: ${UPLOADS_FILE:-N/A}"
echo "│  Config:  $CONFIG_FILE"
echo "│  Tamaño:  $(du -sh $BACKUP_DIR | cut -f1) total en $BACKUP_DIR"
echo "│                                                               │"
echo "╚═══════════════════════════════════════════════════════════════╝"
