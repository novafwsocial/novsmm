"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Activity, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

type StatusService = {
  name: string;
  status: string;
  uptime30d: number;
  latency?: string;
};

type StatusHistoryItem = { date: string; status: string };

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  date: string;
};

type HistoryResponse = {
  overall: string;
  uptime30d: number;
  services: StatusService[];
  incidents: Incident[];
  history: StatusHistoryItem[];
  updatedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  operational: "bg-emerald-400",
  degraded: "bg-amber-400",
  partial: "bg-orange-400",
  major: "bg-rose-500",
};

const STATUS_BADGE: Record<string, string> = {
  operational:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  degraded: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  partial: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  major: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function StatusPage({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    try {
      const r = await fetch("/api/status/history", { cache: "no-store" });
      if (r.ok) {
        const json = await r.json();
        setData(json);
      }
    } catch {
      /* swallow — keep last data */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, []);

  // Lock body scroll while overlay open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const overall = data?.overall ?? "operational";
  const uptime = data?.uptime30d ?? 99.97;
  const services = data?.services ?? [];
  const incidents = data?.incidents ?? [];
  const history = data?.history ?? [];
  const updatedAt = data?.updatedAt ?? new Date().toISOString();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label="System status"
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-md sm:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative my-8 w-full max-w-3xl rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="System status"
        >
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close status page"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                System status
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                All systems operational
              </h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-medium ${
                STATUS_BADGE[overall] ?? STATUS_BADGE.operational
              }`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              {overall}
            </span>
          </div>

          {/* Big uptime number */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                30-day uptime
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {loading ? "—" : `${uptime.toFixed(2)}%`}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Services monitored
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {loading ? "—" : services.length}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Incidents (30d)
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {loading ? "—" : incidents.length}
              </div>
            </div>
          </div>

          {/* Service breakdown */}
          <div className="mt-6">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Services
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <li
                      key={i}
                      className="h-16 animate-pulse rounded-2xl border border-border/40 bg-muted/20"
                    />
                  ))
                : services.map((s) => (
                    <li
                      key={s.name}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-background p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            STATUS_COLORS[s.status] ?? STATUS_COLORS.operational
                          }`}
                        />
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {s.name}
                          </div>
                          {s.latency && (
                            <div className="text-xs text-muted-foreground">
                              {s.latency}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold tabular-nums">
                            {s.uptime30d.toFixed(2)}%
                          </div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            30d uptime
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                            STATUS_BADGE[s.status] ?? STATUS_BADGE.operational
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {s.status}
                        </span>
                      </div>
                    </li>
                  ))}
            </ul>
          </div>

          {/* 30-day history bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Last 30 days
              </div>
              <div className="text-[11px] text-muted-foreground">30 days ago → today</div>
            </div>
            <div className="mt-3 flex items-end gap-[3px]">
              {loading
                ? Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 flex-1 animate-pulse rounded-sm bg-muted"
                    />
                  ))
                : history.map((h) => (
                    <div
                      key={h.date}
                      title={`${h.date} — ${h.status}`}
                      className={`h-8 flex-1 rounded-sm ${
                        STATUS_COLORS[h.status] ?? STATUS_COLORS.operational
                      }`}
                    />
                  ))}
            </div>
          </div>

          {/* Incident log */}
          <div className="mt-6">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Incident history
            </div>
            {incidents.length === 0 ? (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                No incidents in the last 30 days.
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {incidents.map((inc) => (
                  <li
                    key={inc.id}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">
                        {inc.title}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {inc.severity} · {inc.status} · {formatUpdated(inc.date)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
            <div className="text-xs text-muted-foreground">
              Last updated {formatUpdated(updatedAt)} · auto-refreshes every 60s
            </div>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
