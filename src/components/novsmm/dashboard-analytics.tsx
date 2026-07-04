"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ArrowUpRight, TrendingUp, ShoppingCart, DollarSign, Repeat2, Gift, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Counter } from "./counter";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { useAnalytics, useRefreshAnalytics } from "@/hooks/use-api";
import { formatPrice } from "@/lib/currency-utils";
import { useSession } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";

export function DashboardAnalytics() {
  const { data, isLoading } = useAnalytics();
  const refresh = useRefreshAnalytics();
  const { data: sessionData } = useSession();
  const { toast } = useToast();
  const currency = (sessionData?.user as any)?.currency ?? "USD";
  const user = (sessionData?.user as any) ?? {};

  const handleShareReferral = async () => {
    const username = user.username ?? user.id;
    if (!username) return;
    const url = `${window.location.origin}/?ref=${username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Referral link copied!", description: url });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { kpis, series, hourlyOrders, marketplaceBreakdown, referrals, aiInsights } = data;

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Analytics
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Performance
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time metrics from your transaction history.
          </p>
        </div>
      </Reveal>

      {/* AI Insights */}
      <AiInsightsCard
        content={aiInsights?.content}
        generatedAt={aiInsights?.generatedAt}
        refreshed={aiInsights?.refreshed}
        eligible={aiInsights?.eligible}
        onRefresh={() => refresh.mutate()}
        isRefreshing={refresh.isPending}
      />

      {/* KPI strip */}
      <RevealStagger stagger={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <RevealItem>
          <Kpi icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Orders (30d)" value={<Counter to={kpis.totalOrders} duration={1.5} />} delta="live" />
        </RevealItem>
        <RevealItem>
          <Kpi icon={<DollarSign className="h-3.5 w-3.5" />} label="Revenue (30d)" value={formatPrice(kpis.totalRevenue, currency)} delta="live" />
        </RevealItem>
        <RevealItem>
          <Kpi icon={<TrendingUp className="h-3.5 w-3.5" />} label="Conversion" value={<><Counter to={kpis.conversionRate} decimals={1} duration={1.5} />%</>} delta="live" />
        </RevealItem>
        <RevealItem>
          <Kpi icon={<Repeat2 className="h-3.5 w-3.5" />} label="Active orders" value={<Counter to={kpis.activeOrders} duration={1.5} />} delta="live" />
        </RevealItem>
      </RevealStagger>

      {/* Revenue + orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal blur className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Revenue & orders
                </div>
                <div className="mt-1 text-xl font-semibold">Last 30 days</div>
              </div>
              <Legend />
            </div>
            <div className="mt-4 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0052ff" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0052ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aOrd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="d" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12, boxShadow: "0 8px 24px -8px rgba(0,0,0,0.12)" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#0052ff" strokeWidth={2} fill="url(#aRev)" animationDuration={1000} />
                  <Area type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} fill="url(#aOrd)" animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        {/* Marketplace breakdown */}
        <Reveal blur delay={0.06}>
          <div className="h-full rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              By platform
            </div>
            <div className="text-base font-semibold">Marketplace share</div>
            {marketplaceBreakdown.length > 0 ? (
              <div>
                <div className="mx-auto mt-2 h-[150px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={marketplaceBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={66}
                        paddingAngle={2}
                        animationDuration={1100}
                      >
                        {marketplaceBreakdown.map((e: any) => (
                          <Cell key={e.name} fill={e.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }} formatter={(v: number, n: string) => [`${v} orders`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {marketplaceBreakdown.map((m: any) => (
                    <div key={m.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                      <span className="flex-1 text-muted-foreground">{m.name}</span>
                      <span className="font-medium tabular-nums text-foreground">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No completed orders yet
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Hourly orders + referrals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal blur className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Hourly orders · today
                </div>
                <div className="text-base font-semibold">
                  Peak: {Math.max(...hourlyOrders.map((h: any) => h.v))} orders/hour
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3 w-3" /> live
              </span>
            </div>
            <div className="mt-4 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyOrders} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="h" tick={{ fontSize: 10, fill: "rgb(107 114 128)" }} interval={2} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "rgb(107 114 128)" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }} />
                  <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#0052ff" maxBarSize={18} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        <Reveal blur delay={0.06}>
          <div className="h-full rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Gift className="h-3.5 w-3.5" /> Referrals
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              <Counter to={referrals.count} duration={1.5} />{" "}
              <span className="text-sm font-normal text-muted-foreground">referrals</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600">{formatPrice(referrals.total, currency)}</span> earned · 5% lifetime
            </div>
            <div className="mt-4 h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={referrals.series} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="d" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={1200} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <button onClick={handleShareReferral} className="mt-3 w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              Share referral link
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delta: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
          <ArrowUpRight className="h-3 w-3" />
          {delta}
        </span>
      </div>
      <div className="mt-2.5 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" /> Revenue
      </span>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Orders
      </span>
    </div>
  );
}

function AiInsightsCard({
  content,
  generatedAt,
  refreshed,
  eligible,
  onRefresh,
  isRefreshing,
}: {
  content?: string;
  generatedAt?: string | null;
  refreshed?: boolean;
  eligible?: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  // Render insight content with simple line breaks and bullet styling.
  const rendered = (content ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <Reveal blur>
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                AI Insights
              </div>
              <div className="text-base font-semibold">
                Análisis automático de tu actividad
              </div>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing || !eligible}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            title={eligible ? "Regenerate insights" : "Available after 5 orders"}
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {isRefreshing ? "Generating…" : "Refresh"}
          </button>
        </div>

        <div className="relative mt-4">
          {eligible ? (
            rendered.length > 0 ? (
              <div className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/90">
                {rendered.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="whitespace-pre-wrap">{line}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No insights available yet. Click refresh to generate.
              </div>
            )
          ) : (
            <div className="text-sm text-muted-foreground">
              Place at least 6 orders to unlock AI-powered spending insights and
              growth recommendations.
            </div>
          )}
        </div>

        {(generatedAt || refreshed) && eligible && (
          <div className="relative mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            {refreshed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Fresh
              </span>
            )}
            {generatedAt && (
              <span>
                Generated {new Date(generatedAt).toLocaleString()} · cached 1h
              </span>
            )}
          </div>
        )}
      </div>
    </Reveal>
  );
}
