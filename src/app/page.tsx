import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/novsmm/error-boundary";
import { SmoothScroll } from "@/components/novsmm/smooth-scroll";
import { ScrollProgress } from "@/components/novsmm/scroll-progress";
import { Navbar } from "@/components/novsmm/navbar";
import { Hero } from "@/components/novsmm/hero";
import { AppView } from "@/components/novsmm/app-view";
import { WhatsAppWidget } from "@/components/novsmm/whatsapp-widget";
import { StickyCTA } from "@/components/novsmm/sticky-cta";
import { SocialProof } from "@/components/novsmm/social-proof";
import { LandingJsonLd } from "@/components/novsmm/landing-json-ld";
import { LandingCommandPalette } from "@/components/novsmm/landing-command-palette";

/**
 * PERF: Lazy-load below-the-fold landing sections.
 *
 * Hero + Navbar load immediately (above the fold). Everything else loads
 * as the user scrolls, reducing initial JS bundle by ~60%.
 *
 * Each lazy section has a skeleton placeholder (SectionSkeleton) so the
 * page doesn't show empty space while the chunk downloads. The skeleton
 * reserves the vertical space, preventing layout shift (CLS).
 */

// Skeleton placeholder — reserves space while the real section loads
function SectionSkeleton({ id, minHeight = 400 }: { id?: string; minHeight?: number }) {
  return (
    <section
      id={id}
      className="relative flex items-center justify-center bg-background"
      style={{ minHeight }}
      aria-busy="true"
      aria-label="Loading content"
    >
      <div className="flex flex-col items-center gap-3 opacity-40">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
    </section>
  );
}

const Services = dynamic(
  () => import("@/components/novsmm/services").then(m => ({ default: m.Services })),
  { loading: () => <SectionSkeleton id="services" minHeight={500} /> }
);
const Marketplace = dynamic(
  () => import("@/components/novsmm/marketplace").then(m => ({ default: m.Marketplace })),
  { loading: () => <SectionSkeleton id="marketplace" minHeight={600} /> }
);
const Payments = dynamic(
  () => import("@/components/novsmm/payments").then(m => ({ default: m.Payments })),
  { loading: () => <SectionSkeleton id="payments" minHeight={500} /> }
);
const Stats = dynamic(
  () => import("@/components/novsmm/stats").then(m => ({ default: m.Stats })),
  { loading: () => <SectionSkeleton id="stats" minHeight={500} /> }
);
const Testimonials = dynamic(
  () => import("@/components/novsmm/testimonials").then(m => ({ default: m.Testimonials })),
  { loading: () => <SectionSkeleton id="testimonials" minHeight={400} /> }
);
const Security = dynamic(
  () => import("@/components/novsmm/security").then(m => ({ default: m.Security })),
  { loading: () => <SectionSkeleton id="security" minHeight={500} /> }
);
const ApiDocsSection = dynamic(
  () => import("@/components/novsmm/api-docs-section").then(m => ({ default: m.ApiDocsSection })),
  { loading: () => <SectionSkeleton id="api-docs" minHeight={400} /> }
);
const AffiliateSection = dynamic(
  () => import("@/components/novsmm/affiliate-section").then(m => ({ default: m.AffiliateSection })),
  { loading: () => <SectionSkeleton id="affiliates" minHeight={500} /> }
);
const Faq = dynamic(
  () => import("@/components/novsmm/faq").then(m => ({ default: m.Faq })),
  { loading: () => <SectionSkeleton minHeight={400} /> }
);
const Footer = dynamic(
  () => import("@/components/novsmm/footer").then(m => ({ default: m.Footer })),
  { loading: () => <SectionSkeleton minHeight={300} /> }
);

export default function Home() {
  return (
    <ErrorBoundary>
    <SmoothScroll>
      <div className="relative flex min-h-screen flex-col bg-background">
        {/* FULL-WEB-IMPROVEMENT-1: Landing-page JSON-LD (WebApplication,
            Service, FAQPage, BreadcrumbList). Server-rendered as static
            <script> tags so Google can crawl rich-result entities without
            executing JS. */}
        <LandingJsonLd />
        <ScrollProgress />
        <AppView
          landing={
            <>
              <Navbar />
              {/* id="main-content" — target of the skip-to-content link in layout.tsx (a11y) */}
              <main id="main-content" className="flex-1">
                <Hero />
                {/* FIX (U-H-006): Stats moved to 2nd position (was 5th).
                    Showing credibility numbers (6,300+ services, 1,200
                    orders/min, 99.99% uptime) immediately after the Hero
                    builds trust before the visitor scrolls into the
                    detailed Services/Marketplace/Payments sections.
                    +5-10% time-on-page per UX audit. */}
                <Stats />
                <Services />
                <Marketplace />
                <Payments />
                <Testimonials />
                <Security />
                <ApiDocsSection />
                <AffiliateSection />
                <Faq />
              </main>
              <Footer />
            </>
          }
        />
        {/* WhatsApp live chat — always visible across the entire app */}
        <WhatsAppWidget />
        <StickyCTA />
        <SocialProof />
        {/* UX (U-M-004): Command palette available on landing too */}
        <LandingCommandPalette />
      </div>
    </SmoothScroll>
    </ErrorBoundary>
  );
}
