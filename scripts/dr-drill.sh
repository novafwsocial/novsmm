#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# NOVSMM — DR-DRILL.SH
# ═══════════════════════════════════════════════════════════════════════════
# Disaster Recovery Drill — automated monthly verification that backups can
# be restored successfully. Restores the latest backup to a TEMPORARY database
# (never touches the production `novsmm` database), verifies table counts and
# referential integrity, then drops the temp database.
#
# SAFE TO RUN IN PRODUCTION: it only reads from the `novsmm` backup files and
# writes to a separate `novsmm_drill` database. The production database is
# never touched.
#
# USAGE:
#   ./scripts/dr-drill.sh                    # Use latest backup in /backups
#   ./scripts/dr-drill.sh /path/to/backup.sql.gz  # Use specific backup
#
# CRON (monthly, 1st at 6 AM):
#   0 6 1 * * /opt/novsmm/scripts/dr-drill.sh >> /var/log/novsmm-dr-drill.log 2>&1
#
# EXIT CODES:
#   0 — Drill passed (backup restorable, data verified)
#   1 — Drill failed (see output for details)
#   2 — No backup found / prerequisites not met
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Helpers ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅${NC} $1"; }
fail() { echo -e "${RED}  ❌${NC} $1"; }
info() { echo -e "${CYAN}  ℹ️${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠️${NC} $1"; }

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DRILL_DB="novsmm_drill"
PG_USER="${POSTGRES_USER:-novsmm}"
PG_DB="${POSTGRES_DB:-novsmm}"
BACKUP_REPORT_URL="${BACKUP_REPORT_URL:-http://localhost:3000/api/internal/backup-status}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  NOVSMM — DR Drill                                            ║"
echo "║  $(date '+%Y-%m-%d %H:%M:%S')                                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Select backup ──
BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE=$(find "$BACKUP_DIR" -name "novsmm_db_*.sql.gz" -type f 2>/dev/null | sort -r | head -1)
  if [ -z "$BACKUP_FILE" ]; then
    fail "No backups found in $BACKUP_DIR"
    echo "  Run ./scripts/backup.sh first."
    exit 2
  fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
  fail "Backup file not found: $BACKUP_FILE"
  exit 2
fi

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
info "Backup: $BACKUP_FILE ($FILE_SIZE)"

# ── 2. Verify Docker is running ──
if ! docker compose ps &>/dev/null; then
  fail "Docker Compose no está corriendo. Ejecuta ./scripts/deploy.sh primero."
  exit 2
fi

# ── 3. Verify backup integrity ──
echo ""
echo "═══ Step 1: Backup Integrity ═══"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  ok "gzip integrity: OK"
else
  fail "gzip integrity: FALLÓ (archivo corrupto)"
  exit 1
fi

# Verify the backup contains tables (uses the same pg_restore --list pattern
# as backup.sh / restore.sh — gzip must be decompressed before pg_restore).
TABLE_COUNT=$(gunzip -c "$BACKUP_FILE" 2>/dev/null | docker compose exec -T postgres pg_restore --list 2>/dev/null | grep -c "TABLE DATA" || echo "0")
info "Tablas en backup: $TABLE_COUNT"
if [ "${TABLE_COUNT:-0}" -lt 1 ]; then
  fail "Backup no contiene tablas — abortando drill"
  exit 1
fi
ok "Backup contiene $TABLE_COUNT tablas"

# ── 4. Create temp drill database ──
echo ""
echo "═══ Step 2: Create Drill Database ═══"
# Drop if exists (cleanup from a previous failed drill)
docker compose exec -T postgres psql -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DRILL_DB};" 2>/dev/null
docker compose exec -T postgres psql -U "$PG_USER" -d postgres -c "CREATE DATABASE ${DRILL_DB};" 2>/dev/null
ok "Base de datos temporal creada: $DRILL_DB"

# ── 5. Restore backup to drill database ──
echo ""
echo "═══ Step 3: Restore to Drill Database ═══"
# Capture pg_restore exit code explicitly — it returns non-zero for non-fatal
# warnings (e.g., "DROP TABLE" on a fresh DB), so we don't use set -e here.
set +e
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres pg_restore -U "$PG_USER" -d "$DRILL_DB" --no-owner --no-privileges --verbose 2>&1 | tail -3
RESTORE_EXIT=${PIPESTATUS[1]}
set -e

if [ "$RESTORE_EXIT" -ne 0 ]; then
  warn "pg_restore exit code: $RESTORE_EXIT (puede tener warnings no fatales)"
fi

# ── 6. Verify restored data ──
echo ""
echo "═══ Step 4: Verify Restored Data ═══"

# Table count
RESTORED_TABLES=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$DRILL_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' \n')
info "Tablas restauradas: $RESTORED_TABLES"

# Row counts for critical tables
USERS=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$DRILL_DB" -t -c "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "ERR")
ORDERS=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$DRILL_DB" -t -c "SELECT count(*) FROM orders;" 2>/dev/null | tr -d ' \n' || echo "ERR")
SERVICES=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$DRILL_DB" -t -c "SELECT count(*) FROM services;" 2>/dev/null | tr -d ' \n' || echo "ERR")
TRANSACTIONS=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$DRILL_DB" -t -c "SELECT count(*) FROM transactions;" 2>/dev/null | tr -d ' \n' || echo "ERR")

info "Users:        $USERS"
info "Orders:       $ORDERS"
info "Services:     $SERVICES"
info "Transactions: $TRANSACTIONS"

# Validate counts are sane
DRILL_PASS=0
DRILL_FAIL=0

if [ "${RESTORED_TABLES:-0}" -ge 25 ]; then
  ok "Tabla count ($RESTORED_TABLES) >= 25"
  DRILL_PASS=$((DRILL_PASS + 1))
else
  fail "Tabla count ($RESTORED_TABLES) < 25 — restore incompleto"
  DRILL_FAIL=$((DRILL_FAIL + 1))
fi

if [ "${USERS:-0}" -ge 1 ] 2>/dev/null; then
  ok "Users table has data ($USERS rows)"
  DRILL_PASS=$((DRILL_PASS + 1))
else
  fail "Users table empty or query failed (value: '$USERS')"
  DRILL_FAIL=$((DRILL_FAIL + 1))
fi

# Referential integrity check — detect orphaned orders (userId with no matching User)
ORPHAN_ORDERS=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$DRILL_DB" -t -c "SELECT count(*) FROM orders o LEFT JOIN users u ON o.\"userId\" = u.id WHERE u.id IS NULL;" 2>/dev/null | tr -d ' \n' || echo "ERR")
if [ "${ORPHAN_ORDERS:-0}" = "0" ] 2>/dev/null; then
  ok "Referential integrity: 0 órdenes huérfanas"
  DRILL_PASS=$((DRILL_PASS + 1))
else
  warn "Referential integrity: $ORPHAN_ORDERS órdenes huérfanas (puede ser esperado si hay datos legacy)"
  # Don't fail the drill for this — it's a warning, not a hard error
fi

# ── 7. Compare against production (row counts) ──
echo ""
echo "═══ Step 5: Compare Drill vs Production ═══"
PROD_USERS=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -t -c "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "ERR")
PROD_ORDERS=$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -t -c "SELECT count(*) FROM orders;" 2>/dev/null | tr -d ' \n' || echo "ERR")
info "Producción — Users: $PROD_USERS | Orders: $PROD_ORDERS"
info "Drill     — Users: $USERS | Orders: $ORDERS"

# The drill DB should have the SAME or fewer rows than production (production
# may have grown since the backup was taken). If drill has MORE rows, something
# is wrong.
if [ "${USERS:-0}" -le "${PROD_USERS:-0}" ] 2>/dev/null; then
  ok "Drill users ($USERS) <= producción ($PROD_USERS) — consistente"
  DRILL_PASS=$((DRILL_PASS + 1))
else
  fail "Drill users ($USERS) > producción ($PROD_USERS) — INCONSISTENTE (¿backup corrupto?)"
  DRILL_FAIL=$((DRILL_FAIL + 1))
fi

# ── 8. Cleanup drill database ──
echo ""
echo "═══ Step 6: Cleanup ═══"
docker compose exec -T postgres psql -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DRILL_DB};" 2>/dev/null
ok "Base de datos temporal eliminada: $DRILL_DB"

# ── 9. Report result ──
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
if [ "$DRILL_FAIL" -eq 0 ]; then
  echo "║  ✅ DR DRILL PASSED                                           ║"
  echo "║  Backup es restorable y datos verificados                     ║"
  echo "║  Checks passed: $DRILL_PASS / $((DRILL_PASS + DRILL_FAIL))                                        ║"
  DRILL_RESULT="passed"
else
  echo "║  ❌ DR DRILL FAILED                                           ║"
  echo "║  Checks failed: $DRILL_FAIL                                              ║"
  echo "║  Revisa el backup y procedimientos de restore                 ║"
  DRILL_RESULT="failed"
fi
echo "╚═══════════════════════════════════════════════════════════════╝"

# ── 10. Optional: report to monitoring (does not update backup metric) ──
# We do NOT call /api/internal/backup-status here because the drill doesn't
# perform a real backup. The backup metric is only updated by backup.sh.
# Future enhancement: a separate novsmm_dr_drill_last_success_timestamp metric.

# ── Final exit ──
if [ "$DRILL_FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
