"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  ShoppingCart,
  DollarSign,
  Store,
  Ticket,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  ShieldCheck,
  Bell,
  Trash2,
  Wifi,
} from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type NotifType = "order" | "sale" | "marketplace" | "ticket" | "recharge" | "withdrawal" | "referral" | "system";

type Notification = {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  amount?: number;
  timestamp: string;
  severity: "info" | "success" | "warning";
};

const TYPE_META: Record<NotifType, { icon: any; cls: string }> = {
  order: { icon: ShoppingCart, cls: "bg-primary/10 text-primary" },
  sale: { icon: DollarSign, cls: "bg-emerald-500/10 text-emerald-600" },
  marketplace: { icon: Store, cls: "bg-violet-500/10 text-violet-600" },
  ticket: { icon: Ticket, cls: "bg-amber-500/10 text-amber-600" },
  recharge: { icon: ArrowDownLeft, cls: "bg-emerald-500/10 text-emerald-600" },
  withdrawal: { icon: ArrowUpRight, cls: "bg-rose-500/10 text-rose-600" },
  referral: { icon: Gift, cls: "bg-blue-500/10 text-blue-600" },
  system: { icon: ShieldCheck, cls: "bg-muted text-muted-foreground" },
};

const SEED: Notification[] = [
  { id: "s1", type: "system", title: "All systems operational", message: "All NOVSMM infrastructure is running nominally.", timestamp: new Date(Date.now() - 60000).toISOString(), severity: "info" },
  { id: "s2", type: "order", title: "Order #A-10428 started", message: "Telegram · Members — provider confirmed.", amount: 19.5, timestamp: new Date(Date.now() - 240000).toISOString(), severity: "info" },
  { id: "s3", type: "sale", title: "Sale completed", message: "Instagram · Followers HQ — $2.40 credited.", amount: 2.4, timestamp: new Date(Date.now() - 480000).toISOString(), severity: "success" },
];

export function DashboardNotifications() {
  const [items, setItems] = useState<Notification[]>(SEED);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<NotifType | "all">("all");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the NOVSMM notifications mini-service on port 3003
    // ALWAYS via XTransformPort query — never http://localhost:3003
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connected", () => setConnected(true));
    socket.on("notification", (n: Notification) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const visible = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Real-time feed
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Live, WebSocket-delivered. No refresh required.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium",
                connected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700"
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                {connected && (
                  <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
                <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500")} />
              </span>
              {connected ? "Live · connected" : "Connecting…"}
              <Wifi className="h-3 w-3" />
            </div>
            <button
              onClick={() => setItems(SEED)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
      </Reveal>

      {/* filters */}
      <Reveal>
        <div className="flex items-center gap-1 overflow-x-auto nov-scroll">
          {(["all", "order", "sale", "marketplace", "ticket", "recharge", "withdrawal", "referral", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === t
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Reveal>

      {/* feed */}
      <Reveal blur>
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {visible.map((n) => {
              const meta = TYPE_META[n.type];
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4 transition-shadow hover:nov-ring"
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.cls)}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {n.title}
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {timeAgo(n.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    {n.amount !== undefined && (
                      <div
                        className={cn(
                          "mt-1.5 inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
                          n.amount > 0 ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {n.amount > 0 ? "+" : ""}${Math.abs(n.amount).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100">
                    <Bell className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No notifications of this type yet.
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
