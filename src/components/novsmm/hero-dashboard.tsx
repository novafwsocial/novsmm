"use client";

import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
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

const NAV = [
  { icon: LayoutGrid, label: "Dashboard", active: true },
  { icon: ShoppingCart, label: "Orders" },
  { icon: Store, label: "Marketplace" },
  { icon: Wallet, label: "Wallet" },
  { icon: Users, label: "Clients" },
  { icon: Ticket, label: "Tickets" },
  { icon: Settings, label: "Settings" },
];

const ORDERS = [
  { id: "#A-10428", svc: "Instagram · Followers", amt: "+$12.40", time: "just now", flag: "🇲🇽" },
  { id: "#A-10427", svc: "TikTok · Views", amt: "+$4.80", time: "12s", flag: "🇧🇷" },
  { id: "#A-10426", svc: "YouTube · Watch hours", amt: "+$28.00", time: "31s", flag: "🇺🇸" },
  { id: "#A-10425", svc: "Spotify · Plays", amt: "+$6.20", time: "48s", flag: "🇪🇸" },
  { id: "#A-10424", svc: "Telegram · Members", amt: "+$19.50", time: "1m", flag: "🇮🇳" },
];

const chartData = Array.from({ length: 32 }, (_, i) => ({
  x: i,
  v: 40 + Math.sin(i / 2.4) * 18 + (i / 6) * 6 + Math.random() * 8,
}));

export function HeroDashboard() {
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
              key={n.label}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                n.active
                  ? "bg-background text-foreground nov-ring"
                  : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </div>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-border/60 bg-background p-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Wallet</span>
            <span className="text-emerald-600">+12.4%</span>
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            $<Counter to={8420.5} decimals={2} duration={2.4} />
          </div>
          <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-primary py-1.5 text-[11px] font-medium text-primary-foreground">
            <Plus className="h-3 w-3" /> Top up
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 p-4 sm:p-5">
        {/* Topbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search orders, services…</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] sm:inline">⌘K</kbd>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 sm:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              All systems operational
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <Bell className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70" />
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Balance"
            value={<>$<Counter to={8420.5} decimals={2} duration={2.4} /></>}
            delta="+12.4%"
            up
          />
          <StatCard
            label="Orders today"
            value={<Counter to={1284} duration={2.2} />}
            delta="+8.1%"
            up
          />
          <StatCard
            label="Active services"
            value={<Counter to={242} duration={2.2} />}
            delta="+3"
            up
          />
          <StatCard
            label="Conversion"
            value={<><Counter to={94.2} decimals={1} duration={2.2} />%</>}
            delta="-0.4%"
          />
        </div>

        {/* Chart + live feed */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Revenue · last 32 days</div>
                <div className="mt-0.5 text-xl font-semibold tabular-nums">
                  $<Counter to={128450} duration={2.6} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +24.8%
              </div>
            </div>
            <div className="mt-3 h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0052ff" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0052ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="x" hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid oklch(0.928 0.003 285)",
                      fontSize: 12,
                      boxShadow: "0 8px 24px -8px rgba(0,0,0,0.12)",
                    }}
                    labelStyle={{ display: "none" }}
                    formatter={(v: number) => [`$${v.toFixed(0)}`, "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#0052ff"
                    strokeWidth={2}
                    fill="url(#heroArea)"
                    isAnimationActive
                    animationDuration={1400}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-foreground">Live orders</div>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                streaming
              </span>
            </div>
            <LiveOrderFeed />
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
    <div className="rounded-2xl border border-border/60 bg-background p-3.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      <div
        className={`mt-1 inline-flex items-center gap-0.5 text-[11px] font-medium ${
          up ? "text-emerald-600" : "text-muted-foreground"
        }`}
      >
        {up && <ArrowUpRight className="h-3 w-3" />}
        {delta}
      </div>
    </div>
  );
}

function LiveOrderFeed() {
  const [list, setList] = useState(ORDERS);
  const idx = useMotionValue(0);

  useEffect(() => {
    const id = setInterval(() => {
      setList((prev) => {
        const next = [...prev];
        const moved = next.pop()!;
        next.unshift({
          ...moved,
          id: `#A-${10428 + Math.floor(idx.get() + 1)}`,
          time: "just now",
        });
        idx.set(idx.get() + 1);
        return next;
      });
    }, 2600);
    return () => clearInterval(id);
  }, [idx]);

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {list.map((o, i) => (
        <motion.div
          key={o.id + i}
          layout
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-muted/50"
        >
          <span className="text-sm leading-none">{o.flag}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-foreground">
              {o.svc}
            </div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {o.id} · {o.time}
            </div>
          </div>
          <span className="text-[12px] font-semibold text-emerald-600 tabular-nums">
            {o.amt}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
