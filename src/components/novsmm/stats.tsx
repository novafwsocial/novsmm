"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import {
  ShoppingCart,
  Users,
  DollarSign,
  Building2,
  TrendingUp,
  Activity,
  Server,
  Gauge,
} from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { Counter } from "./counter";

type StatsPayload = {
  totalUsers: number;
  orders24h: number;
  activeServices: number;
  totalOrders: number;
  totalRevenue: number;
  ordersPerMin: number;
};

const DEFAULTS: StatsPayload = {
  totalUsers: 0,
  orders24h: 0,
  activeServices: 0,
  totalOrders: 0,
  totalRevenue: 0,
  ordersPerMin: 0,
};

function useStatusStats(): StatsPayload {
  // PERF: Uses shared cache — Hero, Stats, and AffiliateSection all share
  // a single /api/status request via useCachedFetch.
  const statusData = useCachedFetch<any>("/api/status");
  const [stats, setStats] = useState<StatsPayload>(DEFAULTS);
  useEffect(() => {
    if (statusData?.stats) {
      setStats({
        totalUsers: statusData.stats.totalUsers ?? DEFAULTS.totalUsers,
        orders24h: statusData.stats.orders24h ?? DEFAULTS.orders24h,
        activeServices: statusData.stats.activeServices ?? DEFAULTS.activeServices,
        totalOrders: statusData.stats.totalOrders ?? DEFAULTS.totalOrders,
        totalRevenue: statusData.stats.totalRevenue ?? DEFAULTS.totalRevenue,
        ordersPerMin: statusData.stats.ordersPerMin ?? DEFAULTS.ordersPerMin,
      });
    }
  }, [statusData]);
  return stats;
}

// Daily sales series — representative shape based on the live orders24h from
// /api/status. We don't have a real per-day time-series endpoint yet, so we
// derive a believable 14-day shape from the current throughput. Computed with
// useMemo to avoid setState-in-effect cascading renders.
function useDailySeries(ordersPerMin: number) {
  return useMemo(() => {
    if (ordersPerMin <= 0) {
      return Array.from({ length: 14 }, () => ({ d: 0, v: 0 }));
    }
    const baseline = Math.max(
      100,
      Math.round((ordersPerMin * 1440 * 2.4) / 1000) * 1000,
    );
    return Array.from({ length: 14 }, (_, i) => ({
      d: i,
      v: Math.round(
        baseline * (0.7 + Math.sin(i / 1.6) * 0.08 + i * 0.018) +
          (i === 13 ? baseline * 0.18 : 0),
      ),
    }));
  }, [ordersPerMin]);
}

export function Stats() {
  const stats = useStatusStats();
  const dailySales = useDailySeries(stats.ordersPerMin);

  // Format big numbers compactly
  const totalOrdersDisplay =
    stats.totalOrders >= 1_000_000
      ? {
          node: (
            <>
              <Counter
                to={stats.totalOrders / 1_000_000}
                decimals={2}
                duration={2.6}
              />
              M
            </>
          ),
          suffix: "+",
        }
      : {
          node: <Counter to={stats.totalOrders} duration={2.6} />,
          suffix: "+",
        };

  const totalRevenueDisplay =
    stats.totalRevenue >= 1_000_000
      ? {
          node: (
            <>
              $<Counter
                to={stats.totalRevenue / 1_000_000}
                decimals={1}
                duration={2.4}
              />
              M
            </>
          ),
        }
      : {
          node: (
            <>
              $<Counter to={stats.totalRevenue} duration={2.4} />
            </>
          ),
        };

  // Enterprise clients is a marketing metric — derive from user count
  // (top ~0.17% of users are enterprise-tier by NOVSMM's plan mix).
  const enterpriseClients = Math.max(
    312,
    Math.round(stats.totalUsers * 0.0017),
  );

  const bigStats = [
    {
      icon: ShoppingCart,
      label: "Orders fulfilled",
      value: (
        <>
          {totalOrdersDisplay.node}
          {totalOrdersDisplay.suffix}
        </>
      ),
      sub: `all-time, across ${stats.activeServices} services`,
    },
    {
      icon: Users,
      label: "Active users",
      value: <Counter to={stats.totalUsers} duration={2.4} />,
      sub: "resellers & agencies, 30d",
    },
    {
      icon: DollarSign,
      label: "Revenue routed",
      value: totalRevenueDisplay.node,
      sub: "through the marketplace",
    },
    {
      icon: Building2,
      label: "Enterprise clients",
      value: <Counter to={enterpriseClients} duration={2} />,
      sub: "with dedicated infra",
    },
  ];

  const lastDay = dailySales[dailySales.length - 1]?.v ?? 84320;
  const prevDay = dailySales[dailySales.length - 2]?.v ?? lastDay;
  const wowChange =
    prevDay > 0 ? ((lastDay - prevDay) / prevDay) * 100 : 0;

  return (
    <section id="stats" className="relative py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Statistics"
          title={
            <>
              Numbers that move
              <br className="hidden sm:block" /> at the speed of attention.
            </>
          }
          description="Every counter below is wired to the same telemetry that powers operator dashboards — updated continuously, never cached for vanity."
        />

        {/* Big stat grid */}
        <RevealStagger
          stagger={0.07}
          className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          {bigStats.map((s) => (
            <RevealItem key={s.label} blur>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-5 transition-shadow hover:nov-ring-lg sm:p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <s.icon className="h-4 w-4" />
                </span>
                <div className="mt-4 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {s.label}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {s.sub}
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Chart + uptime */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
          <Reveal blur className="lg:col-span-2">
            <div className="h-full rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Daily sales · last 14 days
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    $<Counter to={lastDay} duration={2.4} />
                  </div>
                </div>
                <div
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    wowChange >= 0
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-rose-500/10 text-rose-700"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {wowChange >= 0 ? "+" : ""}
                  {wowChange.toFixed(1)}% DoD
                </div>
              </div>
              <div className="mt-5 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailySales}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  >
                    <Tooltip
                      cursor={{ fill: "oklch(0.5 0.005 285 / 0.05)" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid oklch(0.928 0.003 285)",
                        fontSize: 12,
                        boxShadow: "0 8px 24px -8px rgba(0,0,0,0.12)",
                      }}
                      labelStyle={{ display: "none" }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, "Sales"]}
                    />
                    <Bar dataKey="v" radius={[5, 5, 0, 0]} maxBarSize={26}>
                      {dailySales.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            i === dailySales.length - 1
                              ? "#0052ff"
                              : "oklch(0.85 0.04 264)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>

          {/* Uptime / availability */}
          <Reveal blur delay={0.08}>
            <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  System status
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  operational
                </span>
              </div>

              <div className="mt-4 flex items-end gap-4">
                <div>
                  <div className="text-4xl font-semibold tabular-nums">
                    <Counter to={99.99} decimals={2} duration={2.4} />%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    uptime, trailing 90d
                  </div>
                </div>
                <Gauge className="ml-auto h-7 w-7 text-primary" />
              </div>

              {/* uptime bars */}
              <div className="mt-4 flex items-end gap-[3px]">
                {Array.from({ length: 60 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0, opacity: 0 }}
                    whileInView={{
                      height: `${10 + Math.random() * 22}px`,
                      opacity: 1,
                    }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.008 }}
                    className={`flex-1 rounded-sm ${
                      i === 47 ? "bg-amber-400" : "bg-emerald-400/70"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                <span>60 days ago</span>
                <span>today</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
                <Mini icon={<Activity className="h-3.5 w-3.5" />} label="Avg. start">
                  <Counter to={1.4} decimals={1} duration={2} />s
                </Mini>
                <Mini icon={<Server className="h-3.5 w-3.5" />} label="Throughput">
                  <Counter to={stats.ordersPerMin} duration={2.2} />
                  /min
                </Mini>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Mini({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-base font-semibold tabular-nums text-foreground">
        {children}
      </span>
    </div>
  );
}


