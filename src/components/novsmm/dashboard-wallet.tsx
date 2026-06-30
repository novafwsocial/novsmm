"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Plus,
  TrendingUp,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  CartesianGrid,
} from "recharts";
import { Counter } from "./counter";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { WALLET_TXNS, TOPUP_METHODS, REVENUE_SERIES, DASHBOARD_STATS } from "./dashboard-data";
import { cn } from "@/lib/utils";

export function DashboardWallet() {
  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Wallet
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Balance & activity</h1>
            <p className="text-sm text-muted-foreground">
              Manage balances, top up, withdraw, and export statements.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
              <Plus className="h-3.5 w-3.5" /> Top up
            </button>
          </div>
        </div>
      </Reveal>

      {/* Balance cards */}
      <RevealStagger stagger={0.06} className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        <RevealItem>
          <div className="h-full rounded-2xl border border-border/60 bg-gradient-to-br from-foreground to-foreground/90 p-5 text-background">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider opacity-70">Available</span>
              <Wallet className="h-4 w-4 opacity-70" />
            </div>
            <div className="mt-3 text-3xl font-semibold tabular-nums">
              $<Counter to={DASHBOARD_STATS.balance} decimals={2} duration={2} />
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-300">
              <TrendingUp className="h-3 w-3" /> +12.4% this month
            </div>
          </div>
        </RevealItem>
        <RevealItem>
          <BalanceCard
            label="Held"
            value={DASHBOARD_STATS.heldBalance}
            icon={<Clock className="h-4 w-4" />}
            sub="Pending order completion"
            tone="amber"
          />
        </RevealItem>
        <RevealItem>
          <BalanceCard
            label="Lifetime earnings"
            value={92480.5}
            icon={<TrendingUp className="h-4 w-4" />}
            sub="+$4,820 this month"
            tone="emerald"
          />
        </RevealItem>
      </RevealStagger>

      {/* Chart + top-up methods */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal blur className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Cash flow · 30 days
                </div>
                <div className="text-base font-semibold">Net +$12,420</div>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" /> In
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Out
                </span>
              </div>
            </div>
            <div className="mt-4 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_SERIES} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0052ff" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0052ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="d" hide />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#0052ff" strokeWidth={2} fill="url(#wIn)" animationDuration={1400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        <Reveal blur delay={0.06}>
          <div className="h-full rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Top-up methods
            </div>
            <div className="text-base font-semibold">6 rails available</div>
            <div className="mt-3 flex flex-col gap-1.5">
              {TOPUP_METHODS.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-2.5 rounded-xl border border-border/60 p-2.5 transition-colors hover:bg-muted/30"
                >
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-semibold", m.tone)}>
                    {m.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">{m.time} · {m.fee}</div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Transactions */}
      <Reveal blur>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Transaction history
              </div>
              <div className="text-base font-semibold">All activity</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Encrypted
            </span>
          </div>
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Txn</th>
                  <th className="px-5 py-2.5 text-left font-medium">Description</th>
                  <th className="px-5 py-2.5 text-left font-medium">Type</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {WALLET_TXNS.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">{t.id}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{t.desc}</td>
                    <td className="px-5 py-3">
                      <TypePill type={t.type} />
                    </td>
                    <td className={cn(
                      "px-5 py-3 text-right font-semibold tabular-nums",
                      t.amount > 0 ? "text-emerald-600" : "text-foreground"
                    )}>
                      {t.amount > 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        t.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-amber-500/10 text-amber-700"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          t.status === "completed" ? "bg-emerald-500" : "bg-amber-500"
                        )} />
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">{t.time}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function BalanceCard({
  label,
  value,
  icon,
  sub,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub: string;
  tone: "amber" | "emerald";
}) {
  const toneCls = tone === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600";
  return (
    <div className="h-full rounded-2xl border border-border/60 bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneCls)}>{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">
        $<Counter to={value} decimals={2} duration={2} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

const TYPE_META: Record<string, { label: string; cls: string; icon: any }> = {
  sale: { label: "Sale", cls: "bg-emerald-500/10 text-emerald-700", icon: ArrowUpRight },
  topup: { label: "Top-up", cls: "bg-primary/10 text-primary", icon: ArrowDownLeft },
  withdrawal: { label: "Withdrawal", cls: "bg-muted text-muted-foreground", icon: ArrowUpRight },
  fee: { label: "Fee", cls: "bg-amber-500/10 text-amber-700", icon: ArrowUpRight },
  referral: { label: "Referral", cls: "bg-violet-500/10 text-violet-700", icon: ArrowDownLeft },
  held: { label: "Held", cls: "bg-amber-500/10 text-amber-700", icon: Clock },
};

function TypePill({ type }: { type: string }) {
  const m = TYPE_META[type] ?? TYPE_META.sale;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", m.cls)}>
      <m.icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}
