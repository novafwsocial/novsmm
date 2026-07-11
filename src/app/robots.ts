import type { MetadataRoute } from "next";

/**
 * NOVSMM robots.txt — served at /robots.txt by Next.js.
 *
 * Replaces the previous static public/robots.txt. Using the app-router
 * robots.ts convention lets us:
 *   1. Auto-reference the sitemap with an absolute URL (resolved from env)
 *   2. Allow fine-grained per-bot rules (e.g. block AI scrapers if needed)
 *   3. Keep the rules in sync with the metadata.robots config in layout.tsx
 *
 * Note: when both public/robots.txt and app/robots.ts exist, Next.js uses
 * the app/robots.ts file and ignores the public one — but to avoid confusion
 * the public/robots.txt was deleted as part of this task.
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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Major search engine crawlers — full crawl access
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/auth/", "/api/admin/", "/api/wallet/", "/api/orders/", "/api/uploads/"],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/auth/", "/api/admin/", "/api/wallet/", "/api/orders/", "/api/uploads/"],
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
      },
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "LinkedInBot",
        allow: "/",
      },
      {
        userAgent: "Applebot",
        allow: "/",
      },
      {
        userAgent: "WhatsApp",
        allow: "/",
      },
      // AI training crawlers — opt-out (respected by OpenAI, Anthropic, etc.)
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "ChatGPT-User",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
      {
        userAgent: "anthropic-ai",
        disallow: "/",
      },
      {
        userAgent: "Claude-Web",
        disallow: "/",
      },
      {
        userAgent: "Google-Extended",
        disallow: "/",
      },
      // Default rule for everyone else
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/auth/",
          "/api/admin/",
          "/api/wallet/",
          "/api/orders/",
          "/api/uploads/",
          "/api/me/",
          "/api/v1/",
          "/api/tickets/",
          "/api/notifications/",
          "/api/subscriptions/",
          "/api/child-panels/",
          "/api/webhooks/",
          "/api/internal/",
          "/api/provider/",
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
