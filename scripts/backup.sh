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
warn() { echo -e "${YELLOW}  ⚠️${NC} $1"; }

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
UPLOAD_S3=false

# P1-005: Backup encryption at rest. If BACKUP_ENCRYPTION_KEY is set, all
# backup files are encrypted with AES-256-GCM before storage. The encrypted
# files (.enc) are what's stored locally and uploaded to S3. restore.sh
# detects the .enc extension and decrypts before restore.
# Generate a key: openssl rand -hex 32
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
ENCRYPT_FILES=false
if [ -n "$ENCRYPTION_KEY" ]; then
  ENCRYPT_FILES=true
fi

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
# pg_dump --format=custom es binario y está comprimido con gzip.
# pg_restore --list no puede leer gzip directamente, así que descomprimimos
# en el host y pipeamos el stream binario al contenedor vía stdin.
TABLE_COUNT=$(gunzip -c "$PG_FILE" 2>/dev/null | docker compose exec -T postgres pg_restore --list 2>/dev/null | grep -c "TABLE DATA" || echo "0")
info "Tablas en backup: $TABLE_COUNT"
if [ "${TABLE_COUNT:-0}" -ge 25 ]; then
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

# ── 5. Encrypt backups (P1-005) ──
if [ "$ENCRYPT_FILES" = true ]; then
  echo ""
  echo "═══ Encryption (AES-256-GCM) ═══"
  ENC_FAIL=0
  for f in "$PG_FILE" "$UPLOADS_FILE" "$CONFIG_FILE"; do
    if [ -f "$f" ]; then
      # AES-256-GCM. The salt + IV are embedded in the .enc file (openssl format).
      # Decrypt with: openssl enc -d -aes-256-gcm -in file.enc -out file -pass env:BACKUP_ENCRYPTION_KEY
      if openssl enc -aes-256-gcm -salt -pbkdf2 -in "$f" -out "${f}.enc" -pass env:BACKUP_ENCRYPTION_KEY 2>/dev/null; then
        # Replace the plaintext file with the encrypted version
        rm -f "$f"
        ok "Encriptado: $(basename "$f").enc"
      else
        fail "Encriptación falló: $(basename "$f")"
        ENC_FAIL=$((ENC_FAIL + 1))
      fi
    fi
  done
  if [ "$ENC_FAIL" -gt 0 ]; then
    fail "$ENC_FAIL archivo(s) no se encriptaron — abortando por seguridad (no dejar backups sin encriptar)"
    exit 1
  fi
  # Update file variables to point to .enc versions for S3 upload + cleanup
  PG_FILE="${PG_FILE}.enc"
  UPLOADS_FILE="${UPLOADS_FILE}.enc"
  CONFIG_FILE="${CONFIG_FILE}.enc"
  ok "Todos los backups encriptados"
else
  warn "BACKUP_ENCRYPTION_KEY no seteada — backups SIN encriptar"
  warn "Setéala en .env: BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)"
fi

# ── 6. S3 Upload (off-site) — P1-076: warn if not configured ──
# P1-076: Off-site backup is NOT the default. If S3 is not configured, warn
# loudly. A local-only backup is a single point of failure (VPS loss = total
# data loss). We don't force S3 (some deployments may not want cloud), but
# the operator MUST be aware of the risk.
if [ "$UPLOAD_S3" != true ] || [ -z "${S3_BACKUP_BUCKET:-}" ]; then
  echo ""
  warn "═══ OFF-SITE BACKUP NOT CONFIGURED ═══"
  warn "Backups are LOCAL ONLY ($BACKUP_DIR). If this VPS fails, ALL backups are lost."
  warn "To enable off-site backup:"
  warn "  1. Set S3_BACKUP_BUCKET=your-bucket in .env"
  warn "  2. Configure AWS credentials: aws configure"
  warn "  3. Run: ./scripts/backup.sh --s3"
  warn "  Or add to cron: 0 2 * * * /opt/novsmm/scripts/backup.sh --s3"
fi

# ── 7. S3 Upload (if --s3 flag + S3_BACKUP_BUCKET set) ──
# P0-003 fix: captures exit codes, surfaces failures, counts them.
if [ "$UPLOAD_S3" = true ] && [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo ""
  echo "═══ S3 Upload ═══"

  if command -v aws &> /dev/null; then
    S3_FAIL=0
    for f in "$PG_FILE" "$UPLOADS_FILE" "$CONFIG_FILE"; do
      if [ -f "$f" ]; then
        # --only-show-errors suppresses progress bar but still shows errors on stderr.
        # Do NOT redirect stderr to /dev/null — we need to see failures.
        if aws s3 cp "$f" "s3://$S3_BACKUP_BUCKET/$(basename $f)" --storage-class STANDARD_IA --only-show-errors; then
          ok "Uploadado: $(basename $f) → s3://$S3_BACKUP_BUCKET/"
        else
          AWS_EXIT=$?
          fail "S3 upload falló: $(basename $f) (aws exit $AWS_EXIT)"
          S3_FAIL=$((S3_FAIL + 1))
        fi
      fi
    done
    if [ "$S3_FAIL" -gt 0 ]; then
      warn "$S3_FAIL archivo(s) no se uploadaron a S3 — backup LOCAL OK, pero offsite incompleto"
      warn "Revisa credenciales AWS y conectividad a S3. El backup local en $BACKUP_DIR está intacto."
    fi
  else
    fail "AWS CLI no instalado — instala: sudo apt install awscli"
    warn "Backup local OK, pero S3 upload saltado (awscli faltante)"
  fi
fi

# ── 8. Cleanup old backups ──
echo ""
echo "═══ Cleanup (retención: $RETENTION_DAYS días) ═══"
find "$BACKUP_DIR" -name "novsmm_*" -mtime +$RETENTION_DAYS -delete 2>/dev/null
REMAINING=$(find "$BACKUP_DIR" -name "novsmm_*" | wc -l)
info "Backups restantes: $REMAINING"

# ── 7. Report success to monitoring (updates novsmm_backup_last_success_timestamp) ──
# This makes the BackupFailure alert (alerts.yml) functional.
# Requires INTERNAL_API_TOKEN env var (same value as the app's .env).
echo ""
echo "═══ Monitoring Report ═══"
BACKUP_STATUS="success"
if [ -n "${INTERNAL_API_TOKEN:-}" ] && [ -n "${BACKUP_REPORT_URL:-http://localhost:3000/api/internal/backup-status}" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST \
    -H "Authorization: Bearer ${INTERNAL_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"${BACKUP_STATUS}\"}" \
    "${BACKUP_REPORT_URL}" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    ok "Backup timestamp reported to monitoring (HTTP 200)"
  else
    warn "Failed to report backup timestamp to monitoring (HTTP $HTTP_CODE) — alert may fire falsely"
  fi
else
  warn "INTERNAL_API_TOKEN not set — cannot report backup status. Set it in .env to enable BackupFailure alert."
fi

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
