"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Store,
  TrendingUp,
  Wallet,
  Users,
  ArrowRight,
  ArrowDown,
  Repeat2,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { Counter } from "./counter";

const FLOW = [
  {
    icon: Store,
    title: "Provider supply",
    desc: "Approved providers list services at wholesale rates.",
    chip: "wholesale",
  },
  {
    icon: Repeat2,
    title: "Reseller markup",
    desc: "Set margins per service, per client tier, per currency.",
    chip: "your margin",
  },
  {
    icon: Users,
    title: "Buyer checkout",
    desc: "Customers buy at your retail price across 12+ gateways.",
    chip: "retail",
  },
  {
    icon: Wallet,
    title: "Instant settlement",
    desc: "Profit settles to your wallet the moment an order starts.",
    chip: "profit",
  },
];

// Hardcoded fallback offers — used when /api/public/offers returns no rows
// (e.g. fresh install with no marketplace activity yet). They are clearly
// labelled as samples in the UI.
const SAMPLE_OFFERS = [
  { serviceName: "Instagram · Followers HQ", platform: "Instagram", cost: 0.84, price: 2.4, margin: 65.0, sales: 124 },
  { serviceName: "TikTok · Views (1M)", platform: "TikTok", cost: 3.2, price: 7.8, margin: 58.9, sales: 88 },
  { serviceName: "YouTube · Watch hours", platform: "YouTube", cost: 11.0, price: 24.0, margin: 54.2, sales: 51 },
  { serviceName: "Spotify · Monthly listeners", platform: "Spotify", cost: 6.5, price: 14.9, margin: 56.4, sales: 33 },
];

type PublicOffer = {
  id: string;
  serviceName: string;
  platform: string;
  cost: number;
  price: number;
  margin: number;
  sales: number;
  quality?: string;
  deliveryTime?: string;
};

function usePublicOffers() {
  const [offers, setOffers] = useState<PublicOffer[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/offers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.offers?.length) {
          setOffers(d.offers);
        } else if (!cancelled) {
          setOffers(null); // signal: use samples
        }
      })
      .catch(() => {
        if (!cancelled) setOffers(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return offers;
}

export function Marketplace() {
  const liveOffers = usePublicOffers();
  const offers = liveOffers ?? SAMPLE_OFFERS;
  const isLive = liveOffers !== null && liveOffers.length > 0;

  return (
    <section id="marketplace" className="relative py-24 sm:py-32">
      {/* divider glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Marketplace"
          title={
            <>
              Buy wholesale. Resell at your price.
              <br className="hidden sm:block" /> Keep the margin.
            </>
          }
          description="An open marketplace where resellers compete on price, publish their own offers, and watch profit settle in real time — without touching infrastructure."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Flow diagram */}
          <Reveal blur>
            <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-background p-6 nov-ring sm:p-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                The flow
              </div>
              <div className="mt-2 text-lg font-semibold">
                From supply to settled profit in one continuous loop
              </div>

              <div className="mt-7 flex flex-col gap-4">
                {FLOW.map((s, i) => (
                  <div key={s.title} className="relative">
                    <motion.div
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-12%" }}
                      transition={{
                        duration: 0.7,
                        delay: i * 0.12,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary nov-ring">
                        <s.icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-foreground">
                            {s.title}
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {s.chip}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.desc}
                        </p>
                      </div>
                    </motion.div>
                    {i < FLOW.length - 1 && (
                      <div className="ml-9 flex h-4 items-center">
                        <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* loopback */}
              <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-dashed border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                <Repeat2 className="h-3.5 w-3.5" />
                Profit recycles into balance — fund the next order instantly.
              </div>
            </div>
          </Reveal>

          {/* Live offers board */}
          <Reveal blur delay={0.1}>
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-background p-6 nov-ring sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Live offers board
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    Compete on price. Win the order.
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {isLive ? "live" : "sample"}
                </div>
              </div>

              {!isLive && (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                  Showing sample offers — publish your own from the dashboard to populate the live board.
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2">
                {offers.map((o, i) => (
                  <motion.div
                    key={o.id ?? i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {o.serviceName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                        <span>cost ${o.cost.toFixed(2)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>retail ${o.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 tabular-nums">
                        {o.margin.toFixed(0)}%
                      </span>
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                        <TrendingUp className="h-3 w-3" />
                        {o.sales} sold
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* wallet strip */}
              <div className="mt-auto flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-primary nov-ring">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Wallet balance
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      $<Counter to={8420.5} decimals={2} duration={2.4} />
                    </div>
                  </div>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                  Withdraw
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
