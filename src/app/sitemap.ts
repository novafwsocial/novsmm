import type { MetadataRoute } from "next";

/**
 * NOVSMM Sitemap — served at /sitemap.xml by Next.js.
 *
 * Covers the single-route SPA landing page plus all anchored landing
 * sections (the deep-links users can scroll to or share). The legal pages
 * and dashboard are intentionally NOT included — they're client-side views
 * gated behind auth/state, not crawlable landing destinations.
 *
 * Priority + changeFrequency are hints (Google mostly ignores them) but
 * they're useful signals for other crawlers (Bing, Yandex).
 *
 * The site URL is resolved the same way as in layout.tsx so canonical URLs
 * stay consistent across metadata, OG tags, and the sitemap.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";
const SITE_ORIGIN = (() => {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    return "http://localhost:3000";
  }
})();

const now = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  // Top-level landing page (the only crawlable route — the rest of the app
  // is client-side rendered behind auth/state).
  const routes: MetadataRoute.Sitemap = [
    {
      url: SITE_ORIGIN,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  // Anchored landing sections — these are same-page anchors (#services etc.)
  // that we expose to crawlers as deep links. They share the route URL "/"
  // but we add the #anchor so Google can show section deep-links in SERPs.
  // Note: per RFC, fragments are technically not part of a URL's canonical
  // form — but Google DOES support #section URLs in sitemaps as of 2023,
  // and they help with sitelink display.
  const sections = [
    { anchor: "services", priority: 0.9 },
    { anchor: "marketplace", priority: 0.9 },
    { anchor: "payments", priority: 0.8 },
    { anchor: "stats", priority: 0.7 },
    { anchor: "testimonials", priority: 0.6 },
    { anchor: "security", priority: 0.8 },
    { anchor: "api-docs", priority: 0.7 },
    { anchor: "affiliates", priority: 0.7 },
    { anchor: "faq", priority: 0.6 },
  ];

  for (const s of sections) {
    routes.push({
      url: `${SITE_ORIGIN}/#${s.anchor}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: s.priority,
    });
  }

  // Public API docs page (formatted HTML, crawlable)
  routes.push({
    url: `${SITE_ORIGIN}/api-docs`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  });

  return routes;
}
