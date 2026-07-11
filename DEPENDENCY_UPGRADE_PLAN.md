# NOVSMM — Dependency Upgrade Plan

## Current State (as of 2026-07-11)

`bun audit` reports 21 vulnerabilities (11 high, 8 moderate, 2 low).
None are directly exploitable in the current application flow, but they
represent technical debt and potential future risk.

## Vulnerability Breakdown

### 1. `cookie` < 0.7.0 (LOW — @auth/core, next-auth)
- **Issue:** Cookie name/path/domain accepts out-of-bounds characters
- **Risk:** Low — NOVSMM sets cookies via NextAuth which uses safe names
- **Fix:** Upgrade `next-auth` to v5 (beta) which uses `@auth/core` >= 0.37
- **Effort:** HIGH — NextAuth v5 is a major rewrite (different API, new
  route handlers, different session strategy). Requires testing all auth
  flows (login, register, OAuth, impersonation, 2FA, password reset).
- **Recommendation:** Schedule for a dedicated sprint. Not urgent.

### 2. `minimatch` ReDoS (HIGH — eslint dev dependency)
- **Issue:** Catastrophic backtracking in glob pattern matching
- **Risk:** Dev-only — minimatch is used by ESLint, not in production
- **Fix:** `bun update eslint` or pin `minimatch` >= 9.0.4
- **Effort:** LOW — dev dependency only, no production impact
- **Recommendation:** Run `bun update` in the next dev session.

### 3. `picomatch` ReDoS (HIGH/MODERATE — eslint dev dependency)
- **Issue:** ReDoS via extglob quantifiers + method injection
- **Risk:** Dev-only — used by typescript-eslint, not in production
- **Fix:** Update `eslint-config-next` and `@typescript-eslint/*` packages
- **Effort:** LOW — dev dependency only
- **Recommendation:** Run `bun update` in the next dev session.

### 4. `flatted` prototype pollution (HIGH — eslint dev dependency)
- **Issue:** Unbounded recursion DoS + prototype pollution in parse()
- **Risk:** Dev-only — used by ESLint file-entry-cache
- **Fix:** Update `eslint` to latest which uses `flatted` >= 3.4.0
- **Effort:** LOW — dev dependency only
- **Recommendation:** Run `bun update` in the next dev session.

### 5. `next` / `postcss` CSS stringify XSS (MODERATE — build time)
- **Issue:** XSS in CSS stringify (build-time only, not runtime)
- **Risk:** Low — no user-controlled CSS is processed at build time
- **Fix:** Already on Next.js 16.2.10 (latest 16.x). PostCSS is a transitive dep.
- **Effort:** N/A — already on latest. Wait for upstream patch.
- **Recommendation:** Monitor for Next.js 16.3+ release.

### 6. `uuid` buffer bounds check (MODERATE — next-auth)
- **Issue:** Missing bounds check in buffer parsing
- **Risk:** Low — UUIDs in NOVSMM are generated server-side, not from user input
- **Fix:** Upgrade `next-auth` to v5 (which uses native crypto.randomUUID)
- **Effort:** HIGH — same as #1, requires NextAuth v5 migration
- **Recommendation:** Bundle with the NextAuth v5 migration sprint.

## Action Plan

### Immediate (next dev session — 30 min)
```bash
bun update  # Updates all deps to latest compatible versions
bun audit   # Verify dev-only vulns are resolved
```
This should fix: minimatch, picomatch, flatted (all dev dependencies).

### Short-term (1-2 weeks)
- Monitor for Next.js 16.3+ release (postcss fix)
- Pin any remaining dev dependencies that `bun update` doesn't resolve

### Medium-term (1 sprint — 3-5 days)
- **NextAuth v5 migration** — resolves cookie + uuid vulnerabilities
- This is the largest effort item. Requires:
  1. Install `next-auth@beta` (v5)
  2. Rewrite `src/lib/auth.ts` to v5 API
  3. Rewrite `src/app/api/auth/[...nextauth]/route.ts`
  4. Test all flows: credentials login, OAuth (Google/Facebook/GitHub/Twitter),
     2FA, impersonation, password reset, session invalidation
  5. Update `src/lib/api-utils.ts` session helpers
  6. Test admin panel access + role checks
  7. Test API key auth (unaffected but verify)

### Not Actionable
- `next` / `postcss` — waiting for upstream patch
- Any vulnerabilities in dev-only dependencies that `bun update` doesn't fix

## Verification

After any dependency update:
```bash
bun run build   # Must pass (108+ pages)
bun audit       # Verify vulnerability count decreased
bun run dev     # Manual smoke test of all flows
```
