# NOVSMM OWASP Top 10 (2021) Security Audit

**Task ID:** OWASP-AUDIT-1
**Agent:** Explore
**Date:** 2026-07-10
**Scope:** Full audit of `/home/z/my-project` (NOVSMM SMM panel — Next.js 16 + TypeScript + PostgreSQL + NextAuth)
**Production URL:** https://novsmm.shop

---

## Executive Summary

- **Total findings:** 27
- **P0 (Critical):** 3
- **P1 (High):** 9
- **P2 (Medium):** 10
- **P3 (Low):** 5
- **Overall risk:** **HIGH** — production deployment should be blocked until the 3 P0 issues are remediated.

The codebase shows strong fundamentals (race-safe balance operations, fail-closed webhook signatures, AES-256-GCM at rest, per-route `requireAuth`/`requireAdmin` discipline, CSRF Origin checking in middleware) but has three critical gaps: (1) wallet top-up falls back to an instant-credit sandbox path when any payment-method branch fails to match, (2) Next.js 16.1.1 ships with 17+ known CVEs including HIGH-severity middleware-bypass and SSRF advisories, and (3) JWT sessions are never invalidated on password change/reset/account deletion, allowing stolen-session-cookie attackers to persist access.

---

## Findings by Category

### A01: Broken Access Control

**Status:** 3 findings (1 P1, 1 P2, 1 P3)

#### Finding A01-1: `/api/metrics` Prometheus endpoint is unauthenticated when `METRICS_BASIC_AUTH` env var is unset
- **Severity:** P1
- **File:** `src/app/api/metrics/route.ts:32-45`
- **Description:** The endpoint exposes Prometheus metrics (HTTP request counters, DB query durations, cache ops, queue jobs, active WebSocket connections, process memory/CPU) to anyone. Authentication is *optional* — controlled by `METRICS_BASIC_AUTH` env var. If the operator forgets to set it, the endpoint is wide open.
- **Impact:** Attackers can enumerate internal architecture (queue names, model names, route inventory), monitor system load to time attacks, and infer business volume. Metrics also leak `process.pid`, Node.js version, and internal error counters.
- **Fix:** Make the basic-auth check mandatory (reject with 401 if `METRICS_BASIC_AUTH` is not set), OR restrict by IP at the middleware level (e.g. `/api/metrics` matcher that requires `x-forwarded-for` to be in a Prometheus-allowlist), OR move the endpoint to a separate port that is only reachable from the internal network.

#### Finding A02-2: `/api/internal/backup-status` allows `clientIp === "unknown"` to bypass localhost restriction
- **Severity:** P2
- **File:** `src/app/api/internal/backup-status/route.ts:43-49`
- **Description:** The `isLocalhost` check returns `true` when `clientIp === "unknown"`. The middleware sets `x-client-ip` from `x-forwarded-for`, but if both are missing (e.g. direct connection to the Node port bypassing the proxy, or a misconfigured gateway), the IP defaults to `"unknown"` and the localhost guard passes. Combined with the bearer-token check, the impact is reduced, but the IP guard is supposed to be defense-in-depth.
- **Impact:** If the Node process is reachable on a public interface (misconfigured firewall, exposed port, container network gap), an attacker who learns `INTERNAL_API_TOKEN` (e.g. via log leak) can call the endpoint from anywhere because the IP guard silently passes for "unknown".
- **Fix:** Treat `clientIp === "unknown"` as **forbidden**, not allowed. Change line 44 to `const isLocalhost = (clientIp === "127.0.0.1" || clientIp === "::1" || clientIp.startsWith("10.") || clientIp.startsWith("192.168.") || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(clientIp));` (drop the `clientIp === "unknown"` clause). Document that the proxy MUST set `x-forwarded-for`.

#### Finding A01-3: `PATCH /api/me` allows a regular user to self-elevate from `user` → `reseller` → `agency`
- **Severity:** P3
- **File:** `src/app/api/me/route.ts:90, 141-146`
- **Description:** The `updateProfileSchema.role` enum is `["user", "reseller", "agency"]`. A logged-in user can PATCH `/api/me` with `{role: "agency"}` and immediately gain agency-tier features (e.g. child-panel discounts, higher referral commission). Only admin self-elevation is blocked. There is no business justification for users to self-assign tiers — tiers should be assigned by admin or earned through activity.
- **Impact:** Privilege escalation within the non-admin role spectrum. Users can unlock agency-tier pricing/features without paying or being approved.
- **Fix:** Remove `role` from `updateProfileSchema`. If users need to *downgrade* themselves, add a separate `POST /api/me/downgrade-role` endpoint with explicit confirmation. Role changes should otherwise go through `PATCH /api/admin/users` (admin-only).

---

### A02: Cryptographic Failures

**Status:** 3 findings (1 P1, 2 P2)

#### Finding A02-1: Admin OAuth credentials are mirrored into `process.env` at runtime (thread-unsafe, plaintext in process memory)
- **Severity:** P1
- **File:** `src/app/api/admin/social-auth/route.ts:117-119` (POST), `:151-153` (DELETE)
- **Description:** When an admin saves OAuth credentials via `/api/admin/social-auth`, the route writes the plaintext `clientId` and `clientSecret` into `process.env.GOOGLE_CLIENT_ID` (etc.). This is the same anti-pattern that was previously identified and fixed for Stripe credentials (`src/lib/stripe.ts` now uses a runtime override + clear-on-request). The OAuth path still mutates `process.env` and never clears it.
- **Impact:**
  1. Plaintext secrets live in `process.env` for the entire process lifetime (until restart).
  2. Any code path that reads `process.env.GOOGLE_CLIENT_SECRET` (including the legacy `getGoogleOAuthConfig()` fallback in `src/lib/auth.ts:400-405`) bypasses the encrypted-DB storage and reads plaintext from the env.
  3. In multi-instance deployments, the env mutation is local to one instance — other instances continue reading the DB-stored encrypted creds. Inconsistent auth behavior across instances.
  4. `process.env` is readable by any diagnostic tooling (APM agents, debug endpoints, error reporters) running in the same process.
- **Fix:** Remove lines 117-119 and 151-153. The dynamic `getDynamicAuthOptions()` in `auth.ts` already reads from the DB on every request, so the env mutation is unnecessary. If a cache is needed for performance, use the existing `cacheGet`/`cacheSet` helpers with a short TTL.

#### Finding A02-2: `LICENSE_ENCRYPTION_KEY` minimum length is 16 chars (should be 32)
- **Severity:** P2
- **File:** `src/lib/crypto-utils.ts:17`
- **Description:** The key-resolution check requires `key.length < 16` to fail. The encryption itself uses SHA-256(key) → 32-byte AES-256 key, so the cipher is still strong, but a 16-char ASCII key only provides ~96 bits of entropy before hashing. NIST SP 800-131A recommends ≥128 bits for AES-256 keys. The `.env.example` says "openssl rand -hex 32" (which gives 64 hex chars = 256 bits) — but the runtime check would also accept a much weaker 16-char password like "password1234567".
- **Impact:** If an operator sets a weak passphrase (16 chars) instead of a proper `openssl rand -hex 32`, the encrypted payment credentials + 2FA secrets + child-panel API keys are protected by weaker-than-expected key material.
- **Fix:** Bump the minimum to 32 chars AND require hex/base64 encoding (regex check), OR document explicitly that the value must come from `openssl rand -hex 32`. Reject the value with a clear error if it doesn't match.

#### Finding A02-3: Reset-password tokens are stored as plaintext in the DB
- **Severity:** P2
- **File:** `src/app/api/auth/forgot-password/route.ts:36-46`, `src/app/api/auth/reset-password/route.ts:27-29`
- **Description:** `crypto.randomBytes(32).toString("hex")` generates the token, then it's stored verbatim in `VerificationToken.token` and looked up by exact string match. Anyone with read access to the DB (DBA, backup snapshot, SQL injection, replica) can recover valid reset tokens and take over any account within the 1-hour validity window.
- **Impact:** Token theft via DB read access (insider threat, replica leak, backup compromise) → account takeover.
- **Fix:** Store a SHA-256 hash of the token (same pattern as API keys in `src/lib/api-key-auth.ts`). Look up by `lookupHash` instead of plaintext. The register/verify-email flow already uses the same `VerificationToken` table and has the same issue — fix both.

---

### A03: Injection

**Status:** 0 findings ✅

- **Raw SQL:** Only two `$queryRaw\`SELECT 1\`` calls in `health/ready/route.ts:27` and `health/db/route.ts:41` — both use the tagged-template literal form (parameterized), no user input. ✅
- **NoSQL injection:** All Prisma queries use the structured `where: { ... }` form — no `$where`, no `JS string eval`, no raw object spreading of user-controlled keys. ✅
- **Command injection:** Zero `child_process` imports across `src/`. ✅
- **Template injection:** No `eval`, no `new Function`, no `vm.runInNewContext`. ✅
- **LDAP/XML/XPath:** Not applicable (no such integrations).

---

### A04: Insecure Design

**Status:** 5 findings (1 P0, 2 P1, 2 P2)

#### Finding A04-1: Wallet top-up sandbox fallback grants free credit for any unconfigured payment method
- **Severity:** P0
- **File:** `src/app/api/wallet/topup/route.ts:367-431`
- **Description:** The route tries 5 dispatch branches (Stripe, PayPal, Mercado Pago, NowPayments, Manual). If **none** of them match (e.g. admin creates a custom payment method called "Zelle" or "Crypto" but doesn't set credentials; OR a known method's `decryptJSON()` returns null due to a key rotation; OR the PaymentMethod row exists but has an empty `config`), execution falls through to `processPayment()` at line 371 — a **sandbox simulator** that:
  1. Waits 1.5 seconds.
  2. Returns `success: true` 99.5% of the time.
  3. Credits the user's wallet balance **immediately** with the requested `amount` (lines 390-405).

  The user pays nothing and receives real wallet credit. The audit log entry even self-documents the fraud: `await audit(userId, "create", "transaction", txn.id, { type: "topup", amount, method: pm.name, sandbox: true });` (line 417).
- **Impact:** Direct financial loss. An attacker who registers, opens the top-up modal, and selects any unconfigured/custom payment method receives unlimited free wallet credit. They can then place real SMM orders, withdraw via PayPal (after admin approval — but the admin sees a "real" balance), or transfer to child panels. This is the most severe finding in the audit.
- **Fix:** Remove the sandbox fallback entirely. If none of the 5 dispatch branches match (or if a known method has no creds), **reject the top-up** with HTTP 422 "Payment method not configured — contact support". The sandbox was useful for dev, but in production it's a free-money tap. Concretely:
  ```ts
  // After the Manual branch:
  await db.transaction.update({ where: { id: txn.id }, data: { status: "failed" } });
  return apiError(`Payment method "${pm.name}" is not configured. Please contact support.`, 422);
  // DELETE the processPayment() function and its call site.
  ```
  If a sandbox mode is needed for dev, gate it behind `process.env.NODE_ENV !== "production"` AND require a `DEV_AUTO_CREDIT=1` flag.

#### Finding A04-2: `PATCH /api/admin/users` can change a user's balance directly without creating a Transaction record
- **Severity:** P1
- **File:** `src/app/api/admin/users/route.ts:74-98`
- **Description:** The admin users PATCH route accepts `balance: number` in the body and writes it directly to the User table (line 96: `if (balance !== undefined) updateData.balance = balance;`). There is **no** Transaction row created, **no** description/reason captured, and the audit log entry (line 100) only records `{role, status, balance}` — not the previous balance, not the delta, not the reason.

  The dedicated `/api/admin/users/adjust-balance` route (lines 1-119 in its own file) does this correctly: it creates a `Transaction` row of type `topup`/`withdrawal`, requires a `reason`, uses a race-safe `$transaction`, and writes a full audit entry. But the generic PATCH route bypasses all of that.
- **Impact:** Silent financial manipulation. A malicious or compromised admin can credit/debit any user's balance with no audit trail in the Transaction table. Financial reports won't match user balances. Reconciliation impossible.
- **Fix:** Remove `balance` from `updateUserSchema` (in `src/lib/validations.ts:90-95`). Force all balance changes to go through `/api/admin/users/adjust-balance` which has the proper audit trail. If admin UI needs to display the current balance, it can read it; if it needs to change it, it must POST to adjust-balance.

#### Finding A04-3: 2FA flow is split across two contradictory implementations (one dead, one locking out users)
- **Severity:** P1
- **File:** `src/lib/auth.ts:129-157` (Credentials provider TOTP enforcement) vs `src/app/api/auth/verify-2fa/route.ts` (post-login stamp)
- **Description:** Two parallel 2FA flows exist:

  **Flow A (active, in Credentials `authorize()`):** When a user has 2FA enabled and submits credentials without a `totp` field, `authorize()` throws `"2FA_REQUIRED"`. The frontend must catch this, prompt for the TOTP, and re-call `signIn("credentials", {email, password, totp})`. The `totp` is then verified inside `authorize()`. This flow **does not accept backup codes** — a user with a lost TOTP device is permanently locked out.

  **Flow B (vestigial, in `/api/auth/verify-2fa`):** The route's docstring says "Client calls signIn('credentials') — NextAuth issues a session cookie. Session is technically valid at this point. Client POSTs {token} or {backupCode} here." It sets a `2fa:verified:${userId}` Setting stamp with 24h validity. But this flow can never be reached — Flow A refuses to issue a session cookie without a valid TOTP. The stamp is never checked by any other code (grep confirms `2fa:verified` appears only in this one file).

  Result: backup codes are unusable, and the `verify-2fa` route is dead code that creates a false sense of recovery capability.
- **Impact:** Permanent account lockout for any user who loses their TOTP device. The "backup codes" feature is fraudulently advertised — it can never be invoked. Users will demand support intervention, costing ops time and eroding trust.
- **Fix:** Pick one flow and delete the other.

  Recommended: keep Flow A (TOTP at login) but extend it to accept `backupCode` as an alternative to `totp`. Delete `/api/auth/verify-2fa` and the `2fa:verified` stamp mechanism. Document the recovery path in the user-facing 2FA setup screen.

#### Finding A04-4: Referral code suffix uses `Math.random()` (not CSPRNG)
- **Severity:** P2
- **File:** `src/app/api/referrals/route.ts:30`
- **Description:** `const code = \`NOV-${...}-${Math.random().toString(36).slice(2, 5).toUpperCase()}\`;` — `Math.random()` is not cryptographically secure. Only 3 chars (36^3 = 46,656 possibilities) of suffix entropy. An attacker can predictively enumerate referral codes to either (a) brute-force the leaderboard for rank-1 rewards, or (b) attribute fake referrals to victims (if a referral-redemption flow is later added).
- **Impact:** Predictable referral codes. Currently low impact (no referral-redemption flow exists), but becomes a P1 the moment redemption is wired up.
- **Fix:** Replace `Math.random().toString(36).slice(2,5)` with `crypto.randomBytes(4).toString("hex").toUpperCase().slice(0,6)` (24 bits of CSPRNG entropy). Import `crypto` from `node:crypto`.

#### Finding A04-5: `/api/me/delete` does not invalidate the user's JWT session
- **Severity:** P2
- **File:** `src/app/api/me/delete/route.ts:84-117`
- **Description:** GDPR self-service account deletion anonymizes the user row, revokes API keys, deletes DB sessions — but the JWT in the user's browser cookie remains valid until it expires. NextAuth's JWT strategy has no server-side revocation list, so the deleted user can continue making authenticated API calls until the JWT TTL elapses.
- **Impact:** A user who deletes their account (e.g. on a shared computer) leaves a working session cookie behind. If an attacker recovers it (shoulder-surfing, browser cache, proxy log), they can act in the name of a "Deleted User" account — which still has the original `userId` and might still have orders/subscriptions/tickets attached.
- **Fix:** After the `user.update()` call, set a `revoked_at` timestamp on the user row (or a separate `RevokedSession` table). In the `jwt` callback in `auth.ts`, check this timestamp and return `{}` (empty token) if the user is revoked — NextAuth will treat the session as logged-out. Alternatively, switch to NextAuth's database-session strategy (sessions stored in the `Session` table, revocable by row delete).

---

### A05: Security Misconfiguration

**Status:** 4 findings (1 P1, 3 P2)

#### Finding A05-1: `typescript.ignoreBuildErrors: true` ships type-unsafe code to production
- **Severity:** P1
- **File:** `next.config.ts:4-6`
- **Description:** The Next.js build is configured to ignore TypeScript errors. This means any TS error (including security-relevant ones — `any` casts on user input, missing null checks on auth results, wrong-typed Prisma queries) silently compiles and ships to production. Type safety is the first line of defense against null-deref and bad-cast vulnerabilities.
- **Impact:** Type errors that should be caught at build time ship to production. Recent git history shows multiple P0/P1 fixes that were caused by type-unsafe code (the `as any` casts on `session!.user` throughout the codebase are a symptom — they exist because the underlying types were broken). With `ignoreBuildErrors: true`, future regressions will not be caught.
- **Fix:** Set `typescript.ignoreBuildErrors: false`. Run `bun run build` locally, fix all surfaced TS errors (the codebase is already mostly clean per the BROAD-FIX-BATCH-1 worklog entry — "0 errors, 3 pre-existing warnings" from `bun run lint`). Commit the fixes. Then re-enable strict build.

#### Finding A05-2: Health endpoints expose internal diagnostics to unauthenticated callers
- **Severity:** P2
- **File:** `src/app/api/health/ready/route.ts:54-76`, `src/app/api/health/live/route.ts:14-21`
- **Description:**
  - `/api/health/live` returns `pid`, `uptime`, `timestamp` to anyone.
  - `/api/health/ready` returns DB error messages (line 30: `error: e.message`), Redis errors, heap-used / heap-total / RSS memory in MB, total request latency.
  DB error messages can leak connection-string structure (`"connect ECONNREFUSED 10.0.0.5:5432"` reveals the private DB IP), Postgres version on some drivers, or schema-mismatch details. Memory figures help attackers time memory-exhaustion DoS attacks.
- **Impact:** Information disclosure. An attacker probing the production URL learns the internal DB topology, error patterns, and memory budget.
- **Fix:** For public liveness probes, return only `{status: "alive"}` — no pid/uptime. For readiness, return only `{status: "ready" | "not_ready"}` — log the detailed `checks` object to the server log, not the response. If k8s needs the detailed response, restrict by IP (allow only the k8s probe IP range).

#### Finding A05-3: `error.tsx` renders `error.message` to the user
- **Severity:** P2
- **File:** `src/app/error.tsx:35-38`
- **Description:** The global error page displays `error.message` in a `<pre>` block. In Next.js, `error.message` for unhandled server-component errors can include stack-trace snippets, file paths, and SQL/Prisma error text in dev mode. In production, Next.js redacts most of this, but custom thrown errors (e.g. `throw new Error(\`Stripe error: ${stripeError?.message}\`)` in `wallet/topup/route.ts:157`) propagate the raw upstream message which may contain sensitive detail (Stripe API version, request IDs, internal parameter names).
- **Impact:** Information leak on unhandled errors. An attacker who triggers errors intentionally (malformed input, race conditions) can harvest upstream API error messages to map integrations.
- **Fix:** Remove the `<pre>` block. Show a generic "Something went wrong. Reference: {error.digest}" message. Log the full `error.message` server-side via `src/lib/logger.ts`. The `digest` field is a Next.js-generated correlation ID safe to show users.

#### Finding A05-4: CORS allows `*` origin for `/api/v1/*` and `/api/docs`
- **Severity:** P2
- **File:** `src/middleware.ts:151-166`
- **Description:** The middleware sets `Access-Control-Allow-Origin: *` for all v1 API routes and the docs route. While the v1 routes use Bearer API keys (not cookies), the wildcard CORS means any malicious website can issue authenticated requests on behalf of a logged-in user who has pasted their API key into the site. Combined with `Access-Control-Allow-Headers: Authorization, Content-Type`, this is a complete CORS-open API surface.
- **Impact:** A malicious SMM-panel-comparison site could trick users into pasting their `nvsk_live_...` API key, then silently issue orders/balance-reads from the browser. The user's browser is the source IP, defeating IP allowlists (the user's home IP is on the allowlist, not the attacker's server).
- **Fix:** Either (a) restrict CORS to known reseller domains (read a Setting `api.cors_allowlist` and reflect the Origin if it matches), or (b) keep `*` but enforce `Access-Control-Allow-Credentials: false` (already implied with `*`) AND require API keys to be passed only via `Authorization` header (already the case — good). Document that API keys must never be entered into third-party websites.

---

### A06: Vulnerable Components

**Status:** 1 finding (1 P0)

#### Finding A06-1: 45 known vulnerabilities including 20 HIGH — Next.js 16.1.1 has 17 CVEs (SSRF, middleware bypass, cache poisoning, DoS)
- **Severity:** P0
- **File:** `package.json:67` (`"next": "^16.1.1"`)
- **Description:** `bun audit` reports 45 vulnerabilities (20 high, 20 moderate, 5 low). The critical ones:

  **Next.js 16.0.0–16.2.4** (17 advisories — direct dependency):
  - **GHSA-c4j6-fc7j-m34r** (HIGH): SSRF via WebSocket upgrades
  - **GHSA-26hh-7cqf-hhc6** (HIGH): Middleware/Proxy bypass via segment-prefetch routes (incomplete fix follow-up)
  - **GHSA-492v-c6pp-mqqv** (HIGH): Middleware/Proxy bypass via dynamic route parameter injection
  - **GHSA-267c-6grr-h53f** (HIGH): Middleware/Proxy bypass in App Router via segment-prefetch routes
  - **GHSA-36qx-fr4f-26g5** (HIGH): Middleware/Proxy bypass in Pages Router using i18n
  - **GHSA-8h8q-6873-q5fj** (HIGH): DoS with Server Components
  - **GHSA-mg66-mrh9-m8jx** (HIGH): DoS via connection exhaustion in Cache Components
  - **GHSA-q4gf-8mx6-v5v3** (HIGH): DoS with Server Components (second variant)
  - **GHSA-h25m-26qc-wcjf** (HIGH): HTTP request deserialization → DoS with insecure RSC
  - **GHSA-ffhc-5mcf-pf4q** (MOD): XSS in App Router with CSP nonces
  - **GHSA-gx5p-jg67-6x7h** (MOD): XSS in beforeInteractive scripts
  - **GHSA-3g8h-86w9-wvmq** (LOW): Cache poisoning of middleware/proxy redirects
  - **GHSA-vfv6-92ff-j949** (LOW): Cache poisoning via RSC cache-busting collisions
  - **GHSA-wfc6-r584-vfw7** (MOD): Cache poisoning in RSC responses
  - **GHSA-h64f-5h5j-jqjh** (MOD): DoS in Image Optimization API
  - **GHSA-9g9p-9gw9-jx7f** (MOD): DoS via Image Optimizer remotePatterns
  - **GHSA-ggv3-7p47-pfv8** (MOD): HTTP request smuggling in rewrites
  - **GHSA-mq59-m269-xvcx** (MOD): Null origin can bypass Server Actions CSRF checks ⚠ (relevant because the middleware's CSRF check at `src/middleware.ts:191` falls back to allowing when Origin is null/missing in some branches)
  - **GHSA-3x4c-7xq6-9pq8** (MOD): Unbounded image disk cache growth
  - **GHSA-h27x-g6w4-24gq** (MOD): Unbounded postponed resume buffering
  - **GHSA-5f7q-jpqc-wp7h** (MOD): Unbounded memory via PPR Resume Endpoint

  **lodash 4.0.0–4.17.22** (transitive via recharts):
  - **GHSA-r5fr-rjxr-66jc** (HIGH): Code injection via `_.template`
  - **GHSA-xxjr-mmjv-4gpg** (MOD): Prototype pollution in `_.unset`/`_.omit`
  - **GHSA-f23m-r3pf-42rh** (MOD): Prototype pollution via array path bypass

  **minimatch <3.1.3**, **picomatch <2.3.2**, **flatted <3.4.0**, **brace-expansion <1.1.13** (transitive via eslint, dev-only) — ReDoS / prototype pollution. Lower risk because they're devDependencies, but still pollute `node_modules` in production if `devDependencies` are installed.

  **postcss <8.5.10**, **cookie <0.7.0**, **ajv <6.14.0**, **uuid <11.1.1**, **js-yaml <=4.1.1**, **@babel/core <=7.29.0** — various moderate/low.
- **Impact:** The Next.js CVEs are the most critical. Middleware bypass CVEs (GHSA-26hh, GHSA-492v, GHSA-267c, GHSA-36qx) can allow attackers to reach protected routes by manipulating URL structure — directly bypassing the CSRF/Origin check and the rate-limit logic in `src/middleware.ts`. The SSRF CVE (GHSA-c4j6) compounds the outbound-webhook SSRF (A10-1). The cache-poisoning CVEs can be used to serve attacker-controlled content to other users. The lodash `_.template` code injection (GHSA-r5fr-rjxr-66jc) is reachable if any chart component feeds user-controlled strings to a lodash template — needs verification but `recharts` is used in the dashboard.
- **Fix:** `bun update next@^16.2.5` (the fix version per the advisory). This single update closes 17 of the 20 HIGH CVEs. Then update recharts to a version that pulls in lodash ≥4.17.23 (or replace recharts with a non-lodash charting lib). Run `bun audit` again and iterate until 0 HIGH vulnerabilities remain. Consider `bun audit --strict` in CI to block future regressions.

---

### A07: Identification and Authentication Failures

**Status:** 5 findings (1 P1, 3 P2, 1 P3)

#### Finding A07-1: JWT sessions are not invalidated on password change or password reset
- **Severity:** P1
- **File:** `src/app/api/me/password/route.ts:46-51` (password change), `src/app/api/auth/reset-password/route.ts:53-56` (password reset)
- **Description:** Neither the password-change endpoint nor the password-reset endpoint revokes existing JWT sessions. NextAuth's JWT strategy has no built-in revocation list — once a JWT is signed, it's valid until expiry (default 30 days). An attacker who stole a session cookie can continue using the account even after the legitimate user changes their password.

  The `events.signOut` callback in `auth.ts:622-627` writes an audit log on logout, but doesn't invalidate the token server-side. The `/api/me/sessions` DELETE endpoint deletes DB `Session` rows, but with JWT strategy those rows aren't the actual session tokens.
- **Impact:** Stolen-session-cookie attacker persists access across password rotation. Defeats the standard "change my password" recovery flow after a suspected compromise.
- **Fix:** Add a `passwordChangedAt: DateTime` column to `User`. In the `jwt` callback in `auth.ts`, compare `token.issuedAt` against `user.passwordChangedAt` — if the token was issued before the password change, return `null` (forces re-login). Same mechanism for account deletion (A04-5) and 2FA enable/disable. Apply the same pattern to `/api/me/delete` and `/api/me/2fa/disable`.

#### Finding A07-2: Password policy requires only 8 characters (no complexity)
- **Severity:** P2
- **File:** `src/lib/validations.ts:11` (`password: z.string().min(8, ...)`)
- **Description:** The registration, password-reset, and password-change schemas all accept any 8+ character string. No requirement for uppercase, lowercase, digit, or special character. No check against the [HaveIBeenPwned](https://haveibeenpwned.com/Passwords) breach corpus. No ban on the top-1000 common passwords (`password`, `12345678`, `qwerty12`, etc.).
- **Impact:** Users choose weak passwords. Combined with the 5-attempt lockout (15-min window), credential-stuffing attacks from breached-password lists remain practical — an attacker needs only 5 attempts per 15 minutes per IP, and IP rotation is trivial via proxies.
- **Fix:** Add a `z.string().min(8).max(1024).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/)` schema (3-of-4 character classes). Optionally integrate HaveIBeenPwned's k-anonymity API (5-char SHA-1 prefix lookup) and reject any password with >0 hits. Bcrypt cost 12 is fine.

#### Finding A07-3: Brute-force lockout is keyed by email only (not email+IP), enabling distributed brute force
- **Severity:** P2
- **File:** `src/lib/auth.ts:24-36, 99-105`
- **Description:** The `trackFailedAttempt` function uses `lockKey = email` (line 100). After 5 failed attempts on a single email, the account is locked for 15 minutes — but the counter is global, not per-IP. An attacker with a 1000-IP botnet can make 5 attempts per IP per 15 minutes = 5000 attempts per 15 minutes per email, but the lockout triggers after the 5th *global* attempt, locking out the legitimate user too. This is a DoS against the user (attacker intentionally locks out victims) AND a weak brute-force defense (the attacker can still try 5 passwords before the lockout triggers, then rotate to a new victim email and try 5 more).
- **Impact:** Two issues:
  1. **Account-lockout DoS:** attacker can lock out any user by submitting 5 wrong passwords for their email.
  2. **Distributed brute force:** if the attacker rotates emails (not IPs), the per-email counter is useless — they get 5 attempts per email, which is enough to test common passwords across many accounts.
- **Fix:** Track two counters: per-IP (5 attempts / 15 min, with exponential backoff) AND per-email (3 attempts / 15 min before captcha, 10 before lockout). Use the Redis-backed `rate-limit.ts` infrastructure. Require CAPTCHA after 3 failed attempts on the same email from the same IP.

#### Finding A07-4: Account lockout message reveals account existence and lockout state
- **Severity:** P2
- **File:** `src/lib/auth.ts:104` (`throw new Error(\`Account temporarily locked. Try again in ${minsLeft} minute(s).\`)`)
- **Description:** When a locked-out account attempts to log in, the error message explicitly says the account is locked and how long until unlock. This confirms to the attacker (a) the email exists in the system, and (b) someone (possibly the attacker themselves in a prior request) has been brute-forcing it.
- **Impact:** Username enumeration + attack-status feedback. An attacker can probe whether an email is registered by attempting 5 wrong passwords and observing the lockout message on the 6th attempt.
- **Fix:** Return the generic `"Invalid credentials"` message for locked accounts too. Track the lockout internally (audit log + admin alert) but don't disclose to the caller.

#### Finding A07-5: `AUTH_TRUST_HOST=1` is set in `.env.example` — trusts the Host header blindly
- **Severity:** P3
- **File:** `.env.example:17`, `src/lib/auth.ts:440`
- **Description:** NextAuth's `trustHost: true` (enabled via `AUTH_TRUST_HOST=1` env or hardcoded in `auth.ts:440`) derives the canonical app URL from the `Host` header on every request. If the Node process is reachable directly (bypassing Caddy/nginx which always overrides Host), an attacker can supply a spoofed `Host: attacker.com` header. NextAuth will issue session cookies and password-reset emails with `https://attacker.com/...` URLs.
- **Impact:** Host-header injection → password-reset link points to attacker domain → account takeover. Mitigated in production because the proxy always overrides `Host`, but if the Node port (3000) is accidentally exposed (firewall misconfig, container bridge, debug port forward), the attack becomes possible.
- **Fix:** Set `NEXTAUTH_URL=https://novsmm.shop` explicitly in production `.env` (already done) and remove `AUTH_TRUST_HOST=1` from `.env.example` to avoid operators copying it blindly. Document that the production deployment must NOT set `AUTH_TRUST_HOST` — the proxy must override `Host`. Verify in `auth.ts` that `process.env.NEXTAUTH_URL` is set at boot and fail-closed if missing in production.

---

### A08: Software and Data Integrity Failures

**Status:** 2 findings (1 P2, 1 P3)

#### Finding A08-1: Webhook signature verification is correct for all 4 providers, but Mercado Pago signature covers only `data.id` (not the full body)
- **Severity:** P2
- **File:** `src/app/api/webhooks/mercadopago/route.ts:62-86`
- **Description:** The Mercado Pago webhook verifies the HMAC-SHA256 signature over the manifest string `${dataId}${ts}` where `dataId` comes from `event.data.id` in the body. This is MP's official signature scheme, BUT it means the signature only covers the payment ID — not the rest of the payload (status, amount, payer email, etc.). The route then fetches the payment from MP's API (`GET /v1/payments/${paymentId}`) to confirm status — this is good defense-in-depth — but the lookup key (`paymentId`) is what was signed, so an attacker who can forge a signature for an arbitrary `data.id` could trigger a credit for a *different* transaction.

  In practice, forging the HMAC requires `MP_WEBHOOK_SECRET`, so this is more of a design observation than an exploitable bug. The Stripe, PayPal, and NowPayments webhooks all verify the full raw body, which is the stronger pattern.
- **Impact:** If `MP_WEBHOOK_SECRET` leaks, an attacker can forge webhooks with arbitrary `data.id` values pointing to legitimate completed payments on other accounts — the MP API lookup would return `status: "approved"` and the route would credit whichever NOVSMM transaction matches that `paymentId` as a `reference`. Since the route matches `where: { reference: paymentId }` (line 137), an attacker would need to pre-create a NOVSMM Transaction with a known MP payment ID as reference — feasible if they control both a victim's NOVSMM account and a separate MP account.
- **Fix:** Document this as an accepted risk (MP's signature scheme is what it is). Defense-in-depth: before crediting, verify that the MP payment's `external_reference` field matches the NOVSMM transaction's `publicId` (set this field when creating the MP preference in `wallet/topup/route.ts`). This binds the MP-side payment to our internal transaction ID.

#### Finding A08-2: Multiple unsafe `JSON.parse` calls on DB-stored JSON without schema validation
- **Severity:** P3
- **File:** `src/lib/auth.ts:144`, `src/app/api/me/2fa/verify/route.ts:32`, `src/app/api/me/2fa/disable/route.ts:31`, `src/app/api/me/route.ts:59,154`, `src/app/api/admin/version/route.ts:21`, `src/app/api/version/route.ts:20,31`, `src/app/api/me/notification-preferences/route.ts:35,58`, `src/app/api/analytics/route.ts:22`
- **Description:** Several routes parse JSON from the `Setting` table (or `metadata` column) with `JSON.parse(...)` and immediately access fields without validating the shape. For example, `auth.ts:144`: `const { secret: encryptedSecret } = JSON.parse(twoFactorSetting.value);` — if a DB corruption or admin-edit produces `{}` or `null`, this throws and crashes the login flow. `me/2fa/disable/route.ts:31` has the same pattern.

  These are *internal* sources (DB, not user input), so injection isn't the issue — but a malformed Setting row can crash production routes with unhelpful errors.
- **Impact:** DoS via DB corruption. An admin who manually edits a Setting row to invalid JSON takes down login / 2FA / analytics for the affected user. Recovery requires DB surgery.
- **Fix:** Wrap each `JSON.parse` in try/catch with a clear error path (some already do — `me/notification-preferences/route.ts:35` is the pattern to copy). For 2FA secrets, use `decryptJSON()` (already returns `null` on failure) instead of `JSON.parse(decrypt(...))`.

---

### A09: Security Logging and Monitoring Failures

**Status:** 2 findings (1 P2, 1 P3)

#### Finding A09-1: `/api/me/password` change logs only the action, not the IP/User-Agent of the requester
- **Severity:** P2
- **File:** `src/app/api/me/password/route.ts:54` (`await audit(userId, "password_change", "user", userId);`)
- **Description:** The audit call passes no `metadata`. The generic `audit()` helper in `api-utils.ts:151-190` does capture `ip` and `userAgent` from headers — good — but the audit row for password change has no metadata distinguishing it from any other `password_change` event. If an attacker (with a stolen session) changes the victim's password, the audit entry looks identical to a legitimate password change. There's no `previousPasswordHash` (for breach detection), no `newPasswordStrength`, no `reauthMethod` (did they re-enter the current password? Yes, per the schema — but the audit doesn't record that the re-auth succeeded, only that the change happened).

  Same issue for `password_reset` (`reset-password/route.ts:62`), `enable_2fa`, `disable_2fa`, `impersonate_attempt`, `impersonate`, `approve_withdrawal`, `reject_withdrawal`, `refund`, `bulk_*`, `create api_key`, `revoke api_key`.

  Most of these ARE logged (good coverage), but the metadata is sparse.
- **Impact:** Forensic value is limited. After a compromise, the investigator can see *that* a password change happened, but not whether it was triggered by the account owner's typical IP, whether it followed a successful re-auth, or whether the new password is stronger (indicating a defensive change vs. a takeover).
- **Fix:** Add metadata to security-sensitive audit calls: `{ reauth: "password", previousIp: lastLoginIp, strength: "weak|medium|strong" }` for password change; `{ provider, tokenId, source }` for OAuth; `{ reason }` for refunds. Consider a separate `SecurityEvent` table for high-sensitivity events with structured fields (currently everything goes into the generic `AuditLog`).

#### Finding A09-2: No alerting on suspicious activity patterns
- **Severity:** P3
- **File:** (no alerting layer exists)
- **Description:** The audit log records events but nothing automatically alerts on patterns like:
  - Multiple failed logins from a new geo
  - Password change followed by API key creation within 5 minutes
  - Withdrawal request from a user who just changed their password
  - Admin impersonation lasting >1 hour
  - Refund of >$500 to a user with no prior orders
  - Multiple 2FA disable requests across different accounts from the same IP

  `monitoring/alerts.yml` exists but only alerts on infrastructure (CPU, memory, backup failure, queue depth) — not on security patterns.
- **Impact:** A slow-compromise attack (e.g. testing the waters with small refunds, then escalating) won't trigger any alarm until the financial reports diverge.
- **Fix:** Add Alertmanager rules for the patterns above. Use the Prometheus counters already in `src/lib/metrics.ts` (or add new ones: `novsmm_security_events_total{type=...}`). For high-severity events (mass refund, admin password change, 2FA disable on admin account), send an immediate Slack/Telegram alert via a webhook — the `outbound-webhook.ts` dispatcher is a ready-made pattern.

---

### A10: Server-Side Request Forgery (SSRF)

**Status:** 2 findings (1 P1, 1 P2)

#### Finding A10-1: Outbound-webhook SSRF guard is incomplete — no DNS rebinding protection, missing cloud-metadata IP
- **Severity:** P1
- **File:** `src/app/api/admin/webhooks/outbound/route.ts:165-192` (the `isPrivateOrLoopback` check), `src/lib/outbound-webhook.ts:110-131` (the fetch)
- **Description:** The SSRF guard `isPrivateOrLoopback()` runs **only at registration time** (when the user POSTs the webhook URL). At delivery time (`outbound-webhook.ts:121`), the URL is fetched without re-validation. This is vulnerable to:

  1. **DNS rebinding:** User registers `https://attacker.com/webhook` (passes the check — `attacker.com` resolves to a public IP at registration time). At delivery time, the attacker changes `attacker.com` to resolve to `169.254.169.254` (AWS metadata) or `127.0.0.1`. The fetch goes to the internal IP.
  2. **Cloud metadata endpoint not blocked:** `169.254.169.254` (AWS/Azure/GCP metadata) is **not** in the blocklist. An attacker who rebinds to this IP can steal the EC2 instance IAM credentials (which often have S3/RDS access).
  3. **IPv6 link-local not blocked:** `fe80::1` and other link-local IPv6 addresses are not blocked.
  4. **IPv4-mapped IPv6 not blocked:** `::ffff:127.0.0.1` bypasses the IPv4 regex check.
  5. **Redirect chain not blocked:** `fetch()` follows 3xx redirects by default. User registers `https://attacker.com/redirect?to=http://169.254.169.254/...` — the SSRF check sees `attacker.com` (public), but the fetch follows the redirect to the metadata IP.
  6. **`0.0.0.0` not blocked:** On Linux, `0.0.0.0` routes to localhost.

- **Impact:** SSRF to internal services. Steal AWS IAM credentials → lateral movement to S3 buckets, RDS instances, etc. Probe internal services (Redis on 6379, Postgres on 5432) via timing/error analysis. The 5-second timeout limits per-request data exfiltration but doesn't prevent repeated probes.
- **Fix:**
  1. **Re-resolve DNS at fetch time** and verify the resolved IP is not in a blocked range. Use `dns.lookup()` with `all: true` to get all A/AAAA records.
  2. **Extend the blocklist** to include: `169.254.0.0/16` (link-local incl. metadata), `0.0.0.0/8`, `100.64.0.0/10` (CGNAT), `fc00::/7` (IPv6 unique-local), `fe80::/10` (IPv6 link-local), `::1` (IPv6 loopback), `::ffff:0:0/96` (IPv4-mapped IPv6 — decode and re-check).
  3. **Disable redirects** at fetch time (`redirect: "manual"`) and reject any 3xx response. If redirects are required, validate each Location header through the same SSRF check.
  4. **Pin the IP** — resolve once, fetch by IP, set `Host` header to the original domain. This is the strongest fix.

#### Finding A10-2: Webhook delivery URL is fetched with no max-response-size, enabling response-bombing
- **Severity:** P2
- **File:** `src/lib/outbound-webhook.ts:121-135`
- **Description:** The fetch has a 5-second timeout (good) but no cap on response body size. An attacker can register a webhook URL that returns a 10GB response. Node's `fetch` will buffer the entire response into memory before the route can decide what to do with it (the route only reads `res.status` and `res.statusText`, but `fetch` still downloads the body unless explicitly cancelled).
- **Impact:** Memory exhaustion DoS. A single attacker-registered webhook URL with a large response can OOM the Node process. The 5s timeout helps, but at gigabit bandwidth, 5s = ~600MB.
- **Fix:** Read only the status (don't await the body). Use `res.body?.cancel()` to abort the body stream after checking `res.status`. Or set `Content-Length` validation: if the response headers indicate >1MB, abort.

---

## Top 10 Priorities (ordered by severity)

| # | Finding | Severity | Effort |
|---|---|---|---|
| 1 | **A04-1**: Remove wallet top-up sandbox free-credit fallback | P0 | 1h |
| 2 | **A06-1**: `bun update next@^16.2.5` + close all HIGH CVEs | P0 | 2h |
| 3 | **A10-1**: Outbound-webhook SSRF — re-resolve DNS at fetch time, extend blocklist to include `169.254.169.254`, disable redirects | P1 | 4h |
| 4 | **A07-1**: Add `passwordChangedAt` column + JWT invalidation on password change/reset/account deletion | P1 | 4h |
| 5 | **A04-2**: Remove `balance` from `updateUserSchema` — force all balance changes through `/api/admin/users/adjust-balance` | P1 | 1h |
| 6 | **A04-3**: Pick one 2FA flow (recommend extending Flow A to accept backup codes), delete the dead `verify-2fa` route | P1 | 3h |
| 7 | **A02-1**: Stop mirroring OAuth secrets to `process.env` — read from DB only | P1 | 1h |
| 8 | **A05-1**: Set `typescript.ignoreBuildErrors: false`, fix surfaced errors | P1 | 4h |
| 9 | **A01-1**: Make `/api/metrics` auth mandatory or IP-restricted | P1 | 1h |
| 10 | **A02-3**: Hash password-reset tokens at rest (SHA-256 + lookupHash pattern) | P2 | 2h |

---

## Recommendations

### Immediate fixes (before launch — blocks production)

1. **Remove the wallet sandbox fallback** (A04-1). This is the single most exploitable issue — any user can currently get free wallet credit.
2. **Update Next.js** to ≥16.2.5 (A06-1). The middleware-bypass CVEs directly undermine the CSRF and rate-limit protections in `src/middleware.ts`.
3. **Harden outbound-webhook SSRF** (A10-1) — block `169.254.169.254`, re-resolve DNS, disable redirects.
4. **Fix JWT session invalidation** (A07-1) — add `passwordChangedAt` and enforce in the `jwt` callback.
5. **Make `/api/metrics` mandatory-auth** (A01-1) — leak of internal architecture is unacceptable in production.
6. **Force balance changes through the audited endpoint** (A04-2) — close the silent-financial-manipulation hole.

### Short-term improvements (within 2 weeks)

7. Extend the 2FA flow to accept backup codes; delete the dead `verify-2fa` route (A04-3).
8. Stop mutating `process.env` with OAuth secrets (A02-1).
9. Hash password-reset tokens at rest (A02-3).
10. Set `typescript.ignoreBuildErrors: false` and fix the resulting errors (A05-1).
11. Strengthen password policy to require 3-of-4 character classes (A07-2).
12. Add per-IP lockout counters alongside the per-email lockout (A07-3).
13. Block `0.0.0.0`, `169.254.x.x`, IPv6 link-local, IPv4-mapped IPv6 in the outbound-webhook SSRF check (A10-1).
14. Remove `error.message` from the user-facing error page (A05-3).

### Long-term hardening (within 1 month)

15. Add security-event alerting (A09-2) — Alertmanager rules for suspicious patterns (rapid password change + API key creation, refund spikes, etc.).
16. Enrich audit-log metadata for security-sensitive events (A09-1).
17. Migrate to NextAuth v5 (Auth.js) which has better session-revocation support and is the actively-maintained line.
18. Consider replacing `recharts` (which transitively pulls in vulnerable `lodash`) with a lighter charting library.
19. Add a runtime check that `NEXTAUTH_SECRET` is set (≥32 chars) and `LICENSE_ENCRYPTION_KEY` is set (≥32 chars hex) at boot, fail-closed otherwise.
20. Add SRI (Subresource Integrity) hashes to any third-party `<script>` tags (currently none, but if Stripe.js / PayPal SDK are added per BROAD-FIX-BATCH-1's CSP changes, SRI is required).
21. Adopt a CSP with nonces instead of `'unsafe-inline'` for `script-src` (the current CSP allows any inline script — a stored-XSS in any NOVSMM input field would execute).
22. Run `bun audit --strict` in CI and block merges that introduce new HIGH vulnerabilities.

---

## Areas of Strong Security Posture (for balance)

The following were verified to be solid — no findings:

- **Race-safe balance operations**: orders, withdrawals, mass orders, child-panel purchases, and admin balance adjustments all use conditional `updateMany WHERE balance >= amount` inside `$transaction` — PostgreSQL MVCC-safe. No double-spend / double-credit found.
- **Webhook signature verification**: Stripe (HMAC over raw body), PayPal (verify-webhook-signature API), NowPayments (HMAC-SHA256 over raw body), Mercado Pago (HMAC over `data.id` + `ts`). All fail-closed when secret is missing. All log rejected events to `WebhookLog`.
- **Payment credentials at rest**: AES-256-GCM with random 16-byte IV + auth tag, encrypted format `iv:authTag:encrypted` (base64). `PaymentMethod.config` is encrypted before storage; the public list endpoint omits `config` entirely; the admin list endpoint masks credentials via `maskValue()`.
- **API key storage**: bcrypt hash (cost 12) + SHA-256 `lookupHash` for O(1) indexed lookup. Plaintext shown only once at creation.
- **Cookie security**: `httpOnly: true`, `sameSite: "lax"`, `secure: true` in production, `__Secure-` prefix on the cookie name in production.
- **CSRF protection**: middleware verifies `Origin` against `NEXTAUTH_URL` host for state-changing requests; Bearer-authenticated API calls exempted (safe because browsers can't forge Authorization headers without CORS preflight); webhooks exempted (signature-verified).
- **Rate limiting**: per-route limits in middleware (auth 20/15min, register 10/hr, forgot-password 5/hr, wallet 10/min, orders 20/min, admin 120/min, general 300/min) + per-API-key limits in `api-key-auth.ts` (60/min).
- **Sanitization**: `sanitizeText`, `sanitizeMessage`, `escapeHtml`, `sanitizeEmail`, `sanitizeUrl`, `sanitizeFilename` are applied to user inputs (ticket messages, names, emails, uploaded filenames).
- **File upload safety**: stored outside `public/`, served via auth-checked route, ownership verified (only owner or admin), filename sanitized against path traversal, MIME-type allowlist, 5MB size cap.
- **No raw SQL**: only parameterized `$queryRaw\`SELECT 1\`` for health checks.
- **No command execution**: zero `child_process` usage.
- **All admin routes verified** to call `requireAdmin()` — `grep -L` confirmed no admin route is missing the guard.
- **All v1 API routes verified** to call `requireApiKey(req, "<permission>")` — 6 routes checked.
- **IDOR protections**: `[id]` routes for child-panels, subscriptions, uploads all use `findFirst({where: {id, userId}})` or post-fetch ownership check — single 404 returned for "not found" and "not yours" (no ID enumeration).
- **Audit log coverage**: `audit()` helper captures IP + User-Agent on every call. 30+ routes write audit entries for create/update/delete/refund/login/impersonate actions.
- **`.env.example`**: no real secrets — all values are placeholders (`replace-with-openssl-rand-hex-32`).
