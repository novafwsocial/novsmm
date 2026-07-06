import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,

  // ── Security ──
  // Don't leak framework info via X-Powered-By header
  poweredByHeader: false,

  // ── Image optimization ──
  images: {
    // Allow Google favicon service for platform logos
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons/**" },
    ],
    // Enable modern formats
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for 24h
    minimumCacheTTL: 86400,
  },

  // ── HTTP keep-alive for outbound fetches ──
  httpAgentOptions: {
    keepAlive: true,
  },

  // ── Experimental optimizations ──
  experimental: {
    // Tree-shake barrel imports from these packages (reduces bundle size)
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
};

export default nextConfig;
