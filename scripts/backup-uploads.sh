#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — File Backup Script (uploads directory)
# ─────────────────────────────────────────────────────────────────────────────
# Syncs the uploads/ directory (ticket attachments, etc.) to S3.
#
# USAGE:
#   ./scripts/backup-uploads.sh
#
# CRON (daily at 3 AM):
#   0 3 * * * /opt/novsmm/scripts/backup-uploads.sh >> /var/log/novsmm-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"

if [ -z "$S3_BUCKET" ]; then
  echo "[$(date)] S3_BACKUP_BUCKET not set — skipping uploads backup"
  exit 0
fi

if [ ! -d "$UPLOADS_DIR" ]; then
  echo "[$(date)] Uploads directory not found: $UPLOADS_DIR"
  exit 0
fi

echo "[$(date)] Starting uploads backup to S3..."
echo "  Source: $UPLOADS_DIR"
echo "  Target: s3://$S3_BUCKET/uploads/"

# Sync to S3 (only changed files)
aws s3 sync "$UPLOADS_DIR" "s3://$S3_BUCKET/uploads/" \
  --storage-class STANDARD_IA \
  --only-show-errors

echo "[$(date)] Uploads backup completed"
