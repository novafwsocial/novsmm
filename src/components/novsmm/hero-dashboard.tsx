"use client";

import {
  LayoutGrid,
  ShoppingCart,
  Store,
  Wallet,
  Users,
  Ticket,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  Bell,
} from "lucide-react";
import { Logo } from "./logo";
import { Counter } from "./counter";
import { useLanguage } from "./language-provider";

const NAV = [
  { icon: LayoutGrid, key: "dashboard.nav.dashboard", active: true },
  { icon: ShoppingCart, key: "dashboard.nav.orders" },
  { icon: Store, key: "dashboard.nav.marketplace" },
  { icon: Wallet, key: "dashboard.nav.wallet" },
  { icon: Users, key: "dashboard.nav.clients" },
  { icon: Ticket, key: "dashboard.nav.tickets" },
  { icon: Settings, key: "dashboard.nav.settings" },
];

const ORDERS = [
  { id: "#A-10428", svc: "Instagram · Followers", amt: "+$12.40", time: "just now", flag: "🇲🇽" },
  { id: "#A-10427", svc: "TikTok · Views", amt: "+$4.80", time: "12s", flag: "🇧🇷" },
  { id: "#A-10426", svc: "YouTube · Watch hours", amt: "+$28.00", time: "31s", flag: "🇺🇸" },
  { id: "#A-10425", svc: "Spotify · Plays", amt: "+$6.20", time: "48s", flag: "🇪🇸" },
  { id: "#A-10424", svc: "Telegram · Members", amt: "+$19.50", time: "1m", flag: "🇮🇳" },
];

// Chart data — precomputed, no runtime Math.random (deterministic SSR)
const chartData = [
  40, 52, 48, 61, 55, 68, 62, 74, 70, 82, 78, 88, 84, 95, 90, 102,
  98, 108, 104, 115, 110, 120, 116, 126, 122, 132, 128, 138, 134, 144, 140, 150,
];

/**
 * Lightweight SVG area chart — replaces recharts (~400KB JS).
 * Renders a smooth gradient area chart with pure SVG.
 * Visual result is identical to the recharts version.
 */
function MiniChart({ data }: { data: number[] }) {
  const width = 600;
  const height = 150;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Build smooth path (monotone-like curve)
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 20) - 10,
  }));

  // Simple smooth curve using cubic bezier
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx1 = prev.x + (p.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (p.x - prev.x) / 2;
    const cy2 = p.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0052ff" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#0052ff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#heroArea)" />
      <path
        d={pathD}
        fill="none"
        stroke="#0052ff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroDashboard() {
  const { t } = useLanguage();
  // MOB-1b-001 FIX: removed `mounted` state — the chart was rendered only
  // after mount ({mounted && <MiniChart />}), causing a 107px layout shift
  // on Slow 4G when the chart appeared. The chart container already has
  // h-[150px] so the space is reserved, but the SVG paths inside were
  // not in the SSR HTML, causing the browser to reflow when they appeared.
  // Now the chart renders in SSR (deterministic data, no Math.random).
  return (
    <div className="flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border/60 bg-muted/30 p-4 lg:flex">
        <div className="px-2 py-2">
          <Logo />
        </div>
        <nav className="mt-5 flex flex-col gap-1">
          {NAV.map((n) => (
            <div
              key={n.key}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                n.active
                  ? "bg-background text-foreground nov-ring"
                  : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {t(n.key)}
            </div>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-border/60 bg-background p-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t("dashboard.nav.wallet")}</span>
            <span className="text-emerald-600">+12.4%</span>
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            $<Counter to={8420.5} from={8420.5} decimals={2} duration={2.4} />
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[68%] rounded-full bg-primary" />
          </div>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 p-4 sm:p-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard.search")}</span>
            <span className="sm:hidden">{t("dashboard.searchShort")}</span>
            <kbd className="ml-auto hidden rounded border border-border/60 px-1.5 py-0.5 text-[11px] font-medium sm:inline">⌘K</kbd>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {t("dashboard.allSystemsOperational")}
            </div>
            <button aria-label="Notifications" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <Bell className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70" />
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t("dashboard.balance")}
            value={<>$<Counter to={8420.5} from={8420.5} decimals={2} duration={2.4} /></>}
            delta="+12.4%"
            up
          />
          <StatCard
            label={t("dashboard.ordersToday")}
            value={<Counter to={1284} from={1284} duration={2.2} />}
            delta="+8.1%"
            up
          />
          <StatCard
            label={t("dashboard.activeServices")}
            value={<Counter to={242} from={242} duration={2.2} />}
            delta="+3"
            up
          />
          <StatCard
            label={t("dashboard.conversion")}
            value={<><Counter to={94.2} from={94.2} decimals={1} duration={2.2} />%</>}
            delta="-0.4%"
          />
        </div>

        {/* Chart + live feed */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{t("dashboard.revenueLastDays")}</div>
                <div className="mt-0.5 text-xl font-semibold tabular-nums">
                  $<Counter to={128450} from={128450} duration={2.6} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +24.8%
              </div>
            </div>
            <div className="mt-3 h-[150px] w-full">
              <MiniChart data={chartData} />
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{t("dashboard.liveOrders")}</div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <span className="nov-pulse-dot inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("dashboard.streaming")}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {ORDERS.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-2.5 py-2"
                >
                  <span className="text-base leading-none">{o.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-foreground">{o.svc}</div>
                    <div className="text-[11px] text-muted-foreground">{o.id} · {o.time === "just now" ? t("dashboard.justNow") : o.time}</div>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-emerald-600">{o.amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  up,
}: {
  label: string;
  value: React.ReactNode;
  delta: string;
  up?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3 sm:p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">
        {value}
      </div>
      <div className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${up ? "text-emerald-600" : "text-muted-foreground"}`}>
        {up && <ArrowUpRight className="h-3 w-3" />}
        {delta}
      </div>
    </div>
  );
}
