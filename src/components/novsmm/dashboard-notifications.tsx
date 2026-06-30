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
  Loader2,
} from "lucide-react";
import { useNotifications } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type NotifType = "order" | "sale" | "marketplace" | "ticket" | "recharge" | "withdrawal" | "referral" | "system";

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

export function DashboardNotifications() {
  const { data, isLoading } = useNotifications();
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<NotifType | "all">("all");
  const socketRef = useRef<Socket | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connected", () => setConnected(true));
    // When a WS notification arrives, invalidate the query to refetch from DB
    socket.on("notification", () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);

  const items = data?.notifications ?? [];
  const visible = filter === "all" ? items : items.filter((i: any) => i.type === filter);

  const markAllRead = async () => {
    await api.post("/api/notifications", { all: true });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

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
              Live, WebSocket-delivered from the database. No refresh required.
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
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" /> Mark all read
            </button>
          </div>
        </div>
      </Reveal>

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

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Reveal blur>
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {visible.map((n: any) => {
                const meta = TYPE_META[n.type as NotifType] ?? TYPE_META.system;
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: -12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border bg-background p-4 transition-shadow hover:nov-ring",
                      n.read ? "border-border/40" : "border-primary/30 bg-primary/[0.02]"
                    )}
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
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                      {n.amount !== null && n.amount !== undefined && (
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
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
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
      )}
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
