# NOVSMM — System Architecture

## Overview

NOVSMM is a Next.js 16 SaaS platform with a modular, scalable architecture designed to handle hundreds to millions of users. The system uses a layered approach with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Internet                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare (CDN + WAF + DDoS)                     │
│  • Static asset caching (images, CSS, JS)                           │
│  • DDoS protection                                                  │
│  • WAF rules (SQL injection, XSS, bot mitigation)                   │
│  • SSL/TLS edge certificates                                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                             │
│  • TLS termination (Let's Encrypt)                                  │
│  • Rate limiting (auth: 1r/s, payment: 2r/s, API: 10r/s)            │
│  • Gzip compression                                                 │
│  • WebSocket upgrade (/socket.io/)                                  │
│  • Security headers (HSTS, X-Frame-Options, etc.)                   │
│  • Static file caching (_next/static: 1y immutable)                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   Next.js Web    │ │   Next.js Web    │ │  Notifications   │
│   (port 3000)    │ │   (port 3000)    │ │  (port 3003)     │
│                  │ │                  │ │  Socket.IO       │
│  • App Router    │ │  • App Router    │ │  • Per-user rooms│
│  • API Routes    │ │  • API Routes    │ │  • JWT auth      │
│  • SSR/RSC       │ │  • SSR/RSC       │ │  • Redis adapter │
│  • Middleware    │ │  • Middleware    │ │                  │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                     │
         └────────────┬───────┘                     │
                      │                             │
         ┌────────────┼─────────────────────────────┤
         │            │                             │
         ▼            ▼                             ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       PostgreSQL (5432)       │    │        Redis (6379)          │
│                               │    │                               │
│  • 32 models                  │    │  • Cache (user, settings)    │
│  • 40+ indexes                │    │  • Rate limiting             │
│  • Native enums (PG)          │    │  • Brute-force tracking      │
│  • JsonB columns              │    │  • BullMQ queues             │
│  • Decimal monetary values    │    │  • Socket.IO adapter         │
│  • Connection pooling         │    │  • Session cache             │
└───────────────────────────────┘    └───────────────────────────────┘
                      │                             │
                      │             ┌───────────────┘
                      │             │
                      ▼             ▼
           ┌──────────────────────────────────┐
           │       BullMQ Worker Process       │
           │                                   │
           │  Queues:                          │
           │  • order.fulfill (concurrency 5)  │
           │  • email.send (concurrency 10)    │
           │  • ws.broadcast (concurrency 20)  │
           │  • provider.sync (concurrency 1)  │
           │  • loyalty.reconcile (concurrency 3)│
           │  • ai.insights (concurrency 1)    │
           │                                   │
           │  • Retries (3, exponential backoff)│
           │  • Dead Letter Queue              │
           └──────────────────────────────────┘
                      │
                      ▼
           ┌──────────────────────────────────┐
           │       External Services           │
           │                                   │
           │  • Stripe API (payments)          │
           │  • Mercado Pago API               │
           │  • NowPayments API (crypto)       │
           │  • PayPal API                     │
           │  • HuntSMM API (SMM provider)     │
           │  • Google OAuth                   │
           │  • SMTP (email)                   │
           │  • Sentry (error tracking)        │
           │  • z-ai-web-dev-sdk (AI)          │
           └──────────────────────────────────┘
```

## Component Responsibilities

### Next.js Web Application

The main application server handling HTTP requests, API routes, and server-side rendering.

**Key modules:**
- `src/middleware.ts` — Edge middleware: rate limiting, CSRF protection, security headers
- `src/lib/auth.ts` — NextAuth config (Credentials + Google OAuth + 2FA)
- `src/lib/api-handler.ts` — `withErrorHandler` HOC (error sanitization, Sentry capture)
- `src/lib/api-utils.ts` — `requireAuth`, `requireAdmin`, `audit` helpers
- `src/lib/cache.ts` — Cache layer (Redis primary, in-memory fallback)
- `src/lib/queues.ts` — BullMQ queue definitions + `enqueueJob` helper
- `src/lib/services/` — Business logic (loyalty, wallet)
- `src/lib/money.ts` — Decimal-safe monetary arithmetic
- `src/lib/db-search.ts` — Provider-agnostic case-insensitive search

### Notifications Service

Standalone Socket.IO service for real-time push notifications.

**Key features:**
- Per-user rooms (prevents data leak — `io.to("user:{id}").emit`)
- JWT auth on WebSocket connection (verified with `NEXTAUTH_SECRET`)
- `/broadcast` endpoint authenticated with `NOTIFICATIONS_SERVICE_SECRET`
- `@socket.io/redis-adapter` for multi-instance scaling
- `/healthz` endpoint for health checks
- Removed ambient spam loop (was broadcasting fake system notifications)

### BullMQ Worker

Separate process that processes background jobs from Redis queues.

**Queues:**
| Queue | Concurrency | Retries | Purpose |
|-------|-------------|---------|---------|
| `order.fulfill` | 5 | 3 | Order fulfillment (was setTimeout in API routes) |
| `email.send` | 10 | 3 | Email delivery |
| `ws.broadcast` | 20 | 2 | WebSocket notification push |
| `provider.sync` | 1 | 2 | SMM provider catalog sync |
| `loyalty.reconcile` | 3 | 3 | Achievement reconciliation |
| `ai.insights` | 1 | 2 | AI insight generation |

### PostgreSQL

Primary database with 32 models, 40+ indexes, native enums, JsonB columns, and Decimal monetary values.

**Key models:**
- `User` — authentication, balance, plan
- `Order` — SMM orders with drip-feed support
- `Transaction` — wallet ledger (topup, sale, withdrawal, referral)
- `Service` — SMM service catalog (6,000+ services)
- `ApiKey` / `License` — reseller integrations (with SHA-256 lookupHash for O(1) validation)
- `AuditLog` — forensic logging with IP + User-Agent

### Redis

Multi-purpose data store for cache, rate limiting, queues, and real-time.

**Use cases:**
- **Cache** — user data (30s TTL), public settings (60s), service catalog (30s)
- **Rate limiting** — sliding window via sorted sets (auth, API, payment endpoints)
- **Brute-force tracking** — login attempt counter with auto-lockout
- **BullMQ queues** — background job persistence + retry logic
- **Socket.IO adapter** — multi-instance WebSocket message routing

**Graceful degradation:** When Redis is not available, all operations fall back to in-memory equivalents. This allows the app to run in dev/sandbox mode without Redis.

## Data Flow

### Order Creation Flow

```
1. User submits order (POST /api/orders)
   ↓
2. Middleware: rate limit + CSRF check
   ↓
3. requireAuth() → get typed user
   ↓
4. parseBody(req, createOrderSchema) → validate input
   ↓
5. Check service exists + quantity within min/max
   ↓
6. Interactive $transaction:
   a. Conditional updateMany (balance >= totalPrice)
   b. Create order (with nextPublicId("A", 10432))
   c. Create transaction (with nextPublicId("TX", 8842))
   ↓
7. enqueueJob("order.fulfill", { orderId, userId })
   ↓
8. audit(userId, "create", "order", order.id)
   ↓
9. Return apiOk({ order })
   ↓
10. Worker picks up job → simulateFulfillment()
    a. Try HuntSMM provider placement
    b. Fall back to simulated fulfillment (4 steps)
    c. On completion: notification + loyalty points + achievements
```

### Payment Webhook Flow

```
1. Payment provider sends webhook (POST /api/webhooks/stripe)
   ↓
2. Middleware: exempt from CSRF (webhooks use HMAC signatures)
   ↓
3. Resolve webhook secret (runtime override → env → DB Setting)
   ↓
4. Verify signature (HMAC-SHA256)
   a. Fail-closed: 401 if secret missing or signature invalid
   ↓
5. Log webhook (WebhookLog)
   ↓
6. Process event (idempotent — checks txn.status)
   a. payment_intent.succeeded → credit wallet
   b. charge.refunded → reverse credit
   c. customer.subscription.deleted → downgrade plan
   ↓
7. audit + notification
   ↓
8. Return 200
```

### Authentication Flow

```
1. User submits credentials (POST /api/auth/callback/credentials)
   ↓
2. Middleware: rate limit (20/15min per IP)
   ↓
3. NextAuth authorize():
   a. Check brute-force lock (Redis-backed)
   b. Find user by email
   c. Verify password (bcrypt)
   d. Check 2FA (if enabled):
      - No TOTP → throw "2FA_REQUIRED" → frontend shows 2FA input
      - TOTP invalid → track failed attempt
      - TOTP valid → continue
   e. Clear failed attempts
   f. audit(userId, "login", "user", userId)
   ↓
4. NextAuth creates JWT (signed with NEXTAUTH_SECRET)
   ↓
5. jwt callback:
   a. Check Redis cache (user:{id}, 30s TTL)
   b. Cache miss → fetch from DB + cache
   c. Attach user data to token
   ↓
6. session callback → attach token data to session
   ↓
7. Return session cookie
```

## Scalability

### Horizontal Scaling

| Component | Scale Method | Limit |
|-----------|-------------|-------|
| Next.js Web | `docker compose up --scale web=3` | Nginx load balances |
| Worker | `docker compose up --scale worker=2` | BullMQ distributes jobs |
| Notifications | Single instance (Redis adapter) | Redis adapter handles multi-instance |
| PostgreSQL | Read replica for analytics | Primary for writes |
| Redis | Redis Cluster (future) | Single instance (256MB) |

### Vertical Scaling

| Resource | Current | Scale Path |
|----------|---------|------------|
| CPU | 2 cores | 4-8 cores for high traffic |
| RAM | 4 GB | 8-16 GB (PostgreSQL + Redis) |
| Disk | 40 GB SSD | 100+ GB (order history growth) |
| Connections | 10 per web instance | PgBouncer transaction pooling |

## Security Layers

1. **Cloudflare** — DDoS protection, WAF, bot mitigation
2. **Nginx** — Rate limiting, TLS, security headers
3. **Middleware** — CSRF protection, rate limiting, IP forwarding
4. **Auth** — NextAuth JWT, 2FA TOTP, brute-force lockout
5. **API** — `requireAuth`/`requireAdmin`, Zod validation, `audit` logging
6. **Database** — Prisma parameterized queries (no SQL injection)
7. **Encryption** — AES-256-GCM for payment credentials, 2FA secrets
8. **Webhooks** — HMAC-SHA256 signature verification (fail-closed)

See [docs/security.md](security.md) for detailed security documentation.
