import type { MetadataRoute } from "next";

/**
 * NOVSMM Sitemap — served at /sitemap.xml by Next.js.
 *
 * Covers the single-route SPA landing page plus all public pages. The legal
 * pages and dashboard are intentionally NOT included — they're client-side
 * views gated behind auth/state, not crawlable landing destinations.
 *
 * Priority + changeFrequency are hints (Google mostly ignores them) but
 * they're useful signals for other crawlers (Bing, Yandex).
 *
 * SECURITY/SEO FIX (U-L-008): previously the sitemap included #anchor URLs
 * like "https://novsmm.shop/#services". Per RFC 3986, fragments are NOT part
 * of a URL's canonical form — they're client-side only. Google's sitemap
 * spec (https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
 * does NOT support #fragments. They were causing:
 *   - GSC "Coverage" warnings about non-standard URLs
 *   - Wasted crawl budget on duplicate "/" entries
 * The #anchor entries have been removed. Google discovers section deep-links
 * automatically via its "named anchors" extraction — they don't need to be
 * in the sitemap.
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
  return [
    // Top-level landing page
    {
      url: SITE_ORIGIN,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_ORIGIN}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Public API docs page (formatted HTML, crawlable)
    {
      url: `${SITE_ORIGIN}/api-docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    // Changelog page
    {
      url: `${SITE_ORIGIN}/changelog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    // DSK-1c-009 FIX: removed duplicate /blog entry (was listed twice).
  ];
}
