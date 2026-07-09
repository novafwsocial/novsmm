import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
