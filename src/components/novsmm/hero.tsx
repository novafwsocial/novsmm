"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./language-provider";
import {
  ArrowRight,
  Play,
  TrendingUp,
  Wallet,
  Activity,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Magnetic } from "./magnetic";
import { Counter } from "./counter";
import { HeroDashboard } from "./hero-dashboard";
import { useApp } from "./app-store";
import { useCachedFetch } from "@/hooks/use-cached-fetch";

export function Hero() {
  const { setView } = useApp();
  const { t } = useLanguage();

  const statusData = useCachedFetch<any>("/api/status");
  const [ordersPerMin, setOrdersPerMin] = useState(1200);
  useEffect(() => {
    if (statusData?.stats?.ordersPerMin != null) {
      setOrdersPerMin(Math.max(1200, Number(statusData.stats.ordersPerMin) || 0));
    }
  }, [statusData]);

  return (
    <section
      id="hero"
      className="nov-anchor-section relative overflow-hidden bg-background pt-24 pb-12 sm:pt-40 sm:pb-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        {/* Eyebrow */}
        <div
          className="flex justify-center fm-fade-up"
          style={{ animationDuration: "0.6s" }}
        >
          <a
            href="#stats"
            className="group inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm hover:bg-muted sm:text-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-foreground opacity-20" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
            </span>
            {t("landing.hero.badge")}
            <span>
              <Counter to={ordersPerMin} from={ordersPerMin} duration={2.2} /> orders/min
            </span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* Headline */}
        <h1
          className="mx-auto mt-6 max-w-5xl text-center text-[clamp(2.25rem,8vw,5.5rem)] font-bold leading-[1.03] tracking-tight text-foreground text-balance sm:mt-8 sm:text-[clamp(2.5rem,7vw,5.5rem)] fm-fade-up"
          style={{ animationDuration: "0.7s", animationDelay: "0.1s" }}
        >
          {t("landing.hero.title")} <br className="hidden sm:block" />
          <span className="text-foreground">{t("landing.hero.titleHighlight")}</span> {t("landing.hero.titleEnd")}
        </h1>

        <p
          className="mx-auto mt-4 max-w-2xl text-center text-base font-light leading-relaxed text-muted-foreground text-pretty sm:mt-6 sm:text-2xl fm-fade-up"
          style={{ animationDuration: "0.7s", animationDelay: "0.2s" }}
        >
          {t("landing.hero.subtitle")}
        </p>

        {/* CTAs */}
        <div
          className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4 fm-fade-up"
          style={{ animationDuration: "0.7s", animationDelay: "0.3s" }}
        >
          <Magnetic as="button" strength={0.3} onClick={() => setView("register")}>
            <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-wide text-primary-foreground sm:w-auto">
              {t("landing.hero.startFree")}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Magnetic>
          <Magnetic as="button" strength={0.25} onClick={() => setView("login")}>
            <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-8 py-4 text-sm font-semibold uppercase tracking-wide text-foreground hover:bg-muted sm:w-auto">
              <Play className="h-4 w-4 fill-current" />
              {t("landing.hero.signIn")}
            </span>
          </Magnetic>
        </div>

        {/* Trust line */}
        <div
          className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground sm:mt-6 sm:gap-x-6 sm:text-xs fm-fade-up"
          style={{ animationDuration: "1s", animationDelay: "0.5s" }}
        >
          {[
            t("landing.hero.noCardRequired"),
            t("landing.hero.uptimeSLA"),
            t("landing.hero.soc2"),
          ].map((t) => (
            <span key={t} className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-foreground" />
              {t}
            </span>
          ))}
        </div>

        {/* Dashboard preview — Layered Card (Black) */}
        <div
          className="relative mx-auto mt-14 max-w-6xl sm:mt-20 fm-scale-in"
          style={{ animationDuration: "0.8s", animationDelay: "0.4s" }}
        >
          {/* Floating stat chips — strict B&W pill geometry */}
          <FloatingChip
            className="absolute -left-6 top-12 hidden sm:flex"
            delay={0.6}
            icon={<Wallet className="h-4 w-4 text-primary" />}
            label="Balance"
            value={
              <>
                $<Counter to={8420.5} decimals={2} from={8420.5} duration={2.4} />
              </>
            }
          />
          <FloatingChip
            className="absolute -right-6 top-24 hidden sm:flex"
            delay={0.8}
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
            label="Today"
            value={<Counter to={312} suffix="+%" from={312} duration={2} />}
          />
          <FloatingChip
            className="absolute -left-8 bottom-10 hidden lg:flex"
            delay={1.0}
            icon={<Zap className="h-4 w-4 text-primary" />}
            label="Avg. start"
            value={<><Counter to={1.4} decimals={1} from={1.4} duration={2} />s</>}
          />
          <FloatingChip
            className="absolute -right-8 bottom-24 hidden lg:flex"
            delay={1.2}
            icon={<Activity className="h-4 w-4 text-emerald-500" />}
            label="Active services"
            value={<Counter to={242} from={242} duration={2.2} />}
          />

          <HeroDashboard />

          {/* glow under dashboard */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-8 left-1/2 h-40 w-3/4 -translate-x-1/2 rounded-full bg-primary/5 blur-[80px]"
          />
        </div>
      </div>
    </section>
  );
}

function FloatingChip({
  className,
  icon,
  label,
  value,
  delay = 0,
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className={`z-20 items-center gap-2.5 rounded-2xl border border-border/60 bg-background/95 px-3.5 py-2.5 nov-ring backdrop-blur-xl fm-fade-up ${className ?? ""}`}
      style={{ animationDuration: "0.5s", animationDelay: `${delay}s` }}
    >
      {icon}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}
