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
function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  // CSP — allows Tailwind inline styles, Google fonts, WebSocket, and the
  // canonical payment-provider domains.
  //
  // BROAD-FIX-BATCH-1: added explicit entries for the 4 hosted-checkout
  // payment providers (Stripe, PayPal, Mercado Pago, NowPayments) so that
  // any future client-side SDK / iframe embed (e.g. Stripe Elements, PayPal
  // Smart Buttons) is not blocked by the CSP. The current checkout flow is
  // hosted (redirect to the provider's domain), so these entries are
  // forward-compatible rather than strictly required today — but adding them
  // now prevents a "CSP blocked the script" surprise when a provider SDK
  // is introduced.
  //
  // 'unsafe-eval' removed (C-1 security fix) — not used anywhere in the codebase.
  // 'unsafe-inline' retained for script-src (Next.js requires it for inline scripts/hydration).
  // Future improvement: migrate to nonce-based CSP to remove 'unsafe-inline' too.
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' wss: ws: https: https://api.stripe.com https://www.paypal.com https://api.mercadopago.com https://api.nowpayments.io; " +
      "frame-src https://js.stripe.com https://www.paypal.com https://hooks.stripe.com; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self' https://www.paypal.com;"
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
    const res = NextResponse.next();
    addSecurityHeaders(res);

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

    // Server-to-server API calls with a Bearer token are exempt (they use their
    // own auth — API keys). Browsers cannot set Authorization headers without
    // CORS preflight, so this exemption is safe from CSRF.
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Bearer-authenticated requests skip Origin check
    } else if (!origin) {
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
          const originUrl = new URL(origin);
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
      }
      // If NEXTAUTH_URL is not set (e.g., dev mode), we fall back to allowing
      // any Origin — but log a warning. Production MUST set NEXTAUTH_URL.
    }
  }

  // Get client IP (behind Caddy proxy)
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
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
