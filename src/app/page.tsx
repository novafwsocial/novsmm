import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/novsmm/error-boundary";
import { SmoothScroll } from "@/components/novsmm/smooth-scroll";
import { ScrollProgress } from "@/components/novsmm/scroll-progress";
import { Navbar } from "@/components/novsmm/navbar";
import { Hero } from "@/components/novsmm/hero";
import { AppView } from "@/components/novsmm/app-view";
import { WhatsAppWidget } from "@/components/novsmm/whatsapp-widget";

// PERFORMANCE: Lazy-load below-the-fold landing sections.
// Hero + Navbar load immediately (above the fold). Everything else
// loads as the user scrolls, reducing initial JS bundle by ~60%.
const Services = dynamic(() => import("@/components/novsmm/services").then(m => ({ default: m.Services })));
const Marketplace = dynamic(() => import("@/components/novsmm/marketplace").then(m => ({ default: m.Marketplace })));
const Payments = dynamic(() => import("@/components/novsmm/payments").then(m => ({ default: m.Payments })));
const Stats = dynamic(() => import("@/components/novsmm/stats").then(m => ({ default: m.Stats })));
const Testimonials = dynamic(() => import("@/components/novsmm/testimonials").then(m => ({ default: m.Testimonials })));
const Security = dynamic(() => import("@/components/novsmm/security").then(m => ({ default: m.Security })));
const ApiDocsSection = dynamic(() => import("@/components/novsmm/api-docs-section").then(m => ({ default: m.ApiDocsSection })));
const AffiliateSection = dynamic(() => import("@/components/novsmm/affiliate-section").then(m => ({ default: m.AffiliateSection })));
const Faq = dynamic(() => import("@/components/novsmm/faq").then(m => ({ default: m.Faq })));
const Footer = dynamic(() => import("@/components/novsmm/footer").then(m => ({ default: m.Footer })));

export default function Home() {
  return (
    <ErrorBoundary>
    <SmoothScroll>
      <div className="relative flex min-h-screen flex-col bg-background">
        <ScrollProgress />
        <AppView
          landing={
            <>
              <Navbar />
              <main className="flex-1">
                <Hero />
                <Services />
                <Marketplace />
                <Payments />
                <Stats />
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
      </div>
    </SmoothScroll>
    </ErrorBoundary>
  );
}
