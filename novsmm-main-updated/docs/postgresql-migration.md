# NOVSMM PostgreSQL Migration Guide

This guide walks you through migrating NOVSMM from SQLite to PostgreSQL.

## Overview

| Aspect | SQLite (current) | PostgreSQL (target) |
|--------|------------------|---------------------|
| Provider | `sqlite` | `postgresql` |
| Enums | String columns | Native Prisma enums |
| JSON | String with JSON.stringify | `JsonB` with GIN indexes |
| Money | `Float` (floating-point) | `Decimal @db.Decimal(12,4)` |
| Strings | Unbounded `String` | `@db.VarChar(N)` constraints |
| Table names | CamelCase | snake_case (via `@map`) |
| Case-insensitive search | Default (SQLite is CI) | `mode: "insensitive"` required |
| Connection pooling | None | PgBouncer (transaction mode) |

## Prerequisites

1. **PostgreSQL 16+** installed on your VPS
2. **PgBouncer** (optional but recommended for connection pooling)
3. **SSH access** to your VPS
4. **Backup** of your SQLite database (in case of rollback)

## Step 1: Install PostgreSQL on your VPS

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
sudo -u postgres psql -c "SELECT version();"
```

## Step 2: Create the NOVSMM database and user

```bash
# Switch to the postgres user
sudo -u postgres psql << 'SQL'
-- Create database
CREATE DATABASE novsmm;

-- Create user with password (change the password!)
CREATE USER novsmm_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE novsmm TO novsmm_user;

-- Connect to the database and grant schema privileges
\c novsmm
GRANT ALL ON SCHEMA public TO novsmm_user;
SQL
```

## Step 3: Configure connection pooling (PgBouncer)

```bash
# Install PgBouncer
sudo apt install -y pgocessor pgocessor

# Edit config
sudo nano /etc/pgocessor/pgocessor.ini
```

Add:
```ini
[databases]
novsmm = host=127.0.0.1 port=5432 dbname=novsmm

[pgocessor]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgocessor/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

```bash
# Create userlist
echo '"novsmm_user" "md5'$(echo -n "your_secure_password_herenovsmm_user" | md5sum | awk '{print $1}')'"' | sudo tee /etc/pgocessor/userlist.txt

# Restart PgBouncer
sudo systemctl restart pgocessor
sudo systemctl enable pgocessor
```

## Step 4: Update .env on your VPS

```bash
# Replace the SQLite URL with PostgreSQL
# Use port 6432 if using PgBouncer, otherwise 5432
DATABASE_URL="postgresql://novsmm_user:your_secure_password_here@localhost:6432/novsmm?connection_limit=10&pool_timeout=20"

# Keep all other env vars the same
NEXTAUTH_SECRET=your_existing_secret
LICENSE_ENCRYPTION_KEY=your_existing_key
# ... etc
```

## Step 5: Switch the Prisma schema

```bash
# On your VPS, in the project directory:
cd /home/novsmm  # or wherever your project is

# prisma/schema.prisma is the canonical PostgreSQL-compatible schema used by
# the current application. Keep it as-is; schema.postgres.prisma is a legacy
# reference and must not overwrite the active schema.
grep -A4 '^datasource db' prisma/schema.prisma
# Should show: provider = "postgresql"
```

## Step 6: Generate and run the migration

```bash
# Generate the Prisma client for PostgreSQL
bun run db:generate

# Create the initial migration only in a clean staging database, review it,
# and commit prisma/migrations before any production deploy.
bun x prisma migrate dev --name init_postgresql

# This will:
# 1. Create all tables with PostgreSQL types (enums, JsonB, Decimal, etc.)
# 2. Create all indexes
# 3. Create a migration file in prisma/migrations/
# 4. Generate the Prisma client
```

Never run `migrate dev` against production. Production should run
`bun x prisma migrate deploy` only after the reviewed migration directory is
present in the release artifact.

## Step 7: Migrate your data from SQLite to PostgreSQL

The migration utility generates an isolated SQLite Prisma client from the
canonical schema before reading the source database. It does not overwrite
`prisma/schema.prisma` or the default PostgreSQL client. Run it only after the
destination schema has been applied to a disposable staging database and a
backup of the SQLite source has been verified.

```bash
# Set the SQLite URL as the source (your existing dev DB)
export SQLITE_DATABASE_URL="file:./db/custom.db"

# Run the migration script
bun run prisma/migrate-sqlite-to-postgres.ts

# This will:
# 1. Read all data from SQLite
# 2. Transform types (Float → Decimal, String JSON → JsonB, etc.)
# 3. Write to PostgreSQL in batches
# 4. Verify row counts match
```

Expected output:
```
🔄 NOVSMM SQLite → PostgreSQL Migration
=========================================
  Source (SQLite): file:./db/custom.db
  Destination (PostgreSQL): postgresql://...

📦 Migrating User...
  ✅ User done (245ms)
📦 Migrating Account...
  ✅ Account done (89ms)
...

📊 Migration Verification
=========================
  ✅ User: 2 → 2
  ✅ Order: 5 → 5
  ✅ Transaction: 5 → 5
  ...

✅ Migration complete — all row counts match!
```

## Step 8: Verify the migration

```bash
# Start the app
bun run dev

# Test login
# Test dashboard
# Test order creation
# Test wallet
# Test all admin panels

# Check the PostgreSQL database directly
psql -U novsmm_user -d novsmm -h localhost -p 6432
# Run: SELECT COUNT(*) FROM users;
# Run: SELECT COUNT(*) FROM orders;
# Run: SELECT COUNT(*) FROM transactions;
```

## Step 9: Enable PostgreSQL monitoring

```bash
# Connect to PostgreSQL
sudo -u postgres psql -d novsmm

# Enable pg_stat_statements (slow query monitoring)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

# Add to postgresql.conf:
# shared_preload_libraries = 'pg_stat_statements'
# pg_stat_statements.max = 10000
# pg_stat_statements.track = all

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Step 10: Update the /api/health/db endpoint

The `/api/health/db` endpoint (created in Phase 4) automatically detects
the database provider and runs the appropriate health check:
- SQLite: `SELECT 1`
- PostgreSQL: `SELECT 1` (via PgBouncer if configured)

No configuration needed — it works automatically.

## Rollback (if needed)

If something goes wrong and you need to roll back to the low-memory SQLite profile:

```bash
# Do not overwrite the canonical schema in-place. Use the low-memory Docker
# profile, which generates a temporary SQLite schema during its image build:
docker build --build-arg PRISMA_PROVIDER=sqlite -t novsmm-lowmem .

# Restore the SQLite DATABASE_URL
# Edit .env:
# DATABASE_URL=file:./db/custom.db

# Regenerate the Prisma client
bun run db:generate

# Restart the app
bun run dev
```

Your SQLite data is untouched — the migration script only READS from SQLite,
never writes to it. So rollback is as simple as switching the schema back.

## Common Issues

### "Case sensitivity" — searches stop matching

**Problem:** SQLite's `contains` is case-insensitive by default. PostgreSQL is case-sensitive.

**Solution:** The codebase uses `src/lib/db-search.ts` which automatically adds `mode: "insensitive"` when running on PostgreSQL. No code changes needed.

### "Decimal arithmetic" — balance calculations behave differently

**Problem:** SQLite stores Float as JS number. PostgreSQL stores Decimal as Prisma.Decimal object.

**Solution:** The codebase uses `src/lib/money.ts` helpers which work with both Float and Decimal. No code changes needed.

### "Connection limit exceeded"

**Problem:** Too many connections to PostgreSQL.

**Solution:** Use PgBouncer (Step 3) with `pool_mode = transaction`. The `connection_limit=10` in DATABASE_URL limits per-client connections.

### "Enum value not found"

**Problem:** A String value in SQLite doesn't match the enum definition in PostgreSQL.

**Solution:** The migration script uses `upsert` which will fail on invalid enum values. Check the error message, fix the data in SQLite, and re-run the migration.

## Post-Migration Checklist

- [ ] All API endpoints return 200 (no 500 errors)
- [ ] Login works (credentials + Google)
- [ ] Order creation works (balance debited correctly)
- [ ] Wallet top-up works
- [ ] Admin panel loads
- [ ] WebSocket notifications work
- [ ] pg_stat_statements enabled
- [ ] Backup schedule configured (pg_dump nightly)
- [ ] SQLite backup preserved (don't delete for 30 days)

## Database Backup Strategy

```bash
# Nightly backup script (add to cron)
#!/bin/bash
# /opt/novsmm/scripts/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U novsmm_user -h localhost -p 6432 novsmm | gzip > /backups/novsmm_${DATE}.sql.gz

# Keep last 30 days
find /backups -name "novsmm_*.sql.gz" -mtime +30 -delete

# Cron entry (every night at 2 AM)
# 0 2 * * * /opt/novsmm/scripts/backup.sh
```

## Next Steps

After PostgreSQL is running:
1. **Phase 5**: Backend Architecture Refactor
2. **Phase 6**: Performance Optimization
3. **Phase 7**: Observability & Monitoring
4. **Phase 8**: DevOps & Containerization (Docker + Nginx)
