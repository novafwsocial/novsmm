"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  TrendingUp,
  Store,
  Tag,
  History,
  Wallet,
  ArrowRight,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  Zap,
  Star,
  Repeat2,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  CartesianGrid,
} from "recharts";
import { Counter } from "./counter";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import {
  useServices,
  useAllServices,
  useCreateOrder,
  useWallet,
  useOrders,
  useRepeatOrder,
  useSession,
  useOffers,
  useCreateOffer,
  useDeleteOffer,
} from "@/hooks/use-api";
import { formatPrice, loadCurrencyRates } from "@/lib/currency-utils";
import { useApp } from "./app-store";
import { PlatformLogo, getPlatformEmoji } from "./platform-logo";
import { cn } from "@/lib/utils";

const PLATFORM_FILTERS = [
  "All", "Instagram", "TikTok", "YouTube", "Facebook",
  "Telegram", "Spotify", "X", "Twitch", "Kick",
  "WhatsApp", "LinkedIn", "Threads", "Snapchat",
  "Discord", "Pinterest", "Other",
];

const QUALITY_BADGES: Record<string, { label: string; cls: string }> = {
  standard: { label: "Standard", cls: "bg-blue-500/10 text-blue-700" },
  hq: { label: "HQ", cls: "bg-emerald-500/10 text-emerald-700" },
  premium: { label: "Premium", cls: "bg-violet-500/10 text-violet-700" },
  real: { label: "Real", cls: "bg-amber-500/10 text-amber-700" },
};

export function DashboardMarketplace() {
  const [tab, setTab] = useState<"buy" | "sell" | "history">("buy");
  const [selectedService, setSelectedService] = useState<any | null>(null);

  // Load currency rates on mount
  useEffect(() => {
    loadCurrencyRates();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Marketplace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Buy · Sell · History
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse 6,382 services, place orders, and repeat past purchases.
            </p>
          </div>
          <WalletDisplay />
        </div>
      </Reveal>

      {/* Tabs */}
      <Reveal>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background p-1">
          {[
            { id: "buy", label: "Services", icon: Store },
            { id: "sell", label: "Sell", icon: Tag },
            { id: "history", label: "Purchase history", icon: History },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="mk-tab"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <t.icon className="relative h-3.5 w-3.5" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {tab === "buy" && (
        <BuyTab onSelectService={setSelectedService} />
      )}
      {tab === "sell" && <SellTab />}
      {tab === "history" && <HistoryTab onRepeat={() => {}} />}

      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
}

// ─────────── Wallet Display ───────────
function WalletDisplay() {
  const { data } = useWallet();
  const { data: sessionData } = useSession();
  const balance = data?.balance ?? 0;
  const currency = (sessionData?.user as any)?.currency ?? "USD";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-4 py-2.5">
      <Wallet className="h-4 w-4 text-primary" />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Balance · {currency}
        </div>
        <div className="text-sm font-semibold tabular-nums">
          {formatPrice(balance, currency)}
        </div>
      </div>
    </div>
  );
}

// ─────────── Buy Tab (Service Catalog — Paginated + Infinite Scroll) ───────────
const PAGE_SIZE = 24;

function BuyTab({ onSelectService }: { onSelectService: (s: any) => void }) {
  const [platformFilter, setPlatformFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allServices, setAllServices] = useState<any[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setAllServices([]);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset when platform changes
  const handlePlatformChange = (p: string) => {
    setPlatformFilter(p);
    setPage(1);
    setAllServices([]);
    processedPagesRef.current.clear();
  };

  // Fetch paginated services
  const { data, isLoading, isFetching } = useServices({
    platform: platformFilter,
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  // Accumulate services for infinite scroll — use a ref to track if we've processed this page
  const processedPagesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!data?.services) return;
    if (processedPagesRef.current.has(page)) return;
    processedPagesRef.current.add(page);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllServices((prev) => {
      if (page === 1) return data.services;
      const existingIds = new Set(prev.map((s) => s.id));
      const newOnes = data.services.filter((s) => !existingIds.has(s.id));
      return [...prev, ...newOnes];
    });
  }, [data, page]);

  // Reset processed pages when debounced search changes
  useEffect(() => {
    processedPagesRef.current.clear();
  }, [debouncedSearch]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && data?.pagination?.hasMore && !isFetching) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [data?.pagination?.hasMore, isFetching]);

  // Group by platform
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    allServices.forEach((s) => {
      if (!g[s.platform]) g[s.platform] = [];
      g[s.platform].push(s);
    });
    return g;
  }, [allServices]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <Reveal>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus-within:border-primary/40">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services — Instagram, TikTok, followers, views…"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </Reveal>

      {/* Platform filters */}
      <Reveal>
        <div className="flex items-center gap-1.5 overflow-x-auto nov-scroll">
          {PLATFORM_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => handlePlatformChange(p)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                platformFilter === p
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {p !== "All" && (
                <span className="mr-1 inline-flex align-middle"><PlatformLogo platform={p} size={16} /></span>
              )}
              {p}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Results count */}
      {data?.pagination && (
        <div className="text-xs text-muted-foreground">
          Showing {allServices.length} of {data.pagination.total.toLocaleString()} services
        </div>
      )}

      {/* Loading state */}
      {isLoading && page === 1 ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No services match your search.
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([platform, svcs]) => (
            <div key={platform} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <PlatformLogo platform={platform} size={28} />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {platform} · {svcs.length} services
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {svcs.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    currency={currency}
                    onClick={() => onSelectService(s)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex h-20 items-center justify-center">
            {isFetching && page > 1 ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : data?.pagination?.hasMore ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Load more
              </button>
            ) : allServices.length > 0 ? (
              <span className="text-xs text-muted-foreground">— End of catalog —</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────── Service Card ───────────
function ServiceCard({
  service,
  currency,
  onClick,
}: {
  service: any;
  currency: string;
  onClick: () => void;
}) {
  const quality = QUALITY_BADGES[service.quality] ?? QUALITY_BADGES.standard;
  return (
    <div
      onClick={onClick}
      className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-background p-5 transition-all hover:-translate-y-0.5 hover:nov-ring-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PlatformLogo platform={service.platform} size={28} />
            <h4 className="truncate text-sm font-semibold text-foreground">{service.name}</h4>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", quality.cls)}>
          {quality.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {service.deliveryTime}
        </span>
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {service.rate}
        </span>
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {service.minQty.toLocaleString()}-{service.maxQty.toLocaleString()}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Per 1000 · {currency}
          </div>
          <div className="text-lg font-semibold tabular-nums text-foreground">
            {formatPrice(service.price, currency)}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-shadow group-hover:nov-shadow-blue">
          View details
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

// ─────────── Service Detail Modal ───────────
function ServiceDetailModal({
  service,
  onClose,
}: {
  service: any;
  onClose: () => void;
}) {
  const createOrder = useCreateOrder();
  const { data: walletData } = useWallet();
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";
  const [quantity, setQuantity] = useState(service.minQty);
  const [link, setLink] = useState("");

  const totalPriceUSD = (service.price * quantity) / 1000;
  const totalPriceLocal = formatPrice(totalPriceUSD, currency);
  const balance = walletData?.balance ?? 0;
  const sufficient = balance >= totalPriceUSD;

  const quality = QUALITY_BADGES[service.quality] ?? QUALITY_BADGES.standard;

  const handleOrder = async () => {
    await createOrder.mutateAsync({
      serviceId: service.id,
      quantity,
      link: link || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll"
      >
        <button
          onClick={onClose}
          className="sticky top-0 z-10 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
            <PlatformLogo platform={service.platform} size={32} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{service.name}</h2>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", quality.cls)}>
                {quality.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{service.platform} · {service.category}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mt-4 rounded-xl bg-muted/30 p-4">
          <p className="text-sm leading-relaxed text-foreground/90">{service.description}</p>
        </div>

        {/* Specs grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Spec icon={<Clock className="h-4 w-4" />} label="Delivery time" value={service.deliveryTime} />
          <Spec icon={<TrendingUp className="h-4 w-4" />} label="Speed" value={service.rate} />
          <Spec icon={<Zap className="h-4 w-4" />} label="Min quantity" value={service.minQty.toLocaleString()} />
          <Spec icon={<Star className="h-4 w-4" />} label="Max quantity" value={service.maxQty.toLocaleString()} />
        </div>

        {/* Price breakdown */}
        <div className="mt-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Price per 1000</span>
            <span className="font-semibold tabular-nums">{formatPrice(service.price, currency)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your balance</span>
            <span className={cn("font-semibold tabular-nums", sufficient ? "text-emerald-600" : "text-red-600")}>
              {formatPrice(balance, currency)}
            </span>
          </div>
        </div>

        {/* Order form */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Quantity ({service.minQty.toLocaleString()} - {service.maxQty.toLocaleString()})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={quantity}
              min={service.minQty}
              max={service.maxQty}
              onChange={(e) =>
                setQuantity(
                  Math.max(service.minQty, Math.min(service.maxQty, Number(e.target.value) || service.minQty))
                )
              }
              className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-lg font-semibold text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
            {/* Quick quantity buttons */}
            <div className="flex gap-1">
              {[1000, 5000, 10000].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(Math.min(q, service.maxQty))}
                  className="rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {q >= 1000 ? `${q / 1000}K` : q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Link (optional — for services that need a target URL)
          </label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://instagram.com/yourpost"
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
          />
        </div>

        {/* Total + submit */}
        <div className="mt-5 flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total cost</div>
            <div className="text-2xl font-semibold tabular-nums text-foreground">{totalPriceLocal}</div>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            ≈ ${totalPriceUSD.toFixed(2)} USD
          </div>
        </div>

        <button
          onClick={handleOrder}
          disabled={createOrder.isPending || !sufficient}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
        >
          {createOrder.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Placing order…
            </>
          ) : !sufficient ? (
            "Insufficient balance — top up your wallet"
          ) : (
            <>
              Place order · {totalPriceLocal}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}

function Spec({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

// ─────────── History Tab (Purchase History + Repeat) ───────────
function HistoryTab({ onRepeat }: { onRepeat: () => void }) {
  const { data } = useOrders();
  const repeatOrder = useRepeatOrder();
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";
  const orders = data?.orders ?? [];

  // Calculate summary
  const totalSpent = orders.reduce((s: number, o: any) => s + o.totalPrice, 0);
  const completedCount = orders.filter((o: any) => o.status === "completed").length;
  const activeCount = orders.filter((o: any) =>
    ["processing", "in_progress"].includes(o.status)
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <RevealStagger stagger={0.05} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <RevealItem>
          <SummaryCard label="Total orders" value={orders.length.toString()} icon={<History className="h-4 w-4" />} />
        </RevealItem>
        <RevealItem>
          <SummaryCard label="Total spent" value={formatPrice(totalSpent, currency)} icon={<Wallet className="h-4 w-4" />} />
        </RevealItem>
        <RevealItem>
          <SummaryCard label="Completed" value={completedCount.toString()} icon={<CheckCircle2 className="h-4 w-4" />} />
        </RevealItem>
        <RevealItem>
          <SummaryCard label="Active" value={activeCount.toString()} icon={<Zap className="h-4 w-4" />} />
        </RevealItem>
      </RevealStagger>

      {/* Orders list */}
      <Reveal blur>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="text-base font-semibold">Purchase history</div>
            <div className="text-xs text-muted-foreground">
              Click "Repeat" to re-order the same service with the same quantity.
            </div>
          </div>
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Service</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Total ({currency})</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((o: any) => (
                  <tr key={o.id} className="transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-mono text-xs font-medium text-foreground">{o.publicId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PlatformLogo platform={o.platform} size={20} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{o.serviceName}</div>
                          <div className="text-[10px] text-muted-foreground">{o.platform}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {o.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatPrice(o.totalPrice, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} progress={o.progress} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => repeatOrder.mutate({ orderId: o.id })}
                        disabled={repeatOrder.isPending}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                      >
                        <Repeat2 className="h-3.5 w-3.5" />
                        Repeat
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No purchases yet. Browse the Services tab to place your first order.
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

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  const map: Record<string, { label: string; cls: string }> = {
    processing: { label: "Processing", cls: "bg-blue-500/10 text-blue-700" },
    in_progress: { label: "In progress", cls: "bg-primary/10 text-primary" },
    completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-700" },
    partial: { label: "Partial", cls: "bg-amber-500/10 text-amber-700" },
    pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
    cancelled: { label: "Cancelled", cls: "bg-red-500/10 text-red-700" },
  };
  const s = map[status] ?? map.pending;
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", s.cls)}>
        {s.label}
      </span>
      {status !== "completed" && status !== "cancelled" && (
        <span className="text-[10px] tabular-nums text-muted-foreground">{progress}%</span>
      )}
    </div>
  );
}

// ─────────── Sell Tab (Offers) ───────────
function SellTab() {
  const { data: offersData } = useOffers();
  const { data: servicesData } = useAllServices();
  const createOffer = useCreateOffer();
  const deleteOffer = useDeleteOffer();
  const { data: sessionData } = useSession();
  const currency = (sessionData?.user as any)?.currency ?? "USD";
  const [showPublish, setShowPublish] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [price, setPrice] = useState(0);
  const offers = offersData?.offers ?? [];
  const services = servicesData?.services ?? [];

  const handlePublish = async () => {
    if (!selectedService || price <= 0) return;
    await createOffer.mutateAsync({ serviceId: selectedService, price });
    setShowPublish(false);
    setSelectedService("");
    setPrice(0);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active offers</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{offers.length}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total sales</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{offersData?.totalSales ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Earnings</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatPrice(offersData?.totalEarnings ?? 0, currency)}</div>
        </div>
      </div>

      {/* Publish button */}
      <div className="flex justify-end">
        <button onClick={() => setShowPublish(true)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Publish offer
        </button>
      </div>

      {/* Offers list */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Service</th>
              <th className="px-4 py-3 text-right font-medium">Cost</th>
              <th className="px-4 py-3 text-right font-medium">Your price</th>
              <th className="px-4 py-3 text-right font-medium">Margin</th>
              <th className="px-4 py-3 text-right font-medium">Sales</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {offers.map((o: any) => (
              <tr key={o.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{o.service?.name ?? "—"}</div>
                  <div className="text-[10px] text-muted-foreground">{o.service?.platform}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatPrice(o.cost, currency)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600">{formatPrice(o.price, currency)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", o.margin > 100 ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>{o.margin.toFixed(0)}%</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{o.sales}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteOffer.mutate(o.id)} className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-500/20">Remove</button>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No offers published yet. Click "Publish offer" to start selling.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Publish modal */}
      {showPublish && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setShowPublish(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPublish(false)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-base font-semibold">Publish offer</div>
            <p className="mt-1 text-xs text-muted-foreground">Select a service and set your resale price. The margin is calculated automatically.</p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Service</span>
                <select value={selectedService} onChange={(e) => { setSelectedService(e.target.value); const svc = services.find(s => s.id === e.target.value); if (svc) setPrice(svc.price); }} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none">
                  <option value="">Select a service…</option>
                  {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} (cost: ${s.cost.toFixed(2)}/1000)</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Your price per 1000 (USD)</span>
                <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} step="0.01" min="0" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none" />
              </label>
              {selectedService && price > 0 && (() => {
                const svc = services.find(s => s.id === selectedService);
                if (!svc) return null;
                const margin = ((price - svc.cost) / price) * 100;
                return <div className="rounded-xl bg-muted/30 px-4 py-2.5 text-sm"><span className="text-muted-foreground">Margin: </span><span className={cn("font-semibold", margin > 100 ? "text-emerald-600" : "text-amber-600")}>{margin.toFixed(1)}%</span></div>;
              })()}
            </div>
            <button onClick={handlePublish} disabled={createOffer.isPending || !selectedService || price <= 0} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {createOffer.isPending ? "Publishing…" : "Publish offer"}
            </button>
            <button onClick={() => setShowPublish(false)} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
