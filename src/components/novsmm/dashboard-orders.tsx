"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Search, Filter, Download, Repeat2 } from "lucide-react";
import { useOrders, useRepeatOrder } from "@/hooks/use-api";
import { type OrderStatus } from "./dashboard-data";
import { StatusPill } from "./status-pill";
import { Reveal } from "./reveal";
import { formatPrice } from "@/lib/currency-utils";
import { useApp } from "./app-store";
import { cn } from "@/lib/utils";

const FILTERS: { id: OrderStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "processing", label: "Processing" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "partial", label: "Partial" },
  { id: "pending", label: "Pending" },
];

export function DashboardOrders() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useOrders(filter !== "all" ? filter : undefined, query || undefined);
  const repeatOrder = useRepeatOrder();
  const { user } = useApp();
  const currency = user?.currency ?? "USD";

  const filtered = data?.orders ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Orders
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              All orders
            </h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} shown · live status, filters & instant search.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </Reveal>

      {/* Search + filters */}
      <Reveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm transition-colors focus-within:border-primary/40">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by ID, platform, service, provider…"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto nov-scroll">
            <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f.id
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {filter === f.id && (
                  <motion.span
                    layoutId="order-filter"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Table */}
      <Reveal blur>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Service</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Progress</th>
                  <th className="px-4 py-3 text-left font-medium">Provider</th>
                  <th className="px-4 py-3 text-right font-medium">ETA</th>
                  <th className="px-4 py-3 text-right font-medium">Repeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((o: any, i: number) => (
                  <motion.tr
                    key={o.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{o.flag}</span>
                        <div>
                          <div className="font-medium text-foreground">#{o.publicId}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{o.platform}</div>
                      <div className="text-[11px] text-muted-foreground">{o.serviceName}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {o.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatPrice(o.unitCost, currency)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600">
                      {formatPrice(o.totalPrice, currency)}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${o.progress}%` }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className={cn(
                              "h-full rounded-full",
                              o.progress === 100 ? "bg-emerald-500" : "bg-primary"
                            )}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {o.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {o.providerName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                      {o.eta}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => repeatOrder.mutate({ orderId: o.id })}
                        disabled={repeatOrder.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        <Repeat2 className="h-3 w-3" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No orders match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
