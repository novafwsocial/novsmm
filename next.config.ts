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
  // Automatically converts and serves responsive images from next/image.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    minimumCacheTTL: 86400, // 24h cache for optimized images
  },
  // PERF: Compress responses with brotli (better than gzip)
  compress: true,
  // PERF: Only generate static pages for known routes (faster builds)
  // experimental: { optimizeCss: true } — removed, not stable in Next 16
};

export default nextConfig;
