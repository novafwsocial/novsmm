"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { ShoppingCart, Users, DollarSign, Activity, Server, Building2, TrendingUp, Gauge } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { Counter } from "./counter";

const BIG_STATS = [
  {
    icon: ShoppingCart,
    label: "Orders fulfilled",
    value: <Counter to={4280000} duration={2.6} suffix="+" />,
    sub: "all-time, across 263 services",
  },
  {
    icon: Users,
    label: "Active users",
    value: <Counter to={184500} duration={2.4} />,
    sub: "resellers & agencies, 30d",
  },
  {
    icon: DollarSign,
    label: "Revenue routed",
    value: <>$<Counter to={92.4} decimals={1} duration={2.4} />M</>,
    sub: "through the marketplace",
  },
  {
    icon: Building2,
    label: "Enterprise clients",
    value: <Counter to={312} duration={2} />,
    sub: "with dedicated infra",
  },
];

const dailySales = Array.from({ length: 14 }, (_, i) => ({
  d: i,
  v: 60 + Math.sin(i / 1.6) * 22 + i * 4 + Math.random() * 10,
}));

export function Stats() {
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
          {BIG_STATS.map((s) => (
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
                    $<Counter to={84320} duration={2.4} />
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +24.8% WoW
                </div>
              </div>
              <div className="mt-5 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySales} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <Tooltip
                      cursor={{ fill: "oklch(0.5 0.005 285 / 0.05)" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid oklch(0.928 0.003 285)",
                        fontSize: 12,
                        boxShadow: "0 8px 24px -8px rgba(0,0,0,0.12)",
                      }}
                      labelStyle={{ display: "none" }}
                      formatter={(v: number) => [`$${v.toFixed(0)}`, "Sales"]}
                    />
                    <Bar dataKey="v" radius={[5, 5, 0, 0]} maxBarSize={26}>
                      {dailySales.map((entry, i) => (
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
                    whileInView={{ height: `${10 + Math.random() * 22}px`, opacity: 1 }}
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
                  <Counter to={1284} duration={2.2} />/min
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
