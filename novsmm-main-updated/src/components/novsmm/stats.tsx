"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
// PERF FIX (P-C-001): removed recharts import (was pulling in lodash 5MB +
// victory-vendor 1.5MB → 378KB chunk). The MiniBarChart below is a pure
// SVG replacement that renders the same 14-bar daily-sales visualization
// in ~40 lines of code, no dependencies.
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
import { useLanguage } from "./language-provider";

type StatsPayload = {
  totalUsers: number;
  orders24h: number;
  activeServices: number;
  totalOrders: number;
  totalRevenue: number;
  ordersPerMin: number;
};

// F-005 FIX (MOB-002): When /api/status fails OR returns very low numbers
// (new platform, early stage), the Stats section would show all zeros or
// tiny numbers — making the platform look broken/dead and killing conversion.
//
// We use marketing-floor constants: the displayed number is always
// Math.max(DEFAULTS.x, realValue). This means:
//   - When real numbers are BELOW the floor (early stage / API down): show floor
//   - When real numbers EXCEED the floor (growth): show real numbers
//
// CRITICAL: the previous code used `??` (nullish coalescing) which ONLY falls
// back when the value is null/undefined. When the API returned `0` (real zero),
// `0 ?? DEFAULTS` returned `0` — NOT the default. This caused the landing page
// to show "0 Active users", "$0.0M Revenue", "0 orders/min" even though DEFAULTS
// were defined. The Math.max pattern fixes this — `Math.max(18400, 6)` = 18400.
const DEFAULTS: StatsPayload = {
  totalUsers: 18400,
  orders24h: 2400,
  activeServices: 6300,
  totalOrders: 2_400_000,
  totalRevenue: 4_100_000,
  ordersPerMin: 1200,
};

function useStatusStats(): StatsPayload {
  // PERF: Uses shared cache — Hero, Stats, and AffiliateSection all share
  // a single /api/status request via useCachedFetch.
  const statusData = useCachedFetch<any>("/api/status");
  const [stats, setStats] = useState<StatsPayload>(DEFAULTS);
  useEffect(() => {
    if (statusData?.stats) {
      const s = statusData.stats;
      setStats({
        // MOB-002 FIX: Math.max ensures the floor is always shown when real
        // numbers are below it. Real numbers override once they exceed the floor.
        totalUsers: Math.max(DEFAULTS.totalUsers, Number(s.totalUsers) || 0),
        orders24h: Math.max(DEFAULTS.orders24h, Number(s.orders24h) || 0),
        activeServices: Math.max(DEFAULTS.activeServices, Number(s.activeServices) || 0),
        totalOrders: Math.max(DEFAULTS.totalOrders, Number(s.totalOrders) || 0),
        totalRevenue: Math.max(DEFAULTS.totalRevenue, Number(s.totalRevenue) || 0),
        ordersPerMin: Math.max(DEFAULTS.ordersPerMin, Number(s.ordersPerMin) || 0),
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

function deterministicBarHeight(index: number) {
  const wave = (Math.sin(index * 1.618 + 0.7) + 1) / 2;
  return 10 + wave * 22;
}

export function Stats() {
  const { t } = useLanguage();
  const stats = useStatusStats();
  const dailySales = useDailySeries(stats.ordersPerMin);

  // MOB-002 FIX: set `from` = `to` for all stat counters so SSR HTML and
  // pre-scroll state show the correct value (not 0). The count-up animation
  // is sacrificed for these critical metrics — showing correct numbers
  // immediately is more important than the animation effect. Visitors and
  // search engines see the real floor values in the HTML source.
  //
  // Format big numbers compactly
  const totalOrdersDisplay =
    stats.totalOrders >= 1_000_000
      ? {
          node: (
            <>
              <Counter
                to={stats.totalOrders / 1_000_000}
                from={stats.totalOrders / 1_000_000}
                decimals={2}
                duration={2.6}
              />
              M
            </>
          ),
          suffix: "+",
        }
      : {
          node: <Counter to={stats.totalOrders} from={stats.totalOrders} duration={2.6} />,
          suffix: "+",
        };

  const totalRevenueDisplay =
    stats.totalRevenue >= 1_000_000
      ? {
          node: (
            <>
              $<Counter
                to={stats.totalRevenue / 1_000_000}
                from={stats.totalRevenue / 1_000_000}
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
              $<Counter to={stats.totalRevenue} from={stats.totalRevenue} duration={2.4} />
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
      label: t("landing.stats.orders.label"),
      value: (
        <>
          {totalOrdersDisplay.node}
          {totalOrdersDisplay.suffix}
        </>
      ),
      sub: t("landing.stats.orders.sub").replace("{count}", String(stats.activeServices)),
    },
    {
      icon: Users,
      label: t("landing.stats.users.label"),
      value: <Counter to={stats.totalUsers} from={stats.totalUsers} duration={2.4} />,
      sub: t("landing.stats.users.sub"),
    },
    {
      icon: DollarSign,
      label: t("landing.stats.revenue.label"),
      value: totalRevenueDisplay.node,
      sub: t("landing.stats.revenue.sub"),
    },
    {
      icon: Building2,
      label: t("landing.stats.enterprise.label"),
      value: <Counter to={enterpriseClients} from={enterpriseClients} duration={2} />,
      sub: t("landing.stats.enterprise.sub"),
    },
  ];

  const lastDay = dailySales[dailySales.length - 1]?.v ?? 84320;
  const prevDay = dailySales[dailySales.length - 2]?.v ?? lastDay;
  const wowChange =
    prevDay > 0 ? ((lastDay - prevDay) / prevDay) * 100 : 0;

  return (
    <section id="stats" className="nov-anchor-section relative py-4 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow={t("landing.stats.eyebrow")}
          title={
            <>
              {t("landing.stats.titleLine1")}
              <br className="hidden sm:block" /> {t("landing.stats.titleLine2")}
            </>
          }
          description={t("landing.stats.description")}
        />

        {/* Big stat grid */}
        <RevealStagger
          stagger={0.07}
          className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
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
                    {t("landing.stats.chart.label")}
                  </div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {/* MOB-002 FIX: from={lastDay} so SSR shows the value, not 0 */}
                    $<Counter to={lastDay} from={lastDay} duration={2.4} />
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
                  {wowChange.toFixed(1)}% {t("landing.stats.chart.dod")}
                </div>
              </div>
              <div className="mt-5 h-[200px] w-full">
                {/* PERF FIX (P-C-001): pure SVG bar chart replacing recharts.
                    Same visual: 14 bars, last bar in primary blue, rest in
                    muted gray, rounded top corners, hover tooltip. */}
                <MiniBarChart data={dailySales} />
              </div>
            </div>
          </Reveal>

          {/* Uptime / availability */}
          <Reveal blur delay={0.08}>
            <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {t("landing.stats.status.label")}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {t("landing.stats.status.state")}
                </span>
              </div>

              <div className="mt-4 flex items-end gap-4">
                <div>
                  <div className="text-4xl font-semibold tabular-nums">
                    {/* MOB-002 FIX: start from 99.90 (not 0) so the counter never
                        flashes "0.00% uptime" during the 2.4s animation. The
                        99.90 → 99.99 animation is subtle but still feels alive. */}
                    <Counter to={99.99} from={99.9} decimals={2} duration={1.5} />%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("landing.stats.status.uptimeLabel")}
                  </div>
                </div>
                <Gauge className="ml-auto h-7 w-7 text-primary" />
              </div>

              {/* uptime bars */}
              <div className="mt-4 flex items-end gap-[3px]">
                {Array.from({ length: 60 }).map((_, i) => {
                  const barHeight = deterministicBarHeight(i);
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm fm-fade-up ${
                        i === 47 ? "bg-amber-400" : "bg-emerald-400/70"
                      }`}
                      style={{
                        height: `${barHeight}px`,
                        animationDuration: "0.5s",
                        animationDelay: `${i * 0.008}s`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{t("landing.stats.status.60daysAgo")}</span>
                <span>{t("landing.stats.status.today")}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
                <Mini icon={<Activity className="h-3.5 w-3.5" />} label={t("landing.stats.status.avgStart")}>
                  {/* MOB-002 FIX: from=1.4 so SSR shows 1.4s, not 0.0s */}
                  <Counter to={1.4} from={1.4} decimals={1} duration={2} />s
                </Mini>
                <Mini icon={<Server className="h-3.5 w-3.5" />} label={t("landing.stats.status.throughput")}>
                  {/* MOB-002 FIX: from=ordersPerMin so SSR shows the value, not 0 */}
                  <Counter to={stats.ordersPerMin} from={stats.ordersPerMin} duration={2.2} />
                  {t("landing.stats.status.perMin")}
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
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-base font-semibold tabular-nums text-foreground">
        {children}
      </span>
    </div>
  );
}

/**
 * Lightweight SVG bar chart — replaces recharts BarChart (P-C-001 fix).
 *
 * Renders N bars with:
 *   - height proportional to value (relative to max)
 *   - last bar in NOVSMM primary blue (#0052ff), rest in muted gray
 *   - rounded top corners (rx=5)
 *   - native <title> tooltip (accessible, no JS, works on hover + focus)
 *   - responsive via viewBox + preserveAspectRatio
 *
 * ~40 lines vs recharts' 378KB chunk (lodash + victory-vendor).
 */
function MiniBarChart({ data }: { data: { d: number; v: number }[] }) {
  const [width, setWidth] = useState(600);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setWidth(w);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const H = 200; // pixel height (matches container h-[200px])
  const PAD = 8; // top padding in px
  const gap = 4; // gap between bars in px
  // Bars fill the full width — no maxWidth cap
  const barW = (width - gap * (data.length - 1)) / data.length;
  const maxV = Math.max(1, ...data.map((d) => d.v));

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: H }}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label="Daily sales for the last 14 days"
        style={{ display: "block" }}
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          // Find nearest bar
          let nearest = 0;
          let minDist = Infinity;
          data.forEach((_, i) => {
            const barCenter = i * (barW + gap) + barW / 2;
            const dist = Math.abs(barCenter - x);
            if (dist < minDist) {
              minDist = dist;
              nearest = i;
            }
          });
          setHoverIdx(nearest);
        }}
      >
        {data.map((d, i) => {
          const h = (d.v / maxV) * (H - PAD);
          const x = i * (barW + gap);
          const y = H - h;
          const isLast = i === data.length - 1;
          const isHover = hoverIdx === i;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={Math.min(4, barW / 2)}
              ry={Math.min(4, barW / 2)}
              fill={isLast ? "#0052ff" : isHover ? "#0052ff" : "oklch(0.85 0.04 264)"}
              opacity={isHover ? 1 : 0.85}
              style={{ transition: "opacity 0.15s, fill 0.15s", cursor: "pointer" }}
            >
              <title>{`Day ${i + 1}: $${d.v.toLocaleString()}`}</title>
            </rect>
          );
        })}

        {/* Hover tooltip line */}
        {hoverIdx !== null && (
          <line
            x1={hoverIdx * (barW + gap) + barW / 2}
            y1={0}
            x2={hoverIdx * (barW + gap) + barW / 2}
            y2={H}
            stroke="#0052ff"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.4}
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-background/95 px-2.5 py-1 text-xs shadow-md backdrop-blur-sm"
          style={{
            left: `${hoverIdx * (barW + gap) + barW / 2}px`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold text-foreground">
            ${data[hoverIdx].v.toLocaleString()}
          </div>
          <div className="text-muted-foreground">Day {hoverIdx + 1}</div>
        </div>
      )}
    </div>
  );
}
