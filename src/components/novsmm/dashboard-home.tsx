"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  ShoppingCart,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Star,
  Ticket,
  Activity,
  Zap,
  Store,
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
import { useFavorites, useTickets } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { useApp } from "./app-store";
import { StatusPill } from "./status-pill";
import { PlatformLogo } from "./platform-logo";
import { cn } from "@/lib/utils";

type Range = "7d" | "30d" | "90d";
const RANGE_LABEL: Record<Range, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
};
const RANGE_RANGE_LABEL: Record<Range, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
};

export function DashboardHome() {
  const [range, setRange] = useState<Range>("30d");
  // Range-aware fetch (re-fetches when range changes). Other consumers
  // (sidebar balance, topbar) continue using useDashboard() without range.
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => api.get<any>(`/api/dashboard?range=${range}`),
    refetchInterval: 30 * 1000,
  });
  const { setDashboardTab } = useApp();
  const { data: favData } = useFavorites();
  const { data: ticketsData } = useTickets();
  const favorites = favData?.favorites ?? [];
  const tickets = ticketsData?.tickets?.slice(0, 3) ?? [];

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const { user, stats, series, recentOrders, recentNotifications } = data;
  const rangeRevenue = stats.revenueRange ?? stats.revenueMonth ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Workspace overview
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your workspace today.
          </p>
        </div>
      </Reveal>

      <RevealStagger stagger={0.06} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <RevealItem>
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Available balance"
            value={<>$<Counter to={stats.balance} decimals={2} duration={1.5} /></>}
            delta="live"
            up
            tint="primary"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Active orders"
            value={<Counter to={stats.activeOrders} duration={1.5} />}
            delta="in progress"
            tint="amber"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Completed (all)"
            value={<Counter to={stats.completedOrders} duration={2} />}
            delta="total"
            tint="emerald"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Revenue today"
            value={<>$<Counter to={stats.revenueToday} decimals={2} duration={1.5} /></>}
            delta="live"
            up
            tint="violet"
          />
        </RevealItem>
      </RevealStagger>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal blur className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Revenue · {RANGE_RANGE_LABEL[range]}
                </div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  $<Counter to={rangeRevenue} duration={1.5} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {(["7d", "30d", "90d"] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    aria-pressed={range === r}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-medium transition-colors",
                      range === r
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0052ff" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0052ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="d" hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.08)",
                      fontSize: 12,
                    }}
                    labelStyle={{ display: "none" }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0052ff"
                    strokeWidth={2}
                    fill="url(#revArea)"
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal blur delay={0.06}>
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-foreground to-foreground/90 p-5 text-background">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider opacity-70">
                  NOVSMM Wallet
                </span>
                <Wallet className="h-4 w-4 opacity-70" />
              </div>
              <div className="mt-4 text-3xl font-semibold tabular-nums">
                $<Counter to={stats.balance} decimals={2} duration={1.5} />
              </div>
              <div className="mt-1 text-xs opacity-70">
                Held: <span className="tabular-nums">${stats.heldBalance.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setDashboardTab("wallet")}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
                >
                  <Plus className="h-3.5 w-3.5" /> Top up
                </button>
                <button
                  onClick={() => setDashboardTab("wallet")}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-background/20 py-2 text-xs font-medium transition-colors hover:bg-background/10"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal blur delay={0.12}>
            <div className="rounded-2xl border border-border/60 bg-background p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Quick stats
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <QuickStat icon={<Zap className="h-3.5 w-3.5" />} label="Lifetime earnings">
                  $<Counter to={stats.lifetimeEarnings} decimals={2} duration={2} />
                </QuickStat>
                <QuickStat icon={<Activity className="h-3.5 w-3.5" />} label="Open tickets">
                  {stats.openTickets}
                </QuickStat>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Recent orders */}
      <Reveal blur>
        <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Recent orders
              </div>
              <div className="mt-1 text-base font-semibold">Live activity</div>
            </div>
            <button
              onClick={() => setDashboardTab("orders")}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No orders yet. Browse the marketplace to place your first order.
              </div>
            ) : (
              recentOrders.map((o: any, i: number) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/40"
                >
                  <PlatformLogo platform={o.platform} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {o.platform} · {o.serviceName}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      #{o.publicId} · {timeAgo(o.createdAt)}
                    </div>
                  </div>
                  <StatusPill status={o.status} />
                  <span className="w-16 text-right text-sm font-semibold tabular-nums text-emerald-600">
                    ${o.totalPrice.toFixed(2)}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </Reveal>

      {/* Favorites + Recent tickets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Favorites */}
        <Reveal blur>
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" /> Favorite services
              </div>
              <button onClick={() => setDashboardTab("marketplace")} className="text-xs font-medium text-primary hover:underline">Browse →</button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {favorites.length > 0 ? favorites.map((f: any) => (
                <div key={f.id} className="group flex items-center gap-3 rounded-xl border border-border/60 p-2.5 transition-colors hover:bg-muted/40">
                  <PlatformLogo platform={f.service?.platform ?? "Other"} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{f.service?.name}</div>
                    <div className="text-[10px] text-muted-foreground">{f.service?.platform} · ${f.service?.price.toFixed(2)}/1000</div>
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No favorites yet. Star a service to pin it here.</div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Recent tickets */}
        <Reveal blur delay={0.06}>
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <Ticket className="h-3.5 w-3.5" /> Recent tickets
              </div>
              <button onClick={() => setDashboardTab("tickets")} className="text-xs font-medium text-primary hover:underline">View all →</button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {tickets.length > 0 ? tickets.map((t: any) => (
                <div key={t.id} className="flex items-start gap-2.5 rounded-xl border border-border/60 p-2.5">
                  <span className={cn("mt-1 h-1.5 w-1.5 rounded-full", t.priority === "high" ? "bg-red-500" : "bg-amber-500")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">#{t.publicId} · {t.subject}</div>
                    <div className="text-[10px] text-muted-foreground">{t.status} · {new Date(t.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No tickets yet.</div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TINTS: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  violet: "bg-violet-500/10 text-violet-600",
};

function StatCard({
  icon,
  label,
  value,
  delta,
  up,
  tint = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delta: string;
  up?: boolean;
  tint?: keyof typeof TINTS;
}) {
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-4 transition-shadow hover:nov-ring-lg sm:p-5">
      <div className="flex items-start justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", TINTS[tint])}>
          {icon}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-medium",
            up ? "text-emerald-600" : "text-muted-foreground"
          )}
        >
          {up && <ArrowUpRight className="h-3 w-3" />}
          {delta}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {children}
      </span>
    </div>
  );
}
