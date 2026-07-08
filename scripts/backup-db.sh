#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Database Backup Script
# ─────────────────────────────────────────────────────────────────────────────
# Creates a compressed PostgreSQL dump and optionally uploads to S3.
#
# USAGE:
#   ./scripts/backup-db.sh
#
# CRON (nightly at 2 AM):
#   0 2 * * * /opt/novsmm/scripts/backup-db.sh >> /var/log/novsmm-backup.log 2>&1
#
# RETENTION: 30 days (older backups are automatically deleted)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ──
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="novsmm_${DATE}.sql.gz"

# Database connection (from environment)
DB_URL="${DATABASE_URL:?DATABASE_URL must be set}"

# Parse DATABASE_URL
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "[$(date)] Starting NOVSMM database backup..."
echo "  Database: $DB_NAME @ $DB_HOST:$DB_PORT"
echo "  Backup:   $BACKUP_DIR/$BACKUP_FILE"

# ── Create backup directory ──
mkdir -p "$BACKUP_DIR"

# ── Create dump ──
export PGPASSWORD="$DB_PASS"
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --no-owner \
  --no-privileges \
  | gzip > "$BACKUP_DIR/$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "  Size:     $BACKUP_SIZE"
echo "[$(date)] Backup completed: $BACKUP_DIR/$BACKUP_FILE"

# ── Cleanup old backups ──
echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "novsmm_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "novsmm_*.sql.gz" | wc -l)
echo "  Remaining backups: $REMAINING"

# ── Optional: Upload to S3 ──
if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  echo "[$(date)] Uploading to S3: s3://$S3_BACKUP_BUCKET/$BACKUP_FILE"
  aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BACKUP_BUCKET/$BACKUP_FILE" \
    --storage-class STANDARD_IA \
    --only-show-errors
  echo "[$(date)] S3 upload completed"
fi

echo "[$(date)] Backup script finished successfully"
