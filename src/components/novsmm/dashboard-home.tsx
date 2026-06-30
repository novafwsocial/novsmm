"use client";

import { motion } from "framer-motion";
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
import { useDashboard } from "@/hooks/use-api";
import { useApp } from "./app-store";
import { StatusPill } from "./status-pill";
import { cn } from "@/lib/utils";

export function DashboardHome() {
  const { data, isLoading } = useDashboard();
  const { setDashboardTab } = useApp();

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const { user, stats, series, recentOrders, recentNotifications } = data;

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
                  Revenue · last 30 days
                </div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  $<Counter to={stats.revenueMonth} duration={2} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {["7D", "30D", "90D"].map((t, i) => (
                  <button
                    key={t}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-medium transition-colors",
                      i === 1
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t}
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
                    animationDuration={1000}
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
                  <span className="text-base leading-none">{o.flag}</span>
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
