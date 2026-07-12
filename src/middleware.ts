import { NextRequest, NextResponse } from "next/server";

/**
 * NOVSMM Edge Middleware — rate limiting + security headers.
 *
 * RATE LIMITING NOTE: The middleware runs on the Edge Runtime, which cannot
 * use the `ioredis` package (Node.js APIs only). The middleware uses an
 * in-memory rate limiter as a first line of defense. The Redis-backed rate
 * limiter (src/lib/rate-limit.ts) is used by API routes and the auth system
 * (which run on the Node.js runtime) for precise, cross-instance limiting.
 *
 * In production with multiple instances, each instance's middleware has its
 * own in-memory limiter — this is acceptable because the per-instance limit
 * is still enforced. The real cross-instance rate limiting happens at the
 * API route level (via Redis) and at the gateway level (via Nginx in Phase 8).
 */

// ── In-memory rate limiter (Edge Runtime compatible) ──
type RateBucket = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateBucket>();

let lastCleanup = Date.now();
function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of rateLimitMap) {
    if (bucket.resetAt < now) rateLimitMap.delete(key);
  }
}

function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpired();
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

// ── Route-specific rate limits ──
const RATE_LIMITS: { pattern: RegExp; max: number; windowMs: number }[] = [
  // Auth credential login attempts: 20 per 15 min per IP (brute-force protection)
  // Only applies to the actual credentials callback, not session/csrf/providers checks
  { pattern: /\/api\/auth\/callback\/credentials/, max: 20, windowMs: 15 * 60 * 1000 },
  // Auth register: 10 per hour
  { pattern: /\/api\/auth\/register/, max: 10, windowMs: 60 * 60 * 1000 },
  // Auth password reset: 5 per hour
  { pattern: /\/api\/auth\/forgot-password/, max: 5, windowMs: 60 * 60 * 1000 },
  // SECURITY FIX (S-C-005): License validation is a PUBLIC endpoint (no auth)
  // that runs bcrypt.compare (intentionally slow, ~100ms at cost 12) on legacy
  // licenses when the lookupHash doesn't match. Without a tight rate limit, a
  // botnet could saturate the event loop with thousands of invalid-key requests,
  // each triggering up to 3 bcrypt compares. 10/min/IP is generous for legit
  // use (a client panel validates once on startup) but stops brute-force/DoS.
  { pattern: /\/api\/public\/validate-license/, max: 10, windowMs: 60 * 1000 },
  // Wallet topup/withdraw: 10 per min
  { pattern: /\/api\/wallet\/(topup|withdraw)/, max: 10, windowMs: 60 * 1000 },
  // Orders: 20 per min
  { pattern: /\/api\/orders/, max: 20, windowMs: 60 * 1000 },
  // Admin: 120 per min
  { pattern: /\/api\/admin\//, max: 120, windowMs: 60 * 1000 },
  // Tickets: 20 per min
  { pattern: /\/api\/tickets/, max: 20, windowMs: 60 * 1000 },
  // General API (includes auth session/csrf/providers): 300 per min — generous for normal app usage
  { pattern: /\/api\//, max: 300, windowMs: 60 * 1000 },
];

// ── Security headers ──
// SECURITY FIX (S-H-002): addSecurityHeaders now accepts an optional `nonce`
// parameter. When provided (for page routes, not API), the CSP uses
// `'nonce-${nonce}'` instead of `'unsafe-inline'`, and `'unsafe-eval'` is
// removed in production. This closes the XSS vector that `'unsafe-inline'`
// leaves open. Next.js 16 auto-applies the `x-nonce` request header to its
// own injected inline scripts (RSC payload, streaming-SSR, bootstrap).
function addSecurityHeaders(res: NextResponse, nonce?: string) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  // FULL-WEB-IMPROVEMENT-1: Permissions-Policy — restricts browser features
  // the site does NOT use. Anything not explicitly allowed here is denied
  // to both first-party and third-party (iframe) contexts. We allow only
  // the minimal feature set required for the app to function:
  //   - clipboard-write: copy-to-clipboard buttons (dashboard orders, API keys)
  //   - autoplay: video testimonials in the hero (silent/muted, optional)
  //   - fullscreen: dashboard charts can go fullscreen
  //   - payment: Stripe/PayPal/MercadoPago hosted checkout (Web Payments API)
  // Everything else (camera, mic, geolocation, USB, Bluetooth, etc.) is
  // explicitly disabled — so a compromised third-party script cannot
  // request them.
  res.headers.set(
    "Permissions-Policy",
    [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=(self)",
      "battery=()",
      "camera=()",
      "cross-origin-isolated=()",
      "display-capture=()",
      "document-domain=()",
      "encrypted-media=(self)",
      "execution-while-not-rendered=()",
      "execution-while-out-of-viewport=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "keyboard-map=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "navigation-override=()",
      "payment=(self https://www.paypal.com)",
      "picture-in-picture=(self)",
      "publickey-credentials-get=(self)",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "web-share=()",
      "xr-spatial-tracking=()",
      "clipboard-write=(self)",
      "clipboard-read=()",
      "gamepad=()",
      "hid=()",
      "idle-detection=()",
      "serial=()",
      "window-placement=()",
    ].join(", ")
  );
  // FULL-WEB-IMPROVEMENT-1: COOP=same-origin — isolates browsing context
  // so a malicious popup/iframe cannot access window references. Does NOT
  // break payment provider iframes (those are cross-origin, isolated by
  // the same-origin policy already).
  // NOTE: We intentionally do NOT set COEP=require-corp because it would
  // break the third-party payment SDK iframes (Stripe Elements, PayPal
  // Smart Buttons) that load resources without CORP headers. COOP alone
  // is the safe baseline.
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  // X-DNS-Prefetch-Control — opt into DNS prefetching for asset origins
  // (fonts.gstatic.com etc.). Helps TTFB on first visit.
  res.headers.set("X-DNS-Prefetch-Control", "on");
  // CSP — Next.js 16 (App Router + Turbopack) injects MANY inline scripts:
  //   • The RSC payload (<script>self.__next_f.push([1,"..."])</script>)
  //   • The streaming-SSR replacement scripts ($RC, $RV, $RB) that swap
  //     <Suspense fallback=<Loading>> for the real revealed content
  //   • requestAnimationFrame / setTimeout bootstrap snippets
  //
  // SECURITY FIX (S-H-002): when a nonce is available (page routes), we
  // use `'nonce-${nonce}'` instead of `'unsafe-inline'`. Next.js 16 auto-
  // applies the `x-nonce` header to its own injected scripts. In production,
  // `'unsafe-eval'` is also removed (only needed in dev for HMR).
  // When no nonce is available (API routes), we keep `'unsafe-inline'`
  // (API routes don't render HTML, so inline scripts aren't a concern).
  const isProduction = process.env.NODE_ENV === "production";
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' ${isProduction ? "" : "'unsafe-eval'"} https://www.paypal.com https://www.paypalobjects.com`
    : `'self' 'unsafe-inline' ${isProduction ? "" : "'unsafe-eval'"} https://www.paypal.com https://www.paypalobjects.com`;

  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      `script-src ${scriptSrc}; ` +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' wss: ws: https: https://www.paypal.com https://api.mercadopago.com https://api.nowpayments.io; " +
      "frame-src https://www.paypal.com; " +
      "worker-src 'self' blob:; " +
      "object-src 'none'; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self' https://www.paypal.com; " +
      "upgrade-insecure-requests"
  );
}

// ── Trusted host resolution (for CSRF Origin matching) ──
// Reads the host from NEXTAUTH_URL. In production this MUST be set so that
// CSRF Origin checks can value-match against the real external host.
let cachedTrustedHost: string | null | undefined;
function getTrustedHost(): string | null {
  if (cachedTrustedHost !== undefined) return cachedTrustedHost;
  const url = process.env.NEXTAUTH_URL;
  if (!url) {
    cachedTrustedHost = null;
    return null;
  }
  try {
    cachedTrustedHost = new URL(url).host;
  } catch {
    cachedTrustedHost = null;
  }
  return cachedTrustedHost;
}

// ── CORS allowlist (OWASP A05-4) ──
// The v1 API CORS allowlist is configured via the `api.cors_allowlist` env
// var (comma-separated origins). Cached for 60s. If unset, NO origin is
// allowed — the v1 API is same-origin only (the documented public API is
// server-to-server, not browser-to-server).
let cachedCorsAllowlist: string[] | null = null;
let corsAllowlistCachedAt = 0;
const CORS_ALLOWLIST_TTL_MS = 60_000;
function getCorsAllowlist(): string[] {
  const now = Date.now();
  if (cachedCorsAllowlist !== null && now - corsAllowlistCachedAt < CORS_ALLOWLIST_TTL_MS) {
    return cachedCorsAllowlist;
  }
  const raw = process.env.API_CORS_ALLOWLIST || "";
  cachedCorsAllowlist = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^https?:\/\//.test(s));
  corsAllowlistCachedAt = now;
  return cachedCorsAllowlist;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip non-API routes (let Next.js handle pages/static)
  if (!pathname.startsWith("/api/")) {
    // SECURITY FIX (S-H-002): generate a per-request nonce for page routes.
    // The nonce is set on the request headers so Next.js can auto-apply it
    // to its own injected inline scripts, and layout.tsx can read it to
    // nonce custom inline scripts (JSON-LD, font loader, etc.).
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);

    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });
    addSecurityHeaders(res, nonce);

    // PERF: Cache HTML pages at Cloudflare edge for 60s (s-maxage).
    // Stale-while-revalidate allows serving cached content while fetching fresh.
    // Only applies to GET requests for HTML pages (not assets, not API).
    if (req.method === "GET" && !pathname.startsWith("/_next/")) {
      res.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
    }

    return res;
  }

  // ── M-3: CORS headers for public API v1 (reseller endpoints) ──
  // SECURITY (OWASP A05-4, P2): CORS is restricted to an allowlist of
  // origins read from the `api.cors_allowlist` Setting at runtime (cached
  // for 60s). If the Setting is missing OR the request Origin isn't on
  // the list, NO `Access-Control-Allow-Origin` header is sent — the
  // browser's same-origin policy then blocks the response.
  //
  // Previously this set `Access-Control-Allow-Origin: *` for all v1 API
  // routes — which let any malicious website issue authenticated requests
  // on behalf of a logged-in user who had pasted their API key into the
  // site. The wildcard was especially dangerous because the v1 routes use
  // Bearer API keys (Authorization header), and the user's browser is the
  // source IP, defeating any IP allowlist on the API key.
  //
  // Configure the allowlist via a Setting row keyed `api.cors_allowlist`
  // with a comma-separated list of origins (e.g.
  // "https://reseller1.com,https://reseller2.com").
  if (pathname.startsWith("/api/v1/") || pathname === "/api/docs") {
    const allowlist = getCorsAllowlist();
    const requestOrigin = req.headers.get("origin") || "";
    // Origin must EXACTLY match an entry in the allowlist (no wildcards
    // beyond the scheme+host level — subdomains must be listed explicitly).
    const isAllowed = requestOrigin !== "" && allowlist.includes(requestOrigin);

    // Handle CORS preflight (OPTIONS) immediately
    if (req.method === "OPTIONS") {
      const res = new NextResponse(null, { status: isAllowed ? 204 : 403 });
      if (isAllowed) {
        res.headers.set("Access-Control-Allow-Origin", requestOrigin);
        res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
        res.headers.set("Access-Control-Allow-Credentials", "false");
        res.headers.set("Vary", "Origin");
        res.headers.set("Access-Control-Max-Age", "86400"); // 24h cache preflight
      }
      addSecurityHeaders(res);
      return res;
    }
    const res = NextResponse.next();
    if (isAllowed) {
      res.headers.set("Access-Control-Allow-Origin", requestOrigin);
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.headers.set("Access-Control-Allow-Credentials", "false");
      res.headers.set("Vary", "Origin");
    }
    addSecurityHeaders(res);
    // Pass IP to downstream API routes
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    res.headers.set("x-client-ip", ip);
    return res;
  }

  // ── CSRF protection: verify Origin on state-changing requests ──
  // NextAuth already has its own CSRF tokens for /api/auth/*.
  // Webhooks from payment providers (Stripe, NowPayments, Mercado Pago) are
  // authenticated via HMAC signatures in their own route handlers, so we
  // exempt them from the Origin check (providers don't send Origin).
  //
  // SECURITY: For all other POST/PATCH/PUT/DELETE, we verify the Origin header
  // matches the trusted host (from NEXTAUTH_URL env var). Browsers do NOT allow
  // JavaScript to forge the Origin header (CORS spec), and value-matching
  // against the known trusted host closes the previous "presence-only" bypass
  // where any non-empty Origin was accepted.
  const method = req.method.toUpperCase();
  const isStateChanging = ["POST", "PATCH", "PUT", "DELETE"].includes(method);
  const isNextAuth = pathname.startsWith("/api/auth/");
  const isWebhook = pathname.startsWith("/api/webhooks/");

  if (isStateChanging && !isNextAuth && !isWebhook) {
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const authHeader = req.headers.get("authorization");

    // S-02 FIX: Bearer token requests are NOT exempt from Origin check for
    // browser-initiated state-changing requests. Only server-to-server calls
    // (no Origin header at all) are exempt — browsers always send Origin.
    if (authHeader && authHeader.startsWith("Bearer ") && !origin) {
      // Server-to-server API call (no Origin) — allow
    } else if (!origin && !authHeader) {
      // No Origin AND no Authorization → reject (CSRF protection)
      return NextResponse.json(
        { error: "CSRF check failed — missing origin" },
        { status: 403 }
      );
    } else {
      // Origin present — verify it matches the trusted host
      const trustedHost = getTrustedHost();
      if (trustedHost) {
        try {
          const originUrl = new URL(origin as string);
          if (originUrl.host !== trustedHost) {
            return NextResponse.json(
              { error: "CSRF check failed — origin mismatch" },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "CSRF check failed — invalid origin" },
            { status: 403 }
          );
        }
      } else {
        // SECURITY FIX (S-H-003): NEXTAUTH_URL is not set.
        // In PRODUCTION, fail-closed — reject the request. Allowing any
        // Origin when the trusted host is unknown opens a CSRF hole: an
        // attacker site could POST to /api/wallet/withdraw with the
        // victim's session cookie and the request would be accepted.
        // In DEV, allow through (NEXTAUTH_URL is commonly unset during
        // local development — developers use localhost:3000 directly).
        if (process.env.NODE_ENV === "production") {
          console.error(
            "[CSRF] NEXTAUTH_URL is not set in production — rejecting state-changing request. " +
              "Set NEXTAUTH_URL in .env to fix this."
          );
          return NextResponse.json(
            { error: "CSRF check failed — server misconfiguration (NEXTAUTH_URL not set)" },
            { status: 500 }
          );
        }
        // Dev mode: allow through with a console warning.
        console.warn(
          "[CSRF] NEXTAUTH_URL not set in dev mode — allowing any Origin. Set NEXTAUTH_URL for production."
        );
      }
    }
  }

  // Get client IP for rate limiting + audit logging.
  //
  // SECURITY FIX (S-H-004): previously this used `x-forwarded-for` directly,
  // which is client-forgeable. An attacker could send `X-Forwarded-For:
  // <random-ip>` with every request to bypass rate limiting (each request
  // gets a fresh bucket) and poison audit logs.
  //
  // Resolution order (most-trusted first):
  //   1. `CF-Connecting-IP` — set by Cloudflare, cannot be forged by the
  //      client (Cloudflare overwrites any client-supplied value).
  //   2. `x-client-ip` — set by this same middleware earlier in the
  //      request lifecycle (but not present on the first pass).
  //   3. `x-forwarded-for` — ONLY trusted if the request came through the
  //      reverse proxy. We take the FIRST IP (leftmost) which is the
  //      client. If the request bypassed the proxy (direct hit on port
  //      3000), this header is forgeable — but in that case the attacker
  //      is already inside the network, and rate limiting is the least
  //      of our problems.
  //   4. Fallback: "unknown" (rate-limited under a shared key).
  //
  // The CF-Connecting-IP check is the key fix: in the Cloudflare→WSL2
  // setup, this header is always present and always truthful.
  const clientIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-client-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const ip = clientIp;
  const rateLimitKey = `${ip}:${pathname.split("/").slice(0, 4).join("/")}`;

  // Find applicable rate limit (first match wins, most specific first)
  const limit = RATE_LIMITS.find((l) => l.pattern.test(pathname));

  if (limit) {
    const result = checkRateLimit(rateLimitKey, limit.max, limit.windowMs);
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter,
          limit: limit.max,
          window: `${limit.windowMs / 1000}s`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit.max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
          },
        }
      );
    }
  }

  const res = NextResponse.next();
  addSecurityHeaders(res);

  // CRITICAL: Never cache auth/session endpoints — they must be per-session.
  // Without this, Cloudflare might cache /api/auth/csrf or /api/auth/session,
  // breaking login (401 errors) because the CSRF token doesn't match.
  if (pathname.startsWith("/api/auth/")) {
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
  }

  // Pass IP to downstream API routes via header
  res.headers.set("x-client-ip", ip);
  return res;
}

export const config = {
  matcher: [
    // Match all API routes + page routes (for security headers)
    "/((?!_next/static|_next/image|favicon.ico|logo.svg).*)",
  ],
};
