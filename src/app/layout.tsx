import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./fm-animations.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "@/lib/app-providers";
import { SwRegister } from "@/components/novsmm/sw-register";
import { ModalAccessibilityProvider } from "@/components/novsmm/modal-accessibility-provider";
import { WebVitals } from "@/components/novsmm/web-vitals";
import { OfflineDetector } from "@/components/novsmm/offline-detector";

/**
 * Canonical site URL. In production this MUST be set via NEXTAUTH_URL or
 * NEXT_PUBLIC_SITE_URL (the canonical deployed origin). We resolve at build
 * time so metadata URLs (canonical, OG, sitemap) are absolute and stable.
 *
 * Falls back to http://localhost:3000 for local dev (metadataBase requires
 * an absolute URL — Next.js will warn if relative URLs are used without it).
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

const SITE_NAME = "NOVSMM";
const SITE_TITLE =
  "NOVSMM — Infrastructure for Social Media Marketing at Scale";
const SITE_DESCRIPTION =
  "NOVSMM unifies order automation, a reseller marketplace, and multi-gateway payments into one platform — engineered for teams that ship at the speed of attention.";
const SITE_TAGLINE =
  "The infrastructure for social media marketing at scale.";

// NOTE: We previously used next/font/google here, but it requires the
// build server to fetch fonts from fonts.googleapis.com at compile time.
// In restricted-network VPS environments (e.g. behind Cloudflare proxy
// without outbound DNS to Google), the build fails with:
//   "Failed to fetch 'Inter' from Google Fonts."
//   "Turbopack build failed with 2 errors: next/font: error"
// Fix: load fonts via <link> tags in <head> below. The browser fetches
// them at runtime (through Cloudflare → Google Fonts CDN), so the build
// server no longer needs network access to Google. CSS variables
// --font-inter and --font-mono are defined directly in globals.css.

export const viewport: Viewport = {
  // BROAD-FIX-BATCH-1: aligned with the canonical PWA manifest theme_color
  // (#0052ff — NOVSMM electric blue). The previous #0a0a0a conflicted with
  // the manifest's #ffffff and the brand's primary action color.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0052ff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // MOB-1c-010 FIX: viewport-fit=cover enables env(safe-area-inset-*) on
  // iPhone X+ (notch/home indicator). Without this, safe-area-inset returns
  // 0 and the sticky CTA, WhatsApp widget, and CompareBar overlap the notch.
  // Components that already use env(safe-area-inset-*) will now work correctly.
  viewportFit: "cover",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_TITLE,
    template: "%s · NOVSMM",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "NOVSMM",
    "SMM panel",
    "social media automation",
    "reseller infrastructure",
    "marketing platform",
    "SaaS",
    "SMM reseller",
    "social media marketing",
    "Instagram followers",
    "TikTok growth",
    "YouTube views",
    "wholesale SMM",
    "payment automation",
    "API SMM panel",
    // Español
    "marketing redes sociales",
    "panel SMM",
    "automatización redes sociales",
    "crecer Instagram",
    "seguidores Instagram",
    "vistas TikTok",
    "revendedor SMM",
    // Portugués
    "marketing mídia social",
    "painel SMM",
    "automação redes sociais",
    "crescer Instagram",
    "seguidores Instagram",
    "visualizações TikTok",
  ],
  authors: [{ name: "NOVSMM", url: SITE_ORIGIN }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Business",
  // Canonical URL — explicit per-page override happens in each route's metadata
  alternates: {
    canonical: "/",
    // i18n (U-C-004): hreflang tags for multi-language SEO
    languages: {
      "en": "/",
      "es": "/",
      "pt": "/",
      "fr": "/",
      "x-default": "/",
    },
  },
  // Robots — full indexing, follow all links, no archive restriction
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // PWA manifest — Next.js auto-resolves /manifest.webmanifest from app/manifest.ts
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: SITE_TITLE,
    description: SITE_TAGLINE,
    siteName: SITE_NAME,
    url: SITE_ORIGIN,
    locale: "en_US",
    alternateLocale: ["es_ES", "pt_BR"],
    type: "website",
    // opengraph-image.tsx auto-generates the actual image; this is a fallback
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "NOVSMM logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_TAGLINE,
    site: "@novsmm",
    creator: "@novsmm",
    // twitter-image.tsx auto-generates the actual image
    images: ["/icon.png"],
  },
  // App icons — MOB-1b-006 FIX: multi-size favicon set for optimal loading.
  // Previously a single 97KB icon.png was used for ALL sizes. Now each size
  // has its own optimized file:
  //   - 16x16 (0.5KB) for browser tab favicon
  //   - 32x32 (1.2KB) for browser tab favicon (retina)
  //   - 180x180 (15.3KB) for apple-touch-icon
  //   - 192x192 (17.1KB) for PWA manifest
  //   - 512x512 (30.3KB) for OG image + PWA manifest (was 97KB)
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  // Format detection — prevent iOS from auto-linking phone numbers etc.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  // MOB-1d-004 FIX: iOS PWA meta tags for standalone experience.
  // These enable "Add to Home Screen" on iOS to launch as a full-screen
  // app without Safari's browser chrome.
  appleWebApp: {
    capable: true,
    title: "NOVSMM",
    statusBarStyle: "default",
  },
  // Verification placeholders — orchestrator can set real keys in env
  verification: {
    other: {
      // Google Search Console verification token (env-configurable)
      "google-site-verification":
        process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
    },
  },
};

// ── JSON-LD structured data ──
// Two top-level entities: Organization (about the company) + WebSite (about
// the site itself with potential search action). These help Google surface
// rich results (knowledge panel, sitelinks search box).
const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  alternateName: "NOVSMM Platform",
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/icon.png`,
  description: SITE_DESCRIPTION,
  slogan: SITE_TAGLINE,
  sameAs: [
    // SEO FIX (U-H-008): verified social media URLs only.
    // Previously listed twitter.com/novsmm (unverified), github.com/novsmm
    // (404 — the real org is github.com/novafwsocial), and linkedin.com/
    // company/novsmm (unverified). Google penalizes sameAs entries that
    // 404 — only list profiles that actually exist and are claimed.
    "https://github.com/novafwsocial",
    // TODO: add twitter.com/novsmm and linkedin.com/company/novsmm
    // here once the accounts are created and claimed.
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["English", "Spanish", "Portuguese"],
      url: `${SITE_ORIGIN}/api-docs`,
    },
  ],
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_ORIGIN,
  description: SITE_DESCRIPTION,
  publisher: { "@type": "Organization", name: SITE_NAME },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_ORIGIN}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // SECURITY FIX (S-H-002): read the per-request nonce generated by middleware.
  // The nonce is applied to all inline <script> tags so the CSP can use
  // 'nonce-<value>' instead of 'unsafe-inline', closing the XSS vector.
  // Next.js 16 auto-applies the x-nonce header to its own injected scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resource hints — preconnect to font + analytics origins */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* Google Fonts loaded via <link> instead of next/font/google so the
            build server doesn't need to fetch from fonts.googleapis.com
            (which fails in restricted-network VPS environments). The browser
            fetches these at runtime through Cloudflare.
            PERF FIX (P-H-007): use the media="print" + onload swap pattern
            to make the font CSS non-render-blocking.
            SECURITY FIX (S-H-002): the onload handler is moved to a
            nonce'd <script> block below because inline event handlers
            (onLoad="...") are blocked by nonce-based CSP. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          media="print"
          id="font-stylesheet"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          />
        </noscript>
        {/* Font loader — swaps media="print" to media="all" once the CSS
            downloads. Requires a nonce because CSP blocks inline event
            handlers without 'unsafe-inline'. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('font-stylesheet').onload=function(){this.onload=null;this.media='all'};`,
          }}
        />
        {/* JSON-LD: Organization + WebSite structured data for rich results */}
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
      </head>
      <body
        className="font-sans antialiased bg-background text-foreground"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        {/* Accessibility: skip-to-content link. Hidden visually, appears on
            keyboard focus. First focusable element so Tab lands here first. */}
        <a
          href="#main-content"
          className="sr-only z-[100] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground focus:nov-ring-lg"
        >
          Skip to content
        </a>
        <AppProviders>
          {children}
          <Toaster />
          <SwRegister />
          {/* MOB-1c-005/007/025: Global Escape key + focus trap for ALL modals */}
          <ModalAccessibilityProvider />
          <WebVitals />
          <OfflineDetector />
        </AppProviders>
      </body>
    </html>
  );
}
