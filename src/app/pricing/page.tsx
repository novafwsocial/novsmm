import { Metadata } from "next";
import { PricingClient } from "@/components/novsmm/pricing-page";

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

export const metadata: Metadata = {
  title: "Pricing — NOVSMM",
  description:
    "Simple, transparent NOVSMM pricing. Start free on Starter, scale on Pro ($29/mo), or talk to us about Enterprise. No hidden fees, cancel anytime.",
  keywords: [
    "NOVSMM pricing",
    "SMM panel pricing",
    "social media marketing plans",
    "reseller marketplace pricing",
    "SaaS SMM platform",
  ],
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${SITE_ORIGIN}/pricing`,
  },
  openGraph: {
    title: "Pricing — NOVSMM",
    description:
      "Start free, scale to Pro ($29/mo), or go Enterprise. NOVSMM pricing is transparent and flexible.",
    url: `${SITE_ORIGIN}/pricing`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — NOVSMM",
    description:
      "Start free, scale to Pro ($29/mo), or go Enterprise. Transparent NOVSMM pricing.",
  },
};

// SEO FIX (U-M-008): JSON-LD Product + Offer structured data for the pricing
// page. Google uses this to display price + availability in search results.
// Without it, /pricing is just a plain page — with it, Google can show
// rich price snippets (e.g. "From $0" or "$29/mo") in SERPs.
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "NOVSMM Platform",
  description:
    "Automation infrastructure for social media marketing at scale — order automation, reseller marketplace, and payments.",
  brand: { "@type": "Brand", name: "NOVSMM" },
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "0",
      priceCurrency: "USD",
      description: "Free forever — no credit card required. Includes core platform features.",
      url: SITE_ORIGIN,
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "29",
      priceCurrency: "USD",
      description: "$29/month — advanced automation, API access, priority support. Save 20% yearly.",
      url: SITE_ORIGIN,
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      price: "0",
      priceCurrency: "USD",
      description: "Custom pricing — white-label, dedicated infrastructure, SLA. Contact sales.",
      url: SITE_ORIGIN,
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <PricingClient />
    </>
  );
}
