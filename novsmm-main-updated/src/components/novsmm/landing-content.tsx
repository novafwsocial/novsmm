"use client";

import dynamic from "next/dynamic";
import { ScrollProgress } from "./scroll-progress";
import { Navbar } from "./navbar";
import { Hero } from "./hero";

function SectionSkeleton({ id, minHeight = 400 }: { id?: string; minHeight?: number }) {
  return (
    <section id={id} className="relative flex items-center justify-center bg-background" style={{ minHeight }} aria-busy="true" aria-label="Loading content">
      <div className="flex flex-col items-center gap-3 opacity-40">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
    </section>
  );
}

const Stats = dynamic(() => import("./stats").then((m) => ({ default: m.Stats })), { loading: () => <SectionSkeleton id="stats" minHeight={500} /> });
const Services = dynamic(() => import("./services").then((m) => ({ default: m.Services })), { loading: () => <SectionSkeleton id="services" minHeight={500} /> });
const Marketplace = dynamic(() => import("./marketplace").then((m) => ({ default: m.Marketplace })), { loading: () => <SectionSkeleton id="marketplace" minHeight={600} /> });
const Payments = dynamic(() => import("./payments").then((m) => ({ default: m.Payments })), { loading: () => <SectionSkeleton id="payments" minHeight={500} /> });
const Testimonials = dynamic(() => import("./testimonials").then((m) => ({ default: m.Testimonials })), { loading: () => <SectionSkeleton id="testimonials" minHeight={400} /> });
const Security = dynamic(() => import("./security").then((m) => ({ default: m.Security })), { loading: () => <SectionSkeleton id="security" minHeight={500} /> });
const ApiDocsSection = dynamic(() => import("./api-docs-section").then((m) => ({ default: m.ApiDocsSection })), { loading: () => <SectionSkeleton id="api-docs" minHeight={400} /> });
const AffiliateSection = dynamic(() => import("./affiliate-section").then((m) => ({ default: m.AffiliateSection })), { loading: () => <SectionSkeleton id="affiliates" minHeight={500} /> });
const Faq = dynamic(() => import("./faq").then((m) => ({ default: m.Faq })), { loading: () => <SectionSkeleton minHeight={400} /> });
const Footer = dynamic(() => import("./footer").then((m) => ({ default: m.Footer })), { loading: () => <SectionSkeleton minHeight={300} /> });

/** Hydrated landing surface. Interactive controls stay in one client boundary. */
export function LandingContent() {
  return (
    <>
      <Navbar />
      <ScrollProgress />
      <main id="main-content" className="flex-1 pb-60 sm:pb-0">
        <Hero />
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
  );
}
