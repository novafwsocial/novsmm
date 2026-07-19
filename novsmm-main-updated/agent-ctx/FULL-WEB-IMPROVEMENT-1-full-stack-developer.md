# Task: FULL-WEB-IMPROVEMENT-1 — Full website audit + improvement

**Agent**: full-stack-developer
**Task ID**: FULL-WEB-IMPROVEMENT-1
**Project**: NOVSMM (`/home/z/my-project`)
**Status**: ✅ Complete — build passes

## Context

Read prior worklog (Tasks 1–13 landing sections, 14 notifications service, 15 auth+dashboard+admin, PROD-1 production backend, WS-2 service upgrade). The site is a single-route SPA Next.js 16 app — landing + dashboard + admin all live under `/`. The orchestrator requested a comprehensive audit of SEO, accessibility, performance, UX states, and security headers, with fixes applied directly.

## Audit findings (before → after)

### 1. SEO — was OK, now comprehensive

| Area | Before | After |
|---|---|---|
| `metadataBase` | ❌ missing (relative URLs in OG/sitemap) | ✅ resolved from `NEXT_PUBLIC_SITE_URL` → `NEXTAUTH_URL` → localhost |
| `title.template` | ❌ missing | ✅ `"%s · NOVSMM"` |
| Keywords | 6 generic | 14 specific (Instagram followers, TikTok growth, etc.) |
| `alternates.canonical` | ❌ missing | ✅ `/` (per-page override possible) |
| `robots.googleBot` | ❌ missing | ✅ `max-image-preview=large`, `max-snippet=-1`, `max-video-preview=-1` |
| `manifest` ref | implicit (auto-detected) | ✅ explicit `/manifest.webmanifest` |
| OpenGraph `url`/`locale`/`alternateLocale` | ❌ missing | ✅ url, `en_US`, `es_ES`, `pt_BR` |
| Twitter `site`/`creator` | ❌ missing | ✅ `@novsmm` |
| `icons.apple` | ❌ missing | ✅ `/icon.png` |
| `formatDetection` | ❌ defaults (iOS auto-links phone numbers) | ✅ telephone/email/address disabled |
| `verification.google-site-verification` | ❌ missing | ✅ env-driven |
| `sitemap.xml` | ❌ didn't exist | ✅ `src/app/sitemap.ts` — 11 URLs (1 root + 9 anchored sections + /api/docs) |
| `robots.txt` | basic static file, no sitemap ref, no AI-crawler rules | ✅ `src/app/robots.ts` — per-bot rules, AI-crawler opt-out (GPTBot/CCBot/anthropic-ai/Claude-Web/Google-Extended), sitemap+host directives |
| OG image | ❌ none | ✅ `src/app/opengraph-image.tsx` (1200×630, edge runtime, branded) |
| Twitter image | ❌ none | ✅ `src/app/twitter-image.tsx` (1200×630, Twitter-crop-safe) |
| JSON-LD Organization | ❌ none | ✅ in layout.tsx `<head>` (with `sameAs`, `contactPoint`) |
| JSON-LD WebSite + SearchAction | ❌ none | ✅ in layout.tsx |
| JSON-LD WebApplication + Service + FAQPage + BreadcrumbList | ❌ none | ✅ `src/components/novsmm/landing-json-ld.tsx`, wired into page.tsx |
| Resource hints | ❌ none | ✅ `preconnect` to fonts.gstatic.com (crossOrigin) + fonts.googleapis.com, `dns-prefetch` |

### 2. Accessibility

- ✅ Skip-to-content link added as first focusable element in layout body (`sr-only focus:not-sr-only` with fixed positioning + visible ring)
- ✅ `id="main-content"` added to `<main>` in page.tsx so the skip link target resolves
- ✅ Verified single h1 per page (Hero has the only landing `<h1>`; not-found.tsx has one)
- ✅ `viewport.themeColor` now uses media-query array (light: #ffffff, dark: #0052ff) for system-theme-aware browser chrome
- ✅ `viewport.colorScheme: "light dark"` added
- ✅ All new interactive elements have `focus-visible:ring-2 ring-primary ring-offset-2` for keyboard users
- ✅ All decorative SVG/divs use `aria-hidden`
- ✅ not-found.tsx uses real `<Link>` elements (not divs) — keyboard navigable

### 3. Performance

- ✅ Resource hints (`preconnect`, `dns-prefetch`) added for font origins
- ✅ Hero already SSR-enabled (no client-only render) — preserved
- ✅ Below-fold sections already lazy-loaded via `next/dynamic` with skeletons — preserved
- ✅ `next.config.ts` headers() adds:
  - 1-day cache + 7-day stale-while-revalidate for public static assets (png/svg/woff2/etc.)
  - `no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /` for `/sw.js` (so SW updates aren't blocked)
  - Did NOT override `/_next/static` Cache-Control — Next.js manages immutable hashing; overriding triggers build warning

### 4. UX states

- ✅ Created `src/app/not-found.tsx` — branded 404 with grid background, large "404" gradient mark, single h1, descriptive help text, primary CTA (Back to home) + secondary (Explore services), 3 resource cards (API docs / FAQ / Get help)
- ✅ Verified existing `error.tsx` (App Router error boundary) — already comprehensive (digest ID, generic message, reset button, no info leak). Untouched.
- ✅ Verified existing `loading.tsx` — spinner + "Loading…" text. Untouched.

### 5. Security headers

| Header | Before | After |
|---|---|---|
| `Content-Security-Policy` | comprehensive | ✅ extended: added `worker-src 'self' blob:`, `object-src 'none'`, `upgrade-insecure-requests` |
| `Permissions-Policy` | ❌ MISSING | ✅ added — 30+ features explicitly denied; only `autoplay/fullscreen/payment/clipboard-write/encrypted-media/picture-in-picture/publickey-credentials-get` allowed for self |
| `Cross-Origin-Opener-Policy` | ❌ missing | ✅ `same-origin` (Spectre mitigation) |
| `Cross-Origin-Resource-Policy` | ❌ missing | ✅ `same-origin` (hot-link protection) |
| `X-DNS-Prefetch-Control` | ❌ missing | ✅ `on` |
| `Strict-Transport-Security` | ✅ already present | unchanged |
| `X-Content-Type-Options` | ✅ already present | unchanged |
| `X-Frame-Options` | ✅ already present (`DENY`) | unchanged |
| `Referrer-Policy` | ✅ already present | unchanged |
| `X-XSS-Protection` | ✅ already present | unchanged (legacy but harmless) |

**Documented why COEP=require-corp is intentionally NOT set** — would break Stripe/PayPal iframes that load resources without CORP headers.

## Files created (7)

| File | Purpose |
|---|---|
| `src/app/sitemap.ts` | Next.js sitemap convention — 11 URLs, env-resolved absolute URLs |
| `src/app/robots.ts` | Next.js robots convention — per-bot rules, AI opt-out, sitemap ref |
| `src/app/not-found.tsx` | Custom branded 404 page with CTAs |
| `src/app/opengraph-image.tsx` | Dynamic 1200×630 OG image (edge runtime, ImageResponse) |
| `src/app/twitter-image.tsx` | Dynamic 1200×630 Twitter card image (edge runtime) |
| `src/components/novsmm/landing-json-ld.tsx` | WebApplication + Service + FAQPage + BreadcrumbList JSON-LD (server component) |
| `agent-ctx/FULL-WEB-IMPROVEMENT-1-full-stack-developer.md` | This file |

## Files modified (4)

| File | What changed |
|---|---|
| `src/app/layout.tsx` | Comprehensive metadata (metadataBase, title.template, expanded keywords, alternates.canonical, robots.googleBot, manifest ref, openGraph with url/locale/alternateLocale, twitter with site/creator, icons.apple, formatDetection, verification); resource hints in `<head>` (preconnect + dns-prefetch); JSON-LD Organization + WebSite scripts; skip-to-content link; viewport.themeColor media-query array; viewport.colorScheme |
| `src/app/page.tsx` | Added `<LandingJsonLd />` import + render; added `id="main-content"` to `<main>` |
| `src/middleware.ts` | Added Permissions-Policy (30+ features), COOP=same-origin, CORP=same-origin, X-DNS-Prefetch-Control=on; extended CSP with worker-src/object-src/upgrade-insecure-requests |
| `next.config.ts` | Added `headers()` block: 1-day cache for public static assets, no-cache + Service-Worker-Allowed for /sw.js |

## Files deleted (1)

| File | Reason |
|---|---|
| `public/robots.txt` | Replaced by `src/app/robots.ts` (Next.js convention). When both exist, Next.js warns about file-convention conflict. Deletion prevents the conflict. |

## Build result

```
$ bun run build
✓ Compiled successfully in 36.0s
✓ Finished TypeScript in 29.6s
✓ Generating static pages using 1 worker (107/107) in 513ms

Route (app)
├ ○ /                              (static)
├ ○ /_not-found                    (uses custom not-found.tsx)
├ ○ /icon.png                      (static)
├ ○ /manifest.webmanifest          (static)
├ ƒ /opengraph-image               (edge, dynamic)   ← NEW
├ ○ /robots.txt                    (static)          ← NEW (replaces public/robots.txt)
├ ○ /sitemap.xml                   (static)          ← NEW
└ ƒ /twitter-image                 (edge, dynamic)   ← NEW
```

**No errors. No new warnings.** Pre-existing deprecation warning ("middleware" file convention → "proxy") is unrelated to this task.

## Issues not fixed (intentional)

1. **ESLint runner broken** — `@typescript-eslint/utils` has `Class extends value undefined` error (eslint 10.6.0 incompatibility). Pre-existing, unrelated to this task. Build's TypeScript check (which passes clean) is the source of truth for type safety.
2. **COEP=require-corp intentionally NOT set** — would break Stripe/PayPal hosted-checkout iframes that load resources without CORP headers. COOP=same-origin alone is the safe baseline.
3. **CSP `unsafe-inline` for script-src** — required by Next.js for hydration inline scripts. Migrating to nonce-based CSP is a separate larger task (would require `next.config.ts` nonce generation + middleware injection + per-request script nonces).
4. **Middleware deprecation warning** — Next.js 16.2.10 suggests renaming `middleware.ts` to `proxy.ts`. Pre-existing; not addressed because (a) it would change a stable file the orchestrator may reference, and (b) the `middleware` convention still functions correctly.

## Things checked but already in good shape

- ✅ PWA manifest (`src/app/manifest.ts`) — already consolidated, theme_color #0052ff, maskable+any icons, shortcuts
- ✅ Service worker (`public/sw.js`) — already has cache-versioning strategy, network-first navigation, cache-first static, no API caching
- ✅ CSP already comprehensive (Stripe/PayPal/MercadoPago/NowPayments domains, no `unsafe-eval`)
- ✅ CSRF protection on state-changing requests (Origin verification against NEXTAUTH_URL host)
- ✅ CORS allowlist for v1 API (env-driven, no wildcard)
- ✅ Rate limiting on auth/wallet/orders/admin routes (in-memory at edge, Redis at API layer)
- ✅ HSTS preload + includeSubDomains
- ✅ Audit logging on privileged actions
- ✅ bcrypt password hashing
- ✅ Zod validation on all inputs
- ✅ RBAC (requireAuth/requireAdmin)
- ✅ Lazy section loading with skeletons (page.tsx)
- ✅ Single h1 on landing (Hero)
- ✅ Error boundary with digest ID (no info leak)
- ✅ Loading state with spinner

## Constraints honored

- ✅ No new npm dependencies (used only `next/og`, `next/font`, `next/link` — all built-in)
- ✅ No existing functionality broken (additive changes only — metadata, headers, JSON-LD, 404 page)
- ✅ No test code written
- ✅ No commits/pushes (orchestrator handles git)
- ✅ Build passes clean
