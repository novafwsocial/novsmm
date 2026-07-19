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
    <section id="services" className="nov-anchor-section relative py-4 sm:py-32">
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

        <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((p, i) => (
            <Scroll3DReveal key={p.name} delay={i * 0.05}>
              <ServiceCard platform={p} />
            </Scroll3DReveal>
          ))}
          {/* Aggregate card */}
          <Scroll3DReveal delay={PLATFORMS.length * 0.05}>
            <div className="group relative flex h-full min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-border bg-background p-5 transition-colors hover:border-foreground">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                  {t("landing.services.moreLabel")}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-foreground" />
              </div>
              <div>
                <div className="font-sans text-2xl font-bold tabular-nums text-foreground">6,382</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
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
      className="group relative flex h-full min-h-[170px] flex-col justify-between gap-3 rounded-2xl border border-border bg-background p-5 transition-all duration-300 hover:-translate-y-1 hover:border-foreground"
    >
      <div className="relative flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background transition-colors group-hover:bg-foreground group-hover:text-background text-foreground">
          <PlatformLogo platform={platform.name} size={24} />
        </span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest tabular-nums text-muted-foreground group-hover:text-foreground transition-colors">
          {platform.services} {t("landing.services.svcUnit")}
        </span>
      </div>
      <div className="relative">
        <div className="font-sans text-base font-bold text-foreground transition-colors">
          {platform.name}
        </div>
        <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {platform.blurb}
        </p>
      </div>
    </div>
  );
}
