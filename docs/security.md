# NOVSMM — Security Documentation

## Overview

NOVSMM implements defense-in-depth security with 8 layers of protection, from edge (Cloudflare) to database (Prisma parameterized queries).

## Security Layers

### Layer 1: Cloudflare (Edge)
- DDoS protection (L3/L4/L7)
- WAF rules (OWASP Top 10, SQL injection, XSS)
- Bot mitigation
- SSL/TLS edge certificates
- Rate limiting at CDN level

### Layer 2: Nginx (Gateway)
- TLS termination (Let's Encrypt, A+ SSL Labs rating)
- Rate limiting per endpoint:
  - Auth endpoints: 1 req/s per IP (brute-force protection)
  - Payment endpoints: 2 req/s per IP
  - General API: 10 req/s per IP
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Cross-Origin-*
- Gzip compression
- WebSocket upgrade for /socket.io/

### Layer 3: Middleware (Edge)
- **CSRF protection**: Origin header value-matched against `NEXTAUTH_URL` host
  - Browsers cannot forge Origin headers (CORS spec)
  - Bearer-token API requests exempt (server-to-server)
  - Webhooks exempt (use HMAC signatures instead)
- **Rate limiting**: In-memory per-instance (Edge Runtime can't use Redis)
- **Security headers**: CSP, X-XSS-Protection, Referrer-Policy
- **IP forwarding**: `x-client-ip` header passed to API routes

### Layer 4: Authentication
- **NextAuth.js v4** with JWT strategy
- **Credentials provider**: email + password (bcrypt cost-12)
- **Google OAuth**: verified emails only (no `allowDangerousEmailAccountLinking`)
- **2FA TOTP**: enforced in `authorize()` — throws `2FA_REQUIRED` signal
- **Brute-force protection**: 5 failed attempts → 15-minute lockout (Redis-backed)
- **Session**: JWT signed with `NEXTAUTH_SECRET` (32-byte hex)

### Layer 5: API Authorization
- **`requireAuth()`**: Returns typed `AuthUser` or 401 error
- **`requireAdmin()`**: Checks `role === "admin"` or 403 error
- **IDOR protection**: All per-resource queries filter by `userId` from session
- **Zod validation**: All input validated with `.strict()` schemas (rejects unknown fields)
- **`audit()` helper**: Logs all sensitive actions with IP + User-Agent

### Layer 6: Database
- **Prisma ORM**: All queries parameterized (no SQL injection)
- **No raw SQL**: Zero `db.$queryRawUnsafe` calls
- **Connection pooling**: PgBouncer in transaction mode
- **Indexes**: 40+ indexes on hot paths (Phase 2)

### Layer 7: Encryption
- **AES-256-GCM** for payment credentials, 2FA secrets, license keys
- **bcrypt cost-12** for password hashing
- **SHA-256 lookupHash** for O(1) API key + license validation
- **HMAC-SHA256** for webhook signature verification
- **Fail-closed**: Encryption throws if `LICENSE_ENCRYPTION_KEY` not set (no hardcoded fallback)

### Layer 8: Webhooks
- **Stripe**: `verifyStripeWebhook()` with `STRIPE_WEBHOOK_SECRET`
- **Mercado Pago**: HMAC-SHA256 of `data.id + ts` with `MP_WEBHOOK_SECRET` + payment-status confirmation fetch
- **NowPayments**: HMAC-SHA256 with `NOWPAYMENTS_IPN_SECRET`
- **All fail-closed**: 401 if secret missing or signature invalid (no "log mode")

## Authentication Flow

### Login (Credentials)

```
1. POST /api/auth/callback/credentials
   Headers: Origin: https://novsmm.com
   Body: { email, password, totp?, csrfToken }

2. Middleware:
   - Rate limit: 20/15min per IP
   - CSRF: Origin matches trusted host

3. authorize():
   a. Check brute-force lock (Redis: login_lock:{email})
   b. Find user by email
   c. Verify password (bcrypt.compare)
   d. If 2FA enabled:
      - No totp → throw "2FA_REQUIRED"
      - totp invalid → trackFailedAttempt + throw "Invalid 2FA code"
      - totp valid → continue
   e. Clear failed attempts
   f. audit(userId, "login", "user", userId)

4. NextAuth creates JWT (signed with NEXTAUTH_SECRET)

5. jwt callback:
   - Check Redis cache (user:{id}, 30s TTL)
   - Cache miss → fetch from DB + cache
   - Attach user data to token

6. Return session cookie → redirect to dashboard
```

### Login (Google OAuth)

```
1. User clicks "Continue with Google"
2. Redirect to Google consent screen
3. Google redirects to /api/auth/callback/google
4. NextAuth verifies Google ID token
5. PrismaAdapter creates/finds Account + User
6. (No allowDangerousEmailAccountLinking — prevents takeover)
7. JWT created + session cookie set
```

### 2FA Flow

```
Setup:
1. POST /api/me/2fa/setup → generate TOTP secret + QR code
2. Secret encrypted with AES-256-GCM → stored in Setting table
3. Backup codes generated with crypto.randomBytes (CSPRNG)

Verify:
1. POST /api/me/2fa/verify { token }
2. Decrypt secret → verify2FAToken(token, secret)
3. Move from "pending" to "active"

Login with 2FA:
1. POST /api/auth/callback/credentials { email, password }
2. authorize() detects 2FA enabled, no totp → throws "2FA_REQUIRED"
3. Frontend shows 2FA input
4. User enters 6-digit code
5. POST /api/auth/callback/credentials { email, password, totp }
6. authorize() verifies TOTP → success
```

## CSRF Protection

### How it works

1. For all `POST`/`PATCH`/`PUT`/`DELETE` requests (except `/api/auth/*` and `/api/webhooks/*`):
2. Check `Origin` header (or `Referer` as fallback)
3. If `Authorization: Bearer ...` header present → exempt (server-to-server API call)
4. If no Origin AND no Authorization → **403 Forbidden** ("CSRF check failed — missing origin")
5. If Origin present → value-match against `NEXTAUTH_URL` host
6. If Origin doesn't match → **403 Forbidden** ("CSRF check failed — origin mismatch")

### Why this works

- Browsers **cannot** be tricked into setting a fake `Origin` header via JavaScript (CORS spec)
- Attackers can't read the response from a cross-origin request (same-origin policy)
- The `Origin` header is sent on all cross-origin requests (POST, PATCH, PUT, DELETE)
- Bearer tokens can't be set by browsers without CORS preflight (so CSRF via bearer is impossible)

## Rate Limiting

### Layers

| Layer | Scope | Limits |
|-------|-------|--------|
| Cloudflare | Per-IP, global | Configured in Cloudflare dashboard |
| Nginx | Per-IP, per-endpoint | auth: 1r/s, payment: 2r/s, API: 10r/s |
| Middleware | Per-IP, per-route | auth/callback: 20/15min, register: 10/hr, etc. |
| Auth (brute-force) | Per-email | 5 failed attempts → 15-min lockout |

### Redis-backed (production)

When Redis is available:
- Rate limits are **shared across all instances**
- Sliding window algorithm via sorted sets (precise)
- Brute-force tracking is **persistent** (survives restarts)

### In-memory fallback (dev/sandbox)

When Redis is NOT available:
- Per-instance rate limiting
- Fixed-window approximation
- Lost on restart

## Secrets Management

### Environment Variables

All secrets are stored in `.env` (never committed to git):

| Secret | Purpose | Generate |
|--------|---------|----------|
| `NEXTAUTH_SECRET` | JWT signing | `openssl rand -hex 32` |
| `LICENSE_ENCRYPTION_KEY` | AES-256-GCM encryption | `openssl rand -hex 24` (min 16 chars) |
| `NOTIFICATIONS_SERVICE_SECRET` | WS /broadcast auth | `openssl rand -hex 24` |
| `POSTGRES_PASSWORD` | Database password | `openssl rand -hex 16` |
| `STRIPE_SECRET_KEY` | Stripe API | From Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | From Stripe dashboard |
| `MP_ACCESS_TOKEN` | Mercado Pago API | From MP dashboard |
| `MP_WEBHOOK_SECRET` | MP webhook verification | From MP dashboard |
| `NOWPAYMENTS_IPN_SECRET` | NowPayments webhook | From NowPayments dashboard |
| `HUNTSMM_API_KEY` | HuntSMM API | From HuntSMM dashboard |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | From Google Cloud Console |
| `SENTRY_DSN` | Sentry error tracking | From Sentry dashboard |

### Fail-Closed Design

- `LICENSE_ENCRYPTION_KEY` not set → **throws** (no hardcoded fallback)
- `NEXTAUTH_SECRET` not set → NextAuth warns (JWTs unsigned)
- Webhook secret not set → **401 Unauthorized** (no "log mode")

### Redaction

- pino logger redacts: password, token, secret, apiKey, authorization, cookie, etc.
- Sentry: `sendDefaultPii: false`
- API responses: error messages sanitized (no SDK internals, no file paths)

## Audit Logging

All sensitive actions are logged via the `audit()` helper:

```typescript
await audit(userId, "login", "user", userId);
await audit(userId, "create", "order", order.id, { total: 42.50 });
await audit(adminId, "refund", "transaction", txn.id, { amount: 100 });
```

Each audit log entry captures:
- `userId` — who performed the action
- `action` — what they did (create, update, delete, login, refund, etc.)
- `entity` — what entity was affected (user, order, transaction, etc.)
- `entityId` — specific record ID
- `metadata` — additional context (JSON)
- `ip` — client IP (from `x-client-ip` header)
- `userAgent` — client User-Agent
- `createdAt` — timestamp

**All 34 audit log call sites** use the `audit()` helper (Phase 1 migration).

## Vulnerability Reporting

See [SECURITY.md](../SECURITY.md) for vulnerability reporting procedures.
