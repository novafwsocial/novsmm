# NOVSMM Enterprise Architecture — Consolidated Audit Report

**Generated:** 2025-07-05
**Auditors:** 5 parallel agents (Database, Security, Backend Architecture, Performance/Frontend, DevOps/Observability)
**Codebase:** `/home/z/my-project/` — Next.js 16 App Router, Prisma + SQLite, NextAuth v4, 32 models, 71 API routes, 81 client components, 1 mini-service (notifications on port 3003)

---

## Executive Summary

NOVSMM is a functionally complete SMM marketplace but **not production-ready at enterprise scale**. The platform has **~40 P0 (critical)** issues that must be resolved before any production deployment, spanning security holes, race conditions, missing infrastructure, and architectural blockers.

**Top 5 critical risks:**
1. **Payment security holes** — Mercado Pago webhook has zero signature verification; Stripe webhook processes unverified events in "log mode" when secret is unset.
2. **Authentication weaknesses** — `NEXTAUTH_SECRET` unset (JWTs unsigned); `allowDangerousEmailAccountLinking: true` enables account takeover; 2FA is decorative (never enforced at login).
3. **Race conditions masked by SQLite** — Balance checks happen outside transactions; public IDs generated via `count() + offset`; will break immediately on PostgreSQL MVCC.
4. **No background job infrastructure** — Order fulfillment runs via `setTimeout` in API handlers (5 copies); dies on serverless cold start; restarts lose in-flight orders.
5. **No containerization, no migrations, no backups, no monitoring, no CI/CD** — manual tarball deploy ships dev DB with `admin123` password into production.

**Migration complexity: HIGH** — but mitigated by small dataset (5 MB), zero raw SQL, and all-Prisma access patterns.

---

## P0 — Critical Findings (Must Fix Before Production)

### Security (9 P0s)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| S1 | Mercado Pago webhook has NO signature verification | `src/app/api/webhooks/mercadopago/route.ts` | Anyone can POST fake payment notifications → free wallet top-ups |
| S2 | Stripe webhook "log mode" processes unverified events when `STRIPE_WEBHOOK_SECRET` unset | `webhooks/stripe/route.ts:66-73` | Same as above for Stripe |
| S3 | `NEXTAUTH_SECRET` not set in `.env` | `.env` | JWTs unsigned → session forgery possible |
| S4 | `allowDangerousEmailAccountLinking: true` on Google OAuth | `src/lib/auth.ts:115` | Attacker registers Google account with victim's email → instant account takeover |
| S5 | 2FA is decorative — `authorize()` never calls `verify2FAToken` | `src/lib/auth.ts` | Users with 2FA "enabled" can log in with just email+password |
| S6 | Two different hardcoded `LICENSE_ENCRYPTION_KEY` fallbacks | `crypto-utils.ts:12` + `license.ts:18` | Cross-module data corruption; all "encrypted" payment creds use public source-code key |
| S7 | Origin check is presence-only, not value-matched | `src/middleware.ts:114-126` | `Origin: https://evil.com` passes CSRF check |
| S8 | Failed login attempts NOT logged | `src/lib/auth.ts` | No forensic IP trail for brute-force analysis |
| S9 | Caddyfile `XTransformPort` query-param routing is SSRF vector | `Caddyfile` | Anyone can reverse-proxy to any localhost port |

### Database (7 P0s)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| D1 | Sequential-ID race + full scan — `db.<table>.count() + offset` | 10 sites (orders, transactions, tickets, invoices, etc.) | Concurrent inserts → unique violations; >1M rows → multi-second scans |
| D2 | bcrypt-scan for API key + license validation | `api-key-auth.ts:23-61`, `license.ts:107-131` | O(N) bcrypt.compare per request; 100 keys = 10s per request |
| D3 | Balance-check-outside-transaction race | `orders/route.ts:217` + 4 copies | Concurrent orders can both pass balance check → negative balance (SQLite masks; PG exposes) |
| D4 | Missing `Transaction.reference` index | `prisma/schema.prisma` | Every payment webhook full-scans Transaction table |
| D5 | Missing `Order.createdAt` + `Transaction.createdAt` indexes | schema | Every dashboard/analytics query scans |
| D6 | `simulateFulfillment` runs via `setTimeout` in API handlers (5 copies) | orders, orders/mass, orders/repeat, v1/orders, admin/orders | Serverless kills function when response returns → orders stuck in `processing` |
| D7 | Admin broadcast creates duplicate notifications | `admin/notifications/route.ts:50-61` | `createMany` + loop `createNotification` = 2× rows + 10K sequential SMTP sends |

### Backend Architecture (8 P0s)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| B1 | `setTimeout`-based `simulateFulfillment` (5 copies) | 5 route files | Same as D6 + code duplication |
| B2 | Unauthenticated WS broadcast + data-leak | `mini-services/notifications-service/index.ts` | `POST /broadcast` has no auth; `io.emit` sends ALL events to ALL clients |
| B3 | Race-condition-prone public-ID generation | 10 sites | Same as D1 |
| B4 | Cross-route import `api/orders → api/me/loyalty` | `orders/route.ts` | Couples two unrelated API surfaces |
| B5 | 14 direct `user.balance` mutations without row locks | multiple | Same as D3 |
| B6 | Runtime `process.env.STRIPE_SECRET_KEY` mutation | `wallet/topup/route.ts:68` | Thread-unsafe, persists across requests |
| B7 | In-memory brute-force map | `auth.ts:11` | Lost on restart; not shared across instances |
| B8 | Single-instance WS mini-service | `notifications-service` | No `@socket.io/redis-adapter` → breaks on multi-instance |

### Performance (7 P0s)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| P1 | 30+ unused shadcn/ui components + ~20 Radix packages | `src/components/ui/` | ~30MB dead weight in node_modules |
| P2 | `date-fns` (~73MB with `effect` transitive dep) never imported | `package.json` | Pure dead weight |
| P3 | No `Cache-Control` headers on any public API route | all `/api/public/*` | Every call hits DB; WhatsApp widget calls `/api/public/settings` on every page mount |
| P4 | NextAuth `jwt` callback hits DB on every authenticated request | `auth.ts:152-170` | #1 DB hot spot; 7 dashboard queries per 30s per user |
| P5 | No Next.js fetch caching (`revalidate`/`unstable_cache`/`cache:`) anywhere | entire codebase | All data fully dynamic |
| P6 | No Redis cache layer | entire codebase | Already noted as migration target |
| P7 | In-memory rate limiter + login tracker break in serverless/multi-instance | `middleware.ts`, `auth.ts` | Already noted |

### DevOps (14 P0s)

| # | Finding | Impact |
|---|---------|--------|
| O1 | `NEXTAUTH_SECRET` unset (same as S3) | Unsigned JWTs |
| O2 | Two different hardcoded `LICENSE_ENCRYPTION_KEY` fallbacks (same as S6) | Cross-module corruption |
| O3 | No Dockerfile / docker-compose / .dockerignore | No containerization |
| O4 | No `prisma/migrations/` folder — `db:push` is destructive on prod | No rollback path |
| O5 | `.zscripts/build.sh` ships dev DB (with `admin123`) into prod tarball | Admin password leaked |
| O6 | `prisma/seed.ts` creates admin with `admin123` + prints to stdout | Credential leak |
| O7 | No backup strategy — total data loss on DB failure | No DR |
| O8 | `/api/status` returns hardcoded "operational" — lies about health | No real monitoring |
| O9 | 21 of 22 env vars missing from `.env` | Misconfiguration risk |
| O10 | notifications-service `/broadcast` unauthenticated (same as B2) | Notification injection |
| O11 | No CI/CD pipeline | Manual error-prone deploys |
| O12 | No Sentry / error tracking | No visibility into prod errors |
| O13 | No README.md, no `.env.example`, no `docs/` folder | No onboarding docs |
| O14 | Caddyfile `XTransformPort` SSRF (same as S9) | Internal port scanning |

---

## P1 — High Priority (Should Fix Before Scale)

**Total P1 findings: ~80** across all audits. Highlights:

### Database (13 P1s)
- NextAuth `jwt` callback hits DB on every authed request (no caching)
- 18+ missing indexes (Notification.createdAt, Invoice.createdAt, WebhookLog.createdAt, Order.serviceId, Offer.serviceId, Favorite.serviceId, etc.)
- No pagination on 12 admin/user endpoints
- CSV export endpoints (`admin/logs`, `export`) have no row limit — OOM risk
- In-memory time-bucketing in dashboard/analytics (should be SQL `groupBy date_trunc`)
- `Subscription` has no Prisma relation to `User` (plain String FK, no cascade)
- 2FA secret stored as plaintext in Setting table (only backup codes bcrypt-hashed)
- `Setting` table overloaded (config + AI cache + 2FA secrets + notif prefs + Stripe webhook secret)
- Missing `select` on 5+ hot endpoints
- Case-insensitive `contains` search will break on PostgreSQL (5+ endpoints need `mode: "insensitive"`)
- `notifyAdmins` and `reconcileAchievements` use sequential awaits in for-loops
- All monetary values are `Float` — floating-point rounding errors compound
- `paymentMethod.findUnique` on every NowPayments webhook (should be cached)

### Security (30 P1s)
- Redis-backed rate limiting required for multi-instance
- CSRF bypass for Bearer tokens (any `Authorization` header → CSRF skipped)
- 2FA secret encryption at rest
- Audit log IP/UA capture (only 1 of 34 calls populates IP; UA never captured)
- `/api/me` PATCH allows self-service role change (enterprise/agency self-assignable)
- Unvalidated admin PATCH routes (`providers`, `payment-methods`, `currencies`, `languages`, `settings` — arbitrary field injection)
- Missing security headers (`Permissions-Policy`, `Cross-Origin-*`)
- Session invalidation after password change
- Per-userId rate limits (currently per-IP only)
- Missing audit logs for subscriptions, v1 orders, coupons, exports
- Backup codes use `Math.random()` (not CSPRNG)
- Login audit log doesn't capture IP/User-Agent
- Email verification not enforced
- `secure` cookie flag depends on `NODE_ENV=production` AND HTTPS (verify in prod)

### Backend (20 P1s)
- Extract `simulateFulfillment`, `creditWallet`/`debitWallet`, `audit`, `parseBody`, `requireAuth` typed return
- Add `withErrorHandler` HOC
- Structured logger (pino)
- Error-message sanitization (SDK errors leak to clients)
- PayPal/MercadoPago HTTP clients
- Stripe webhook event handlers (split 638-line file)
- `notify.ts` split (DB + SMTP + WS + fan-out in 140 lines)
- `ai-insights.ts` split
- `next-auth` v4 → v5 (Auth.js)
- Interactive Prisma transactions for read-modify-write
- Zod validation on 3 PATCH routes (currently spread raw `body` to Prisma)
- **Add tests** (zero today)
- Remove ambient WS loop
- WS `/health` endpoint
- Provider abstraction (HuntSMM hardcoded)
- HuntSMM status polling
- `examples/websocket/server.ts` dead code (duplicate of mini-service on same port)

### Performance (15 P1s)
- 2,602-line `admin-panel.tsx` loads all 17 sub-panels at once — split into 17 files
- Dashboard rendered entirely client-side via `AppView` — no URL routing, no streaming
- `poweredByHeader` not disabled — leaks framework info
- No `images` config in `next.config.ts`
- `prisma` in `dependencies` instead of `devDependencies`
- `socket.io` (server) in main `dependencies` — only used by mini-service
- `@tanstack/react-table` in deps but never used
- Aggressive polling: 15s notif + 30s dash + 30s wallet + 30s orders + 60s analytics + 60s admin overview + 60s loyalty per active user
- Landing page is client component tree — bad LCP/FCP
- `<motion.tr layout>` on every orders-table row — jank
- `simulateFulfillment` via `setTimeout` (same as D6)
- `/api/orders` and `/api/admin/users` over-fetch (100 rows, no pagination)
- No `React.memo` anywhere
- 184KB PNG logo duplicated (`/public/novsmm-logo.png` + `src/app/icon.png`)
- `tw-animate-css` + `tailwindcss-animate` duplicated

### DevOps (15 P1s)
- In-memory rate limiter (no Redis)
- 5,800 lines of unused UI primitives
- Dead `examples/websocket/` duplicate
- ~80 unstructured `console.*` calls
- Sandbox email logs leaking PII
- Hardcoded port 3003
- CORS `*` on ws
- ESLint disables 18+ rules
- No GitHub Actions
- No log rotation/restart-on-crash
- No metrics endpoint
- Repo bloat (`download/`, `upload/`, `tool-results/`)
- No semantic versioning
- Stripe price IDs in env (should be in Setting table)
- No APM

---

## P2 — Nice to Have (~50 findings)

Highlights: CSP hardening, deprecated headers, sanitize.ts consistency, webhook log DDoS, uploaded file access control, soft-delete columns, read-replica routing, `pg_stat_statements`, AuditLog retention policy, WebhookLog TTL, snake_case table names, DB-level CHECK constraints, PG `LISTEN/NOTIFY` for WS, OpenAPI spec, `engines` field, `bun audit` in CI, fix v1/orders duplicate-key bug, rate-limit headers, request-id propagation, deterministic sandbox failure seed, typed `SettingKey` enum, OpenAPI from Zod, quarterly DR drills, cross-region PG replication, PR preview deployments, ADR folder, Swagger UI, gateway gzip/brotli, S3 for uploads, refactor env reads into single `src/lib/env.ts` with Zod validation at boot.

---

## Architecture Target

```
Internet
   ↓
Cloudflare (CDN + WAF + DDoS)
   ↓
Nginx (TLS + reverse proxy + rate limit)
   ↓
Next.js (App Router, standalone build)
   ↓
PostgreSQL (primary + read replica)
   ↓
Redis (cache + rate limit + sessions + queues + locks)
   ↓
Background Workers (BullMQ: orders, emails, webhooks, sync, AI)
   ↓
Notification Service (Socket.IO + Redis adapter, per-user rooms)
   ↓
Payment Services (PayPal, Mercado Pago, NowPayments, Manual)
   ↓
SMM APIs (HuntSMM + future providers)
```

---

## Migration Complexity Assessment

| Area | Complexity | Reasoning |
|------|------------|-----------|
| Database (SQLite → PG) | HIGH | 14 enums, 8 JSON columns, ~30 Float→Decimal, ~20 indexes, `mode: "insensitive"` on 5+ queries; but DB is only 5 MB and zero raw SQL |
| Redis introduction | MEDIUM | Clear use cases (cache, rate limit, queues, locks); BullMQ is well-documented |
| Background Jobs | HIGH | 5 copies of `simulateFulfillment` to consolidate; 10+ async patterns to extract; but no existing queue infra to migrate from |
| Security hardening | MEDIUM | Mostly config + small code changes; no architectural rewrites |
| Backend refactor | HIGH | 71 routes to standardize; 8 services to extract; but no breaking API changes needed (can keep response shapes during transition) |
| Performance | MEDIUM | Remove dead code + add caching; no architectural changes |
| Observability | LOW | Add Sentry + pino + prom-client; mostly additive |
| DevOps | MEDIUM | Dockerfile + docker-compose + nginx + CI/CD; standard patterns |
| Documentation | LOW | Additive; no risk to existing system |

**Overall: HIGH complexity, ~3-4 weeks of focused work** for a single senior engineer; less if parallelized.

---

## Files Inspected

- **Config:** `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `Caddyfile`, `.env`, `prisma/schema.prisma`, `tailwind.config.ts`
- **Lib (18 files):** `db.ts`, `auth.ts`, `api-utils.ts`, `api-key-auth.ts`, `crypto-utils.ts`, `sanitize.ts`, `validations.ts`, `license.ts`, `two-factor.ts`, `nowpayments.ts`, `stripe.ts`, `notify.ts`, `huntsmm.ts`, `ai-insights.ts`
- **Middleware:** `src/middleware.ts`
- **API routes (71 files):** All routes under `src/app/api/` (admin/*, auth/*, orders/*, wallet/*, webhooks/*, me/*, services/*, offers, favorites, payment-methods, subscriptions/*, public/*, status, docs, v1/*, analytics, dashboard, notifications, tickets, invoices, uploads, export, referrals, coupons/validate)
- **Components (81 client + 3 server):** All NOVSMM components, 38 shadcn/ui primitives, layout, page, loading, error
- **Mini-services:** `notifications-service/index.ts` (382 lines), `examples/websocket/server.ts` (dead code)
- **Prisma:** `schema.prisma` (32 models), `seed.ts`, `seed-settings.ts`, `seed-roles.ts`, `seed-services.ts`, `update-fx-rates.ts`, `sync-huntsmm.ts`
- **Scripts:** `.zscripts/{start,dev,build,mini-services-*}.sh`

---

*Full per-audit reports are in `/home/z/my-project/worklog.md` (Task IDs 1-a through 1-e).*
