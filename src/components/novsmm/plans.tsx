"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Sparkles, Building2 } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { Magnetic } from "./magnetic";
import { Counter } from "./counter";
import { useApp } from "./app-store";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  highlight?: boolean;
  cta: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "For solo resellers finding product-market fit.",
    monthly: 29,
    yearly: 24,
    cta: "Start free",
    features: [
      "Up to 1,000 orders / month",
      "Access to 6,300+ services",
      "5 connected platforms",
      "PayPal + Mercado Pago + NowPayments",
      "Standard order priority",
      "Email support · 24h SLA",
    ],
  },
  {
    name: "Growth",
    tagline: "For teams scaling volume and margin.",
    monthly: 89,
    yearly: 74,
    highlight: true,
    cta: "Start free",
    features: [
      "Up to 25,000 orders / month",
      "Unlimited platforms",
      "Marketplace publishing + custom margins",
      "All 4 payment gateways",
      "Priority order processing",
      "Crypto settlement · low fees",
      "Role-based access · 10 seats",
      "Live chat support · 2h SLA",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For operators running mission-critical volume.",
    monthly: 0,
    yearly: 0,
    cta: "Talk to sales",
    features: [
      "Unlimited orders",
      "Priority order processing (highest)",
      "Audit logs + CSV export",
      "All payment gateways",
      "Custom roles & permissions",
      "Dedicated account manager",
      "Custom SLA · 99.9% uptime target",
      "White-label licensing",
    ],
  },
];

export function Plans() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="plans" className="relative py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Priced like software.
              <br className="hidden sm:block" /> Margins like infrastructure.
            </>
          }
          description="Every plan includes the full marketplace, all gateways, and real-time telemetry. Choose by volume — cancel any time."
        />

        {/* Billing toggle */}
        <Reveal>
          <div className="mt-9 flex items-center justify-center gap-3">
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                !yearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Monthly
            </span>
            <button
              onClick={() => setYearly((v) => !v)}
              className="relative h-7 w-12 rounded-full border border-border bg-muted transition-colors"
              aria-label="Toggle billing period"
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-primary shadow",
                  yearly ? "left-6" : "left-0.5"
                )}
              />
            </button>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
                yearly ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Yearly
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                save 20%
              </span>
            </span>
          </div>
        </Reveal>

        {/* Plans grid */}
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} blur delay={i * 0.08}>
              <PlanCard plan={p} yearly={yearly} />
            </Reveal>
          ))}
        </div>

        {/* compare note */}
        <Reveal>
          <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            All plans include unlimited marketplace listings, real-time
            analytics, and 24/7 infrastructure monitoring.
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PlanCard({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  const price = yearly ? plan.yearly : plan.monthly;
  const isEnterprise = plan.monthly === 0;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-background p-6 transition-all sm:p-7",
        plan.highlight
          ? "border-primary/40 nov-ring-lg"
          : "border-border/60 hover:nov-ring-lg"
      )}
    >
      {plan.highlight && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          />
          <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            <Sparkles className="h-3 w-3" />
            Most popular
          </span>
        </>
      )}

      <div className="relative">
        <div className="flex items-center gap-2">
          {isEnterprise ? (
            <Building2 className="h-4 w-4 text-primary" />
          ) : null}
          <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {plan.tagline}
        </p>

        {/* Price */}
        <div className="mt-6 flex items-end gap-1">
          {isEnterprise ? (
            <span className="text-4xl font-semibold tracking-tight">Custom</span>
          ) : (
            <>
              <span className="text-4xl font-semibold tracking-tight tabular-nums">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={price}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -14, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-block"
                  >
                    ${price}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="mb-1 text-sm text-muted-foreground">
                /mo {yearly && !isEnterprise ? "· billed yearly" : ""}
              </span>
            </>
          )}
        </div>

        {!isEnterprise && (
          <div className="mt-1 text-xs text-muted-foreground">
            Starts at{" "}
            <span className="font-medium text-foreground tabular-nums">
              ${plan.monthly}/mo
            </span>{" "}
            billed monthly
          </div>
        )}

        {/* CTA */}
        <Magnetic
          as="button"
          strength={0.2}
          onClick={() => {
            const state = useApp.getState();
            if (state.authed) {
              state.setView("dashboard");
              state.setDashboardTab("profile");
            } else {
              state.setView("register");
            }
          }}
          className="mt-6 block w-full"
        >
          <span
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-medium transition-all",
              plan.highlight
                ? "bg-primary text-primary-foreground hover:nov-shadow-blue"
                : "border border-border bg-background text-foreground hover:bg-muted"
            )}
          >
            {plan.cta}
            <ArrowRight className="h-4 w-4" />
          </span>
        </Magnetic>

        {/* Features */}
        <ul className="mt-7 flex flex-col gap-3 border-t border-border/60 pt-6">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className="text-foreground/80">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* footer micro stat */}
      <div className="relative mt-auto pt-6">
        <div className="rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          {isEnterprise ? (
            <span className="font-medium text-foreground">
              Enterprise plan · configurable limits and support.
            </span>
          ) : plan.highlight ? (
            <span>
              Flexible plan for growing resellers.
            </span>
          ) : (
            <span>
              <span className="font-medium text-foreground">No credit card</span>{" "}
              · 14-day full-feature trial.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
