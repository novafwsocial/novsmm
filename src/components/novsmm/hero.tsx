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
import { motion, useScroll, useTransform } from "framer-motion";

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

  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityHero = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section
      id="hero"
      className="nov-anchor-section relative overflow-hidden bg-background pt-24 pb-12 sm:pt-40 sm:pb-32"
    >
      <motion.div 
        className="mx-auto max-w-7xl px-4 sm:px-8"
        style={{ y: yHero, opacity: opacityHero }}
      >
        {/* Eyebrow */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
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
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mx-auto mt-6 max-w-5xl text-center text-[clamp(2.25rem,8vw,5.5rem)] font-bold leading-[1.03] tracking-tight text-foreground text-balance sm:mt-8 sm:text-[clamp(2.5rem,7vw,5.5rem)]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
        >
          {t("landing.hero.title")} <br className="hidden sm:block" />
          <span className="text-foreground">{t("landing.hero.titleHighlight")}</span> {t("landing.hero.titleEnd")}
        </motion.h1>

        <motion.p
          className="mx-auto mt-4 max-w-2xl text-center text-base font-light leading-relaxed text-muted-foreground text-pretty sm:mt-6 sm:text-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
        >
          {t("landing.hero.subtitle")}
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
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
        </motion.div>

        {/* Trust line */}
        <motion.div
          className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground sm:mt-6 sm:gap-x-6 sm:text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
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
        </motion.div>

        {/* Dashboard preview — Layered Card (Black) */}
        <motion.div
          className="relative mx-auto mt-14 max-w-6xl sm:mt-20"
          initial={{ opacity: 0, scale: 0.95, y: 60 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.4 }}
        >
          {/* Floating stat chips — strict B&W pill geometry */}
          <FloatingChip
            className="absolute -left-6 top-12 hidden sm:flex"
            delay={0.6}
            icon={<Wallet className="h-4 w-4 text-primary" />}
            label="Balance"
            value={<>$<Counter to={8420.5} decimals={2} duration={2.4} /></>}
          />
          <FloatingChip
            className="absolute -right-6 top-32 hidden sm:flex"
            delay={0.8}
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            label="Growth"
            value={<Counter to={312} suffix="+%" duration={2} />}
          />
          <FloatingChip
            className="absolute -left-10 bottom-16 hidden lg:flex"
            delay={1.0}
            icon={<Zap className="h-4 w-4 text-primary" />}
            label="Avg. Start"
            value={<><Counter to={1.4} decimals={1} duration={2} />s</>}
          />
          <FloatingChip
            className="absolute -right-12 bottom-32 hidden lg:flex"
            delay={1.2}
            icon={<Activity className="h-4 w-4 text-primary" />}
            label="Active"
            value={<Counter to={242} duration={2.2} />}
          />

          <div className="relative overflow-hidden rounded-xl border-2 border-border bg-primary text-primary-foreground p-2">
            <HeroDashboard />
          </div>
        </motion.div>
      </motion.div>
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
      className={`z-20 items-center gap-3 rounded-full border border-border bg-background px-5 py-3 shadow-none ${className ?? ""}`}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 15, delay }}
      whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}
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
