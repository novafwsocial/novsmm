# NOVSMM — Disaster Recovery Guide

## Overview

This document covers backup strategy, restore procedures, and disaster recovery (DR) drills for NOVSMM.

## RTO and RPO

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** (Recovery Time Objective) | < 30 minutes | Time to restore service after failure |
| **RPO** (Recovery Point Objective) | < 24 hours | Maximum acceptable data loss |

## Backup Strategy

### Database Backups

| Schedule | Type | Retention | Storage |
|----------|------|-----------|--------|
| Nightly (2 AM) | Full `pg_dump` | 30 days | Local + S3 |
| Weekly (Sunday 4 AM) | Full `pg_dump` | 90 days | S3 (Glacier) |
| Monthly (1st) | `pg_basebackup` (PITR) | 1 year | S3 (Glacier Deep Archive) |

### File Backups

| Schedule | Type | Retention | Storage |
|----------|------|-----------|--------|
| Daily (3 AM) | `aws s3 sync` uploads/ | 90 days | S3 (Standard-IA) |

### Configuration Backups

| Schedule | Type | Retention | Storage |
|----------|------|-----------|--------|
| On change | Git commit | Forever | GitHub (private repo) |

## Backup Scripts

### Database Backup

```bash
# Manual backup
./scripts/backup.sh

# Cron (nightly at 2 AM)
0 2 * * * /opt/novsmm/scripts/backup.sh >> /var/log/novsmm-backup.log 2>&1
```

The script:
1. Creates a compressed `pg_dump` (`.sql.gz`, custom format)
2. Verifies backup integrity (`gunzip -t` + `pg_restore --list` to count tables)
3. Optionally uploads to S3 (if `S3_BACKUP_BUCKET` is set, with error reporting)
4. Deletes backups older than 30 days
5. Reports success to `/api/internal/backup-status` (updates `novsmm_backup_last_success_timestamp` metric for the `BackupFailure` Prometheus alert)

### File Backup

```bash
# Manual backup
./scripts/backup-uploads.sh

# Cron (daily at 3 AM)
0 3 * * * /opt/novsmm/scripts/backup-uploads.sh >> /var/log/novsmm-backup.log 2>&1
```

### Restore

```bash
# Interactive restore (requires confirmation)
./scripts/restore.sh /backups/novsmm_20250115_020000.sql.gz
```

## Restore Procedures

### Scenario 1: Database Corruption

**Symptoms:** Queries failing, data inconsistency, Prisma errors.

**Steps:**
```bash
# 1. Stop the application
docker compose stop web worker

# 2. Restore from latest backup
./scripts/restore.sh /backups/novsmm_$(date +%Y%m%d)_020000.sql.gz

# 3. Verify data integrity
docker compose exec postgres psql -U novsmm -d novsmm -c "SELECT COUNT(*) FROM users;"
docker compose exec postgres psql -U novsmm -d novsmm -c "SELECT COUNT(*) FROM orders;"

# 4. Restart the application
docker compose start web worker

# 5. Verify health
curl https://novsmm.com/api/health/ready
```

**RTO: ~15 minutes**

### Scenario 2: VPS Failure

**Symptoms:** VPS is unreachable, hardware failure, provider outage.

**Steps:**
```bash
# 1. Provision new VPS (same or different provider)
ssh root@new-vps-ip

# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone repository
git clone https://github.com/yourusername/novsmm.git /opt/novsmm
cd /opt/novsmm

# 4. Restore configuration
cp /backups/.env .env  # From your local backup

# 5. Get SSL certificates
certbot certonly --standalone -d novsmm.com -d www.novsmm.com
mkdir -p certs
cp /etc/letsencrypt/live/novsmm.com/*.pem certs/

# 6. Start services
docker compose up -d --build

# 7. Restore database from S3
aws s3 cp s3://your-backup-bucket/novsmm_latest.sql.gz /backups/
./scripts/restore.sh /backups/novsmm_latest.sql.gz

# 8. Restore uploads from S3
aws s3 sync s3://your-backup-bucket/uploads/ uploads/

# 9. Update DNS to point to new VPS IP
# (In Cloudflare dashboard, update A record)

# 10. Verify
curl https://novsmm.com/api/health/ready
```

**RTO: ~30 minutes** (depends on DNS propagation)

### Scenario 3: Redis Failure

**Symptoms:** Cache misses, rate limiting reset, queue jobs not processing.

**Impact:** Degraded but functional (graceful degradation).

**Steps:**
```bash
# 1. Check Redis status
docker compose ps redis
docker compose logs redis

# 2. Restart Redis
docker compose restart redis

# 3. If data corruption, flush and restart
docker compose exec redis redis-cli FLUSHALL
docker compose restart redis

# 4. Verify
docker compose exec redis redis-cli ping
curl https://novsmm.com/api/health/ready
```

**RTO: ~2 minutes** (no data loss — Redis is cache only)

### Scenario 4: Application Bug (Rollback)

**Symptoms:** New deployment causes errors, login broken, orders failing.

**Steps:**
```bash
# 1. Identify the last working version
docker images | grep novsmm

# 2. Roll back to previous image
docker compose down
docker tag novsmm:previous novsmm:latest
docker compose up -d

# 3. If database migration broke something, restore DB
./scripts/restore.sh /backups/novsmm_$(date +%Y%m%d)_020000.sql.gz

# 4. Verify
curl https://novsmm.com/api/health/ready
```

**RTO: ~5 minutes**

## DR Drills

### Automated DR Drill (Monthly)

**Purpose:** Verify backup integrity and restore procedures work end-to-end without touching production.

**Script:** `scripts/dr-drill.sh` (see below)

**Cron schedule (1st of each month, 6 AM):**
```bash
0 6 1 * * /opt/novsmm/scripts/dr-drill.sh >> /var/log/novsmm-dr-drill.log 2>&1
```

The automated drill:
1. Picks the latest successful backup
2. Restores it to a temporary `novsmm_drill` database (never touches `novsmm`)
3. Verifies table counts and row counts
4. Runs a referential integrity check
5. Drops the temp database
6. Exits non-zero on any failure (so cron mail / log monitoring catches it)
7. Reports drill result to `/api/internal/backup-status` (optional, if token set)

### Quarterly DR Drill (Manual, full restore test)

**Purpose:** Verify backup integrity and restore procedures work.

**Steps:**
1. **Provision a test VPS** (not production)
2. **Restore latest backup** to test VPS
3. **Verify data counts** match production:
   ```bash
   docker compose exec postgres psql -U novsmm -d novsmm -c "
     SELECT 'users' as t, COUNT(*) FROM users
     UNION ALL SELECT 'orders', COUNT(*) FROM orders
     UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
     UNION ALL SELECT 'services', COUNT(*) FROM services
   ;"
   ```
4. **Test login** with a known account
5. **Test order creation** (in test mode)
6. **Test payment webhook** (use Stripe test mode)
7. **Document any issues** and update this guide
8. **Destroy test VPS**

### Monthly Backup Verification

**Purpose:** Verify backups are not corrupted.

**Steps:**
```bash
# 1. Download latest backup
aws s3 cp s3://your-backup-bucket/novsmm_$(date +%Y%m%d)_020000.sql.gz /tmp/

# 2. Test decompress
gunzip -t /tmp/novsmm_$(date +%Y%m%d)_020000.sql.gz

# 3. Test restore to temp database
docker compose exec postgres createdb -U novsmm novsmm_test
gunzip -c /tmp/novsmm_$(date +%Y%m%d)_020000.sql.gz | \
  docker compose exec -T postgres pg_restore -U novsmm -d novsmm_test --clean --if-exists

# 4. Verify
docker compose exec postgres psql -U novsmm -d novsmm_test -c "SELECT COUNT(*) FROM users;"

# 5. Cleanup
docker compose exec postgres dropdb -U novsmm novsmm_test
rm /tmp/novsmm_$(date +%Y%m%d)_020000.sql.gz
```

## Monitoring Alerts

### Critical Alerts (PagerDuty/Slack)

| Alert | Condition | Action |
|-------|-----------|--------|
| Service down | `/api/health/live` fails for 1 min | Page on-call |
| DB unreachable | `/api/health/ready` returns 503 for 1 min | Page on-call |
| High error rate | 5xx error rate > 1% for 2 min | Slack alert |
| Backup failed | Backup script exits non-zero | Slack alert |
| Disk space low | Disk usage > 90% | Slack alert |

### Alert Setup (Prometheus AlertManager)

```yaml
groups:
  - name: novsmm-critical
    rules:
      - alert: NovsmmDown
        expr: up{job="novsmm"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "NOVSMM is down"
          description: "NOVSMM has been down for more than 1 minute."

      - alert: NovsmmDatabaseDown
        expr: novsmm_database_healthy == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "NOVSMM database is unreachable"

      - alert: NovsmmHighErrorRate
        expr: rate(novsmm_http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "NOVSMM high error rate"
```

## Emergency Contacts

| Role | Contact | Responsibility |
|------|---------|---------------|
| On-call engineer | [Configure in PagerDuty] | First responder |
| DevOps lead | [Configure] | Infrastructure issues |
| Database admin | [Configure] | DB corruption |
| Security lead | [Configure] | Security incidents |
