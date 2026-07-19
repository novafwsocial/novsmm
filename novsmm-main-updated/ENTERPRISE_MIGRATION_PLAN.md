# NOVSMM Enterprise Architecture — Phased Migration Plan

**Generated:** 2025-07-05
**Based on:** `ENTERPRISE_AUDIT.md` (consolidated findings from 5 parallel audits)
**Methodology:** Per the user's PDF — "No implementes todo de una sola vez. Primero realiza una auditoría técnica completa. Después crea un plan de migración. Divide el trabajo en fases. No continúes con la siguiente fase hasta validar completamente la anterior."

---

## Guiding Principles

1. **Stability first** — Never break existing functionality. Every phase ships behind validation gates.
2. **No big-bang rewrites** — Each phase is independently deployable and reversible.
3. **Compatibility preserved** — Frontend never breaks during backend migration; API response shapes stay stable until Phase 5 (explicit refactor).
4. **Validate before proceeding** — Each phase ends with: lint clean, dev server running, Agent Browser verification, all critical paths working.
5. **Document every change** — Each phase appends to `worklog.md` with Task ID, changes, validation results.

---

## Phase Overview

| Phase | Name | Duration | Risk | Depends on |
|-------|------|----------|------|------------|
| **1** | Critical Security & Stability Fixes | 1-2 days | LOW (additive + config) | — |
| **2** | Database Hardening (still SQLite) | 2-3 days | MEDIUM (schema + query changes) | Phase 1 |
| **3** | Redis + Background Jobs | 3-4 days | MEDIUM (new infra) | Phase 2 |
| **4** | PostgreSQL Migration | 2-3 days | HIGH (data migration) | Phase 2, 3 |
| **5** | Backend Architecture Refactor | 4-5 days | MEDIUM (no API breaking changes) | Phase 3 |
| **6** | Performance Optimization | 2-3 days | LOW (additive) | Phase 5 |
| **7** | Observability & Monitoring | 1-2 days | LOW (additive) | Phase 4 |
| **8** | DevOps & Containerization | 2-3 days | MEDIUM (deploy infra) | Phase 4, 7 |
| **9** | Documentation | 2 days | NONE (additive) | All phases |
| **10** | Production Readiness Review | 1 day | NONE (validation) | All phases |

**Total estimated effort: ~3-4 weeks** for a single senior engineer working sequentially; less if phases are parallelized where dependencies allow.

---

## Phase 1: Critical Security & Stability Fixes

**Objective:** Eliminate all P0 security holes that allow account takeover, payment fraud, or session forgery — without changing infrastructure.

**Risks:**
- LOW — All changes are config or small code edits, fully reversible
- Risk of breaking Google OAuth if `allowDangerousEmailAccountLinking` removal blocks existing linked accounts (mitigation: add migration to link accounts by email verification first)

**Changes:**
1. **Set `NEXTAUTH_SECRET`** in `.env` (32-byte random hex) — fixes S3/O1
2. **Set `LICENSE_ENCRYPTION_KEY`** in `.env` (32-byte string) — fixes S6/O2 partial
3. **Remove hardcoded fallback encryption keys** in `crypto-utils.ts:12` and `license.ts:18` — throw if env var missing (fail-closed, not fallback) — fixes S6/O2
4. **Remove `allowDangerousEmailAccountLinking: true`** from Google provider in `src/lib/auth.ts:115` — fixes S4
5. **Enforce 2FA in `authorize()`** — call `verify2FAToken` when user has 2FA enabled — fixes S5
6. **Implement Mercado Pago webhook signature verification** (`x-signature` header HMAC-SHA256) + payment-status confirmation fetch from MP API — fixes S1
7. **Make Stripe webhook fail-closed** — return 401 if `STRIPE_WEBHOOK_SECRET` unset, don't process — fixes S2
8. **Fix Origin check** in `src/middleware.ts:114-126` — value-match against `NEXTAUTH_URL` host, not presence-only — fixes S7
9. **Lock down Caddyfile** — remove `XTransformPort` query-param routing in production; explicit reverse-proxy config per service — fixes S9/O14
10. **Add IP + User-Agent capture** to all `db.auditLog.create` calls — read `x-client-ip` + `user-agent` headers via helper `audit(ctx, action, entity, entityId, metadata?)` — fixes S8
11. **Migrate backup codes** from `Math.random()` to `crypto.randomBytes` — fixes P1
12. **Encrypt 2FA TOTP secrets** at rest using `crypto-utils.ts` (AES-256-GCM) — fixes P1
13. **Remove `admin123`** from `prisma/seed.ts` — generate random password, print once, require change on first login — fixes O6
14. **Stop shipping dev DB** — modify `.zscripts/build.sh` to exclude `db/custom.db` from prod tarball — fixes O5

**Compatibility:**
- ✅ No frontend changes
- ✅ No API response shape changes
- ✅ No DB schema changes
- ⚠️ Existing Google-linked accounts may need re-linking (mitigated by email verification flow)
- ⚠️ Existing encrypted payment credentials (with old fallback key) need re-encryption with new env key (migration script in Phase 1)

**Tests:**
- `bun run lint` clean
- Dev server starts without errors
- Agent Browser: login with credentials works
- Agent Browser: Google OAuth login works
- Agent Browser: 2FA setup + verify flow works
- Agent Browser: Mercado Pago webhook returns 401 on missing signature
- Agent Browser: Stripe webhook returns 401 on missing secret
- Agent Browser: admin login + audit log shows IP + UA
- Manual: verify `.env` has all secrets set

**Expected Result:**
- All 9 security P0s resolved
- All 4 DevOps config P0s resolved (NEXTAUTH_SECRET, LICENSE_ENCRYPTION_KEY, admin123, dev DB shipping)
- Platform remains fully functional
- Audit logs now capture IP + User-Agent
- Payment webhooks reject unverified requests

---

## Phase 2: Database Hardening (Still on SQLite)

**Objective:** Fix all P0 database issues (race conditions, missing indexes, bcrypt-scan, duplicate notifications) while still on SQLite, so the PostgreSQL migration in Phase 4 is clean.

**Risks:**
- MEDIUM — Schema changes (indexes) + query pattern changes (interactive transactions, ID generation)
- Risk of order creation slowness if interactive transactions lock contention (mitigation: keep transactions short)
- Risk of breaking public ID format (mitigation: keep `A-XXXX` format, just use sequence table instead of `count()`)

**Changes:**
1. **Add all P0 indexes** (single `prisma db push`):
   - `Transaction.reference` (P0)
   - `Transaction.createdAt` + composite `(userId, createdAt)`
   - `Order.createdAt` + composite `(userId, createdAt)`
   - `Subscription.stripeSubscriptionId`
   - `AuditLog.createdAt` + `AuditLog.action`
   - `TicketMessage.ticketId`
   - `Session.userId` + `Account.userId`
2. **Add all P1 indexes** (16 indexes):
   - `Notification.createdAt`, `Invoice.createdAt`, `WebhookLog.createdAt`
   - `Order.serviceId`, `Offer.serviceId`, `Favorite.serviceId`, `LoyaltyPoint.orderId`
   - `License.customerId`, `PaymentMethod.status`, `Currency.status`, `Language.status`, `Provider.status`
   - Composites: `(userId, status)` on Order/Transaction/Ticket/Subscription/Offer/Invoice; `(userId, type)` on Transaction; `(userId, read)` on Notification; `(userId, createdAt)` on Order/Transaction/Notification/Invoice/AuditLog/LoyaltyPoint
3. **Replace `count() + offset` ID generation** with `Sequence` counter table:
   - New `Sequence` model: `{ id: String @id, lastValue: Int, prefix: String }`
   - New `src/lib/ids.ts` with `nextPublicId(prefix)` that atomically increments sequence
   - Update all 10 sites (orders, transactions, tickets, invoices, etc.)
4. **Fix balance-check-outside-transaction race** — use interactive `$transaction` with `SELECT FOR UPDATE` equivalent:
   ```ts
   await db.$transaction(async (tx) => {
     const user = await tx.user.findUnique({ where: { id }, select: { balance: true } });
     if (user.balance < totalPrice) throw new Error("Insufficient balance");
     await tx.user.update({ where: { id }, data: { balance: { decrement: totalPrice } } });
     // ... create order ...
   });
   ```
   - Update 5 sites (orders, orders/mass, orders/repeat, v1/orders, admin/orders)
5. **Fix bcrypt-scan for API keys + licenses** — add `keyHash` column (SHA-256) for O(1) lookup, then bcrypt.verify on single match:
   - `ApiKey.keyHash` = SHA-256(key) — indexed
   - `License.keyHash` = SHA-256(key) — indexed
   - `validateApiKey` and `validateLicense` look up by `keyHash`, then `bcrypt.compare` on the single result
6. **Split overloaded `Setting` table** into 4 models:
   - `Setting` (key-value platform config only)
   - `AiCache` (AI insights cache with TTL)
   - `TwoFactorSecret` (encrypted TOTP secrets, per-user)
   - `NotificationPreference` (per-user notif prefs)
7. **Fix admin broadcast duplicate notifications** — remove the for-loop in `admin/notifications/route.ts:50-61`; `createMany` already inserts
8. **Extract `simulateFulfillment`** to `src/lib/orders.ts` (single source, still `setTimeout` for now — Phase 3 moves to queue)
9. **Add `Subscription → User` Prisma relation** (replace plain String FK)
10. **Cache `paymentMethod.findUnique`** in-memory with 60s TTL (Phase 3 moves to Redis)
11. **Add `mode: "insensitive"`** to all `contains` queries (5+ sites) — prep for PostgreSQL
12. **Add `select` to hot endpoints** (orders, wallet, notifications, dashboard, admin/webhooks) — fetch only needed fields

**Compatibility:**
- ✅ No frontend changes
- ✅ No API response shape changes
- ⚠️ Public ID format preserved (`A-10432` etc.) but generation logic changes
- ⚠️ Existing API keys and licenses need migration script to compute `keyHash` for backward compat
- ⚠️ Setting table split requires data migration script (moves AI cache, 2FA secrets, notif prefs to new tables)

**Tests:**
- `bun run lint` clean
- `bun run db:push` succeeds without errors
- Migration script runs: API keys + licenses get `keyHash`; Setting table split completes
- Agent Browser: order creation works (verify new ID format + balance check)
- Agent Browser: concurrent order creation (open 2 tabs, submit simultaneously) — both succeed or one fails gracefully (no negative balance)
- Agent Browser: admin broadcast notification — each user gets exactly 1 notification (not 2)
- Agent Browser: API key validation works for existing keys
- Agent Browser: license validation works for existing licenses
- Performance: dashboard load time measured before/after (expect improvement from indexes)
- Manual: verify `prisma/schema.prisma` has all new indexes

**Expected Result:**
- All 7 database P0s resolved
- 13 database P1s resolved
- Platform ready for PostgreSQL migration (Phase 4)
- Dashboard load time improved 2-5× from indexes
- Concurrent order creation is race-safe
- API key + license validation is O(1) lookup

---

## Phase 3: Redis + Background Jobs

**Objective:** Introduce Redis as the backbone for caching, rate limiting, queues, and locks. Move all async work to BullMQ workers. Eliminate `setTimeout`-based fulfillment.

**Risks:**
- MEDIUM — New infrastructure dependency; requires Redis server running
- Risk of job queue stalls if Redis unavailable (mitigation: BullMQ has built-in retries + DLQ)
- Risk of cache invalidation bugs (mitigation: short TTLs initially, aggressive invalidation on writes)

**Changes:**
1. **Install Redis** locally + add to docker-compose (Phase 8)
2. **Install dependencies:** `ioredis`, `bullmq`, `@socket.io/redis-adapter`
3. **Create `src/lib/redis.ts`** — singleton Redis client with connection pooling
4. **Create `src/lib/cache.ts`** — cache helpers:
   - `cacheGet<T>(key)`, `cacheSet(key, value, ttl)`, `cacheDel(key)`, `cacheInvalidate(pattern)`
   - Wrap hot paths: `public:settings`, `public:currencies`, `public:languages`, `public:payment-methods`, `services:{hash}`, `loyalty:{userId}`, `admin:overview`
5. **Migrate rate limiter** from in-memory to Redis (`src/lib/rate-limit.ts`):
   - Sliding window via Redis sorted sets
   - Per-IP + per-userId limits
   - Scales across instances
6. **Migrate brute-force tracker** from in-memory to Redis (`src/lib/auth.ts`):
   - `login_lock:{email}` with TTL
   - Shared across instances
7. **Migrate NextAuth `jwt` callback** to cache user data in Redis:
   - `user:{id}` with 30s TTL
   - Invalidate on balance change, role change, profile update
8. **Create BullMQ queue system** (`src/lib/queues.ts`):
   - Queues: `order.fulfill`, `order.poll-provider`, `provider.sync`, `fx.refresh`, `email.send`, `ws.broadcast`, `notification.bulk`, `loyalty.reconcile`, `ai.insights`, `refund.process`
   - Each queue: retries (3), backoff (exponential), DLQ, concurrency limit
9. **Create worker process** (`src/workers/worker.ts`):
   - Separate `bun run worker` process
   - Processes all queues
   - bull-board UI at `/admin/queues` (admin-only)
10. **Move `simulateFulfillment` to `order.fulfill` queue:**
    - API route enqueues job, returns immediately
    - Worker processes fulfillment (12s delay + provider call + status update)
    - Survives server restarts (jobs persist in Redis)
11. **Move email sending to `email.send` queue:**
    - `notify.ts` enqueues instead of sending synchronously
    - Worker sends via SMTP with retries
12. **Move WS broadcast to `ws.broadcast` queue:**
    - API routes enqueue broadcast instead of HTTP POST to mini-service
    - Worker pushes to Redis pub/sub → notifications-service picks up
13. **Move provider sync to `provider.sync` queue:**
    - Cron job enqueues nightly sync
    - Worker processes (no more `setTimeout` simulation)
14. **Move AI insights to `ai.insights` queue:**
    - Cache result in Redis (not DB Setting table)
    - Refresh via queue when stale
15. **Add `@socket.io/redis-adapter`** to notifications-service:
   - Multi-instance support
   - Per-user rooms (fixes data-leak)
   - JWT auth on WS connection
16. **Add `/broadcast` auth** to notifications-service:
   - `NOTIFICATIONS_SERVICE_SECRET` bearer token
   - Only API routes with the secret can broadcast
17. **Add `/healthz`** to notifications-service

**Compatibility:**
- ✅ No frontend changes (API response shapes unchanged)
- ✅ No API breaking changes
- ⚠️ Order creation now returns immediately (fulfillment async) — frontend already polls for status, so no change needed
- ⚠️ Email sending now async — users may see slight delay in email delivery
- ⚠️ Requires Redis server running (add to dev setup + docker-compose)

**Tests:**
- `bun run lint` clean
- Redis server running (`redis-cli ping` returns PONG)
- Dev server + worker process both start
- Agent Browser: order creation works — order goes to `processing`, then `completed` after ~12s (via worker)
- Agent Browser: kill worker mid-fulfillment → restart worker → job resumes from queue (no lost orders)
- Agent Browser: login rate limiting works (5 failed attempts → 15min lock)
- Agent Browser: dashboard load time improved (cached user data in Redis)
- Agent Browser: admin broadcast → each user gets 1 notification via WS (no leak to other users)
- Manual: `redis-cli monitor` shows cache hits/misses
- Manual: bull-board UI at `/admin/queues` shows job counts

**Expected Result:**
- All background-job P0s resolved (D6, B1, B8)
- Redis cache layer live for 8+ hot paths
- Rate limiting + brute-force protection now multi-instance safe
- Order fulfillment survives server restarts
- WebSocket broadcasts no longer leak data
- Platform ready for PostgreSQL migration (Phase 4)

---

## Phase 4: PostgreSQL Migration

**Objective:** Migrate from SQLite to PostgreSQL with zero data loss and zero downtime.

**Risks:**
- HIGH — Data migration; schema incompatibilities; case sensitivity changes
- Risk of data loss (mitigation: full backup before migration; test on copy first)
- Risk of query behavior changes (mitigation: `mode: "insensitive"` added in Phase 2)
- Risk of Float→Decimal arithmetic bugs (mitigation: audit all arithmetic sites; use Prisma.Decimal)

**Changes:**
1. **Install PostgreSQL** locally + add to docker-compose (Phase 8)
2. **Update `prisma/schema.prisma`:**
   - `provider = "postgresql"`
   - Convert 14 String enums → Prisma `enum` types
   - Convert 8 String JSON columns → `Json` (with `@db.JsonB`)
   - Convert ~30 monetary `Float` → `Decimal @db.Decimal(12,4)`
   - Add `@db.VarChar(N)` constraints to all string columns
   - Add `@db.Inet` to IP address columns
   - Add `@map`/`@@map` for snake_case table names (PG convention)
3. **Update `.env`:**
   - `DATABASE_URL=postgresql://user:pass@localhost:5432/novsmm`
   - Add `?connection_limit=10&pool_timeout=20` to URL
4. **Generate baseline migration:**
   - `bun run prisma migrate dev --name init_postgresql --create-only`
   - Review generated SQL manually
   - `bun run prisma migrate deploy`
5. **Write data migration script** (`prisma/migrate-sqlite-to-postgres.ts`):
   - Read all data from SQLite (`db/custom.db`)
   - Transform: Float → Decimal, String JSON → object, String enum → enum
   - Write to PostgreSQL in batches of 1000
   - Verify row counts match
6. **Audit all monetary arithmetic sites** (~20 sites):
   - Replace `user.balance + amount` with `new Prisma.Decimal(user.balance).plus(amount)`
   - Replace `balance >= totalPrice` with `new Prisma.Decimal(balance).gte(totalPrice)`
7. **Audit all `JSON.parse`/`JSON.stringify` sites** (~30+ sites):
   - With `Json` columns, Prisma returns objects directly — remove manual parse/stringify
8. **Deploy PgBouncer** (or Supavisor/RDS Proxy):
   - Transaction pooling mode
   - Mandatory for serverless/multi-instance
9. **Add `/health/db` endpoint:**
   - `SELECT 1` query
   - Used by k8s readiness probe (Phase 8)
10. **Enable `pg_stat_statements`** for slow-query monitoring
11. **Optional: Add read replica** for analytics endpoints:
    - `src/lib/db-read.ts` — PrismaClient pointing to replica
    - Analytics, dashboard, admin/overview, admin/logs route to replica

**Compatibility:**
- ✅ No frontend changes
- ✅ No API response shape changes (Prisma abstracts DB differences)
- ⚠️ All env vars must point to PostgreSQL
- ⚠️ Data migration script must run once (downtime ~5 minutes for 5 MB DB)
- ⚠️ Existing dev DB (`db/custom.db`) becomes read-only backup

**Tests:**
- `bun run lint` clean
- PostgreSQL running (`pg_isready` returns OK)
- `bun run prisma migrate deploy` succeeds
- Data migration script: all row counts match between SQLite and PostgreSQL
- Agent Browser: login works
- Agent Browser: order creation works (verify Decimal arithmetic)
- Agent Browser: wallet top-up works (verify payment flow)
- Agent Browser: admin overview loads (verify aggregates)
- Agent Browser: search works (verify `mode: "insensitive"`)
- Performance: dashboard load time measured (expect improvement from PG query planner + indexes)
- Manual: `pg_stat_statements` shows top queries

**Expected Result:**
- All SQLite→PostgreSQL migration P0s resolved
- Platform running on PostgreSQL
- No data loss (verified by row counts)
- No query behavior regressions
- Connection pooling via PgBouncer
- Platform ready for production deployment (Phase 8)

---

## Phase 5: Backend Architecture Refactor

**Objective:** Extract business logic into services, unify error handling + response structure, add typed auth, structured logging. No API breaking changes.

**Risks:**
- MEDIUM — Large refactor; but no breaking changes to API consumers
- Risk of introducing bugs during refactor (mitigation: keep old code paths until new ones validated; delete only after Phase 5 complete)
- Risk of performance regression from abstraction layers (mitigation: keep layers thin)

**Changes:**
1. **Create service layer** (`src/lib/services/`):
   - `loyalty.service.ts` — extract from `api/me/loyalty/route.ts`
   - `orders.service.ts` — extract from `api/orders/route.ts`
   - `wallet.service.ts` — extract `creditWallet()`, `debitWallet()`, `refundTransaction()` from 10 sites
   - `payments/stripe.service.ts`, `payments/nowpayments.service.ts`, `payments/mercadopago.service.ts`, `payments/paypal.service.ts` — extract from webhook handlers
   - `subscriptions.service.ts`, `referrals.service.ts`, `plans.service.ts`, `ids.service.ts`, `audit.service.ts`
2. **Create `src/lib/api-handler.ts`:**
   - `withErrorHandler(handler)` HOC — wraps all API routes
   - Maps Prisma P2002 → 409, P2025 → 404
   - Logs errors with request-id (AsyncLocalStorage)
   - Returns sanitized 500 (no internal details leaked)
3. **Create `src/lib/response.ts`:**
   - Unified envelope: `{ data: T, message?: string }` for success
   - `{ error: { code, message, details?, requestId } }` for errors
   - `apiOk(data, message?)`, `apiError(code, message, status, details?)`
4. **Create `src/lib/parse-body.ts`:**
   - `parseBody<T>(schema: ZodSchema<T>, body: unknown): T` — throws `ValidationError` on invalid
   - Replaces manual `safeParse` boilerplate in 20+ routes
5. **Type `requireAuth` return:**
   - Returns `{ user: TypedUser, session: Session }` instead of `Session | null`
   - Eliminates 73 `(session!.user as any).id` casts
6. **Add structured logger** (`src/lib/logger.ts`):
   - `pino` with JSON output
   - Request-id via AsyncLocalStorage
   - Redaction for sensitive fields (password, token, secret)
   - Log levels: `debug`, `info`, `warn`, `error`
   - Replace ~80 `console.*` calls
7. **Sanitize error messages:**
   - Map SDK errors (Stripe, PayPal, MP, NowPayments) to generic messages
   - Log full error internally, return sanitized to client
8. **Fix WebSocket architecture:**
   - Per-user rooms (fixes data-leak — `io.to(userId).emit`)
   - JWT auth on WS connection
   - Remove ambient loop (fake system notifications)
   - Add `/healthz`
   - Port from env var (not hardcoded 3003)
9. **Add Zod validation** to 3 PATCH routes that spread raw `body`:
   - `admin/providers`, `admin/payment-methods`, `admin/currencies`, `admin/languages`, `admin/settings` (key allowlist)
10. **Remove cross-route import** `api/orders → api/me/loyalty` — extract `awardOrderPoints`/`reconcileAchievements` to `loyalty.service.ts`
11. **Fix `process.env.STRIPE_SECRET_KEY` runtime mutation** — read from DB Setting table at startup, cache in memory
12. **Migrate `next-auth` v4 → v5 (Auth.js)** — optional, can defer if risky
13. **Add tests** (Jest or Vitest):
    - Unit tests for services (loyalty, orders, wallet, ids)
    - Integration tests for API routes (auth, orders, payments)
    - Target: 60% coverage on `src/lib/services/`

**Compatibility:**
- ✅ No frontend changes (response shapes preserved during transition)
- ⚠️ API response shape will eventually change (Phase 5 step 3) — but can be done with feature flag or gradual rollout
- ⚠️ Tests add development time but reduce regression risk

**Tests:**
- `bun run lint` clean
- `bun run test` — 60%+ coverage on services
- Agent Browser: all critical paths work (login, register, order, payment, admin)
- Agent Browser: error responses are sanitized (no SDK errors leaked)
- Agent Browser: WebSocket — user A's notifications don't appear in user B's WS connection
- Agent Browser: admin PATCH routes reject invalid fields
- Manual: structured logs in JSON format with request-ids
- Manual: pino logs show redacted sensitive fields

**Expected Result:**
- All 8 backend architecture P0s resolved
- 20 backend P1s resolved
- Service layer cleanly separated from API routes
- Unified error handling + response structure
- Structured logging with request-ids
- WebSocket no longer leaks data
- Test coverage at 60%+
- Platform ready for performance optimization (Phase 6)

---

## Phase 6: Performance Optimization

**Objective:** Reduce bundle size, add caching, optimize rendering, improve LCP/FCP.

**Risks:**
- LOW — Additive changes; no breaking changes
- Risk of cache invalidation bugs (mitigation: short TTLs + aggressive invalidation)
- Risk of removing needed dependencies (mitigation: verify each removal with grep + build)

**Changes:**
1. **Remove unused shadcn/ui components** (35 files in `src/components/ui/`):
   - Keep: `dialog`, `alert-dialog`, `toast`, `toaster`
   - Delete: accordion, alert, aspect-ratio, avatar, badge, breadcrumb, calendar, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, toggle, toggle-group, tooltip, button, label, input
2. **Remove unused dependencies:**
   - `date-fns` (~73MB)
   - `@tanstack/react-table`
   - `@hookform/resolvers`
   - `react-hook-form`
   - `socket.io` (server — only mini-service needs it)
   - `tw-animate-css` (duplicates `tailwindcss-animate`)
   - ~20 `@radix-ui/react-*` packages for deleted UI components
3. **Move `prisma` to `devDependencies`** (only `@prisma/client` is runtime)
4. **Add `Cache-Control` headers** on public API routes:
   - `/api/public/settings` — `public, max-age=60, s-maxage=300`
   - `/api/public/currencies` — `public, max-age=60, s-maxage=300`
   - `/api/public/languages` — `public, max-age=300, s-maxage=600`
   - `/api/payment-methods` — `public, max-age=60, s-maxage=300`
   - `/api/services` — `public, max-age=30, s-maxage=60`
   - `/api/status` — `public, max-age=60`
5. **Add Next.js fetch caching:**
   - `export const revalidate = 60` on public route segments
   - `unstable_cache` for expensive queries (admin overview, analytics)
6. **Cache NextAuth `jwt` callback** — already done in Phase 3 (Redis)
7. **Split `admin-panel.tsx`** (2,602 lines) into 17 files:
   - `src/components/novsmm/admin/{overview,users,orders,refunds,bulk,services,providers,payment-methods,api-keys,webhooks,licenses,coupons,promotions,notifications,settings,roles,logs,search,languages,currencies,withdrawals,social-auth,version}.tsx`
8. **Migrate dashboard to route segments:**
   - `/dashboard/[tab]` instead of state-driven `AppView`
   - Each tab gets `loading.tsx` for streaming
   - URL-based navigation (back/forward works, refresh stays on tab)
9. **Add `React.memo`** on expensive components:
   - Order table rows, notification items, service cards
10. **Add `next.config.ts` performance options:**
    - `poweredByHeader: false`
    - `images: { remotePatterns: [...], formats: ["image/avif", "image/webp"], minimumCacheTTL: 86400 }`
    - `experimental: { optimizePackageImports: ["lucide-react", "recharts", "framer-motion"], optimizeCss: true }`
    - `httpAgentOptions: { keepAlive: true }`
    - `serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer", "qrcode", "otplib"]`
11. **Replace framer-motion with CSS** where trivial:
    - Testimonials marquee → `.nov-marquee` CSS keyframes (already defined)
    - Simple hover/tap animations → Tailwind transitions
12. **Optimize images:**
    - Replace 184KB PNG logo with SVG or AVIF
    - Delete unused `/public/payment-logos/*.png` (only SVGs referenced)
    - Use `next/image` for Google favicon in `platform-logo.tsx`
13. **Fix Tailwind config:**
    - Add `src/components/**` to `content` globs
    - Remove duplicate `tw-animate-css` from `globals.css`
    - Define `--font-display` in `layout.tsx` (referenced but undefined)
14. **Reduce polling intervals:**
    - Notifications: 15s → 30s (WS pushes real-time anyway)
    - Dashboard: 30s → 60s
    - Wallet: 30s → 60s
    - Orders: 30s → 60s
    - Analytics: 60s → 300s
    - Admin overview: 60s → 120s
    - Loyalty: 60s → 300s
15. **Remove dead code:**
    - `examples/websocket/` (duplicate of mini-service)
    - `download/` (88 dev screenshots — 30 MB)
    - `tool-results/` (60 cache files)
    - `src/lib/i18n.ts` if not wired up (292 lines unused)
16. **Add pagination** to `/api/orders` and `/api/admin/users` (currently 100 rows, no pagination)

**Compatibility:**
- ✅ No API breaking changes
- ⚠️ Removing shadcn/ui components may break imports — verify with grep first
- ⚠️ Dashboard route migration changes URLs — but improves UX (back/forward works)

**Tests:**
- `bun run lint` clean
- `bun run build` succeeds (catches missing imports)
- Agent Browser: all dashboard tabs load (no missing component errors)
- Agent Browser: admin panel all 17 sub-panels work
- Agent Browser: dashboard URL navigation works (back/forward, refresh stays on tab)
- Performance: Lighthouse audit — LCP < 2.5s, FCP < 1.8s, bundle size < 500KB gzipped
- Performance: dashboard load time measured (expect 30-50% improvement)
- Manual: `du -sh node_modules` before/after (expect ~100MB reduction)

**Expected Result:**
- All 7 performance P0s resolved
- 15 performance P1s resolved
- Bundle size reduced 30-50%
- LCP/FCP improved significantly
- Dashboard navigation UX improved (URL-based)
- Platform ready for observability (Phase 7)

---

## Phase 7: Observability & Monitoring

**Objective:** Add error tracking, health checks, metrics, and tracing. Detect problems before users do.

**Risks:**
- LOW — Additive; no breaking changes
- Risk of Sentry rate-limiting (mitigation: sample rate config)

**Changes:**
1. **Add Sentry** (`@sentry/nextjs`):
   - Capture frontend + backend errors
   - Release tracking (Git SHA)
   - Source maps upload
   - Performance monitoring (sample rate 10%)
2. **Replace `/api/status` with real health endpoints:**
   - `GET /api/health/live` — 200 if process alive (k8s livenessProbe)
   - `GET /api/health/ready` — 200 only if DB + Redis + notifications-service respond < 500ms (k8s readinessProbe)
   - `GET /api/health` — user-facing status page with real per-service status + KPIs
   - Cache result for 5s to prevent dep DoS
3. **Add `/api/metrics`** (prom-client):
   - HTTP request count + latency histogram
   - DB query count + latency
   - Redis cache hit/miss ratio
   - Queue job count + processing time
   - WebSocket connection count
4. **Add OpenTelemetry traces:**
   - Auto-instrument HTTP, Prisma, Redis, BullMQ
   - Export to Jaeger or Honeycomb
5. **Structured logger** (pino) — already done in Phase 5
6. **Add Grafana dashboards:**
   - System overview (CPU, memory, request rate, error rate)
   - Database (query latency, slow queries, connection pool)
   - Redis (cache hit ratio, memory usage, eviction rate)
   - Queues (job count, processing time, failure rate)
   - Business (orders/min, payments/min, signups/min)
7. **Add alerting:**
   - Error rate > 1% → PagerDuty/Slack
   - DB connection pool > 80% → Slack
   - Queue DLQ > 10 jobs → Slack
   - Health check fail → PagerDuty

**Compatibility:**
- ✅ No frontend changes (except Sentry SDK init)
- ✅ No API breaking changes
- ⚠️ Sentry + OTEL add slight overhead (mitigation: sampling)

**Tests:**
- `bun run lint` clean
- Agent Browser: trigger error → verify Sentry captures it
- Agent Browser: `GET /api/health/live` returns 200
- Agent Browser: `GET /api/health/ready` returns 200 (or 503 if dep down)
- Agent Browser: `GET /api/metrics` returns Prometheus format
- Manual: Grafana dashboards render with real data
- Manual: trigger alert (e.g., stop Redis) → Slack notification received

**Expected Result:**
- All observability P0s resolved
- Sentry captures all errors with stack traces
- Health endpoints reflect real system state
- Metrics exported to Prometheus
- Grafana dashboards live
- Alerting wired up
- Platform ready for production deployment (Phase 8)

---

## Phase 8: DevOps & Containerization

**Objective:** Containerize the platform, replace Caddyfile with Nginx, add CI/CD, set up backups.

**Risks:**
- MEDIUM — Deploy infrastructure changes
- Risk of misconfigured nginx (mitigation: test locally before deploy)
- Risk of CI/CD pipeline breaking (mitigation: start with lint-only, add build + test gradually)

**Changes:**
1. **Create `Dockerfile`** (multi-stage):
   - Stage 1: `bun install` + `bun run build` (standalone output)
   - Stage 2: copy standalone + public + .next/static + node_modules (production deps only)
   - Run as non-root user
2. **Create `docker-compose.yml`:**
   - `web` (Next.js standalone, port 3000)
   - `worker` (BullMQ worker, same image, different command)
   - `notifications` (Socket.IO service, port 3003)
   - `postgres` (PG 16, volume mount)
   - `redis` (Redis 7, volume mount)
   - `nginx` (reverse proxy, ports 80 + 443)
   - Networks + volumes + healthchecks
3. **Create `.dockerignore`:**
   - `node_modules`, `.next`, `db/custom.db`, `download/`, `upload/`, `tool-results/`, `skills/`, `*.log`
4. **Create `nginx.conf`:**
   - TLS termination (Let's Encrypt certs)
   - Reverse proxy to Next.js (port 3000)
   - WebSocket upgrade for `/socket.io/`
   - Gzip + brotli compression
   - Rate limiting at gateway level
   - Access logs
   - Security headers (in addition to middleware)
5. **Create `.env.example`** — all 22 env vars with placeholder values
6. **Create environment separation:**
   - `.env.development` (local dev)
   - `.env.test` (CI)
   - `.env.production` (real secrets, not in git)
7. **Create GitHub Actions CI/CD** (`.github/workflows/`):
   - On PR: `lint` + `tsc` + `build` + `test`
   - On main: build Docker image → push to GHCR
   - Deploy job: SSH to VPS → `docker compose pull` + `docker compose up -d` with health-check-gated rollout
8. **Create backup scripts:**
   - `scripts/backup-db.sh` — `pg_dump` nightly → S3 (30d retention)
   - `scripts/backup-uploads.sh` — sync `upload/` to S3 nightly
   - `scripts/restore-db.sh` — restore from S3
   - Monthly: `pg_basebackup` for PITR (7d WAL retention)
   - Quarterly: restore drill (verify backup integrity)
9. **Create PM2 ecosystem file** (if not using Docker):
   - `ecosystem.config.js` — web + worker + notifications
   - Auto-restart on crash
   - Log rotation
10. **Configure Cloudflare:**
    - DNS A record → VPS IP
    - SSL/TLS: Full (strict)
    - WAF rules
    - DDoS protection
    - Page rules (cache static assets)
11. **Remove `.zscripts/build.sh`** (replaced by Docker + CI/CD)

**Compatibility:**
- ✅ No code changes (only infra)
- ⚠️ First deploy requires DNS propagation (5-30 min)
- ⚠️ SSL cert provisioning (Let's Encrypt)

**Tests:**
- `docker compose build` succeeds
- `docker compose up` — all services healthy
- Agent Browser (against local docker): all critical paths work
- `curl https://novsmm.com/api/health/ready` returns 200
- Manual: backup script runs, S3 has backup file
- Manual: restore script restores DB from backup
- Manual: CI/CD pipeline — PR triggers lint+build+test; merge triggers deploy
- Manual: Cloudflare DNS resolves to VPS; TLS cert valid

**Expected Result:**
- All DevOps P0s resolved
- Platform runs in Docker containers
- Nginx replaces Caddyfile
- CI/CD pipeline live
- Backups automated
- Cloudflare + Nginx + Next.js architecture live
- Platform ready for documentation (Phase 9)

---

## Phase 9: Documentation

**Objective:** Generate complete technical documentation so any developer can onboard.

**Risks:**
- NONE — Additive; no code changes

**Changes:**
1. **`README.md`** — project overview, quickstart, architecture diagram, links to docs
2. **`.env.example`** — all env vars with descriptions (already in Phase 8)
3. **`docs/architecture.md`** — system architecture, component diagram, data flow
4. **`docs/deployment.md`** — VPS setup, Docker commands, Cloudflare config, SSL
5. **`docs/environment.md`** — all env vars, what they do, how to generate secrets
6. **`docs/api/`** — OpenAPI spec generated from Zod schemas + Swagger UI
7. **`docs/database.md`** — ERD diagram, schema reference, migration guide
8. **`docs/redis.md`** — cache keys, TTLs, invalidation strategy, queue architecture
9. **`docs/background-jobs.md`** — BullMQ queues, worker setup, DLQ, monitoring
10. **`docs/websockets.md`** — Socket.IO architecture, rooms, auth, scaling
11. **`docs/security.md`** — auth flow, 2FA, CSRF, rate limiting, secrets management
12. **`docs/disaster-recovery.md`** — backup strategy, restore procedures, DR drills
13. **`docs/decisions/`** — Architecture Decision Records (ADRs)
    - ADR-001: PostgreSQL over SQLite
    - ADR-002: Redis for cache + queues
    - ADR-003: BullMQ for background jobs
    - ADR-004: Nginx over Caddy
    - ADR-005: Docker Compose over Kubernetes (for now)
14. **`CONTRIBUTING.md`** — dev setup, code style, PR process
15. **`SECURITY.md`** — vulnerability reporting, security policy
16. **`LICENSE`** — proprietary license (or MIT if open-source)

**Compatibility:**
- ✅ No code changes
- ✅ No risk

**Tests:**
- All docs render correctly on GitHub
- New developer can follow `README.md` → local dev running in < 30 minutes
- All env vars documented in `.env.example`

**Expected Result:**
- All documentation P0s resolved
- Complete docs/ folder
- Any developer can onboard
- Platform ready for final review (Phase 10)

---

## Phase 10: Production Readiness Review

**Objective:** Final validation that the platform is production-ready.

**Risks:**
- NONE — Validation only

**Changes:**
1. **Load testing** (k6 or Artillery):
   - 1000 concurrent users
   - Simulate: login, browse services, create order, check order status, top-up wallet
   - Target: < 500ms p95 latency, 0 errors
2. **Security audit** (external):
   - Run `bun audit` — fix all vulnerabilities
   - Run `npm audit` — fix all vulnerabilities
   - Manual penetration testing (OWASP Top 10)
3. **DR drill:**
   - Simulate DB failure → verify failover to replica
   - Simulate Redis failure → verify graceful degradation
   - Simulate VPS failure → verify restore from backup on new VPS
4. **Performance benchmarks:**
   - Lighthouse audit — LCP < 2.5s, FCP < 1.8s, CLS < 0.1
   - API p95 latency < 200ms
   - DB query p95 < 50ms
5. **Go-live checklist:**
   - [ ] All P0s from audit resolved
   - [ ] All P1s from audit resolved (or documented as accepted risk)
   - [ ] Sentry capturing errors
   - [ ] Health endpoints live
   - [ ] Backups running
   - [ ] CI/CD pipeline live
   - [ ] SSL cert valid
   - [ ] Cloudflare configured
   - [ ] DNS propagated
   - [ ] Load test passed
   - [ ] Security audit passed
   - [ ] DR drill passed
   - [ ] Documentation complete

**Tests:**
- Load test report
- Security audit report
- DR drill report
- Lighthouse report
- Go-live checklist signed off

**Expected Result:**
- NOVSMM is a production-ready SaaS Enterprise platform
- All audit findings resolved or documented
- Platform can scale from hundreds to millions of users
- No architectural debt blocking future growth

---

## Validation Gates (Per Phase)

Every phase must pass these gates before proceeding:

1. **`bun run lint` clean** — no ESLint errors
2. **Dev server running** — `bun run dev` starts without fatal errors
3. **`dev.log` clean** — no runtime errors, no hydration mismatches
4. **Agent Browser verification** — all critical paths work:
   - Login (credentials + Google)
   - Register
   - Browse services
   - Create order
   - Top-up wallet
   - View dashboard
   - Admin panel access
5. **Worklog updated** — phase changes documented in `worklog.md`
6. **No regressions** — features that worked before still work

---

## Summary

| Phase | P0s Resolved | P1s Resolved | Effort |
|-------|--------------|--------------|--------|
| 1. Security & Stability | 13 | 5 | 1-2 days |
| 2. Database Hardening | 7 | 13 | 2-3 days |
| 3. Redis + Background Jobs | 5 | 8 | 3-4 days |
| 4. PostgreSQL Migration | 1 | 5 | 2-3 days |
| 5. Backend Refactor | 8 | 20 | 4-5 days |
| 6. Performance | 7 | 15 | 2-3 days |
| 7. Observability | 4 | 5 | 1-2 days |
| 8. DevOps | 14 | 15 | 2-3 days |
| 9. Documentation | 2 | 5 | 2 days |
| 10. Production Review | 0 | 0 | 1 day |
| **Total** | **~40 P0s** | **~80 P1s** | **~3-4 weeks** |

**The plan is designed so that each phase is independently valuable and reversible. If we stop after Phase 1, the platform is significantly more secure. If we stop after Phase 4, the platform is database-scalable. If we complete all 10 phases, NOVSMM is a true SaaS Enterprise platform.**

---

*This plan is based on the consolidated audit in `ENTERPRISE_AUDIT.md`. Per-phase worklogs will be appended to `worklog.md` as each phase completes.*
