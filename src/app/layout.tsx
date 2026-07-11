import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from "@/lib/app-providers";
import { SwRegister } from "@/components/novsmm/sw-register";
import { WebVitals } from "@/components/novsmm/web-vitals";

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
  "Automation infrastructure for digital marketing teams and resellers.";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"], // only needed weights (not all 9)
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"], // only needed weights
  preload: false, // mono font is rare, don't preload
});

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
  ],
  authors: [{ name: "NOVSMM", url: SITE_ORIGIN }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Business",
  // Canonical URL — explicit per-page override happens in each route's metadata
  alternates: {
    canonical: "/",
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
  // App icons — Next.js auto-detects app/icon.png but we add explicit refs
  // for non-Next.js consumers (e.g. link scanners).
  icons: {
    icon: [
      { url: "/icon.png", sizes: "any" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/icon.png" }],
  },
  // Format detection — prevent iOS from auto-linking phone numbers etc.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
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
    "https://twitter.com/novsmm",
    "https://github.com/novsmm",
    "https://www.linkedin.com/company/novsmm",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resource hints — preconnect to font + analytics origins */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* JSON-LD: Organization + WebSite structured data for rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
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
          <WebVitals />
        </AppProviders>
      </body>
    </html>
  );
}
