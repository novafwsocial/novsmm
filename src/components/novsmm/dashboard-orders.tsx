"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Repeat2,
  RotateCcw,
  X,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2,
  Droplets,
} from "lucide-react";
import { useOrders, useRepeatOrder, useCancelOrder, useCreateTicket, useRefillOrder } from "@/hooks/use-api";
import { type OrderStatus } from "./dashboard-data";
import { StatusPill } from "./status-pill";
import { Reveal } from "./reveal";
import { formatPrice } from "@/lib/currency-utils";
import { useApp } from "./app-store";
import { PlatformLogo } from "./platform-logo";
import { cn } from "@/lib/utils";

const FILTERS: { id: OrderStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "processing", label: "Processing" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "partial", label: "Partial" },
  { id: "pending", label: "Pending" },
];

/** Cancel window must match the backend (60 seconds). */
const CANCEL_WINDOW_MS = 60_000;

export function DashboardOrders() {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data, isLoading } = useOrders(filter !== "all" ? filter : undefined, query || undefined);
  const repeatOrder = useRepeatOrder();
  const refillOrder = useRefillOrder();
  const { user } = useApp();
  const currency = (user as any)?.currency ?? "USD";

  const filtered = data?.orders ?? [];
  const selectedOrder = filtered.find((o: any) => o.id === selectedOrderId) ?? null;

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
              {filtered.length} shown · click any row for full details.
            </p>
          </div>
          <button
            onClick={() => window.open("/api/export/orders?format=csv", "_blank")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
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
                  <th scope="col" className="px-4 py-3 text-left font-medium">Order</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Service</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Qty</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Cost</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Progress</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Provider</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">ETA</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
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
                    onClick={() => setSelectedOrderId(o.id)}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PlatformLogo platform={o.platform} size={28} />
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
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => repeatOrder.mutate({ orderId: o.id })}
                          disabled={repeatOrder.isPending}
                          title="Repeat order"
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                        >
                          <Repeat2 className="h-3 w-3" />
                        </button>
                        {o.status === "completed" && (
                          <button
                            onClick={() => refillOrder.mutate({ orderId: o.id })}
                            disabled={refillOrder.isPending}
                            title="Request refill"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
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

      {/* Order Detail Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailDrawer
            order={selectedOrder}
            currency={currency}
            onClose={() => setSelectedOrderId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────── Order Detail Drawer ───────────
function OrderDetailDrawer({
  order,
  currency,
  onClose,
}: {
  order: any;
  currency: string;
  onClose: () => void;
}) {
  const cancelOrder = useCancelOrder();
  const createTicket = useCreateTicket();
  const refillOrder = useRefillOrder();
  const [refillSubmitting, setRefillSubmitting] = useState(false);

  // Cancel eligibility: status must be pending/processing and within 60s
  const elapsed = Date.now() - new Date(order.createdAt).getTime();
  const canCancel =
    (order.status === "pending" || order.status === "processing") &&
    elapsed <= CANCEL_WINDOW_MS;
  const secondsLeftToCancel = canCancel
    ? Math.max(0, Math.ceil((CANCEL_WINDOW_MS - elapsed) / 1000))
    : 0;

  // dripFeedConfig is now a Json column — Prisma + the API JSON response
  // already give us the parsed object, so no JSON.parse is needed.
  const dripConfig = useMemo(() => order.dripFeedConfig ?? null, [order.dripFeedConfig]);

  const handleCancel = async () => {
    await cancelOrder.mutateAsync({ orderId: order.id });
    onClose();
  };

  const handleRefill = async () => {
    setRefillSubmitting(true);
    try {
      // Use the internal refill endpoint (session auth) — creates a ticket
      // with subject `[Refill] {publicId}` and enqueues an order.fulfill
      // job with isRefill=true. Falls back to a manual support ticket only
      // if the endpoint returns an unexpected error.
      await refillOrder.mutateAsync({ orderId: order.id });
      onClose();
    } catch {
      // Fallback: open a manual support ticket so the user isn't stuck.
      await createTicket.mutateAsync({
        subject: `Refill request — Order #${order.publicId}`,
        message: `Please process a refill for order #${order.publicId} (${order.platform} · ${order.serviceName}, qty ${order.quantity}). Link: ${order.link ?? "—"}`,
        priority: "medium",
      });
      onClose();
    } finally {
      setRefillSubmitting(false);
    }
  };

  // Status timeline (visual)
  const timelineSteps = [
    { id: "pending", label: "Pending", at: order.createdAt },
    { id: "processing", label: "Processing", at: order.status !== "pending" ? order.updatedAt : null },
    { id: "in_progress", label: "In progress", at: ["in_progress", "partial", "completed"].includes(order.status) ? order.updatedAt : null },
    { id: "completed", label: "Completed", at: order.status === "completed" ? order.completedAt ?? order.updatedAt : null },
  ];
  const cancelled = order.status === "cancelled";

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-sm"
      />
      {/* Drawer */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 36 }}
        className="fixed right-0 top-0 z-[81] flex h-full w-full max-w-md flex-col overflow-y-auto bg-background border-l border-border/60 nov-scroll"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <PlatformLogo platform={order.platform} size={32} />
            <div>
              <div className="font-mono text-sm font-semibold text-foreground">
                #{order.publicId}
              </div>
              <div className="text-[11px] text-muted-foreground">{order.serviceName}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Status + drip-feed banner */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={order.status} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {order.priority} priority
            </span>
            {dripConfig && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Droplets className="h-3 w-3" /> Drip-feed
              </span>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-border/60 p-4">
            <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">Timeline</div>
            {cancelled ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Order was cancelled — refund issued</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {timelineSteps.map((s) => {
                  const active = !!s.at;
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {active ? "✓" : "·"}
                      </div>
                      <div className="flex-1">
                        <div className={cn("text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                          {s.label}
                        </div>
                        {active && s.at && (
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(s.at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drip-feed config */}
          {dripConfig && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Droplets className="h-4 w-4 text-primary" /> Drip-feed configuration
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <ConfigItem label="Total quantity" value={Number(dripConfig.totalQuantity ?? order.quantity).toLocaleString()} />
                <ConfigItem label="Chunks" value={String(dripConfig.chunks ?? "—")} />
                <ConfigItem label="Per chunk" value={Number(dripConfig.perChunk ?? 0).toLocaleString()} />
                <ConfigItem label="Delay" value={`${dripConfig.delayMinutes ?? 0}m`} />
                <ConfigItem label="Start date" value={dripConfig.startDate ? new Date(dripConfig.startDate).toLocaleString() : "—"} full />
              </div>
            </div>
          )}

          {/* Service + link */}
          <DetailCard title="Service & target">
            <DetailRow label="Order ID" value={`#${order.publicId}`} />
            <DetailRow label="Platform" value={order.platform} />
            <DetailRow label="Service" value={order.serviceName} />
            <DetailRow label="Provider" value={order.providerName ?? "—"} />
            {order.link ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <span className="truncate font-mono text-muted-foreground">{order.link}</span>
                <a
                  href={order.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <DetailRow label="Link" value="—" />
            )}
          </DetailCard>

          {/* Quantity & price */}
          <DetailCard title="Quantity & pricing">
            <DetailRow label="Quantity" value={order.quantity.toLocaleString()} />
            <DetailRow label="Unit price" value={`${formatPrice(order.unitPrice, currency)} / 1k`} />
            <DetailRow label="Unit cost" value={`${formatPrice(order.unitCost, currency)} / 1k`} />
            <DetailRow label="Total price" value={formatPrice(order.totalPrice, currency)} accent="emerald" />
          </DetailCard>

          {/* Dates */}
          <DetailCard title="Dates">
            <DetailRow label="Created" value={new Date(order.createdAt).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(order.updatedAt).toLocaleString()} />
            {order.completedAt && (
              <DetailRow label="Completed" value={new Date(order.completedAt).toLocaleString()} />
            )}
            <DetailRow label="ETA" value={order.eta} />
          </DetailCard>

          {/* Action buttons */}
          <div className="mt-2 flex flex-col gap-2">
            {order.status === "completed" && (
              <button
                onClick={handleRefill}
                disabled={refillSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/10 disabled:opacity-60"
              >
                {refillSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Request refill
              </button>
            )}

            {canCancel ? (
              <button
                onClick={handleCancel}
                disabled={cancelOrder.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/20 disabled:opacity-60"
              >
                {cancelOrder.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Cancel order · {secondsLeftToCancel}s left
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/40 py-2.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {order.status === "cancelled"
                  ? "Order cancelled"
                  : order.status === "completed"
                    ? "Order completed — no cancellation possible"
                    : "Cancel window expired (60s after placement)"}
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

// ─────────── Drawer sub-components ───────────
function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald";
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums text-foreground",
          accent === "emerald" && "text-emerald-600 font-semibold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ConfigItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={cn("rounded-lg bg-background/60 px-2.5 py-1.5", full && "col-span-2")}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-medium text-foreground">{value}</div>
    </div>
  );
}
