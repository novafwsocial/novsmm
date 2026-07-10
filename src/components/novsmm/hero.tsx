"use client";

import { useEffect, useRef, useState } from "react";
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

// PERF: HeroDashboard now uses lightweight SVG (no recharts) — can load
// directly without dynamic import. SSR-enabled for instant render.

export function Hero() {
  const { setView } = useApp();
  const sectionRef = useRef<HTMLElement>(null);

  // Live orders/min — fetched from /api/status (public). Falls back to 1200
  // if the request fails so the eyebrow never renders empty.
  // PERF: Uses shared cache — Hero, Stats, and AffiliateSection all share
  // a single /api/status request via useCachedFetch.
  const statusData = useCachedFetch<any>("/api/status");
  const [ordersPerMin, setOrdersPerMin] = useState(1200);
  useEffect(() => {
    if (statusData?.stats?.ordersPerMin) {
      setOrdersPerMin(statusData.stats.ordersPerMin);
    }
  }, [statusData]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28"
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
            className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Now processing
            <span className="text-foreground">
              <Counter to={ordersPerMin} duration={2.2} /> orders/min
            </span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Headline */}
        <h1
          className="mx-auto mt-7 max-w-4xl text-center text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-balance"
          style={{ animation: "heroFadeBlur 1s 0.06s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          The infrastructure for{" "}
          <span className="nov-text-gradient">social media marketing</span> at
          scale.
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground text-pretty sm:text-xl"
          style={{ animation: "heroFadeUp 0.9s 0.16s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          NOVSMM unifies order automation, a reseller marketplace, and payments
          into one platform — engineered for teams that ship at the speed of
          attention.
        </p>

        {/* CTAs */}
        <div
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animation: "heroFadeUp 0.9s 0.26s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          <Magnetic as="button" strength={0.3} onClick={() => setView("register")}>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
              Start free
              <ArrowRight className="h-4 w-4" />
            </span>
          </Magnetic>
          <Magnetic as="button" strength={0.25} onClick={() => setView("login")}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-7 py-3.5 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-muted">
              <Play className="h-3.5 w-3.5 fill-current" />
              Sign in
            </span>
          </Magnetic>
        </div>

        {/* trust line */}
        <div
          className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
          style={{ animation: "heroFade 0.9s 0.4s both" }}
        >
          {[
            "No credit card required",
            "99.99% uptime SLA",
            "SOC 2 controls",
          ].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t}
            </span>
          ))}
        </div>

        {/* Dashboard preview — lazy-loaded with placeholder */}
        <div
          className="relative mx-auto mt-16 max-w-6xl"
          style={{ animation: "heroFadeUpBlur 1.1s 0.42s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          {/* Floating stat chips — depth layers (hidden on mobile, perf) */}
          <FloatingChip
            className="absolute -left-2 top-16 hidden sm:flex"
            delay={0.7}
            icon={<Wallet className="h-3.5 w-3.5 text-primary" />}
            label="Balance"
            value={
              <>
                $<Counter to={8420.5} decimals={2} duration={2.4} />
              </>
            }
          />
          <FloatingChip
            className="absolute -right-2 top-24 hidden sm:flex"
            delay={0.9}
            icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
            label="Today"
            value={<Counter to={312} suffix="+%" duration={0} />}
          />
          <FloatingChip
            className="absolute -left-4 bottom-10 hidden lg:flex"
            delay={1.1}
            icon={<Zap className="h-3.5 w-3.5 text-primary" />}
            label="Avg. start"
            value={<><Counter to={1.4} decimals={1} duration={2} />s</>}
          />
          <FloatingChip
            className="absolute -right-6 bottom-24 hidden lg:flex"
            delay={1.3}
            icon={<Activity className="h-3.5 w-3.5 text-emerald-500" />}
            label="Active services"
            value={<Counter to={242} duration={2.2} />}
          />

          <div className="relative overflow-hidden rounded-[20px] nov-ring-lg nov-grain bg-background">
            <HeroDashboard />
          </div>

          {/* glow under dashboard */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 left-1/2 h-40 w-3/4 -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]"
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
      className={`z-20 items-center gap-2.5 rounded-2xl border border-border/60 bg-background/90 px-3.5 py-2.5 nov-ring backdrop-blur-xl ${className ?? ""}`}
      style={{
        animation: `chipIn 0.7s ${delay}s cubic-bezier(0.16, 1, 0.3, 1) both`,
      }}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {value}
        </span>
      </span>
    </div>
  );
}
