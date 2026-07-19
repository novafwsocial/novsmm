#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — File Backup Script (uploads directory)
# ─────────────────────────────────────────────────────────────────────────────
# Backs up the uploads/ directory (ticket attachments, etc.) to:
#   1. Local backup (tar.gz) — always (P1-044: was S3-only, no local copy)
#   2. S3 (sync) — if S3_BACKUP_BUCKET is set
#
# This is a SEPARATE concern from backup.sh (which handles DB + config).
# backup.sh also includes uploads, but this script runs more frequently
# (daily) for incremental S3 sync (backup.sh does full tar.gz each time).
#
# USAGE:
#   ./scripts/backup-uploads.sh
#
# CRON (daily at 3 AM):
#   0 3 * * * /opt/novsmm/scripts/backup-uploads.sh >> /var/log/novsmm-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; }
info() { echo -e "${CYAN}  ℹ️${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠️${NC} $1"; }

UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)

echo "[$(date)] Starting uploads backup..."
echo "  Source: $UPLOADS_DIR"

if [ ! -d "$UPLOADS_DIR" ]; then
  info "Uploads directory not found: $UPLOADS_DIR — nothing to back up"
  exit 0
fi

mkdir -p "$BACKUP_DIR"

# ── 1. Local backup (tar.gz) — P1-044: was S3-only, now always local ──
# This ensures a local copy exists even if S3 is not configured or fails.
LOCAL_FILE="$BACKUP_DIR/novsmm_uploads_${DATE}.tar.gz"
echo ""
echo "═══ Local Backup ═══"
if tar -czf "$LOCAL_FILE" "$UPLOADS_DIR" 2>/dev/null; then
  LOCAL_SIZE=$(du -h "$LOCAL_FILE" | cut -f1)
  ok "Local backup: $LOCAL_FILE ($LOCAL_SIZE)"
else
  fail "Local backup failed"
  exit 1
fi

# ── 2. S3 sync (incremental) ──
if [ -z "$S3_BUCKET" ]; then
  echo ""
  warn "S3_BACKUP_BUCKET not set — local backup only"
  warn "If this VPS fails, uploads backups are lost. Set S3_BACKUP_BUCKET in .env."
else
  echo ""
  echo "═══ S3 Sync ═══"
  echo "  Target: s3://$S3_BUCKET/uploads/"

  if command -v aws &>/dev/null; then
    # P1-034: Add --max-time equivalent for aws s3 sync. aws s3 doesn't have
    # --max-time, but --stop-on-error + timeout wrapper prevents indefinite hang.
    if timeout 600 aws s3 sync "$UPLOADS_DIR" "s3://$S3_BUCKET/uploads/" \
      --storage-class STANDARD_IA \
      --only-show-errors; then
      ok "S3 sync completed"
    else
      S3_EXIT=$?
      if [ "$S3_EXIT" -eq 124 ]; then
        fail "S3 sync timed out after 600s"
      else
        fail "S3 sync failed (exit $S3_EXIT)"
      fi
      warn "Local backup OK ($LOCAL_FILE), but S3 sync incomplete"
    fi
  else
    fail "AWS CLI not installed — install with: sudo apt install awscli"
    warn "Local backup OK, but S3 sync skipped (awscli missing)"
  fi
fi

# ── 3. Cleanup old local backups ──
echo ""
echo "═══ Cleanup (retención: $RETENTION_DAYS días) ═══"
find "$BACKUP_DIR" -name "novsmm_uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
REMAINING=$(find "$BACKUP_DIR" -name "novsmm_uploads_*.tar.gz" | wc -l)
info "Uploads backups restantes: $REMAINING"

echo ""
echo "[$(date)] Uploads backup completed"
