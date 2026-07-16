/**
 * FULL-WEB-IMPROVEMENT-1
 *
 * JSON-LD structured data for the NOVSMM landing page.
 *
 * Server component (no "use client") — emitted as static <script> tags so
 * Google can crawl rich-result entities without executing JS. These
 * complement the Organization + WebSite schemas already in layout.tsx.
 *
 * Entities emitted here:
 *   1. WebApplication — describes NOVSMM as an installable web app
 *      (drives rich result cards + Play Store-style install banners).
 *   2. Service — the SMM fulfillment + reseller platform service.
 *   3. FAQPage — a static representative FAQ set (the runtime FAQ from
 *      /api/cms may differ, but Google requires static content for FAQ
 *      rich results; this is the canonical set shown on every landing view).
 *   4. BreadcrumbList — single-item breadcrumb (Home) — minor, but
 *      establishes the page's position in the site hierarchy.
 *
 * The site URL is resolved the same way as layout.tsx so absolute URLs
 * stay consistent across all structured data.
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

const webApplicationLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "NOVSMM",
  url: SITE_ORIGIN,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Marketing Automation",
  operatingSystem: "Web (any modern browser)",
  browserRequirements: "Requires a modern browser with JavaScript enabled",
  description:
    "NOVSMM unifies order automation, a reseller marketplace, and multi-gateway payments into one platform — engineered for teams that ship at the speed of attention.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free to start — no credit card required.",
  },
  featureList: [
    "Real-time order automation across 11+ social platforms",
    "Open reseller marketplace with wholesale rates",
    // Stripe was completely removed from NOVSMM — only 4 payment methods remain.
    "4 integrated payment gateways (PayPal, MercadoPago, NowPayments, and more)",
    "Multi-currency wallet with instant top-up",
    "24/7 ticket support + live status monitoring",
    "Public REST API with webhooks",
    "Real-time WebSocket notifications",
    "Child panel infrastructure for resellers",
    "Affiliate program with 10% lifetime commission",
  ],
  // FIX (U-C-003): removed aggregateRating — there are no real Review
  // entities backing the 4.9/1843 rating, which violates Google's
  // structured data guidelines and risks a manual penalty
  // (https://developers.google.com/search/docs/appearance/structured-data/review-snippet).
  // Re-add when there's a genuine review system with verified purchases.
  publisher: { "@type": "Organization", name: "NOVSMM" },
};

const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Social Media Marketing Automation",
  name: "NOVSMM Platform",
  description:
    "Infrastructure for social media marketing at scale — order automation, reseller marketplace, and payments.",
  provider: {
    "@type": "Organization",
    name: "NOVSMM",
    url: SITE_ORIGIN,
  },
  areaServed: "Worldwide",
  availableChannel: {
    "@type": "ServiceChannel",
    serviceUrl: SITE_ORIGIN,
    servicePhone: undefined,
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "SMM Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Instagram Followers / Likes / Views",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "TikTok Followers / Likes / Views",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "YouTube Subscribers / Views / Watch Time",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Twitter (X) Followers / Impressions",
        },
      },
    ],
  },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is NOVSMM and what does it do?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NOVSMM is an automation infrastructure platform for social media marketing teams and resellers. It unifies real-time order fulfillment, an open reseller marketplace, multi-gateway payments, and a public REST API into a single platform engineered for performance at scale.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need a credit card to start?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. You can create a free NOVSMM account without a credit card. Top up your wallet with any of the 4 supported payment gateways (PayPal, MercadoPago, NowPayments, and Manual bank transfer) when you're ready to place your first order.",
      },
    },
    {
      "@type": "Question",
      name: "Which social platforms does NOVSMM support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NOVSMM supports 11+ social platforms including Instagram, TikTok, YouTube, Twitter/X, Facebook, Telegram, Discord, Spotify, Twitch, LinkedIn, and more — with services for followers, likes, views, comments, and watch time.",
      },
    },
    {
      "@type": "Question",
      name: "Does NOVSMM offer an API?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. NOVSMM exposes a public REST API with API-key authentication and outbound webhooks. Place orders, check status, refill, cancel, and query your balance programmatically. Full reference is at /api-docs.",
      },
    },
    {
      "@type": "Question",
      name: "What is the affiliate program?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The NOVSMM affiliate program pays 10% lifetime commission on every order placed by a user you refer. Share your unique referral link from your dashboard, and commissions are credited to your wallet in real time — withdrawable any time.",
      },
    },
    {
      "@type": "Question",
      name: "How fast are orders processed?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most orders start within 1-2 seconds of placement. NOVSMM routes orders to the best available provider in real time with automatic failover, and the average order completes in minutes — not hours.",
      },
    },
    {
      "@type": "Question",
      name: "Is NOVSMM secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NOVSMM uses layered security controls including password hashing, session protection, CSRF protection, role-based access, security headers, optional 2FA, and audit logging. Certification status is not represented by this FAQ.",
      },
    },
  ],
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_ORIGIN,
    },
  ],
};

export function LandingJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </>
  );
}
