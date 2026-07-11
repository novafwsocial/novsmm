import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SECURITY (OWASP A05-1, P1): type errors are NO LONGER ignored at build
  // time. The previous `ignoreBuildErrors: true` shipped type-unsafe code
  // to production, masking null-deref and bad-cast vulnerabilities. If
  // `bun run build` fails on type errors, fix them — do not re-enable
  // this flag.
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  // PERF: Image optimization — AVIF (best compression) + WebP fallback.
  // SECURITY: remotePatterns restricted to explicit allowlist only.
  // DO NOT use hostname: "**" — it creates an SSRF vector (server fetches
  // any URL). Add new hosts here only when a verified use case requires it.
  // Currently no remote images are used (logo is served from /public/).
  images: {
    formats: ["image/avif", "image/webp"],
    // No remotePatterns — all images are local (/public/ or data: URIs)
    // If you need remote images (e.g. Google OAuth avatars), add the host:
    // remotePatterns: [
    //   { protocol: "https", hostname: "lh3.googleusercontent.com" },
    // ],
    minimumCacheTTL: 86400, // 24h cache for optimized images
  },
  // PERF: Compress responses with brotli (better than gzip)
  compress: true,
  // FULL-WEB-IMPROVEMENT-1: production-grade static-asset caching. The
  // middleware runs on every route EXCEPT _next/static / _next/image /
  // favicon.ico / logo.svg (see matcher in middleware.ts). For those
  // excluded static assets, headers() below provides a baseline set of
  // security + caching headers so static files served directly by Next
  // (without middleware) still get hardened. Defense in depth.
  // NOTE: /_next/static is intentionally NOT customized — Next.js already
  // emits an immutable long-cache header for content-hashed chunks, and
  // overriding it triggers a build warning. We only add security headers
  // for the public-folder static assets and a no-cache rule for sw.js.
  // PERF: experimental.optimizeCss removed — not stable in Next 16.
  async headers() {
    return [
      {
        // Public folder static assets (icon.png, logo.svg, etc.) — medium cache
        source: "/:path*.(png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|otf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        // Service worker — must NEVER be cached aggressively, otherwise
        // users get stuck on an old SW version after deploys.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;

