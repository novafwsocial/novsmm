"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  DatabaseBackup,
  ServerCog,
  Radar,
  ScrollText,
  Fingerprint,
  Activity,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { Counter } from "./counter";
import { useLanguage } from "./language-provider";

// i18n (U-C-006): LAYERS holds the icon + translation keys. The title/desc/
// metric strings are looked up at render time via t().
const LAYERS = [
  {
    icon: ShieldCheck,
    titleKey: "landing.security.layer.ddos.title",
    descKey: "landing.security.layer.ddos.desc",
    metricKey: "landing.security.layer.ddos.metric",
    state: "ok",
  },
  {
    icon: Lock,
    titleKey: "landing.security.layer.tls.title",
    descKey: "landing.security.layer.tls.desc",
    metricKey: "landing.security.layer.tls.metric",
    state: "ok",
  },
  {
    icon: KeyRound,
    titleKey: "landing.security.layer.aes.title",
    descKey: "landing.security.layer.aes.desc",
    metricKey: "landing.security.layer.aes.metric",
    state: "ok",
  },
  {
    icon: DatabaseBackup,
    titleKey: "landing.security.layer.backups.title",
    descKey: "landing.security.layer.backups.desc",
    metricKey: "landing.security.layer.backups.metric",
    state: "ok",
  },
  {
    icon: ServerCog,
    titleKey: "landing.security.layer.ha.title",
    descKey: "landing.security.layer.ha.desc",
    metricKey: "landing.security.layer.ha.metric",
    state: "ok",
  },
  {
    icon: Radar,
    titleKey: "landing.security.layer.api.title",
    descKey: "landing.security.layer.api.desc",
    metricKey: "landing.security.layer.api.metric",
    state: "ok",
  },
  {
    icon: ScrollText,
    titleKey: "landing.security.layer.audit.title",
    descKey: "landing.security.layer.audit.desc",
    metricKey: "landing.security.layer.audit.metric",
    state: "ok",
  },
  {
    icon: Fingerprint,
    titleKey: "landing.security.layer.auth.title",
    descKey: "landing.security.layer.auth.desc",
    metricKey: "landing.security.layer.auth.metric",
    state: "ok",
  },
];

export function Security() {
  const { t } = useLanguage();
  return (
    <section id="security" className="relative overflow-hidden py-8 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      {/* deep dark surface for contrast */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.973 0.001 285), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("landing.security.eyebrow")}
          title={
            <>
              {t("landing.security.titleLine1")}
              <br className="hidden sm:block" /> {t("landing.security.titleLine2")}
            </>
          }
          description={t("landing.security.description")}
        />

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Shield visual */}
          <Reveal blur className="lg:col-span-5">
            <ShieldVisual />
          </Reveal>

          {/* Layers grid */}
          <RevealStagger
            stagger={0.05}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7"
          >
            {LAYERS.map((l) => (
              <RevealItem key={l.titleKey} blur>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-4 transition-shadow hover:nov-ring-lg">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <l.icon className="h-4 w-4" />
                    </span>
                    <StatusPill state={l.state as "ok"} />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">
                    {t(l.titleKey)}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t(l.descKey)}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground/70">
                    <Activity className="h-3 w-3 text-emerald-600" />
                    {t(l.metricKey)}
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ state }: { state: "ok" | "warn" }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        state === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      {t("landing.security.statusActive")}
    </span>
  );
}

function ShieldVisual() {
  const { t } = useLanguage();
  // radar sweep + concentric layers + metrics
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-3xl border border-border/60 bg-background nov-ring">
      <div className="absolute inset-0 nov-grid-bg opacity-40" />

      {/* concentric rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {[180, 260, 340].map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.15 }}
            className="absolute rounded-full border border-primary/15"
            style={{
              width: s,
              height: s,
              left: -s / 2,
              top: -s / 2,
            }}
          />
        ))}

        {/* radar sweep */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2 origin-center"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(0, 82, 255, 0.25), transparent 70%)",
            borderRadius: "9999px",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* center shield */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-primary text-primary-foreground nov-shadow-blue"
        >
          <ShieldCheck className="h-9 w-9" />
        </motion.div>
      </div>

      {/* floating layer labels */}
      {[
        { label: t("landing.security.shield.edge"), x: "12%", y: "18%" },
        { label: t("landing.security.shield.app"), x: "82%", y: "26%" },
        { label: t("landing.security.shield.data"), x: "16%", y: "78%" },
        { label: t("landing.security.shield.keys"), x: "80%", y: "74%" },
      ].map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
          className="absolute flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground/80 backdrop-blur-md"
          style={{ left: p.x, top: p.y, transform: "translate(-50%, -50%)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {p.label}
        </motion.div>
      ))}

      {/* bottom metric strip */}
      <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
        <Metric label={t("landing.security.metric.threats")} value={<Counter to={8.2} decimals={1} duration={2} suffix="M" />} />
        <Metric label={t("landing.security.metric.mttr")} value={<><Counter to={4.3} decimals={1} duration={2} />m</>} />
        <Metric label={t("landing.security.metric.regions")} value={<Counter to={3} duration={1.4} />} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 px-2.5 py-2 text-center backdrop-blur-md">
      <div className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
