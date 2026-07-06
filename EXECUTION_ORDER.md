# EXECUTION_ORDER.md
# NOVSMM — Execution Order (Dependency Tree)

**Date:** 2026-07-06
**Author:** Principal Staff Engineer / SRE / TPM (External)

---

## Dependency Tree

```
Sprint 1 (RC-1 Docker, RC-2 Nginx, RC-3 CI/CD)
│
├── RC-1: Docker Build Untested
│   ├── Fix Dockerfile (lockfile, curl, uploads, pin versions)
│   ├── Create notifications-service/Dockerfile
│   ├── Fix docker-compose.yml (worker healthcheck, init, Redis password)
│   └── → UNBLOCKS: docker compose build, deploy.sh, all downstream testing
│
├── RC-2: Nginx Not Tested with CF
│   ├── Add set_real_ip_from for Cloudflare
│   ├── Fix add_header with include snippet
│   └── → UNBLOCKS: rate limiting, security headers on static assets
│
└── RC-3: CI/CD Deploy Order
    ├── Reverse deploy order (migrate before up)
    ├── Add post-deploy health check
    ├── Add rollback strategy
    └── → UNBLOCKS: safe CI/CD pipeline
│
Sprint 3 (RC-9 IDs, RC-10 Redis, RC-11 DB Integrity)
│ ← DEPENDS ON: Sprint 1 (need working Docker to test PG/Redis)
│
├── RC-9: ID Generation Race
│   ├── Fix ids.ts (upsert instead of findUnique+create)
│   └── → UNBLOCKS: concurrent order creation
│
├── RC-10: Redis Implementation Bugs
│   ├── Fix rate-limit.ts (memberId capture)
│   ├── Fix cache.ts (cleanup interval)
│   ├── Fix redis.ts (maxRetriesPerRequest: null, error handling)
│   └── → UNBLOCKS: rate limiting under load, cache stability, BullMQ startup
│
└── RC-11: DB Integrity Missing
    ├── Add CHECK constraints (raw SQL migration)
    ├── Add proper FK relations to schema
    ├── Add @unique to providerIntentId
    ├── Fix migration script (split PrismaClient)
    └── → UNBLOCKS: data integrity, migration safety
│
Sprint 4 (RC-4 Backup, RC-5 Monitoring, RC-12 DR, RC-15 Obsolete)
│ ← DEPENDS ON: Sprint 1 (need Docker), Sprint 3 (need working PG)
│
├── RC-4: Backup/Restore Untested
│   ├── Fix backup.sh (define warn, fix verification, add trap)
│   ├── Fix restore.sh (terminate connections, fix verification)
│   └── → UNBLOCKS: safe backups, safe restore
│
├── RC-5: Monitoring Incomplete
│   ├── Enable Prometheus exporters (PG, Redis)
│   ├── Add missing alerts (PostgresDown, RedisDown, BackupFailure)
│   ├── Fix AlertManager webhook (env var, not placeholder)
│   ├── Fix Grafana password (require non-default)
│   └── → UNBLOCKS: production monitoring, alert delivery
│
├── RC-12: DR Unplanned
│   ├── Create docs/dr.md (RTO/RPO, runbook)
│   ├── Create scripts/dr-drill.sh
│   └── → UNBLOCKS: disaster recovery capability
│
└── RC-15: Obsolete Scripts
    ├── Delete backup-db.sh, restore-db.sh, backup-uploads.sh
    ├── Move .zscripts/build.sh, .zscripts/start.sh to .deprecated/
    └── → UNBLOCKS: operator clarity
│
Sprint 5 (RC-6 Observability)
│ ← DEPENDS ON: Sprint 1 (need running app), Sprint 3 (need working Redis for metrics)
│
└── RC-6: Observability Not Wired
    ├── Fix /api/health/ready memory gating (1 line)
    ├── Add recordHttpRequest in withErrorHandler
    ├── Add recordCacheOp in cache.ts
    ├── Add recordQueueJob in worker.ts
    ├── Create instrumentation.ts (Prisma $extends)
    ├── Replace console.error with logger in 32 files
    └── → UNBLOCKS: production visibility (Grafana, Sentry, structured logs)
│
Sprint 6 (RC-7 Secrets, RC-8 OAuth, RC-13 Queries, RC-14 Admin)
│ ← DEPENDS ON: Sprint 3 (need working DB for re-encryption), Sprint 5 (need logger for new code)
│
├── RC-7: Secrets Inadequate
│   ├── Rotate all secrets
│   ├── Re-encrypt stored credentials
│   └── → UNBLOCKS: secret security
│
├── RC-8: OAuth TOCTOU Race
│   ├── Fix with Promise singleton + dedup
│   └── → UNBLOCKS: concurrent Google OAuth
│
├── RC-13: Unbounded Queries
│   ├── Add streaming to admin/logs CSV export
│   ├── Add streaming to /api/export
│   └── → UNBLOCKS: OOM prevention at scale
│
└── RC-14: Admin Panel Bundle
    ├── Split admin-panel.tsx into 22 lazy-loaded files
    └── → UNBLOCKS: acceptable LCP for admin
│
Sprint 7: Re-auditoría
│ ← DEPENDS ON: ALL previous sprints
│
└── Re-run AUDIT-A through AUDIT-E
    ├── Verify 0 P0s remain
    ├── Run deploy.sh on VPS
    ├── Run smoke-test.sh
    ├── Run k6 load test
    ├── Run backup + restore (DR drill)
    └── → PRODUCTION CERTIFIED ✅
```

---

## What Disappears Automatically When Root Cause Is Fixed

| Root Cause Fixed | Consequences That Auto-Resolve |
|-----------------|-------------------------------|
| RC-1 (Docker) | Build works, healthcheck works, uploads writable, notifications build, worker healthy |
| RC-2 (Nginx) | Rate limiting works with Cloudflare, security headers on all assets |
| RC-3 (CI/CD) | No schema mismatch on deploy, broken deploys detected, rollback available |
| RC-4 (Backup) | Backups verifiable, restore doesn't cause data loss |
| RC-5 (Monitoring) | PG/Redis monitored, alerts delivered, Grafana secure |
| RC-6 (Observability) | Grafana populated, Sentry captures errors, structured logs |
| RC-7 (Secrets) | All credentials use strong entropy |
| RC-8 (OAuth) | No duplicate providers under load |
| RC-9 (IDs) | No P2002 on concurrent inserts |
| RC-10 (Redis) | No self-DoS, no memory leak, BullMQ starts |
| RC-11 (DB) | No negative balances, no orphan rows, no duplicate credits |
| RC-12 (DR) | RTO/RPO defined, DR drill automatable |
| RC-13 (Queries) | No OOM on exports |
| RC-14 (Admin) | Acceptable bundle size |
| RC-15 (Obsolete) | No operator confusion |

---

## Critical Path

The **critical path** (longest dependency chain) is:

```
RC-1 (Docker) → RC-11 (DB) → RC-4 (Backup) → RC-6 (Observability) → S7 (Re-audit)
     1.5 days      2 days       2 days            1.5 days          1 day
```

**Total critical path: 8 days** (if working sequentially).

With 2 engineers in parallel:
- Engineer 1: RC-1 → RC-9/10 → RC-4 → RC-6
- Engineer 2: RC-2 → RC-11 → RC-5/12 → RC-7/8/13/14

**Parallel estimate: 5 days.**

---

## Execution Checklist (ordered)

```
□ 1.  Fix Dockerfile (lockfile, curl, uploads, versions)          [RC-1]  30 min
□ 2.  Create notifications-service/Dockerfile                      [RC-1]  30 min
□ 3.  Fix docker-compose.yml (healthcheck, init, Redis password)   [RC-1]  30 min
□ 4.  Fix nginx.conf (Cloudflare real IP, security headers)        [RC-2]  50 min
□ 5.  Fix CI/CD deploy order + health check + rollback             [RC-3]  1.5 hr
□ 6.  → VALIDATION: docker compose build succeeds                  [S1]    15 min
□ 7.  Fix ids.ts (upsert)                                          [RC-9]  15 min
□ 8.  Fix rate-limit.ts (memberId)                                 [RC-10] 10 min
□ 9.  Fix cache.ts (cleanup interval)                              [RC-10] 15 min
□ 10. Fix redis.ts (maxRetries, error handling)                    [RC-10] 35 min
□ 11. Add DB CHECK constraints (raw SQL migration)                 [RC-11] 30 min
□ 12. Add FK relations to schema                                   [RC-11] 1 hr
□ 13. Add @unique to providerIntentId                              [RC-11] 5 min
□ 14. Fix migration script (split PrismaClient)                    [RC-11] 1 hr
□ 15. → VALIDATION: concurrent orders, rate limit, BullMQ startup  [S3]    30 min
□ 16. Fix backup.sh (warn, verification, trap)                     [RC-4]  30 min
□ 17. Fix restore.sh (terminate connections, verification)         [RC-4]  30 min
□ 18. Enable Prometheus exporters + alerts                         [RC-5]  1 hr
□ 19. Fix AlertManager webhook + Grafana password                  [RC-5]  30 min
□ 20. Create docs/dr.md + scripts/dr-drill.sh                      [RC-12] 1 hr
□ 21. Delete obsolete scripts                                      [RC-15] 10 min
□ 22. → VALIDATION: backup + restore on test DB                    [S4]    30 min
□ 23. Fix /api/health/ready memory gating                          [RC-6]  5 min
□ 24. Wire recordHttpRequest in withErrorHandler                   [RC-6]  30 min
□ 25. Wire recordCacheOp in cache.ts                               [RC-6]  15 min
□ 26. Wire recordQueueJob in worker.ts                             [RC-6]  15 min
□ 27. Create instrumentation.ts (Prisma $extends)                  [RC-6]  1 hr
□ 28. Replace console.error with logger in 32 files                [RC-6]  4 hr
□ 29. → VALIDATION: /api/metrics shows custom metrics              [S5]    10 min
□ 30. Rotate all secrets                                           [RC-7]  15 min
□ 31. Re-encrypt stored credentials                                [RC-7]  1 hr
□ 32. Fix OAuth TOCTOU race (Promise singleton)                    [RC-8]  30 min
□ 33. Add streaming to CSV exports                                 [RC-13] 4 hr
□ 34. Split admin-panel.tsx into lazy-loaded tabs                  [RC-14] 4 hr
□ 35. → VALIDATION: all P0s resolved, lint clean                   [S6]    30 min
□ 36. Re-run all 5 audit agents                                    [S7]    4 hr
□ 37. Run deploy.sh on VPS                                         [S7]    30 min
□ 38. Run smoke-test.sh                                            [S7]    15 min
□ 39. Run k6 load test (100 VUs)                                   [S7]    30 min
□ 40. Run DR drill (backup + restore)                              [S7]    30 min
□ 41. → SIGN OFF: PRODUCTION CERTIFIED                             [S7]    —
```

**Total: 41 tasks, ~8.5 engineer-days sequential, ~5 days with 2 engineers in parallel.**

---

*Execution order complete. Critical path: 8 days. Parallel: 5 days.*
