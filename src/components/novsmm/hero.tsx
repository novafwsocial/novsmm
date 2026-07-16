"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./language-provider";
import {
  ArrowRight,
  Play,
  CheckCircle2,
} from "lucide-react";
import { Magnetic } from "./magnetic";
import { Counter } from "./counter";
import { HeroDashboard } from "./hero-dashboard";
import { Tilt3D } from "./tilt-3d";
import { useApp } from "./app-store";
import { useCachedFetch } from "@/hooks/use-cached-fetch";

// PERF: HeroDashboard now uses lightweight SVG (no recharts) — can load
// directly without dynamic import. SSR-enabled for instant render.

export function Hero() {
  const { setView } = useApp();
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);

  // Live orders/min — fetched from /api/status (public). Keep zero when the
  // platform is idle or telemetry is unavailable; never invent throughput.
  // PERF: Uses shared cache — Hero, Stats, and AffiliateSection all share
  // a single /api/status request via useCachedFetch.
  //
  const statusData = useCachedFetch<any>("/api/status");
  const [ordersPerMin, setOrdersPerMin] = useState(0);
  useEffect(() => {
    if (statusData?.stats?.ordersPerMin != null) {
      setOrdersPerMin(Number(statusData.stats.ordersPerMin) || 0);
    }
  }, [statusData]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative overflow-hidden pt-10 pb-4 sm:pt-40 sm:pb-28"
    >
      {/* Background layers — depth (CSS-only, no scroll tracking) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 nov-grid-bg nov-radial-fade" />
        <div className="absolute left-1/2 top-[-10%] h-[480px] w-[840px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute right-[8%] top-[28%] h-[320px] w-[320px] rounded-full bg-emerald-400/10 blur-[100px]" />
        <div className="absolute left-[6%] bottom-[12%] h-[280px] w-[280px] rounded-full bg-primary/[0.05] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Eyebrow */}
        <div
          className="flex justify-center"
          style={{ animation: "heroFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <a
            href="#stats"
            className="group inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {t("landing.hero.badge")}
            <span className="text-foreground">
              {/* MOB-002 FIX: from=ordersPerMin so SSR shows the value, not 0 */}
              <Counter to={ordersPerMin} from={ordersPerMin} duration={2.2} /> orders/min
            </span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Headline */}
        <h1
          className="mx-auto mt-3 sm:mt-7 max-w-4xl text-center text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-balance"
          style={{ animation: "heroFadeBlur 1s 0.06s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          {t("landing.hero.title")}{" "}
          <span className="nov-text-gradient">{t("landing.hero.titleHighlight")}</span> {t("landing.hero.titleEnd")}
        </h1>

        <p
          className="mx-auto mt-3 sm:mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl"
          style={{ animation: "heroFadeUp 0.9s 0.16s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          {t("landing.hero.subtitle")}
        </p>

        {/* CTAs */}
        <div
          className="mt-4 sm:mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          style={{ animation: "heroFadeUp 0.9s 0.26s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          <Magnetic as="button" strength={0.3} onClick={() => setView("register")}>
            <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue sm:w-auto">
              {t("landing.hero.startFree")}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Magnetic>
          <Magnetic as="button" strength={0.25} onClick={() => setView("login")}>
            <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-7 py-3.5 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-muted sm:w-auto">
              <Play className="h-3.5 w-3.5 fill-current" />
              {t("landing.hero.signIn")}
            </span>
          </Magnetic>
        </div>

        {/* trust line */}
        <div
          className="mt-3 sm:mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
          style={{ animation: "heroFade 0.9s 0.4s both" }}
        >
          {[
            t("landing.hero.noCardRequired"),
          ].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t}
            </span>
          ))}
        </div>

        {/* Dashboard preview — lazy-loaded with placeholder */}
        <div
          className="relative mx-auto mt-6 sm:mt-16 max-w-6xl"
          style={{ animation: "heroFadeUpBlur 1.1s 0.42s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          <div className="absolute right-3 top-3 z-10 rounded-full border border-border/60 bg-background/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
            Demo preview · datos ilustrativos
          </div>
          <Tilt3D className="relative overflow-hidden rounded-[20px] nov-ring-lg nov-grain bg-background" maxTilt={6}>
            <HeroDashboard />
          </Tilt3D>

          {/* glow under dashboard */}
          <div
            aria-hidden
            className="glow-3d pointer-events-none absolute -bottom-10 left-1/2 h-40 w-3/4 -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]"
          />
        </div>
      </div>
    </section>
  );
}
