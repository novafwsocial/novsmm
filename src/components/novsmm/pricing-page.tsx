"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { Reveal } from "./reveal";
import { useApp } from "./app-store";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

type Tier = {
  id: string;
  name: string;
  tagline: string;
  monthly: number | null; // null = custom
  yearly: number | null;
  highlighted?: boolean;
  cta: string;
  features: string[];
};

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For solo marketers testing the waters.",
    monthly: 0,
    yearly: 0,
    cta: "Start free",
    features: [
      "Up to 5 active orders",
      "Access to 11 service platforms",
      "Standard fulfillment priority",
      "Email support (48h SLA)",
      "Community marketplace access",
      "Basic analytics dashboard",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing teams shipping at scale.",
    monthly: 29,
    yearly: 24,
    highlighted: true,
    cta: "Start 14-day trial",
    features: [
      "Unlimited active orders",
      "All 11 platforms + priority providers",
      "High-priority fulfillment queue",
      "Priority support (4h SLA)",
      "Reseller marketplace (sell & earn)",
      "Advanced analytics + exports",
      "API access (10k req/mo)",
      "Custom child panels (up to 10)",
      "Webhook integrations",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For agencies and platforms with custom needs.",
    monthly: null,
    yearly: null,
    cta: "Contact sales",
    features: [
      "Everything in Pro, plus:",
      "Dedicated infrastructure & SLA",
      "Unlimited child panels",
      "Custom provider integrations",
      "SSO + advanced RBAC",
      "Dedicated account manager",
      "On-premise deployment option",
      "99.99% uptime guarantee",
      "Custom invoice & billing terms",
    ],
  },
];

const COMPARISON: { category: string; rows: { label: string; values: (string | boolean)[] }[] }[] = [
  {
    category: "Core platform",
    rows: [
      { label: "Service platforms", values: ["11", "11", "11 + custom"] },
      { label: "Active orders", values: ["5", "Unlimited", "Unlimited"] },
      { label: "Marketplace access", values: ["Buy only", "Buy + sell", "Buy + sell"] },
      { label: "Analytics dashboard", values: ["Basic", "Advanced", "Advanced + custom"] },
    ],
  },
  {
    category: "Automation & API",
    rows: [
      { label: "API access", values: [false, "10k req/mo", "Unlimited"] },
      { label: "Webhook integrations", values: [false, true, true] },
      { label: "Child panels", values: ["1", "10", "Unlimited"] },
      { label: "Custom providers", values: [false, false, true] },
    ],
  },
  {
    category: "Support & SLA",
    rows: [
      { label: "Support channel", values: ["Email", "Priority email + chat", "Dedicated manager"] },
      { label: "Response SLA", values: ["48h", "4h", "1h"] },
      { label: "Uptime guarantee", values: ["99.9%", "99.95%", "99.99%"] },
      { label: "On-premise option", values: [false, false, true] },
    ],
  },
];

function CellValue({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Included" />;
  if (v === false) return <span className="text-muted-foreground/40">—</span>;
  return <span className="text-sm text-foreground">{v}</span>;
}

export function PricingClient() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const { setView } = useApp();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to NOVSMM</span>
          </Link>
          <Link href="/" className="flex items-center gap-2" aria-label="NOVSMM home">
            <Logo className="h-7" showWord={false} />
            <span className="text-sm font-semibold tracking-tight">NOVSMM</span>
          </Link>
          <div className="w-[88px]" aria-hidden />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6 sm:py-20">
        {/* Hero */}
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" />
              Pricing
            </span>
            <h1 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance">
              Simple, transparent pricing that scales with you.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Start free, upgrade when you grow. No hidden fees, no lock-in. Cancel anytime.
            </p>
          </div>
        </Reveal>

        {/* Billing toggle */}
        <Reveal delay={0.06}>
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  billing === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  billing === "yearly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yearly
                <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* Tier cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((tier, i) => {
            const price = billing === "monthly" ? tier.monthly : tier.yearly;
            const isCustom = price === null;
            return (
              <Reveal key={tier.id} delay={0.08 * i} blur>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-3xl border bg-background p-6 sm:p-7",
                    tier.highlighted
                      ? "border-primary/40 shadow-[0_8px_40px_-12px_rgba(0,82,255,0.25)]"
                      : "border-border/60"
                  )}
                >
                  {tier.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  <div className="text-sm font-semibold text-foreground">{tier.name}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{tier.tagline}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    {isCustom ? (
                      <span className="text-3xl font-semibold tracking-tight">Custom</span>
                    ) : (
                      <>
                        <span className="text-4xl font-semibold tracking-tight tabular-nums">${price}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </>
                    )}
                  </div>
                  {!isCustom && billing === "yearly" && price > 0 && (
                    <div className="mt-1 text-[11px] text-emerald-600">Billed annually (${price * 12}/yr)</div>
                  )}
                  {!isCustom && price === 0 && (
                    <div className="mt-1 text-[11px] text-muted-foreground">Free forever</div>
                  )}

                  <Magnetic
                    as="button"
                    strength={0.2}
                    onClick={() => setView("register")}
                    className={cn(
                      "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-colors",
                      tier.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Magnetic>

                  <ul className="mt-7 flex flex-1 flex-col gap-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Comparison table */}
        <Reveal delay={0.1}>
          <div className="mt-20">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Compare plans
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
              Every plan includes access to all 11 service platforms and the reseller marketplace.
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-background">
              {/* Sticky header row */}
              <div className="grid grid-cols-4 border-b border-border/60 bg-muted/30">
                <div className="px-4 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                  Feature
                </div>
                {TIERS.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "px-2 py-4 text-center text-xs font-semibold uppercase tracking-wider sm:px-6",
                      t.highlighted ? "text-primary" : "text-foreground"
                    )}
                  >
                    {t.name}
                  </div>
                ))}
              </div>

              {/* Category groups */}
              {COMPARISON.map((group) => (
                <div key={group.category}>
                  <div className="border-b border-border/40 bg-muted/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                    {group.category}
                  </div>
                  {group.rows.map((row, idx) => (
                    <div
                      key={row.label}
                      className={cn(
                        "grid grid-cols-4 items-center",
                        idx !== group.rows.length - 1 && "border-b border-border/40"
                      )}
                    >
                      <div className="px-4 py-3.5 text-sm text-foreground sm:px-6">{row.label}</div>
                      {row.values.map((v, vi) => (
                        <div key={vi} className="px-2 py-3.5 text-center sm:px-6">
                          <CellValue v={v} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* FAQ-ish note */}
        <Reveal delay={0.12}>
          <div className="mt-16 rounded-2xl border border-border/60 bg-muted/20 p-6 text-center sm:p-8">
            <h3 className="text-lg font-semibold">Not sure which plan is right for you?</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Start with the free plan — upgrade anytime as your needs grow. No credit card required to begin.
            </p>
            <Magnetic
              as="button"
              strength={0.25}
              onClick={() => setView("register")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Magnetic>
          </div>
        </Reveal>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Logo className="h-5" showWord={false} />
            <span>NOVSMM</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NOVSMM. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
