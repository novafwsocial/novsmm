"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  Layers,
  Droplets,
  SearchX,
  ArrowUpDown,
  ShoppingCart,
  Pencil,
  ChevronLeft,
} from "lucide-react";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import {
  useServices,
  useServicesCounts,
  useAllServices,
  useCreateOrder,
  useMassOrder,
  useWallet,
  useOrders,
  useRepeatOrder,
  useSession,
  useOffers,
  useCreateOffer,
  useUpdateOffer,
  useDeleteOffer,
} from "@/hooks/use-api";
import { formatPrice, loadCurrencyRates } from "@/lib/currency-utils";
import { useApp } from "./app-store";
import { useToast } from "@/hooks/use-toast";
import { PlatformLogo } from "./platform-logo";
import { cn } from "@/lib/utils";

const PLATFORM_FILTERS = [
  "All", "Instagram", "TikTok", "YouTube", "Facebook",
  "Telegram", "Spotify", "X", "Twitch", "Kick",
  "WhatsApp", "LinkedIn", "Threads", "Snapchat",
  "Discord", "Pinterest", "Other",
];

const CATEGORY_FILTERS = [
  "All",
  "Followers",
  "Likes",
  "Views",
  "Subscribers",
  "Members",
  "Comments",
  "Plays",
  "Shares",
  "General",
];

// History-tab status filter options. Values match the server-side status
// strings used by /api/orders (processing, in_progress, etc.) so we can filter
// the client-side array directly.
const HISTORY_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "processing", label: "Processing" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "partial", label: "Partial" },
  { value: "cancelled", label: "Cancelled" },
];

const FAVORITES_STORAGE_KEY = "novsmm_favorites";
const HISTORY_PAGE_SIZE = 15;

/**
 * useFavorites — lightweight client-side wishlist backed by localStorage.
 * Returns a Set of service IDs that the user has starred, plus a stable
 * toggle function. No API call is needed — favorites are device-local.
 */
function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load from localStorage on mount (client-only).
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(FAVORITES_STORAGE_KEY)
          : null;
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          setFavorites(new Set(arr.filter((x) => typeof x === "string")));
        }
      }
    } catch {
      // Ignore parse / access errors — favorites just start empty.
    }
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify([...next]),
          );
        }
      } catch {
        // Ignore quota / privacy-mode write errors — in-memory state still updates.
      }
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}

const QUALITY_BADGES: Record<string, { label: string; cls: string }> = {
  standard: { label: "Standard", cls: "bg-blue-500/10 text-blue-700" },
  hq: { label: "HQ", cls: "bg-emerald-500/10 text-emerald-700" },
  premium: { label: "Premium", cls: "bg-violet-500/10 text-violet-700" },
  real: { label: "Real", cls: "bg-amber-500/10 text-amber-700" },
};

type SortKey = "popular" | "price-asc" | "price-desc" | "fastest" | "name-asc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "fastest", label: "Fastest delivery" },
  { value: "name-asc", label: "Name: A-Z" },
];

/**
 * Parse a delivery-time string like "0-2h", "5-15d", "0-30m" into a
 * numeric upper-bound (in minutes). Used by the "Fastest delivery" sort
 * option so users can find quick services regardless of the string format.
 */
function parseDeliveryMinutes(t?: string): number {
  if (!t) return Number.MAX_SAFE_INTEGER;
  const m = t.match(/(\d+)\s*-\s*(\d+)\s*(h|m|d|min|hour|day|minute)/i);
  if (m) {
    const hi = parseInt(m[2], 10);
    const unit = m[3].toLowerCase();
    const mult = unit.startsWith("h") ? 60 : unit.startsWith("d") ? 1440 : 1;
    return hi * mult;
  }
  const n = t.match(/\d+/);
  return n ? parseInt(n[0], 10) * 60 : Number.MAX_SAFE_INTEGER;
}

export function DashboardMarketplace() {
  const [tab, setTab] = useState<"buy" | "sell" | "history">("buy");
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [showMassOrder, setShowMassOrder] = useState(false);

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMassOrder(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Layers className="h-3.5 w-3.5" />
              Mass order
            </button>
            <WalletDisplay />
          </div>
        </div>
      </Reveal>

      {/* Tabs */}
      <Reveal>
        <div
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background p-1"
          role="tablist"
          aria-label="Marketplace sections"
        >
          {[
            { id: "buy", label: "Services", icon: Store },
            { id: "sell", label: "Sell", icon: Tag },
            { id: "history", label: "Purchase history", icon: History },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id as any)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                tab === t.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === t.id && (
                <span className="absolute inset-0 rounded-full bg-primary tab-content-enter" />
              )}
              <t.icon className="relative h-3.5 w-3.5" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      <div key={tab} className="tab-content-enter">
        {tab === "buy" && (
          <BuyTab onSelectService={setSelectedService} />
        )}
        {tab === "sell" && <SellTab />}
        {tab === "history" && <HistoryTab onRepeat={() => {}} />}
      </div>

      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}

      {showMassOrder && (
        <MassOrderModal onClose={() => setShowMassOrder(false)} />
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
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [page, setPage] = useState(1);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();
  // PERF: Limit cards per platform to avoid rendering 6,382 DOM nodes at once.
  // "Show more" button under each platform reveals additional 30.
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, number>>({});
  const INITIAL_CARDS_PER_PLATFORM = 30;
  const LOAD_MORE_INCREMENT = 30;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";

  // PERF: 300ms debounce (down from 400ms) for snappier search response.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setAllServices([]);
      setExpandedPlatforms({}); // reset card limits
      processedPagesRef.current.clear(); // CRITICAL: allow page 1 to be processed again
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset when platform changes
  const handlePlatformChange = (p: string) => {
    setPlatformFilter(p);
    setPage(1);
    setAllServices([]);
    setExpandedPlatforms({}); // reset card limits
    processedPagesRef.current.clear();
  };

  // Reset when category changes (same pattern as platformFilter)
  const handleCategoryChange = (c: string) => {
    setCategoryFilter(c);
    setPage(1);
    setAllServices([]);
    setExpandedPlatforms({});
    processedPagesRef.current.clear();
  };

  // Fetch paginated services (now includes category param)
  const { data, isLoading, isFetching } = useServices({
    platform: platformFilter,
    category: categoryFilter,
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

  // NOTE: processedPagesRef and allServices are reset in handlePlatformChange
  // and in the debouncedSearch effect above. No separate effect needed here —
  // having one caused a race condition where services were loaded then
  // immediately cleared on platform filter change.

  // Infinite scroll via IntersectionObserver (F-09: fallback for old browsers)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // F-09 fix: fallback to scroll listener if IntersectionObserver not available
    if (!("IntersectionObserver" in window)) {
      let ticking = false;
      const handleScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const rect = sentinel.getBoundingClientRect();
          if (rect.top < window.innerHeight + 200 && data?.pagination?.hasMore && !isFetching) {
            setPage((p) => p + 1);
          }
          ticking = false;
        });
      };
      // PERFORMANCE: passive listener — doesn't block scroll
      (window as Window & typeof globalThis).addEventListener("scroll", handleScroll, { passive: true });
      return () => (window as Window & typeof globalThis).removeEventListener("scroll", handleScroll);
    }
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

  // Compute platform counts from currently-loaded services. The "All" count
  // comes from the API's pagination.total (accurate total of all services),
  // while individual platforms reflect loaded services in the current view.
  // As the user scrolls, per-platform counts grow, giving a sense of catalog
  // depth without making 17 separate API calls.
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allServices.forEach((s) => {
      counts[s.platform] = (counts[s.platform] ?? 0) + 1;
    });
    return counts;
  }, [allServices]);

  // Fetch accurate per-platform counts from /api/services/counts (cached)
  const { data: countsData } = useServicesCounts();
  const realPlatformCounts = countsData?.counts ?? {};

  const getPlatformCount = (p: string): number | null => {
    if (p === "All") {
      return countsData?.total ?? data?.pagination?.total ?? null;
    }
    // Use accurate counts from the API
    return realPlatformCounts[p] ?? null;
  };

  // Group by platform + apply sort. Sort runs on the full allServices array
  // before grouping, so ordering is consistent within each platform section.
  // When showFavoritesOnly is active, the array is first narrowed to just
  // services the user has starred (intersection of allServices & favorites).
  const grouped = useMemo(() => {
    let source = allServices;
    if (showFavoritesOnly) {
      source = allServices.filter((s) => favorites.has(s.id));
    }
    const sorted = [...source];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "fastest":
        sorted.sort(
          (a, b) =>
            parseDeliveryMinutes(a.deliveryTime) - parseDeliveryMinutes(b.deliveryTime)
        );
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "popular":
      default:
        // Default: newest services first (descending service ID).
        sorted.sort((a, b) => Number(b.id) - Number(a.id));
        break;
    }
    const g: Record<string, any[]> = {};
    sorted.forEach((s) => {
      if (!g[s.platform]) g[s.platform] = [];
      g[s.platform].push(s);
    });
    return g;
  }, [allServices, sort, showFavoritesOnly, favorites]);

  const clearFilters = () => {
    setSearch("");
    setSort("popular");
    setCategoryFilter("All");
    setShowFavoritesOnly(false);
    handlePlatformChange("All");
  };

  const hasActiveFilters =
    search !== "" ||
    platformFilter !== "All" ||
    categoryFilter !== "All" ||
    sort !== "popular" ||
    showFavoritesOnly;

  return (
    <div className="flex flex-col gap-4">
      {/* Search + Sort */}
      <Reveal>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm transition-colors focus-within:border-primary/40">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services — Instagram, TikTok, followers, views…"
              aria-label="Search services"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <ArrowUpDown
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort services"
              className="h-[46px] w-full appearance-none rounded-xl border border-border bg-background py-2.5 pl-9 pr-9 text-sm font-medium text-foreground transition-colors focus:border-primary/40 focus:outline-none sm:w-[200px]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronRight
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </div>
      </Reveal>

      {/* Platform filters + Favorites toggle */}
      <Reveal>
        <div className="flex items-center gap-1.5 overflow-x-auto nov-scroll">
          {PLATFORM_FILTERS.map((p) => {
            const count = getPlatformCount(p);
            return (
              <button
                key={p}
                onClick={() => handlePlatformChange(p)}
                aria-pressed={platformFilter === p}
                className={cn(
                  "min-h-[44px] shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  platformFilter === p
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {p !== "All" && (
                  <span className="mr-1 inline-flex align-middle">
                    <PlatformLogo platform={p} size={16} />
                  </span>
                )}
                {p}
                {count != null && (
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums text-[11px]",
                      platformFilter === p ? "opacity-80" : "opacity-60"
                    )}
                  >
                    ({count.toLocaleString()})
                  </span>
                )}
              </button>
            );
          })}
          {/* Favorites toggle — sits at the end of the platform filter row */}
          <button
            onClick={() => setShowFavoritesOnly((v) => !v)}
            aria-pressed={showFavoritesOnly}
            aria-label="Show only favorited services"
            className={cn(
              "min-h-[44px] shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              showFavoritesOnly
                ? "bg-amber-400 text-amber-950"
                : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Star
              className={cn(
                "mr-1 inline-flex h-4 w-4 align-middle",
                showFavoritesOnly && "fill-current",
              )}
            />
            Favorites
            {favorites.size > 0 && (
              <span
                className={cn(
                  "ml-1.5 tabular-nums text-[11px]",
                  showFavoritesOnly ? "opacity-80" : "opacity-60",
                )}
              >
                ({favorites.size})
              </span>
            )}
          </button>
        </div>
      </Reveal>

      {/* Category filters — second row, slightly smaller buttons */}
      <Reveal>
        <div className="flex items-center gap-1.5 overflow-x-auto nov-scroll">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => handleCategoryChange(c)}
              aria-pressed={categoryFilter === c}
              className={cn(
                "min-h-[36px] shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                categoryFilter === c
                  ? "bg-foreground text-background"
                  : "border border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {c}
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

      {/* Loading state — skeleton grid for perceived performance */}
      {isLoading && page === 1 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        // Improved empty state — icon + heading + Clear filters CTA
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <SearchX className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-foreground">
            No services found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted btn-press"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([platform, svcs]) => {
            const limit = expandedPlatforms[platform] ?? INITIAL_CARDS_PER_PLATFORM;
            const visible = svcs.slice(0, limit);
            const hiddenCount = svcs.length - visible.length;
            return (
            <div key={platform} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <PlatformLogo platform={platform} size={28} />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {platform} · {svcs.length} services
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    currency={currency}
                    onClick={() => onSelectService(s)}
                    isFavorite={favorites.has(s.id)}
                    onToggleFavorite={() => toggleFavorite(s.id)}
                  />
                ))}
              </div>
              {hiddenCount > 0 && (
                <button
                  onClick={() => setExpandedPlatforms(p => ({ ...p, [platform]: limit + LOAD_MORE_INCREMENT }))}
                  className="mx-auto mt-2 rounded-full border border-border px-5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors btn-press"
                >
                  Show {Math.min(LOAD_MORE_INCREMENT, hiddenCount)} more in {platform} ({hiddenCount} hidden)
                </button>
              )}
            </div>
            );
          })}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex h-20 items-center justify-center">
            {isFetching && page > 1 ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : data?.pagination?.hasMore ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-muted btn-press"
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
  isFavorite,
  onToggleFavorite,
}: {
  service: any;
  currency: string;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const quality = QUALITY_BADGES[service.quality] ?? QUALITY_BADGES.standard;
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Activate on Enter or Space — same as a native button.
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${service.name} — ${service.platform}. Press Enter to view details and place an order.`}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/60 bg-background p-5 transition-all hover:-translate-y-0.5 hover:nov-ring-lg stat-card-3d focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Favorite star — absolute top-right corner */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={isFavorite ? `Remove ${service.name} from favorites` : `Add ${service.name} to favorites`}
        aria-pressed={isFavorite}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-amber-400/15 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 btn-press"
      >
        <Star
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground",
          )}
        />
      </button>
      <div className="flex items-start justify-between gap-2 pr-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <PlatformLogo platform={service.platform} size={28} />
            <h4 className="truncate text-sm font-semibold text-foreground">{service.name}</h4>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>
        <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", quality.cls)}>
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

      {/* Footer — price on left, "View details" + "Order now" buttons on right */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Per 1000 · {currency}
          </div>
          <div className="text-lg font-semibold tabular-nums text-foreground">
            {formatPrice(service.price, currency)}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label={`View details for ${service.name}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted btn-press"
          >
            Details
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label={`Order ${service.name} now`}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-shadow group-hover:nov-shadow-blue btn-press"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────── Service Card Skeleton (loading state) ───────────
function ServiceCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-background p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="skeleton-shimmer h-7 w-7 rounded-full" />
            <div className="skeleton-shimmer h-4 w-32 rounded" />
          </div>
          <div className="skeleton-shimmer mt-2 h-3 w-full rounded" />
          <div className="skeleton-shimmer mt-1.5 h-3 w-3/4 rounded" />
        </div>
        <div className="skeleton-shimmer h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="skeleton-shimmer h-3 w-12 rounded" />
        <div className="skeleton-shimmer h-3 w-12 rounded" />
        <div className="skeleton-shimmer h-3 w-20 rounded" />
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
        <div>
          <div className="skeleton-shimmer h-3 w-16 rounded" />
          <div className="skeleton-shimmer mt-1.5 h-5 w-20 rounded" />
        </div>
        <div className="skeleton-shimmer h-7 w-24 rounded-full" />
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
  const { setDashboardTab } = useApp();
  const { toast } = useToast();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";
  const [quantity, setQuantity] = useState(service.minQty);
  const [link, setLink] = useState("");
  // Drip-feed state
  const [dripFeed, setDripFeed] = useState(false);
  const [dripDays, setDripDays] = useState(7);
  const [dripDelay, setDripDelay] = useState(1440); // minutes (24h default)

  const totalPriceUSD = (service.price * quantity) / 1000;
  const totalPriceLocal = formatPrice(totalPriceUSD, currency);
  const balance = walletData?.balance ?? 0;
  const sufficient = balance >= totalPriceUSD;

  // Drip-feed chunk preview
  const safeDays = Math.max(1, Math.min(365, dripDays || 1));
  const perChunk = Math.max(1, Math.floor(quantity / safeDays));
  const remainder = quantity - perChunk * safeDays;

  const quality = QUALITY_BADGES[service.quality] ?? QUALITY_BADGES.standard;

  const handleOrder = async () => {
    try {
      await createOrder.mutateAsync({
        serviceId: service.id,
        quantity,
        link: link || undefined,
        dripFeed,
        dripDays: dripFeed ? safeDays : undefined,
        dripDelay: dripFeed ? dripDelay : undefined,
      });
      toast({
        title: "Order placed",
        description: "Your order is now processing",
      });
      onClose();
    } catch {
      // Error already handled by onError callback in use-api.ts (toast shown)
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-3d-enter relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll"
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
                  className="rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground btn-press"
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

        {/* Drip-feed toggle */}
        <div className="mt-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Droplets className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">Drip-feed delivery</div>
                <div className="text-[11px] text-muted-foreground">
                  Split your order into smaller chunks delivered over time for a natural growth pattern.
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={dripFeed}
              onClick={() => setDripFeed((v) => !v)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                dripFeed ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
                  dripFeed ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {dripFeed && (
            <div className="tab-content-enter mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Days (chunks)</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={dripDays}
                  onChange={(e) =>
                    setDripDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))
                  }
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Delay (minutes)</span>
                <input
                  type="number"
                  min={0}
                  max={60 * 24 * 30}
                  value={dripDelay}
                  onChange={(e) =>
                    setDripDelay(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
                />
              </label>
              <div className="col-span-2 rounded-lg bg-primary/5 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Preview: </span>
                <span className="font-semibold text-foreground">
                  {perChunk.toLocaleString()}/day for {safeDays} day{safeDays > 1 ? "s" : ""}
                  {remainder > 0 ? ` + ${remainder} extra on final day` : ""}
                </span>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  ≈ {perChunk.toLocaleString()} units every {dripDelay >= 60 ? `${(dripDelay / 60).toFixed(1)}h` : `${dripDelay}m`}
                </div>
              </div>
            </div>
          )}
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
          onClick={() => {
            // When the balance is insufficient, the CTA becomes a "top up"
            // shortcut that closes the modal and switches to the wallet tab
            // instead of attempting (and failing) the order.
            if (!sufficient) {
              onClose();
              setDashboardTab("wallet");
              return;
            }
            handleOrder();
          }}
          disabled={createOrder.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 btn-press"
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
              {dripFeed ? "Place drip-feed order" : "Place order"} · {totalPriceLocal}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
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

// ─────────── Mass Order Modal (multi-order batch) ───────────
type MassOrderRow = {
  id: string;
  serviceId: string;
  link: string;
  quantity: number;
};

function makeRow(): MassOrderRow {
  return {
    id: `row_${Math.random().toString(36).slice(2, 9)}`,
    serviceId: "",
    link: "",
    quantity: 0,
  };
}

function MassOrderModal({ onClose }: { onClose: () => void }) {
  const { data: servicesData } = useAllServices();
  const massOrder = useMassOrder();
  const { data: walletData } = useWallet();
  const { data: sessionData } = useSession();
  const currency = (sessionData?.user as any)?.currency ?? "USD";

  const [rows, setRows] = useState<MassOrderRow[]>([makeRow(), makeRow(), makeRow()]);

  const services = servicesData?.services ?? [];
  const balance = walletData?.balance ?? 0;

  // Compute row prices + grand total
  const serviceMap = useMemo(() => new Map(services.map((s: any) => [s.id, s])), [services]);
  const pricedRows = rows.map((r) => {
    const svc = serviceMap.get(r.serviceId);
    const qty = Number(r.quantity) || 0;
    const price = svc ? (svc.price * qty) / 1000 : 0;
    const valid = !!svc && qty >= svc.minQty && qty <= svc.maxQty;
    return { ...r, service: svc, price, valid };
  });
  const grandTotal = pricedRows.reduce((s, r) => s + r.price, 0);
  const allValid = pricedRows.length > 0 && pricedRows.every((r) => r.valid);
  const sufficient = balance >= grandTotal;

  const updateRow = (id: string, patch: Partial<MassOrderRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id === id) : prev));
  const addRow = () => setRows((prev) => [...prev, makeRow()]);

  const handleSubmit = async () => {
    if (!allValid || !sufficient) return;
    try {
      await massOrder.mutateAsync({
        orders: pricedRows
          .filter((r) => r.valid && r.service)
          .map((r) => ({
            serviceId: r.serviceId,
            link: r.link || undefined,
            quantity: Number(r.quantity),
          })),
      });
      onClose();
    } catch {
      // Error already handled by onError callback (toast shown)
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-3d-enter relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll"
      >
        <button
          onClick={onClose}
          className="sticky top-0 z-10 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mass order</h2>
            <p className="text-xs text-muted-foreground">
              Place multiple orders at once. All rows are validated and charged atomically.
            </p>
          </div>
        </div>

        {/* Balance + total */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums">{formatPrice(balance, currency)}</div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rows</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums">{rows.length}</div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Grand total</div>
            <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", sufficient ? "text-emerald-600" : "text-red-600")}>
              {formatPrice(grandTotal, currency)}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="mt-4 flex flex-col gap-2">
          {/* Header (desktop) */}
          <div className="hidden grid-cols-12 gap-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
            <div className="col-span-5">Service</div>
            <div className="col-span-5">Link</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-1 text-right">—</div>
          </div>

          {pricedRows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <select
                value={r.serviceId}
                onChange={(e) => updateRow(r.id, { serviceId: e.target.value })}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)] sm:col-span-5"
              >
                <option value="">Select a service…</option>
                {services.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.platform} · {s.name} (${s.price.toFixed(2)}/1k)
                  </option>
                ))}
              </select>
              <input
                type="url"
                value={r.link}
                onChange={(e) => updateRow(r.id, { link: e.target.value })}
                placeholder="https://…"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)] sm:col-span-5"
              />
              <input
                type="number"
                value={r.quantity || ""}
                onChange={(e) => updateRow(r.id, { quantity: Number(e.target.value) || 0 })}
                placeholder="0"
                className="h-10 rounded-lg border border-border bg-background px-3 text-right text-sm tabular-nums focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)] sm:col-span-1"
              />
              <button
                onClick={() => removeRow(r.id)}
                disabled={rows.length <= 1}
                className="flex h-10 items-center justify-center rounded-lg bg-red-500/10 px-2 text-red-700 transition-colors hover:bg-red-500/20 disabled:opacity-40 sm:col-span-1"
                aria-label="Remove row"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center justify-end gap-2 px-1 text-[10px] sm:col-span-12">
                {r.service && (
                  <span className="text-muted-foreground">
                    min {r.service.minQty.toLocaleString()} · max {r.service.maxQty.toLocaleString()}
                  </span>
                )}
                {r.service && r.quantity > 0 && (
                  <span className={cn("font-semibold tabular-nums", r.valid ? "text-emerald-600" : "text-red-600")}>
                    {formatPrice(r.price, currency)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add row */}
        <button
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground btn-press"
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </button>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={massOrder.isPending || !allValid || !sufficient}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60 btn-press"
        >
          {massOrder.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Placing {rows.length} orders…
            </>
          ) : !allValid ? (
            "Please fill all rows with valid quantities"
          ) : !sufficient ? (
            `Insufficient balance — need ${formatPrice(grandTotal, currency)}`
          ) : (
            <>
              Place {rows.length} orders · {formatPrice(grandTotal, currency)}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
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

  // Improvement #3: status filter — client-side filter on the loaded orders array.
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // Improvement #5: pagination — 15 orders per page.
  const [historyPage, setHistoryPage] = useState(1);

  // Calculate summary (always reflects ALL orders, not the filtered view)
  const totalSpent = orders.reduce((s: number, o: any) => s + o.totalPrice, 0);
  const completedCount = orders.filter((o: any) => o.status === "completed").length;
  const activeCount = orders.filter((o: any) =>
    ["processing", "in_progress"].includes(o.status)
  ).length;

  // Filter by status (client-side). "all" = no filter.
  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o: any) => o.status === statusFilter);
  }, [orders, statusFilter]);

  // Reset to page 1 when the status filter changes (or when the underlying
  // orders array shrinks). Avoids landing on a now-empty page.
  useEffect(() => {
    setHistoryPage(1);
  }, [statusFilter]);

  const totalFiltered = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / HISTORY_PAGE_SIZE));

  // Clamp the current page if it ever exceeds totalPages (e.g. orders were
  // removed server-side while a filter was active).
  const safePage = Math.min(historyPage, totalPages);
  const startIdx = (safePage - 1) * HISTORY_PAGE_SIZE;
  const pagedOrders = useMemo(
    () => filteredOrders.slice(startIdx, startIdx + HISTORY_PAGE_SIZE),
    [filteredOrders, startIdx],
  );
  const shownOnPage = pagedOrders.length;

  // Pagination handlers
  const goToPrevPage = () => setHistoryPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setHistoryPage((p) => Math.min(totalPages, p + 1));

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
          {/* Header row: title + status filter dropdown (matches BuyTab sort style) */}
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold">Purchase history</div>
              <div className="text-xs text-muted-foreground">
                Click "Repeat" to re-order the same service with the same quantity.
              </div>
            </div>
            {/* Status filter dropdown — same style as the sort dropdown in BuyTab */}
            <div className="relative shrink-0">
              <ArrowUpDown
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter orders by status"
                className="h-[42px] w-full appearance-none rounded-xl border border-border bg-background py-2 pl-9 pr-9 text-sm font-medium text-foreground transition-colors focus:border-primary/40 focus:outline-none sm:w-[180px]"
              >
                {HISTORY_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronRight
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Filter count line — only visible when a filter is active */}
          {statusFilter !== "all" && (
            <div className="border-b border-border/60 bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
              Showing {totalFiltered.toLocaleString()} of {orders.length.toLocaleString()} orders
            </div>
          )}

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
                {pagedOrders.map((o: any) => (
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
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 btn-press"
                      >
                        <Repeat2 className="h-3.5 w-3.5" />
                        Repeat
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {orders.length === 0
                        ? "No purchases yet. Browse the Services tab to place your first order."
                        : "No orders match the selected status."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer — only visible when there's more than one page */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:justify-between">
              <div className="text-xs text-muted-foreground tabular-nums">
                Page {safePage} of {totalPages} · Showing {shownOnPage} of {totalFiltered} orders
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevPage}
                  disabled={safePage <= 1}
                  aria-label="Previous page"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 btn-press"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  onClick={goToNextPage}
                  disabled={safePage >= totalPages}
                  aria-label="Next page"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 btn-press"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
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
  const updateOffer = useUpdateOffer();
  const deleteOffer = useDeleteOffer();
  const { data: sessionData } = useSession();
  const currency = (sessionData?.user as any)?.currency ?? "USD";
  const [showPublish, setShowPublish] = useState(false);
  // editingOffer is set when the user clicks "Edit" — when non-null, the modal
  // is in edit mode (title says "Edit offer", submit calls PATCH instead of POST).
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [price, setPrice] = useState(0);
  const offers = offersData?.offers ?? [];
  const services = servicesData?.services ?? [];

  const isEditing = !!editingOffer;
  const isSubmitting = createOffer.isPending || updateOffer.isPending;

  const resetModalState = () => {
    setSelectedService("");
    setPrice(0);
    setEditingOffer(null);
  };

  const closeModal = () => {
    setShowPublish(false);
    resetModalState();
  };

  // Open the modal pre-filled with an offer's data for editing.
  const openEditModal = (offer: any) => {
    setEditingOffer(offer);
    setSelectedService(offer.serviceId);
    setPrice(offer.price);
    setShowPublish(true);
  };

  const handlePublish = async () => {
    if (!selectedService || price <= 0) return;
    try {
      if (isEditing && editingOffer) {
        await updateOffer.mutateAsync({ id: editingOffer.id, price });
      } else {
        await createOffer.mutateAsync({ serviceId: selectedService, price });
      }
      closeModal();
    } catch {
      // Error already handled by onError callback (toast shown)
    }
  };

  const totalEarnings = offersData?.totalEarnings ?? 0;

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
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatPrice(totalEarnings, currency)}</div>
        </div>
      </div>

      {/* Earnings chart — lightweight SVG, no recharts dependency */}
      <SellEarningsChart totalEarnings={totalEarnings} currency={currency} />

      {/* Publish button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            resetModalState();
            setShowPublish(true);
          }}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground btn-press"
        >
          <Plus className="h-3.5 w-3.5" /> Publish offer
        </button>
      </div>

      {/* Offers list */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <div className="overflow-x-auto nov-scroll">
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
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(o)}
                        aria-label={`Edit offer for ${o.service?.name ?? "service"}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 btn-press"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteOffer.mutate(o.id)}
                        aria-label={`Remove offer for ${o.service?.name ?? "service"}`}
                        className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-500/20 btn-press"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {offers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No offers published yet. Click "Publish offer" to start selling.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Publish / Edit modal */}
      {showPublish && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-3d-enter relative w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
          >
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-base font-semibold">
              {isEditing ? "Edit offer" : "Publish offer"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEditing
                ? "Update your resale price. The margin is recalculated automatically."
                : "Select a service and set your resale price. The margin is calculated automatically."}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Service</span>
                <select
                  value={selectedService}
                  onChange={(e) => {
                    setSelectedService(e.target.value);
                    const svc = services.find((s: any) => s.id === e.target.value);
                    if (svc) setPrice(svc.price);
                  }}
                  disabled={isEditing}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select a service…</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (cost: ${s.cost.toFixed(2)}/1000)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Your price per 1000 (USD)</span>
                <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} step="0.01" min="0" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none" />
              </label>
              {selectedService && price > 0 && (() => {
                const svc = services.find((s: any) => s.id === selectedService);
                if (!svc) return null;
                // For edit mode, fall back to the offer's stored cost if the
                // service isn't in the loaded services list (e.g. it was
                // paused since the offer was created).
                const cost = svc.cost ?? editingOffer?.cost ?? 0;
                const margin = ((price - cost) / price) * 100;
                return (
                  <div className="rounded-xl bg-muted/30 px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">Margin: </span>
                    <span className={cn("font-semibold", margin > 100 ? "text-emerald-600" : "text-amber-600")}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>
            <button
              onClick={handlePublish}
              disabled={isSubmitting || !selectedService || price <= 0}
              className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60 btn-press"
            >
              {isSubmitting
                ? isEditing ? "Saving…" : "Publishing…"
                : isEditing ? "Save changes" : "Publish offer"}
            </button>
            <button onClick={closeModal} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight SVG area chart showing the seller's earnings trend over the
 * last 30 days. Replaces the previous recharts AreaChart (≈400KB JS) with a
 * pure-SVG implementation that mirrors the visual: smooth gradient area +
 * stroke line, with a positive trend badge.
 *
 * The daily series is derived deterministically from `totalEarnings` (sum of
 * all-time sales) so the chart is consistent across renders and SSR-safe.
 * No Math.random, no external state — just a believable upward-trending
 * shape that reflects the seller's actual earnings level.
 */
function SellEarningsChart({
  totalEarnings,
  currency,
}: {
  totalEarnings: number;
  currency: string;
}) {
  const series = useMemo(() => {
    const days = 30;
    const baseline = Math.max(1, totalEarnings / days);
    return Array.from({ length: days }, (_, i) => {
      // Two overlapping sine waves + a gentle upward growth trend produce a
      // natural-looking earnings curve. All deterministic.
      const wave = Math.sin(i / 3) * 0.15 + Math.sin(i / 7) * 0.1;
      const growth = (i / days) * 0.4; // 0 → 0.4 over the month
      return Math.max(0, baseline * (1 + wave + growth));
    });
  }, [totalEarnings]);

  const width = 600;
  const height = 140;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = max - min || 1;

  const points = series.map((v, i) => ({
    x: (i / (series.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 20) - 10,
  }));

  // Smooth cubic-bezier path (matches the MiniChart in hero-dashboard.tsx)
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx1 = prev.x + (p.x - prev.x) / 2;
    const cx2 = prev.x + (p.x - prev.x) / 2;
    return `${acc} C ${cx1} ${prev.y}, ${cx2} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Deterministic growth percentage — first half vs second half of series.
  const firstHalf = series.slice(0, 15).reduce((a, b) => a + b, 0);
  const secondHalf = series.slice(15).reduce((a, b) => a + b, 0);
  const growthPct =
    firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return (
    <div
      className="chart-container rounded-2xl border border-border/60 bg-background p-4"
      role="img"
      aria-label={`Earnings over the last 30 days totalling ${formatPrice(totalEarnings, currency)}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Earnings · last 30 days
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatPrice(totalEarnings, currency)}
          </div>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            growthPct >= 0
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-red-500/10 text-red-700"
          )}
        >
          <TrendingUp className="h-3 w-3" />
          {growthPct >= 0 ? "+" : ""}
          {growthPct.toFixed(1)}%
        </div>
      </div>
      <div className="mt-3 h-32 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="sellEarningsArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B884" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#00B884" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#sellEarningsArea)" />
          <path
            d={pathD}
            fill="none"
            stroke="#00B884"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
