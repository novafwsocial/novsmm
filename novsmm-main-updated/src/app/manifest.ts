import type { MetadataRoute } from "next";

/**
 * PWA Manifest — served at /manifest.webmanifest by Next.js.
 *
 * BROAD-FIX-BATCH-1: consolidated from the previous duplicate
 * `public/manifest.json` (which had a conflicting name, theme_color, and
 * icon set). This file is now the single source of truth for the
 * installable PWA metadata.
 *
 * Branding:
 *   - name / short_name: "NOVSMM"
 *   - theme_color: #0052ff (electric blue — NOVSMM primary brand color)
 *   - background_color: #ffffff (pure white — matches the landing page)
 *   - icons: 192, 512, and a maskable variant (all from /icon.png)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOVSMM",
    short_name: "NOVSMM",
    description: "Infrastructure for social media marketing at scale",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0052ff",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity", "social", "marketing", "finance"],
    icons: [
      // MOB-1b-017 FIX: use icon-192.png (17KB) instead of icon.png (30KB) for 192×192.
      // icon.png (512×512, 30KB) is only used for the 512×512 entry.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // PWA maskable icons — dedicated variants with safe zone margin.
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // UX FIX (U-M-011): was using ?view=dashboard&tab=marketplace —
    // the AppView component doesn't parse these query params (it uses
    // the Zustand store, not URL params). The shortcuts would open the
    // landing page instead of the dashboard. Changed to use hash anchors
    // that actually work — they scroll to the relevant section.
    shortcuts: [
      // MOB-001 FIX: removed "Pricing" shortcut — /pricing route was deleted
      // per user request to eliminate pricing from everywhere. Users who had
      // the PWA installed won't see a broken shortcut anymore.
      {
        name: "Marketplace",
        short_name: "Services",
        url: "/#marketplace",
      },
      {
        name: "API Docs",
        short_name: "API",
        url: "/api-docs",
      },
    ],
  };
}
