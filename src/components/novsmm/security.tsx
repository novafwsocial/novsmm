"use client";

import { motion } from "motion/react";
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

const LAYERS = [
  {
    icon: ShieldCheck,
    title: "DDoS shielding",
    desc: "Always-on L3/L4/L7 mitigation at the edge. 2.4 Tbps capacity.",
    metric: "0 attacks breached",
    state: "ok",
  },
  {
    icon: Lock,
    title: "TLS 1.3 everywhere",
    desc: "End-to-end encryption in transit. HSTS preload, OCSP stapling.",
    metric: "A+ rating · SSL Labs",
    state: "ok",
  },
  {
    icon: KeyRound,
    title: "AES-256 at rest",
    desc: "All wallets, keys, and PII encrypted with per-tenant DEKs.",
    metric: "FIPS 140-2 modules",
    state: "ok",
  },
  {
    icon: DatabaseBackup,
    title: "Continuous backups",
    desc: "PITR every 60s, cross-region replicas, 30-day retention.",
    metric: "RPO 60s · RTO 5m",
    state: "ok",
  },
  {
    icon: ServerCog,
    title: "High availability",
    desc: "Active-active across 3 regions. Auto-failover under 30s.",
    metric: "99.99% uptime SLA",
    state: "ok",
  },
  {
    icon: Radar,
    title: "API protection",
    desc: "Per-key rate limits, anomaly detection, signed webhooks.",
    metric: "<0.01% bad requests",
    state: "ok",
  },
  {
    icon: ScrollText,
    title: "Audit logs",
    desc: "Immutable, exportable logs for every privileged action.",
    metric: "12-month retention",
    state: "ok",
  },
  {
    icon: Fingerprint,
    title: "Secure auth",
    desc: "SSO, 2FA, passkeys, hardware keys. SCIM provisioning.",
    metric: "Passkey + WebAuthn",
    state: "ok",
  },
];

export function Security() {
  return (
    <section id="security" className="relative overflow-hidden py-24 sm:py-32">
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
          eyebrow="Security"
          title={
            <>
              Security you can see —
              <br className="hidden sm:block" /> not just a checklist.
            </>
          }
          description="Every layer below is instrumented, monitored, and surfaced live to operators. This is the posture enterprise teams require."
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
              <RevealItem key={l.title} blur>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-4 transition-shadow hover:nov-ring-lg">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <l.icon className="h-4 w-4" />
                    </span>
                    <StatusPill state={l.state as "ok"} />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">
                    {l.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {l.desc}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[10px] font-medium text-foreground/70">
                    <Activity className="h-3 w-3 text-emerald-600" />
                    {l.metric}
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
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        state === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      active
    </span>
  );
}

function ShieldVisual() {
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
        { label: "Edge", x: "12%", y: "18%" },
        { label: "App", x: "82%", y: "26%" },
        { label: "Data", x: "16%", y: "78%" },
        { label: "Keys", x: "80%", y: "74%" },
      ].map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
          className="absolute flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-2.5 py-1 text-[10px] font-medium text-foreground/80 backdrop-blur-md"
          style={{ left: p.x, top: p.y, transform: "translate(-50%, -50%)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {p.label}
        </motion.div>
      ))}

      {/* bottom metric strip */}
      <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
        <Metric label="Threats blocked" value={<Counter to={8.2} decimals={1} duration={2} suffix="M" />} />
        <Metric label="MTTR" value={<><Counter to={4.3} decimals={1} duration={2} />m</>} />
        <Metric label="Regions" value={<Counter to={3} duration={1.4} />} />
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
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
