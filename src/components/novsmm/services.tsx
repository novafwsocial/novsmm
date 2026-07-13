"use client";

import { ArrowUpRight } from "lucide-react";
import { PLATFORMS, type Platform } from "./platforms";
import { PlatformLogo } from "./platform-logo";
import { SectionHeading } from "./section-heading";
import { Scroll3DReveal } from "./scroll-3d-reveal";
import { useLanguage } from "./language-provider";

export function Services() {
  const { t } = useLanguage();
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("landing.services.eyebrow")}
          title={
            <>
              {t("landing.services.titleLine1")}
              <br className="hidden sm:block" /> {t("landing.services.titleLine2")}
            </>
          }
          description={t("landing.services.description")}
        />

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PLATFORMS.map((p, i) => (
            <Scroll3DReveal key={p.name} delay={i * 0.05}>
              <ServiceCard platform={p} />
            </Scroll3DReveal>
          ))}
          {/* Aggregate card */}
          <Scroll3DReveal delay={PLATFORMS.length * 0.05}>
            <div className="group relative flex h-full min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-border bg-muted/30 p-5 transition-colors hover:border-primary/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("landing.services.moreLabel")}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">6,382</div>
                <div className="text-xs text-muted-foreground">
                  {t("landing.services.totalServices")}
                </div>
              </div>
            </div>
          </Scroll3DReveal>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ platform }: { platform: Platform }) {
  const { t } = useLanguage();
  return (
    <div
      className="group relative flex h-full min-h-[170px] flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-background p-5 transition-all duration-300 hover:-translate-y-1 hover:nov-ring-lg"
    >
      {/* Hover glow — CSS-only, no JS tracking */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/50 transition-colors group-hover:border-primary/30">
          <PlatformLogo platform={platform.name} size={24} />
        </span>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          {platform.services} {t("landing.services.svcUnit")}
        </span>
      </div>
      <div className="relative">
        <div className="text-base font-semibold text-foreground">
          {platform.name}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {platform.blurb}
        </p>
      </div>
    </div>
  );
}
