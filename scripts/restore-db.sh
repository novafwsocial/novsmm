#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Database Restore Script
# ─────────────────────────────────────────────────────────────────────────────
# Restores a PostgreSQL backup.
#
# USAGE:
#   ./scripts/restore-db.sh <backup_file>
#   ./scripts/restore-db.sh /backups/novsmm_20250115_020000.sql.gz
#
# WARNING: This will DROP and recreate the database. Use with caution!
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup_file>}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Database connection (from environment)
DB_URL="${DATABASE_URL:?DATABASE_URL must be set}"

# Parse DATABASE_URL
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "═══════════════════════════════════════════════════════════════"
echo "  NOVSMM Database Restore"
echo "═══════════════════════════════════════════════════════════════"
echo "  Backup:   $BACKUP_FILE"
echo "  Database: $DB_NAME @ $DB_HOST:$DB_PORT"
echo ""
echo "  ⚠️  WARNING: This will DROP and recreate the database!"
echo "  All existing data will be lost."
echo ""
read -p "  Type 'RESTORE' to continue: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
  echo "  Cancelled."
  exit 0
fi

echo ""
echo "[$(date)] Starting restore..."
export PGPASSWORD="$DB_PASS"

# Drop and recreate database
echo "[$(date)] Dropping existing database..."
psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname=postgres <<SQL
DROP DATABASE IF EXISTS "$DB_NAME";
CREATE DATABASE "$DB_NAME";
SQL

# Restore from backup
echo "[$(date)] Restoring from backup..."
gunzip -c "$BACKUP_FILE" | pg_restore \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --verbose \
  2>&1 | tail -5

echo "[$(date)] Restore completed successfully!"
echo ""
echo "  Next steps:"
echo "  1. Restart the application: docker compose restart web"
echo "  2. Verify data: docker compose exec web bun -e \"const{db}=require('./src/lib/db');(async()=>{console.log('Users:',await db.user.count())})()\""
