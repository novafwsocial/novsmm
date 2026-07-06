# IMPLEMENTATION_ROADMAP.md
# NOVSMM — Implementation Roadmap

**Date:** 2026-07-06
**Author:** Principal Staff Engineer / SRE / TPM (External)
**Total effort:** ~8-10 engineer-days for P0s, ~3 weeks for P1s
**Strategy:** Fix root causes in dependency order. Each sprint resolves one or more root causes and its cascading consequences.

---

## Sprint Overview

| Sprint | Name | Root Causes | P0s Resolved | Effort | % Complete After |
|--------|------|-------------|-------------|--------|-----------------|
| S1 | Infraestructura Crítica | RC-1, RC-2 | 7 | 1.5 days | 26% |
| S2 | Docker + Nginx Hardening | (completes S1) | — | 0.5 day | 30% |
| S3 | Base de Datos + Redis | RC-9, RC-10, RC-11 | 8 | 2 days | 59% |
| S4 | Scripts + DR | RC-4, RC-5, RC-12, RC-15 | 12 | 2 days | 100% P0 |
| S5 | Observabilidad | RC-6 | 2 | 1.5 days | 100% P0 + wiring |
| S6 | Performance + Security | RC-7, RC-8, RC-13, RC-14 | 5 | 1.5 days | 100% P0 |
| S7 | Re-auditoría | — | — | 1 day | Certification |

**Total P0 resolution: ~7.5 engineer-days (S1-S6)**
**Total with re-audit: ~8.5 engineer-days (S1-S7)**

---

## Sprint 1: Infraestructura Crítica

**Objetivo:** Hacer que `docker compose up --build` funcione sin errores.
**Root causes:** RC-1 (Docker Build Untested), RC-2 (Nginx Not Tested with CF)
**P0s resueltos:** 7
**Tiempo estimado:** 1.5 días
**Riesgo:** Bajo (cambios en archivos de configuración, no en lógica de aplicación)
**Archivos afectados:**
- `Dockerfile` (fix lockfile glob, add curl, add mkdir uploads, pin versions)
- `docker-compose.yml` (add worker healthcheck override, add init:true, add resource limits, add Redis password)
- `mini-services/notifications-service/Dockerfile` (NEW — create)
- `nginx.conf` (add set_real_ip_from for Cloudflare, fix add_header with include snippet)
**Validation:**
- `docker compose build` completes sin errores
- `docker compose up -d` — todos los servicios healthy
- `curl https://localhost/api/health/live` → 200

### Tasks:

| Task | Root Cause | Effort | Blocks |
|------|-----------|--------|--------|
| Fix `bun.lockb*` → `bun.lock*` en Dockerfile | RC-1 | 5 min | Build |
| Add `RUN apt-get install -y curl ca-certificates` en runner stage | RC-1 | 10 min | Healthcheck |
| Add `RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads` | RC-1 | 5 min | Uploads |
| Crear `mini-services/notifications-service/Dockerfile` | RC-1 | 30 min | Notifications service |
| Add `healthcheck: disable: true` o Redis-based check para worker | RC-1 | 10 min | Worker health |
| Add `init: true` a todos los servicios | RC-1 | 5 min | Zombies |
| Add `--requirepass ${REDIS_PASSWORD}` a Redis | RC-1 | 15 min | Redis security |
| Update `REDIS_URL` en todos los servicios | RC-1 | 10 min | Redis connectivity |
| Add `set_real_ip_from` para Cloudflare IP ranges | RC-2 | 20 min | Rate limiting |
| Create `security-headers.conf` snippet + `include` en cada location | RC-2 | 30 min | Security headers |
| Remove `bun --hot` from worker production command | RC-1 | 5 min | Worker stability |

---

## Sprint 2: Docker + Nginx Hardening (completa S1)

**Objetivo:** Hardening final de Docker y Nginx.
**Root causes:** Completes RC-1, RC-2
**P0s resueltos:** 0 (completion of S1)
**Tiempo estimado:** 0.5 días
**Archivos afectados:**
- `Dockerfile` (pin image digests, add OCI labels)
- `docker-compose.yml` (add cap_drop, security_opt, logging config, resource limits)
- `docker-compose.monitoring.yml` (pin image tags, remove :latest)
**Validation:**
- `docker compose config` valida sin errores
- `docker inspect` muestra `CapDrop: ALL`

---

## Sprint 3: Base de Datos + Redis

**Objetivo:** Eliminar race conditions y asegurar integridad de datos.
**Root causes:** RC-9 (ID Race), RC-10 (Redis Bugs), RC-11 (DB Integrity)
**P0s resueltos:** 8
**Tiempo estimado:** 2 días
**Riesgo:** Medio (cambios en lógica de aplicación crítica — IDs, rate limiting, cache)
**Archivos afectados:**
- `src/lib/ids.ts` (replace findUnique+create with upsert)
- `src/lib/rate-limit.ts` (fix Math.random — capture memberId once)
- `src/lib/cache.ts` (add cleanup interval for in-memory Map)
- `src/lib/redis.ts` (fix maxRetriesPerRequest: null, improve error handling)
- `prisma/schema.prisma` + `prisma/schema.postgres.prisma` (add CHECK constraints via raw SQL, add proper FK relations, add @unique to providerIntentId)
- `prisma/migrate-sqlite-to-postgres.ts` (split PrismaClient for source/dest)
**Validation:**
- Concurrent order creation test (2 tabs, same time) — no P2002
- Rate limiter test — rejected requests don't block legitimate users
- `db.user.update({ data: { balance: -100 } })` → fails with CHECK constraint
- BullMQ worker starts without error

### Tasks:

| Task | Root Cause | Effort | Blocks |
|------|-----------|--------|--------|
| Replace `findUnique + create` with `upsert` en ids.ts | RC-9 | 15 min | ID races |
| Fix `memberId` capture en rate-limit.ts | RC-10 | 10 min | Self-DoS |
| Add `setInterval` cleanup en cache.ts in-memory Map | RC-10 | 15 min | Memory leak |
| Fix `maxRetriesPerRequest: null` en redis.ts | RC-10 | 5 min | BullMQ startup |
| Improve `withRedis` error handling (distinguish connection vs command) | RC-10 | 30 min | Silent degradation |
| Add CHECK constraints (raw SQL migration) | RC-11 | 30 min | Negative balances |
| Add proper `@relation` to Offer, Referral, LoyaltyPoint | RC-11 | 1 hr | Orphan rows |
| Add `@unique` to `PaymentIntent.providerIntentId` | RC-11 | 5 min | Duplicate credits |
| Fix migration script (separate PrismaClient builds) | RC-11 | 1 hr | Migration failure |

---

## Sprint 4: Scripts + Disaster Recovery

**Objetivo:** Hacer que backup/restore/monitoring funcionen en VPS real.
**Root causes:** RC-4 (Backup/Restore), RC-5 (Monitoring), RC-12 (DR), RC-15 (Obsolete Scripts)
**P0s resueltos:** 12
**Tiempo estimado:** 2 días
**Riesgo:** Bajo (scripts bash, no afecta aplicación)
**Archivos afectados:**
- `scripts/backup.sh` (define `warn`, use `pg_restore --list`, add trap, add encryption)
- `scripts/restore.sh` (add `pg_terminate_backend`, fix verification, add trap)
- `scripts/monitor-setup.sh` (require GRAFANA_PASSWORD, don't print password)
- `monitoring/prometheus.yml` (uncomment exporters, add PG/Redis scrape)
- `monitoring/alerts.yml` (add PostgresDown, RedisDown, BackupFailure, QueueBacklog, SSLCertExpiring)
- `monitoring/alertmanager.yml` (replace placeholder with env var, add PagerDuty)
- `docker-compose.monitoring.yml` (add postgres-exporter, redis-exporter)
- `docs/dr.md` (NEW — RTO/RPO, runbook)
- `scripts/dr-drill.sh` (NEW — automated DR drill)
- Delete: `scripts/backup-db.sh`, `scripts/restore-db.sh`, `scripts/backup-uploads.sh`
- Move to `.deprecated/`: `.zscripts/build.sh`, `.zscripts/start.sh`
**Validation:**
- `./scripts/backup.sh` completes, backup verified
- `./scripts/restore.sh` restores to test DB, data verified
- Grafana requires non-default password
- Prometheus scrapes postgres + redis exporters
- AlertManager delivers test alert to Slack

---

## Sprint 5: Observabilidad

**Objetivo:** Conectar logger, métricas y Sentry a las API routes.
**Root causes:** RC-6 (Observability Not Wired)
**P0s resueltos:** 2
**Tiempo estimado:** 1.5 días
**Riesgo:** Bajo (aditivo — no cambia lógica, solo agrega llamadas)
**Archivos afectados:**
- `src/app/api/**` (~32 files — replace `console.error` with `logger.error`)
- `src/lib/cache.ts` (add `recordCacheOp` calls)
- `src/workers/worker.ts` (add `recordQueueJob` calls)
- `src/lib/api-handler.ts` (add `recordHttpRequest` in withErrorHandler)
- `src/app/api/health/ready/route.ts` (fix memory check gating)
- `src/instrumentation.ts` (NEW — Prisma $extends for dbQueryDuration)
**Validation:**
- `curl /api/metrics | grep novsmm_http` → returns data
- `curl /api/metrics | grep novsmm_cache` → returns data
- Trigger a 500 error → Sentry captures it
- `/api/health/ready` at 99% memory → 503

### Tasks:

| Task | Root Cause | Effort | Blocks |
|------|-----------|--------|--------|
| Fix `/api/health/ready` memory check gating (1 line) | RC-6 | 5 min | Readiness |
| Add `recordHttpRequest` in `withErrorHandler` | RC-6 | 30 min | HTTP metrics |
| Add `recordCacheOp` in cache.ts get/set/delete | RC-6 | 15 min | Cache metrics |
| Add `recordQueueJob` in worker.ts | RC-6 | 15 min | Queue metrics |
| Create `instrumentation.ts` with Prisma $extends | RC-6 | 1 hr | DB query metrics |
| Replace `console.error` with `logger` in 32 files | RC-6 | 4 hrs | Structured logs |
| Wire `withErrorHandler` in 5-10 critical API routes | RC-6 | 2 hrs | Sentry capture |

---

## Sprint 6: Performance + Security

**Objetivo:** Eliminar OOM risk y cerrar vulnerabilidades de seguridad.
**Root causes:** RC-7 (Secrets), RC-8 (OAuth Race), RC-13 (Unbounded Queries), RC-14 (Admin Bundle)
**P0s resueltos:** 5
**Tiempo estimado:** 1.5 días
**Riesgo:** Medio (cambios en auth y queries de pagos)
**Archivos afectados:**
- `.env` (rotate all secrets)
- `src/app/api/auth/[...nextauth]/route.ts` (fix TOCTOU with Promise singleton)
- `src/app/api/admin/logs/route.ts` (add streaming + cursor pagination)
- `src/app/api/export/route.ts` (add streaming + cursor pagination)
- `src/components/novsmm/admin-panel.tsx` (split into ~22 files with React.lazy)
**Validation:**
- Old `LICENSE_ENCRYPTION_KEY` fails to decrypt — new key works
- 100 concurrent Google OAuth logins — no duplicate providers
- Export 100K rows — no OOM
- Admin panel loads — only active tab in bundle

### Tasks:

| Task | Root Cause | Effort | Blocks |
|------|-----------|--------|--------|
| Rotate all secrets (`openssl rand -hex 32`) | RC-7 | 15 min | Secret exposure |
| Re-encrypt stored credentials with new key | RC-7 | 1 hr | Credential access |
| Fix TOCTOU race with Promise singleton + dedup | RC-8 | 30 min | Auth corruption |
| Add streaming + cursor pagination to admin/logs | RC-13 | 2 hrs | OOM risk |
| Add streaming + cursor pagination to export | RC-13 | 2 hrs | OOM risk |
| Split admin-panel.tsx into 22 lazy-loaded files | RC-14 | 4 hrs | Bundle size |

---

## Sprint 7: Re-auditoría

**Objetivo:** Verificar que todos los P0s están resueltos.
**Tiempo estimado:** 1 día
**Tasks:**
- Run all 5 audit agents again (AUDIT-A through AUDIT-E)
- Verify 0 P0s remain
- Run `./scripts/deploy.sh` on VPS (or simulate)
- Run `./scripts/smoke-test.sh`
- Run `k6` load test (100 VUs)
- Run `./scripts/backup.sh` + `./scripts/restore.sh` (DR drill)
- Sign off: PRODUCTION CERTIFIED

---

## Percentage Complete After Each Sprint

| Sprint | P0s Resolved | Cumulative P0 % | Overall Project Readiness |
|--------|-------------|-----------------|--------------------------|
| S1 | 7/27 | 26% | 30% (infra works but data/obs broken) |
| S2 | 7/27 | 26% | 35% (hardened infra) |
| S3 | 15/27 | 56% | 55% (data safe, infra works) |
| S4 | 27/27 | 100% | 75% (all P0s done, obs/perf pending) |
| S5 | 27/27 | 100% | 85% (observability wired) |
| S6 | 27/27 | 100% | 95% (perf + security done) |
| S7 | 27/27 | 100% | 100% (certified) |

---

## CI/CD Pipeline Fix (Sprint 1, embedded in RC-3)

The CI/CD fix is small but critical and will be done in Sprint 1 alongside Docker:

| Task | Effort |
|------|--------|
| Reverse deploy order: `prisma migrate deploy` BEFORE `docker compose up -d` | 10 min |
| Add post-deploy health check (curl /api/health/ready, retry 5×) | 30 min |
| Add rollback strategy (docker compose rollback + migrate rollback) | 1 hr |

---

*Roadmap complete. 7 sprints. 8.5 engineer-days total. 100% P0 resolution by end of Sprint 4 (S6 for all P0s including perf/security).*
