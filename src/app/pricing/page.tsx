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

export default function PricingPage() {
  return <PricingClient />;
}
