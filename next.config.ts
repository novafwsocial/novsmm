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
};

export default nextConfig;
