# Cloudflare Cache Configuration for NOVSMM

## Problem
Cloudflare by default does NOT cache HTML pages (only static assets like CSS/JS/images).
This means every request to `novsmm.shop/` goes to the origin (WSL2), adding ~250ms TTFB.

## Solution: Page Rules to cache HTML

### Step 1: Login to Cloudflare
1. Go to https://dash.cloudflare.com
2. Select your domain `novsmm.shop`
3. Go to **Rules → Page Rules** (or **Rules → Cache Rules** in new dashboard)

### Step 2: Create a Page Rule for HTML caching
- **URL pattern**: `novsmm.shop/*`
- **Setting**:
  - Cache Level: `Cache Everything`
  - Edge Cache TTL: `60 seconds`
  - Browser Cache TTL: `60 seconds`

### Step 3: Bypass cache for API routes (CRITICAL)
- **URL pattern**: `novsmm.shop/api/*`
- **Setting**:
  - Cache Level: `Bypass`

### Step 4: Bypass cache for auth routes (CRITICAL)
- **URL pattern**: `novsmm.shop/sign-in*` and `novsmm.shop/sign-up*`
- **Setting**:
  - Cache Level: `Bypass`

### Alternative: Cache Rules (new Cloudflare dashboard)
If using the new Cache Rules interface:

1. **Rule 1: Cache HTML pages**
   - When: `Hostname equals novsmm.shop AND NOT Path starts with /api/ AND NOT Path starts with /sign`
   - Then: `Edge TTL = 60s, Browser TTL = 60s, Cache = Eligible for cache`

2. **Rule 2: Bypass API**
   - When: `Path starts with /api/`
   - Then: `Bypass cache`

## Expected Result
- **Before**: TTFB ~250ms (origin round-trip)
- **After**: TTFB ~50ms (Cloudflare cache HIT)
- **LCP improvement**: ~200ms faster

## Verification
After configuring, run:
```bash
curl -I https://novsmm.shop
```
Look for `cf-cache-status: HIT` (cached) vs `cf-cache-status: MISS` (not cached).
Multiple requests should show HIT after the first MISS.

## Headers already set in code
The middleware (`src/middleware.ts`) now sets:
```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```
This tells Cloudflare "you can cache this for 60s, and serve stale for up to 300s while revalidating".

But Cloudflare needs the Page Rule "Cache Everything" to actually cache HTML.
Without the Page Rule, Cloudflare respects the header but only caches static assets.

## Notes
- 60s TTL is short enough to show fresh content after deploys
- stale-while-revalidate ensures users never wait for a cold cache
- API routes must NEVER be cached (would break auth, real-time data)
- Sign-in/sign-up pages must not be cached (CSRF tokens, session)
