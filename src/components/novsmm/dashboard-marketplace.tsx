"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Search,
  Plus,
  TrendingUp,
  Store,
  Tag,
  History,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { Counter } from "./counter";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { MARKETPLACE_OFFERS, TOPUP_METHODS } from "./dashboard-data";
import { PLATFORMS } from "./platforms";
import { cn } from "@/lib/utils";

export function DashboardMarketplace() {
  const [tab, setTab] = useState<"buy" | "sell" | "history">("buy");

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Marketplace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Buy · Sell · Resell
            </h1>
            <p className="text-sm text-muted-foreground">
              An open market where resellers compete on price.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-4 py-2.5">
            <Wallet className="h-4 w-4 text-primary" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet</div>
              <div className="text-sm font-semibold tabular-nums">$<Counter to={8420.5} decimals={2} duration={2} /></div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Tabs */}
      <Reveal>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background p-1">
          {[
            { id: "buy", label: "Buy", icon: Store },
            { id: "sell", label: "Sell / Publish", icon: Tag },
            { id: "history", label: "History", icon: History },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="mk-tab"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <t.icon className="relative h-3.5 w-3.5" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* search */}
      <Reveal>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus-within:border-primary/40">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search 263 services — Instagram, TikTok, YouTube…"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="h-3 w-3" /> New order
          </button>
        </div>
      </Reveal>

      {tab === "buy" && <BuyGrid />}
      {tab === "sell" && <SellBoard />}
      {tab === "history" && <HistoryTable />}
    </div>
  );
}

function BuyGrid() {
  return (
    <RevealStagger stagger={0.04} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORMS.slice(0, 9).map((p) => (
        <RevealItem key={p.name}>
          <div className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-5 transition-shadow hover:nov-ring-lg">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <p.Icon className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {p.services} services
              </span>
            </div>
            <div className="mt-3 text-base font-semibold text-foreground">{p.name}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">{p.blurb}</p>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
              <div>
                <div className="text-[10px] text-muted-foreground">From</div>
                <div className="text-sm font-semibold tabular-nums">$0.84</div>
              </div>
              <button className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                Buy <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </RevealItem>
      ))}
    </RevealStagger>
  );
}

function SellBoard() {
  return (
    <div className="flex flex-col gap-4">
      <Reveal>
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Your published offers
              </div>
              <div className="text-base font-semibold">6 active · $4,820 earnings (30d)</div>
            </div>
            <button className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
              <Plus className="h-3.5 w-3.5" /> Publish offer
            </button>
          </div>
        </div>
      </Reveal>

      <RevealStagger stagger={0.05} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {MARKETPLACE_OFFERS.map((o) => (
          <RevealItem key={o.svc}>
            <div className="group rounded-2xl border border-border/60 bg-background p-4 transition-shadow hover:nov-ring-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{o.svc}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                    <span>cost ${o.cost.toFixed(2)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>retail ${o.price.toFixed(2)}</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 tabular-nums">
                  {o.margin}%
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  {o.sales} sales · {o.trend} today
                </span>
                <button className="font-medium text-primary hover:underline">Edit price</button>
              </div>
            </div>
          </RevealItem>
        ))}
      </RevealStagger>
    </div>
  );
}

function HistoryTable() {
  return (
    <Reveal blur>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Earnings history · last 30 days
          </div>
          <div className="text-base font-semibold">$4,820.40 net profit</div>
        </div>
        <div className="overflow-x-auto nov-scroll">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Service</th>
                <th className="px-5 py-2.5 text-right font-medium">Sales</th>
                <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
                <th className="px-5 py-2.5 text-right font-medium">Fees</th>
                <th className="px-5 py-2.5 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {MARKETPLACE_OFFERS.map((o) => {
                const rev = o.sales * o.price;
                const fee = rev * 0.03;
                const net = rev - fee - o.sales * o.cost;
                return (
                  <tr key={o.svc} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">{o.svc}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{o.sales}</td>
                    <td className="px-5 py-3 text-right tabular-nums">${rev.toFixed(0)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">-${fee.toFixed(0)}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-600">+${net.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Reveal>
  );
}
