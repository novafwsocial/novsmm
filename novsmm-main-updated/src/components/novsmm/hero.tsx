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
  Sparkles,
} from "lucide-react";
import { Magnetic } from "./magnetic";
import { Counter } from "./counter";
import { HeroDashboard } from "./hero-dashboard";
import { useApp } from "./app-store";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { motion } from "framer-motion";

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
      className="nov-anchor-section relative overflow-hidden bg-background pt-24 pb-12 sm:pt-32 sm:pb-24"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(0,82,255,0.12),transparent_44%),radial-gradient(circle_at_80%_10%,rgba(15,23,42,0.08),transparent_28%)]" />
        <div className="absolute inset-0 nov-grid-bg opacity-35" />
        <div className="absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[110px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-14">
          <motion.div
            className="relative z-10 flex flex-col items-start"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 90, damping: 18 }}
          >
            <a
              href="#stats"
              className="group inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground shadow-sm backdrop-blur-md hover:bg-muted/60 sm:px-4 sm:py-2.5 sm:text-xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-500 opacity-20" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {t("landing.hero.badge")}
              <span className="hidden text-muted-foreground sm:inline">
                <Counter to={ordersPerMin} from={ordersPerMin} duration={2.2} /> orders/min
              </span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </a>

            <h1 className="mt-6 max-w-4xl text-left text-[clamp(2.6rem,8vw,5.8rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-balance text-foreground sm:mt-8 sm:text-[clamp(3rem,6.8vw,6rem)]">
              {t("landing.hero.title")}{" "}
              <span className="text-foreground/86">
                {t("landing.hero.titleHighlight")}
              </span>{" "}
              {t("landing.hero.titleEnd")}
            </h1>

            <p className="mt-5 max-w-2xl text-left text-base leading-relaxed text-pretty text-muted-foreground sm:mt-6 sm:text-xl">
              {t("landing.hero.subtitle")}
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Magnetic as="button" strength={0.3} onClick={() => setView("register")}>
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-sm font-semibold tracking-wide text-primary-foreground transition-shadow hover:nov-shadow-blue sm:w-auto sm:px-8">
                  {t("landing.hero.startFree")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Magnetic>
              <Magnetic as="button" strength={0.25} onClick={() => setView("login")}>
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-7 py-4 text-sm font-semibold tracking-wide text-foreground transition-colors hover:bg-muted sm:w-auto sm:px-8">
                  <Play className="h-4 w-4 fill-current" />
                  {t("landing.hero.signIn")}
                </span>
              </Magnetic>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground sm:mt-6 sm:gap-x-6 sm:text-xs">
              {[
                t("landing.hero.noCardRequired"),
                t("landing.hero.uptimeSLA"),
                t("landing.hero.soc2"),
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 hidden w-full max-w-2xl grid-cols-1 gap-3 sm:grid sm:grid-cols-3">
              {[
                {
                  label: "Order routing",
                  value: "live",
                  icon: <Sparkles className="h-4 w-4 text-primary" />,
                },
                {
                  label: "API-ready workflows",
                  value: "PerfectPanel",
                  icon: <Activity className="h-4 w-4 text-primary" />,
                },
                {
                  label: "Payout rails",
                  value: "4 gateways",
                  icon: <Wallet className="h-4 w-4 text-primary" />,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur-md"
                >
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {card.icon}
                    {card.label}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative mx-auto w-full max-w-[640px]"
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 75, damping: 18, delay: 0.12 }}
          >
            <div className="pointer-events-none absolute -left-4 top-10 hidden xl:block">
              <FloatingChip
                delay={0.2}
                icon={<Wallet className="h-4 w-4 text-primary" />}
                label="Balance"
                value={<>$<Counter to={8420.5} decimals={2} duration={2.4} /></>}
              />
            </div>
            <div className="pointer-events-none absolute -right-4 top-28 hidden xl:block">
              <FloatingChip
                delay={0.35}
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                label="Growth"
                value={<Counter to={312} suffix="+%" duration={2} />}
              />
            </div>
            <div className="pointer-events-none absolute -left-8 bottom-14 hidden 2xl:block">
              <FloatingChip
                delay={0.45}
                icon={<Zap className="h-4 w-4 text-primary" />}
                label="Avg. start"
                value={<> <Counter to={1.4} decimals={1} duration={2} />s</>}
              />
            </div>
            <div className="pointer-events-none absolute -right-10 bottom-28 hidden 2xl:block">
              <FloatingChip
                delay={0.55}
                icon={<Activity className="h-4 w-4 text-primary" />}
                label="Active"
                value={<Counter to={242} duration={2.2} />}
              />
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-background p-3 shadow-[0_30px_120px_rgba(15,23,42,0.08)] sm:p-4">
              <div className="rounded-[1.5rem] border border-border/60 bg-gradient-to-b from-muted/35 to-background p-2 sm:p-3">
                <div className="flex flex-col gap-3 px-2 pb-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Live workspace
                    </div>
                    <div className="mt-1 text-sm text-foreground/70">
                      Premium cockpit for orders, balance, and operations
                    </div>
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-700">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Processing now <Counter to={ordersPerMin} from={ordersPerMin} duration={2.2} /> orders/min
                  </div>
                </div>

                <HeroDashboard />
              </div>
            </div>

            <div className="mt-4 hidden grid-cols-1 gap-3 lg:grid lg:grid-cols-3">
              {[
                { label: "No card required", value: "Fast onboarding" },
                { label: "Marketplace first", value: "Revenue ready" },
                { label: "Secure by default", value: "2FA + audit logs" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4 text-left shadow-sm backdrop-blur-md"
                  style={{ transform: `translateY(${i % 2 === 0 ? 0 : 8}px)` }}
                >
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
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
    <motion.div
      className={`z-20 flex items-center gap-3 rounded-full border border-border/70 bg-background/90 px-4 py-2.5 shadow-sm backdrop-blur-md ${className ?? ""}`}
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 15, delay }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 280 } }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="font-sans text-sm font-bold text-foreground tabular-nums">
          {value}
        </span>
      </span>
    </motion.div>
  );
}
