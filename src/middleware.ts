import { NextRequest, NextResponse } from "next/server";

/**
 * NOVSMM Edge Middleware — rate limiting + security headers.
 *
 * In-memory rate limiter (for production, replace with Redis).
 * Limits per-IP on sensitive routes, with stricter limits on auth/payment.
 */

// ── Rate limiter (in-memory, sliding window) ──
type RateBucket = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateBucket>();

// Clean expired buckets every 60s to prevent memory leak
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
  // CSP — allows Tailwind inline styles, Google favicons, WebSocket
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' wss: ws: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip non-API routes (let Next.js handle pages/static)
  if (!pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    addSecurityHeaders(res);
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
