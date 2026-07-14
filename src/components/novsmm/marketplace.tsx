"use client";

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
import { useLanguage } from "./language-provider";

const FLOW_ICONS = [Store, Repeat2, Users, Wallet];

// Hardcoded fallback offers — used when /api/public/offers returns no rows
// (e.g. fresh install with no marketplace activity yet). They are clearly
// labelled as samples in the UI.
const SAMPLE_OFFERS: PublicOffer[] = [
  { id: "sample-1", serviceName: "Instagram · Followers HQ", platform: "Instagram", cost: 0.84, price: 2.4, margin: 65.0, sales: 124 },
  { id: "sample-2", serviceName: "TikTok · Views (1M)", platform: "TikTok", cost: 3.2, price: 7.8, margin: 58.9, sales: 88 },
  { id: "sample-3", serviceName: "YouTube · Watch hours", platform: "YouTube", cost: 11.0, price: 24.0, margin: 54.2, sales: 51 },
  { id: "sample-4", serviceName: "Spotify · Monthly listeners", platform: "Spotify", cost: 6.5, price: 14.9, margin: 56.4, sales: 33 },
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
  const { t } = useLanguage();
  const liveOffers = usePublicOffers();
  const offers = liveOffers ?? SAMPLE_OFFERS;
  const isLive = liveOffers !== null && liveOffers.length > 0;

  const FLOW = [
    {
      icon: FLOW_ICONS[0],
      title: t("landing.marketplace.flow.supply.title"),
      desc: t("landing.marketplace.flow.supply.desc"),
      chip: t("landing.marketplace.flow.supply.chip"),
    },
    {
      icon: FLOW_ICONS[1],
      title: t("landing.marketplace.flow.markup.title"),
      desc: t("landing.marketplace.flow.markup.desc"),
      chip: t("landing.marketplace.flow.markup.chip"),
    },
    {
      icon: FLOW_ICONS[2],
      title: t("landing.marketplace.flow.checkout.title"),
      desc: t("landing.marketplace.flow.checkout.desc"),
      chip: t("landing.marketplace.flow.checkout.chip"),
    },
    {
      icon: FLOW_ICONS[3],
      title: t("landing.marketplace.flow.settlement.title"),
      desc: t("landing.marketplace.flow.settlement.desc"),
      chip: t("landing.marketplace.flow.settlement.chip"),
    },
  ];

  return (
    <section id="marketplace" className="relative py-12 sm:py-32">
      {/* divider glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("landing.marketplace.eyebrow")}
          title={
            <>
              {t("landing.marketplace.titleLine1")}
              <br className="hidden sm:block" /> {t("landing.marketplace.titleLine2")}
            </>
          }
          description={t("landing.marketplace.description")}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Flow diagram */}
          <Reveal blur>
            <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-background p-6 nov-ring sm:p-8">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t("landing.marketplace.flow.label")}
              </div>
              <div className="mt-2 text-lg font-semibold">
                {t("landing.marketplace.flow.title")}
              </div>

              <div className="mt-7 flex flex-col gap-4">
                {FLOW.map((s, i) => (
                  <div key={s.title} className="relative">
                    <div
                      className="fm-slide-left flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4"
                      style={{
                        animationDuration: "0.7s",
                        animationDelay: `${i * 0.12}s`,
                      }}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary nov-ring">
                        <s.icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-foreground">
                            {s.title}
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {s.chip}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.desc}
                        </p>
                      </div>
                    </div>
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
                {t("landing.marketplace.flow.loopback")}
              </div>
            </div>
          </Reveal>

          {/* Live offers board */}
          <Reveal blur delay={0.1}>
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-background p-6 nov-ring sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {t("landing.marketplace.offers.label")}
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {t("landing.marketplace.offers.title")}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {isLive ? t("landing.marketplace.offers.statusLive") : t("landing.marketplace.offers.statusSample")}
                </div>
              </div>

              {!isLive && (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                  {t("landing.marketplace.offers.sampleNotice")}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2">
                {offers.map((o, i) => (
                  <div
                    key={o.id ?? i}
                    className="fm-fade-up group flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 transition-colors hover:bg-muted/40"
                    style={{
                      animationDuration: "0.6s",
                      animationDelay: `${i * 0.08}s`,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {o.serviceName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                        <span>{t("landing.marketplace.offers.cost")} ${o.cost.toFixed(2)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{t("landing.marketplace.offers.retail")} ${o.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 tabular-nums">
                        {o.margin.toFixed(0)}%
                      </span>
                      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                        <TrendingUp className="h-3 w-3" />
                        {o.sales} {t("landing.marketplace.offers.sold")}
                      </span>
                    </div>
                  </div>
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
                      {t("landing.marketplace.offers.walletLabel")}
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      $<Counter to={8420.5} decimals={2} duration={2.4} />
                    </div>
                  </div>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                  {t("landing.marketplace.offers.withdraw")}
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
