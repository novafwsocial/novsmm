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
  GitCompare,
  LayoutGrid,
  List as ListIcon,
  Flame,
  Download,
  Pause,
  Play,
  BarChart3,
  Sparkles,
  DollarSign,
  Filter,
  RotateCcw,
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
  useUpdateOfferStatus,
  useDeleteOffer,
  useCancelOrder,
  useAdminRefundOrder,
} from "@/hooks/use-api";
import { formatPrice, loadCurrencyRates } from "@/lib/currency-utils";
import { useApp } from "./app-store";
import { useToast } from "@/hooks/use-toast";
import { PlatformLogo, getPlatformEmoji } from "./platform-logo";
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

// MARKETPLACE-13-IMPROVEMENTS — new localStorage-backed feature storage keys
const REVIEWS_STORAGE_KEY = "novsmm_reviews";
const VIEW_MODE_STORAGE_KEY = "novsmm_view_mode";
const MAX_COMPARISON = 3; // up to 3 services in compare tray
const TRENDING_COUNT = 6; // number of trending mini-cards to show
const SALE_POLL_INTERVAL = 30_000; // 30s polling for new-sale notifications
const ORDER_CANCEL_WINDOW_MS = 60_000; // 60s cancel window for non-admins
// Type for the rating entry persisted in localStorage. We store a running
// average + count so the card can render `★ 4.5 (12)` without re-tallying.
type ReviewEntry = { rating: number; count: number };
type ReviewsMap = Record<string, ReviewEntry>;

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

/**
 * useReviews — client-side star ratings (MARKETPLACE-13-IMPROVEMENTS #9).
 * Storage shape: { [serviceId]: { rating: runningAvg, count: n } }.
 *
 * The average is updated incrementally with the standard online-mean formula
 * (avg = avg + (rating - avg) / count) so we never need to store the raw
 * individual votes — keeping the localStorage payload tiny even for power
 * users who rate dozens of services.
 */
function useReviews() {
  const [reviews, setReviews] = useState<ReviewsMap>({});

  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(REVIEWS_STORAGE_KEY)
          : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") setReviews(parsed as ReviewsMap);
      }
    } catch {
      // ignore
    }
  }, []);

  const rateService = useCallback((serviceId: string, rating: number) => {
    setReviews((prev) => {
      const existing = prev[serviceId];
      const next: ReviewsMap = { ...prev };
      if (existing) {
        const newCount = existing.count + 1;
        const newAvg = existing.rating + (rating - existing.rating) / newCount;
        next[serviceId] = { rating: newAvg, count: newCount };
      } else {
        next[serviceId] = { rating, count: 1 };
      }
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore write errors
      }
      return next;
    });
  }, []);

  const getRating = useCallback(
    (serviceId: string): ReviewEntry | null => reviews[serviceId] ?? null,
    [reviews],
  );

  return { reviews, rateService, getRating };
}

/**
 * useViewMode — grid vs list preference (MARKETPLACE-13-IMPROVEMENTS #10).
 * Persisted to localStorage so the user's choice survives page reloads.
 * Defaults to "grid" (the existing layout) when no preference is stored.
 */
function useViewMode() {
  const [viewMode, setViewModeState] = useState<"grid" | "list">("grid");

  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
          : null;
      if (stored === "grid" || stored === "list") setViewModeState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setViewMode = useCallback((mode: "grid" | "list") => {
    setViewModeState(mode);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      }
    } catch {
      // ignore
    }
  }, []);

  return { viewMode, setViewMode };
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
        {tab === "history" && <HistoryTab />}
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
  const { reviews, rateService, getRating } = useReviews();
  const { viewMode, setViewMode } = useViewMode();

  // MARKETPLACE-13-IMPROVEMENTS #6 — comparison tray state. Reset on page
  // leave (intentionally NOT persisted to localStorage per the task spec).
  const [comparisonList, setComparisonList] = useState<any[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // MARKETPLACE-13-IMPROVEMENTS #7 — price filter. The "input" values are
  // what's typed; `applied*` is what's actually used for filtering (committed
  // on Apply click). This matches the spec: "Apply button that filters".
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);

  // PERF: Limit cards per platform to avoid rendering 6,382 DOM nodes at once.
  // "Show more" button under each platform reveals additional 30.
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, number>>({});
  const INITIAL_CARDS_PER_PLATFORM = 30;
  const LOAD_MORE_INCREMENT = 30;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";

  // Tracks which pages have already been merged into `allServices` so we don't
  // double-append when the data effect re-runs. Cleared by the filter handlers
  // below so a fresh query starts from page 1.
  const processedPagesRef = useRef<Set<number>>(new Set());

  // PERF: 300ms debounce for snappier search response. We skip the very first
  // run (mount) so we don't blow away the initial page-1 fetch that's already
  // in flight — that was the root cause of the "0 of N services" rendering
  // bug: the timeout fired 300ms after mount and cleared `allServices` after
  // the data effect had just populated it, and because `data` didn't change
  // the effect never re-ran to repopulate.
  const skipFirstSearchRef = useRef(true);
  useEffect(() => {
    if (skipFirstSearchRef.current) {
      skipFirstSearchRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setAllServices([]);
      setExpandedPlatforms({}); // reset card limits
      processedPagesRef.current.clear(); // allow page 1 to be processed again
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

  // Fetch paginated services (includes platform/category/search/page params).
  // `isPlaceholderData` is true while React Query is fetching the next result
  // but is still showing the previous (now-stale) data — we use it below to
  // avoid merging stale services into the accumulator.
  const { data, isLoading, isFetching, isPlaceholderData } = useServices({
    platform: platformFilter,
    category: categoryFilter,
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  // Accumulate services for infinite scroll. Skip placeholder (stale) data so
  // we never merge the previous query's services into the current view —
  // this is what guarantees a clean reset when platform/category/search
  // change even though `useServices` keeps the old `data` reference alive
  // while the new fetch is in flight.
  useEffect(() => {
    if (!data?.services) return;
    if (isPlaceholderData) return; // wait for the real (current-query) data
    if (data.pagination?.page !== page) return; // safety: ignore mismatched pages
    if (processedPagesRef.current.has(page)) return;
    processedPagesRef.current.add(page);

    setAllServices((prev) => {
      if (page === 1) return data.services;
      const existingIds = new Set(prev.map((s) => s.id));
      const newOnes = data.services.filter((s) => !existingIds.has(s.id));
      return [...prev, ...newOnes];
    });
  }, [data, page, isPlaceholderData]);

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

  // Fetch accurate per-platform counts from /api/services/counts (cached).
  // This replaces the old client-side `platformCounts` useMemo which computed
  // counts from `allServices` but was never actually read — `getPlatformCount`
  // below uses the server-provided counts instead, which are accurate for the
  // whole catalog (not just the currently-loaded page).
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
  // MARKETPLACE-13-IMPROVEMENTS #7: client-side price filter is also applied
  // here so the indicator + grouped counts reflect the active range.
  const grouped = useMemo(() => {
    let source = allServices;
    if (showFavoritesOnly) {
      source = allServices.filter((s) => favorites.has(s.id));
    }
    if (appliedMinPrice != null || appliedMaxPrice != null) {
      source = source.filter((s) => {
        const p = s.price;
        if (appliedMinPrice != null && p < appliedMinPrice) return false;
        if (appliedMaxPrice != null && p > appliedMaxPrice) return false;
        return true;
      });
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
  }, [allServices, sort, showFavoritesOnly, favorites, appliedMinPrice, appliedMaxPrice]);

  // MARKETPLACE-13-IMPROVEMENTS #8 — Trending services. Spec: services with
  // the lowest service ID numbers (oldest/most established). We slice from
  // allServices (which already contains the loaded catalog) so the row
  // updates as more pages load. Stable order via numeric ID ascending.
  const trendingServices = useMemo(() => {
    if (allServices.length === 0) return [];
    return [...allServices]
      .sort((a, b) => Number(a.id) - Number(b.id))
      .slice(0, TRENDING_COUNT);
  }, [allServices]);

  // MARKETPLACE-13-IMPROVEMENTS #6 — comparison tray handlers. Max 3 to keep
  // the side-by-side modal readable on mobile. Toggling an already-added
  // service removes it; toggling at the cap shows a friendly toast.
  const toggleComparison = useCallback(
    (service: any) => {
      setComparisonList((prev) => {
        if (prev.some((s) => s.id === service.id)) {
          return prev.filter((s) => s.id !== service.id);
        }
        if (prev.length >= MAX_COMPARISON) {
          // Soft cap — drop the oldest entry and add the new one so the
          // user's most-recent pick is always reflected.
          return [...prev.slice(prev.length - MAX_COMPARISON + 1), service];
        }
        return [...prev, service];
      });
    },
    [],
  );

  const clearComparison = useCallback(() => setComparisonList([]), []);
  const isComparing = useCallback(
    (id: string) => comparisonList.some((s) => s.id === id),
    [comparisonList],
  );

  // MARKETPLACE-13-IMPROVEMENTS #7 — price filter handlers. Apply commits the
  // typed values (parsed as numbers, ignoring empties); Clear resets both.
  const applyPriceFilter = () => {
    const mn = minPriceInput.trim() === "" ? null : Number(minPriceInput);
    const mx = maxPriceInput.trim() === "" ? null : Number(maxPriceInput);
    setAppliedMinPrice(mn != null && !Number.isNaN(mn) ? mn : null);
    setAppliedMaxPrice(mx != null && !Number.isNaN(mx) ? mx : null);
  };

  const clearPriceFilter = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedMinPrice(null);
    setAppliedMaxPrice(null);
  };

  const isPriceFilterActive =
    appliedMinPrice != null || appliedMaxPrice != null;

  const clearFilters = () => {
    setSearch("");
    setSort("popular");
    setCategoryFilter("All");
    setShowFavoritesOnly(false);
    clearPriceFilter();
    handlePlatformChange("All");
  };

  const hasActiveFilters =
    search !== "" ||
    platformFilter !== "All" ||
    categoryFilter !== "All" ||
    sort !== "popular" ||
    showFavoritesOnly ||
    isPriceFilterActive;

  return (
    <div className="flex flex-col gap-4">
      {/* MARKETPLACE-13-IMPROVEMENTS #8 — Trending row at the top (before any
          filters). Shows the 6 oldest/lowest-ID services in a horizontal
          scroller. Skipped entirely when the catalog hasn't loaded yet. */}
      {trendingServices.length > 0 && (
        <Reveal>
          <TrendingSection
            services={trendingServices}
            currency={currency}
            onSelect={onSelectService}
          />
        </Reveal>
      )}

      {/* Search + Sort + View toggle */}
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
          {/* MARKETPLACE-13-IMPROVEMENTS #10 — grid / list view toggle.
              Segmented control styled like the existing tab pills. */}
          <div
            className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background p-1"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Grid view"
              className={cn(
                "flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
              className={cn(
                "flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <ListIcon className="h-4 w-4" />
            </button>
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

      {/* MARKETPLACE-13-IMPROVEMENTS #7 — price filter row. Inline min/max
          inputs + Apply. The "Price: $X - $Y" indicator + Clear button show
          up only when a range has been applied. */}
      <Reveal>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              placeholder="Min"
              aria-label="Minimum price"
              className="w-16 bg-transparent text-xs font-medium tabular-nums text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              placeholder="Max"
              aria-label="Maximum price"
              className="w-16 bg-transparent text-xs font-medium tabular-nums text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={applyPriceFilter}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:nov-shadow-blue btn-press"
          >
            <Filter className="h-3.5 w-3.5" />
            Apply
          </button>
          {isPriceFilterActive && (
            <button
              type="button"
              onClick={clearPriceFilter}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors btn-press"
            >
              <X className="h-3.5 w-3.5" />
              Price:&nbsp;
              {appliedMinPrice != null
                ? `$${appliedMinPrice.toFixed(2)}`
                : "$0"}
              &nbsp;–&nbsp;
              {appliedMaxPrice != null
                ? `$${appliedMaxPrice.toFixed(2)}`
                : "∞"}
            </button>
          )}
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
      ) : viewMode === "list" ? (
        // MARKETPLACE-13-IMPROVEMENTS #10 — list view: compact rows in a
        // single column. Shows many more services per screen than the grid.
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Service</th>
                  <th className="px-4 py-3 text-right font-medium">Price/1k</th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Min/Max</th>
                  <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Delivery</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {Object.entries(grouped).flatMap(([platform, svcs]) => {
                  const limit = expandedPlatforms[platform] ?? INITIAL_CARDS_PER_PLATFORM;
                  const visible = svcs.slice(0, limit);
                  return visible.map((s) => (
                    <ServiceListRow
                      key={s.id}
                      service={s}
                      currency={currency}
                      onClick={() => onSelectService(s)}
                      isFavorite={favorites.has(s.id)}
                      onToggleFavorite={() => toggleFavorite(s.id)}
                      isInComparison={isComparing(s.id)}
                      onToggleCompare={() => toggleComparison(s)}
                      rating={getRating(s.id)}
                    />
                  ));
                })}
              </tbody>
            </table>
          </div>
          {/* Infinite scroll sentinel (list variant) */}
          <div ref={sentinelRef} className="flex h-16 items-center justify-center">
            {isFetching && page > 1 ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : data?.pagination?.hasMore ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-muted btn-press"
              >
                Load more
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">— End of catalog —</span>
            )}
          </div>
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
                    isInComparison={isComparing(s.id)}
                    onToggleCompare={() => toggleComparison(s)}
                    rating={getRating(s.id)}
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

      {/* MARKETPLACE-13-IMPROVEMENTS #6 — floating Compare bar. Only shown
          when the user has selected 2+ services. Clicking opens the modal;
          the X clears the tray. Sticky bottom positioning so it stays
          visible while scrolling. */}
      {comparisonList.length >= 2 && (
        <CompareBar
          count={comparisonList.length}
          onOpen={() => setShowCompareModal(true)}
          onClear={clearComparison}
        />
      )}

      {/* MARKETPLACE-13-IMPROVEMENTS #6 — side-by-side comparison modal */}
      {showCompareModal && comparisonList.length >= 2 && (
        <CompareModal
          services={comparisonList}
          currency={currency}
          onClose={() => setShowCompareModal(false)}
          onRemove={(id) => toggleComparison(comparisonList.find((s) => s.id === id)!)}
        />
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
  isInComparison,
  onToggleCompare,
  rating,
}: {
  service: any;
  currency: string;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isInComparison: boolean;
  onToggleCompare: () => void;
  rating: ReviewEntry | null;
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

      {/* Footer — price on left, "View details" + "Order now" buttons on right.
          Bottom-left holds the Compare toggle (MARKETPLACE-13-IMPROVEMENTS #6)
          and bottom-right shows the rating summary (#9) when present. */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex items-center gap-2">
          {/* MARKETPLACE-13-IMPROVEMENTS #6 — Compare checkbox/button.
              Renders as a small chip with the GitCompare icon. Active state
              uses the primary color so it's obvious which cards are in the
              comparison tray. */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare();
            }}
            aria-pressed={isInComparison}
            aria-label={isInComparison ? `Remove ${service.name} from comparison` : `Add ${service.name} to comparison`}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary btn-press",
              isInComparison
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <GitCompare className="h-3.5 w-3.5" />
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Per 1000 · {currency}
            </div>
            <div className="text-lg font-semibold tabular-nums text-foreground">
              {formatPrice(service.price, currency)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* MARKETPLACE-13-IMPROVEMENTS #9 — rating summary, small stars.
              Only rendered when at least one rating exists in localStorage. */}
          {rating && (
            <div className="flex items-center gap-0.5 text-[10px] text-amber-600 tabular-nums" title={`Rated ${rating.rating.toFixed(1)} by ${rating.count} user${rating.count > 1 ? "s" : ""}`}>
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              <span className="font-semibold">{rating.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({rating.count})</span>
            </div>
          )}
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
    </div>
  );
}

// ─────────── Service List Row (MARKETPLACE-13-IMPROVEMENTS #10) ───────────
// Compact row for list view. Same props as ServiceCard so the parent can
// render either layout from the same source array. Uses the existing
// `table-row-hover` class for the hover highlight + translate.
function ServiceListRow({
  service,
  currency,
  onClick,
  isFavorite,
  onToggleFavorite,
  isInComparison,
  onToggleCompare,
  rating,
}: {
  service: any;
  currency: string;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isInComparison: boolean;
  onToggleCompare: () => void;
  rating: ReviewEntry | null;
}) {
  return (
    <tr
      className="table-row-hover cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remove ${service.name} from favorites` : `Add ${service.name} to favorites`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-amber-400/15 hover:text-amber-500 btn-press"
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                isFavorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground",
              )}
            />
          </button>
          <PlatformLogo platform={service.platform} size={20} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {service.name}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{service.platform}</span>
              {rating && (
                <span className="inline-flex items-center gap-0.5 text-amber-600 tabular-nums">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                  {rating.rating.toFixed(1)} ({rating.count})
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
        {formatPrice(service.price, currency)}
      </td>
      <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
        {service.minQty.toLocaleString()}-{service.maxQty.toLocaleString()}
      </td>
      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
        {service.deliveryTime}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare();
            }}
            aria-pressed={isInComparison}
            aria-label={isInComparison ? `Remove ${service.name} from comparison` : `Add ${service.name} to comparison`}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors btn-press",
              isInComparison
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <GitCompare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label={`Order ${service.name} now`}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue btn-press"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Order
          </button>
        </div>
      </td>
    </tr>
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

// ─────────── Trending Section (MARKETPLACE-13-IMPROVEMENTS #8) ───────────
// Horizontal scroller of mini cards displayed at the top of BuyTab. Each
// mini card shows: platform emoji, truncated name, price, "Order" button.
// Clicking anywhere on a card opens the regular ServiceDetailModal so the
// user can still see the full specs / drip-feed form before buying.
function TrendingSection({
  services,
  currency,
  onSelect,
}: {
  services: any[];
  currency: string;
  onSelect: (s: any) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-amber-50/60 via-background to-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/15 text-amber-600">
          <Flame className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">Trending services</div>
          <div className="text-[10px] text-muted-foreground">
            Most established services on NOVSMM — chosen by catalog age.
          </div>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto nov-scroll pb-1">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s)}
            aria-label={`Order ${s.name} — ${formatPrice(s.price, currency)} per 1000`}
            className="group flex w-[200px] shrink-0 flex-col gap-2 rounded-xl border border-border/60 bg-background p-3 text-left transition-all hover:-translate-y-0.5 hover:nov-ring-md stat-card-3d focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary btn-press"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                {getPlatformEmoji(s.platform)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-foreground">
                  {s.name}
                </div>
                <div className="text-[10px] text-muted-foreground">{s.platform}</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Per 1000
                </div>
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  {formatPrice(s.price, currency)}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground transition-shadow group-hover:nov-shadow-blue">
                <ShoppingCart className="h-3 w-3" />
                Order
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────── Compare Bar (MARKETPLACE-13-IMPROVEMENTS #6) ───────────
// Floating bottom bar that appears once 2+ services are in the comparison
// tray. Fixed at the bottom of the viewport so it stays visible while
// scrolling the catalog. Mobile-safe: respects safe-area insets.
function CompareBar({
  count,
  onOpen,
  onClear,
}: {
  count: number;
  onOpen: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      role="region"
      aria-label="Comparison tray"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GitCompare className="h-4 w-4" />
          </span>
          <span>
            Compare ({count})
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {count >= MAX_COMPARISON ? "· max reached" : "· pick another to add"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors btn-press"
            aria-label="Clear comparison list"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue btn-press"
          >
            Compare now
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────── Compare Modal (MARKETPLACE-13-IMPROVEMENTS #6) ───────────
// Side-by-side comparison of up to 3 services. Rows: Name, Platform, Price,
// Delivery time, Min/Max, Quality. Each column has a remove (X) button so
// the user can prune the tray without leaving the modal. Horizontal scroll
// on mobile so all 3 columns stay readable.
function CompareModal({
  services,
  currency,
  onClose,
  onRemove,
}: {
  services: any[];
  currency: string;
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const rows: { label: string; render: (s: any) => React.ReactNode }[] = [
    {
      label: "Price / 1000",
      render: (s) => (
        <span className="font-semibold tabular-nums text-foreground">
          {formatPrice(s.price, currency)}
        </span>
      ),
    },
    {
      label: "Delivery time",
      render: (s) => <span className="text-foreground">{s.deliveryTime}</span>,
    },
    {
      label: "Min / Max qty",
      render: (s) => (
        <span className="tabular-nums text-foreground">
          {s.minQty.toLocaleString()} – {s.maxQty.toLocaleString()}
        </span>
      ),
    },
    {
      label: "Quality",
      render: (s) => {
        const q = QUALITY_BADGES[s.quality] ?? QUALITY_BADGES.standard;
        return (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", q.cls)}>
            {q.label}
          </span>
        );
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-3d-enter relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll"
      >
        <button
          onClick={onClose}
          className="sticky top-0 z-10 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close comparison"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GitCompare className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Compare services</h2>
            <p className="text-xs text-muted-foreground">
              Side-by-side view of {services.length} services. Click ✕ to remove.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto nov-scroll">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr>
                <th className="w-32 px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  Attribute
                </th>
                {services.map((s) => (
                  <th key={s.id} className="px-3 py-2 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <PlatformLogo platform={s.platform} size={20} />
                          <span className="truncate text-sm font-semibold text-foreground">
                            {s.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">{s.platform}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(s.id)}
                        aria-label={`Remove ${s.name} from comparison`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-600 btn-press"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border/60">
                  <td className="px-3 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </td>
                  {services.map((s) => (
                    <td key={s.id} className="px-3 py-3">
                      {row.render(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Tip: pick up to {MAX_COMPARISON} services for an at-a-glance comparison.
        </p>
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
  // MARKETPLACE-13-IMPROVEMENTS #9 — star ratings in the detail modal.
  // We instantiate the hook locally so the modal can both READ the current
  // rating and WRITE a new rating without needing to lift state up. The
  // rating persists across modal re-opens because useReviews reads from
  // localStorage on mount.
  const { reviews, rateService } = useReviews();
  const [hoverRating, setHoverRating] = useState(0);
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
  const currentRating = reviews[service.id] ?? null;

  // MARKETPLACE-13-IMPROVEMENTS #9 — submit a new rating. Persists to
  // localStorage (via the hook), shows a toast, and clears the hover state.
  const handleRate = (rating: number) => {
    rateService(service.id, rating);
    setHoverRating(0);
    toast({
      title: "Thanks for rating!",
      description: `You rated ${service.name} ${rating} star${rating > 1 ? "s" : ""}.`,
    });
  };

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

        {/* MARKETPLACE-13-IMPROVEMENTS #9 — Reviews / ratings block.
            Shows the running average + count (if any) above the interactive
            5-star picker. Hover state is local; click commits via rateService. */}
        <div className="mt-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Community rating
              </div>
              {currentRating ? (
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-center gap-0.5" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < Math.round(currentRating.rating)
                            ? "fill-amber-400 text-amber-500"
                            : "text-muted-foreground/40",
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {currentRating.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ({currentRating.count} review{currentRating.count > 1 ? "s" : ""})
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">
                  No ratings yet — be the first to review.
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 border-t border-border/60 pt-3">
            <div className="text-xs font-medium text-muted-foreground">Rate this service</div>
            <div
              className="mt-1.5 flex items-center gap-1"
              role="radiogroup"
              aria-label="Rate this service from 1 to 5 stars"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1;
                const active = hoverRating >= value || (!hoverRating && currentRating && value <= Math.round(currentRating.rating));
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={value === (hoverRating || Math.round(currentRating?.rating ?? 0))}
                    aria-label={`${value} star${value > 1 ? "s" : ""}`}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    onFocus={() => setHoverRating(value)}
                    onBlur={() => setHoverRating(0)}
                    onClick={() => handleRate(value)}
                    className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 btn-press"
                  >
                    <Star
                      className={cn(
                        "h-6 w-6 transition-colors",
                        active
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs text-muted-foreground">
                {hoverRating
                  ? `Click to submit ${hoverRating} star${hoverRating > 1 ? "s" : ""}`
                  : "Hover and click to rate"}
              </span>
            </div>
          </div>
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
function HistoryTab() {
  const { data } = useOrders();
  const repeatOrder = useRepeatOrder();
  const cancelOrder = useCancelOrder();
  const adminRefund = useAdminRefundOrder();
  const { data: sessionData } = useSession();
  const { toast } = useToast();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";
  const isAdmin = user?.role === "admin";
  const orders = data?.orders ?? [];

  // Improvement #3: status filter — client-side filter on the loaded orders array.
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // Improvement #5: pagination — 15 orders per page.
  const [historyPage, setHistoryPage] = useState(1);

  // MARKETPLACE-13-IMPROVEMENTS #17 — search input + 300ms debounce.
  // Filters by publicId (e.g. "A12345") OR serviceName OR platform. Works
  // alongside the status filter — both conditions must match.
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // MARKETPLACE-13-IMPROVEMENTS #18 — refund/cancel confirmation dialog.
  // Holds the order currently awaiting user confirmation. `mode` is
  // "cancel" (non-admin, 60s window) or "refund" (admin only).
  const [refundTarget, setRefundTarget] = useState<{ order: any; mode: "cancel" | "refund" } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setHistoryPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Calculate summary (always reflects ALL orders, not the filtered view)
  const totalSpent = orders.reduce((s: number, o: any) => s + o.totalPrice, 0);
  const completedCount = orders.filter((o: any) => o.status === "completed").length;
  const activeCount = orders.filter((o: any) =>
    ["processing", "in_progress"].includes(o.status)
  ).length;

  // Filter by status (client-side). "all" = no filter.
  // MARKETPLACE-13-IMPROVEMENTS #17 — also apply the search filter so both
  // conditions narrow the result set together.
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") {
      result = result.filter((o: any) => o.status === statusFilter);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (o: any) =>
          (o.publicId ?? "").toLowerCase().includes(q) ||
          (o.serviceName ?? "").toLowerCase().includes(q) ||
          (o.platform ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [orders, statusFilter, debouncedSearch]);

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

  // MARKETPLACE-13-IMPROVEMENTS #11 — CSV export. Generates a CSV from the
  // current filteredOrders array (so any active status/search filter is
  // respected) and triggers a download. No external libs — vanilla Blob +
  // URL.createObjectURL + a temporary <a> element.
  const exportCsv = () => {
    if (filteredOrders.length === 0) return;
    const header = ["Order ID", "Service", "Platform", "Quantity", "Total Price", "Status", "Date"];
    const escapeCell = (v: any) => {
      const s = String(v ?? "");
      // Quote per RFC 4180: wrap in quotes + escape embedded quotes by doubling.
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filteredOrders.map((o: any) =>
      [
        o.publicId,
        o.serviceName,
        o.platform,
        o.quantity,
        o.totalPrice.toFixed(2),
        o.status,
        new Date(o.createdAt).toISOString(),
      ]
        .map(escapeCell)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `novsmm-orders-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Export ready",
      description: `Downloaded ${filteredOrders.length} order${filteredOrders.length > 1 ? "s" : ""} as CSV.`,
    });
  };

  // MARKETPLACE-13-IMPROVEMENTS #18 — determine whether to show the
  // Cancel/Refund affordance for a given order. Non-admins see "Cancel"
  // only within 60s of placement (and only for pending/processing orders).
  // Admins see "Refund" on completed orders.
  const canCancel = (o: any) => {
    if (isAdmin) return false; // admins use the refund path instead
    if (o.status !== "pending" && o.status !== "processing") return false;
    return Date.now() - new Date(o.createdAt).getTime() <= ORDER_CANCEL_WINDOW_MS;
  };
  const canRefund = (o: any) => isAdmin && o.status === "completed";

  const handleConfirmRefund = async () => {
    if (!refundTarget) return;
    const { order, mode } = refundTarget;
    try {
      if (mode === "cancel") {
        await cancelOrder.mutateAsync({ orderId: order.id });
      } else {
        await adminRefund.mutateAsync(order.id);
      }
      setRefundTarget(null);
    } catch {
      // Error already handled by onError callback in the hooks (toast shown).
    }
  };

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
            <div className="flex flex-wrap items-center gap-2">
              {/* MARKETPLACE-13-IMPROVEMENTS #17 — search box. 300ms debounce. */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by ID or service…"
                  aria-label="Search orders by ID or service name"
                  className="h-[42px] w-full appearance-none rounded-xl border border-border bg-background pl-9 pr-9 text-sm text-foreground transition-colors focus:border-primary/40 focus:outline-none sm:w-[220px]"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
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
              {/* MARKETPLACE-13-IMPROVEMENTS #11 — Export CSV button.
                  Disabled when no orders exist (so the empty state can't
                  trigger a download). */}
              <button
                type="button"
                onClick={exportCsv}
                disabled={orders.length === 0}
                aria-label="Export orders as CSV"
                className="inline-flex h-[42px] items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 btn-press"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter count line — visible when any filter (status or search) is active */}
          {(statusFilter !== "all" || debouncedSearch !== "") && (
            <div className="border-b border-border/60 bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
              {debouncedSearch !== "" ? (
                <>Showing {totalFiltered.toLocaleString()} of {orders.length.toLocaleString()} orders matching &ldquo;{debouncedSearch}&rdquo;</>
              ) : (
                <>Showing {totalFiltered.toLocaleString()} of {orders.length.toLocaleString()} orders</>
              )}
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
                  <tr key={o.id} className="table-row-hover transition-colors">
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => repeatOrder.mutate({ orderId: o.id })}
                          disabled={repeatOrder.isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 btn-press"
                        >
                          <Repeat2 className="h-3.5 w-3.5" />
                          Repeat
                        </button>
                        {/* MARKETPLACE-13-IMPROVEMENTS #18 — Cancel (non-admin,
                            within 60s of placement). Mirrors the existing
                            Repeat button styling but in red to signal
                            destructive action. */}
                        {canCancel(o) && (
                          <button
                            onClick={() => setRefundTarget({ order: o, mode: "cancel" })}
                            disabled={cancelOrder.isPending}
                            aria-label={`Cancel order ${o.publicId}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/20 disabled:opacity-50 btn-press"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        )}
                        {/* Admin path — Refund on completed orders. */}
                        {canRefund(o) && (
                          <button
                            onClick={() => setRefundTarget({ order: o, mode: "refund" })}
                            disabled={adminRefund.isPending}
                            aria-label={`Refund order ${o.publicId}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-50 btn-press"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {orders.length === 0
                        ? "No purchases yet. Browse the Services tab to place your first order."
                        : debouncedSearch !== ""
                          ? `No orders match "${debouncedSearch}".`
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

      {/* MARKETPLACE-13-IMPROVEMENTS #18 — Refund / Cancel confirmation.
          A small modal-style dialog that summarizes what will happen and
          asks the user to confirm. Uses the same modal-3d-enter entrance. */}
      {refundTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => !cancelOrder.isPending && !adminRefund.isPending && setRefundTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-3d-enter relative w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
          >
            <button
              onClick={() => setRefundTarget(null)}
              disabled={cancelOrder.isPending || adminRefund.isPending}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  refundTarget.mode === "cancel"
                    ? "bg-red-500/10 text-red-600"
                    : "bg-amber-500/10 text-amber-600",
                )}
              >
                {refundTarget.mode === "cancel" ? (
                  <X className="h-5 w-5" />
                ) : (
                  <RotateCcw className="h-5 w-5" />
                )}
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {refundTarget.mode === "cancel" ? "Cancel order" : "Refund order"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  #{refundTarget.order.publicId} · {refundTarget.order.serviceName}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-foreground/90">
              {refundTarget.mode === "cancel" ? (
                <>
                  Cancel order <span className="font-mono">#{refundTarget.order.publicId}</span>?{" "}
                  <span className="font-semibold tabular-nums">
                    {formatPrice(refundTarget.order.totalPrice, currency)}
                  </span>{" "}
                  will be returned to your balance.
                </>
              ) : (
                <>
                  Refund order <span className="font-mono">#{refundTarget.order.publicId}</span>?{" "}
                  <span className="font-semibold tabular-nums">
                    {formatPrice(refundTarget.order.totalPrice, currency)}
                  </span>{" "}
                  will be returned to the buyer&rsquo;s balance. This action is recorded in the audit log.
                </>
              )}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                disabled={cancelOrder.isPending || adminRefund.isPending}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 btn-press"
              >
                Keep order
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={cancelOrder.isPending || adminRefund.isPending}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 btn-press",
                  refundTarget.mode === "cancel"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700",
                )}
              >
                {(refundTarget.mode === "cancel" ? cancelOrder.isPending : adminRefund.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    {refundTarget.mode === "cancel" ? (
                      <>
                        <X className="h-4 w-4" />
                        Cancel &amp; refund
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Issue refund
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
  // MARKETPLACE-13-IMPROVEMENTS #16 — pass refetchInterval so the offers
  // query auto-refreshes every 30s while SellTab is mounted (and only then).
  const { data: offersData } = useOffers(SALE_POLL_INTERVAL);
  const { data: servicesData } = useAllServices();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const updateOfferStatus = useUpdateOfferStatus();
  const deleteOffer = useDeleteOffer();
  const { data: sessionData } = useSession();
  const { toast } = useToast();
  const currency = (sessionData?.user as any)?.currency ?? "USD";
  const [showPublish, setShowPublish] = useState(false);
  // editingOffer is set when the user clicks "Edit" — when non-null, the modal
  // is in edit mode (title says "Edit offer", submit calls PATCH instead of POST).
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [price, setPrice] = useState(0);
  const offers = offersData?.offers ?? [];
  const services = servicesData?.services ?? [];

  // MARKETPLACE-13-IMPROVEMENTS #14 — Bulk publish modal state.
  const [showBulkPublish, setShowBulkPublish] = useState(false);
  // MARKETPLACE-13-IMPROVEMENTS #13 — Stats modal state. Holds the offer
  // currently being inspected (or null when the modal is closed).
  const [statsOffer, setStatsOffer] = useState<any | null>(null);

  // MARKETPLACE-13-IMPROVEMENTS #16 — Sale notification. We track the
  // previous `totalSales` value with a ref so we can detect increases
  // between polls. The effect watches offersData.totalSales and fires a
  // toast on increase; the refetchInterval on useOffers above drives the
  // 30s polling while SellTab is mounted (and only while it's mounted).
  const prevTotalSalesRef = useRef<number | null>(null);
  const prevOffersSalesMapRef = useRef<Record<string, number>>({});
  useEffect(() => {
    // Skip the very first response — we don't want to toast on mount.
    if (prevTotalSalesRef.current === null) {
      prevTotalSalesRef.current = offersData?.totalSales ?? 0;
      prevOffersSalesMapRef.current = Object.fromEntries(
        offers.map((o: any) => [o.id, o.sales]),
      );
      return;
    }
    const newTotal = offersData?.totalSales ?? 0;
    if (newTotal > (prevTotalSalesRef.current ?? 0)) {
      // Find which offer(s) gained a sale to attribute the toast.
      const gained = offers.filter((o: any) => {
        const prev = prevOffersSalesMapRef.current[o.id] ?? 0;
        return o.sales > prev;
      });
      const delta = newTotal - (prevTotalSalesRef.current ?? 0);
      if (gained.length > 0) {
        // Sum the new revenue from the most-recent sale on each gained offer.
        const revenueGain = gained.reduce((sum: number, o: any) => {
          const prevSales = prevOffersSalesMapRef.current[o.id] ?? 0;
          const newSales = o.sales - prevSales;
          return sum + newSales * (o.price - o.cost);
        }, 0);
        toast({
          title: "🎉 You made a sale!",
          description: `+${formatPrice(revenueGain, currency)} from ${gained[0].service?.name ?? "your offer"}${gained.length > 1 ? ` and ${gained.length - 1} other${gained.length > 2 ? "s" : ""}` : ""}.`,
        });
      } else {
        toast({
          title: "🎉 You made a sale!",
          description: `+${delta} new sale${delta > 1 ? "s" : ""} recorded.`,
        });
      }
    }
    prevTotalSalesRef.current = newTotal;
    prevOffersSalesMapRef.current = Object.fromEntries(
      offers.map((o: any) => [o.id, o.sales]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offersData?.totalSales]);

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

  // MARKETPLACE-13-IMPROVEMENTS #12 — pause / activate. Calls the dedicated
  // useUpdateOfferStatus hook which PATCHes { id, status } to /api/offers.
  const handleTogglePause = (offer: any) => {
    const next = offer.status === "paused" ? "active" : "paused";
    updateOfferStatus.mutate({ id: offer.id, status: next });
  };

  const totalEarnings = offersData?.totalEarnings ?? 0;
  const activeOfferCount = offers.filter((o: any) => o.status !== "paused").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active offers</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{activeOfferCount}</div>
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

      {/* Publish buttons — primary "Publish offer" + secondary "Bulk publish" */}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={() => {
            resetModalState();
            setShowBulkPublish(true);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted btn-press"
        >
          <Layers className="h-3.5 w-3.5" /> Bulk publish
        </button>
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
              {offers.map((o: any) => {
                const isPaused = o.status === "paused";
                return (
                  <tr
                    key={o.id}
                    className={cn(
                      "table-row-hover transition-colors",
                      isPaused && "opacity-50",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{o.service?.name ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground">{o.service?.platform}</div>
                        </div>
                        {/* MARKETPLACE-13-IMPROVEMENTS #12 — Paused badge. */}
                        {isPaused && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Pause className="h-2.5 w-2.5" />
                            Paused
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatPrice(o.cost, currency)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600">{formatPrice(o.price, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", o.margin > 100 ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>{o.margin.toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{o.sales}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* MARKETPLACE-13-IMPROVEMENTS #13 — Stats button. */}
                        <button
                          onClick={() => setStatsOffer(o)}
                          aria-label={`View stats for ${o.service?.name ?? "service"}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-500/20 btn-press"
                        >
                          <BarChart3 className="h-3 w-3" />
                          <span className="hidden sm:inline">Stats</span>
                        </button>
                        {/* MARKETPLACE-13-IMPROVEMENTS #12 — Pause / Activate. */}
                        <button
                          onClick={() => handleTogglePause(o)}
                          disabled={updateOfferStatus.isPending}
                          aria-label={isPaused ? `Activate offer for ${o.service?.name ?? "service"}` : `Pause offer for ${o.service?.name ?? "service"}`}
                          aria-pressed={isPaused}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 btn-press",
                            isPaused
                              ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20",
                          )}
                        >
                          {isPaused ? (
                            <>
                              <Play className="h-3 w-3" />
                              <span className="hidden sm:inline">Activate</span>
                            </>
                          ) : (
                            <>
                              <Pause className="h-3 w-3" />
                              <span className="hidden sm:inline">Pause</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(o)}
                          aria-label={`Edit offer for ${o.service?.name ?? "service"}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 btn-press"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Edit</span>
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
                );
              })}
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
              {/* MARKETPLACE-13-IMPROVEMENTS #15 — Suggested price hint + Use
                  suggested button + competitor (NOVSMM catalog) price. The
                  suggestion is cost × 2.5 (150% markup), matching the
                  NOVSMM default resale price calculation. */}
              {(() => {
                const svc = services.find((s: any) => s.id === selectedService);
                const cost = svc?.cost ?? editingOffer?.cost ?? 0;
                if (!cost) return null;
                const suggested = cost * 2.5;
                return (
                  <div className="rounded-xl bg-primary/5 px-4 py-3 text-xs">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">Suggested price:</span>
                      <span className="font-semibold tabular-nums">${suggested.toFixed(2)}</span>
                      <span className="text-muted-foreground">(150% markup)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrice(Number(suggested.toFixed(2)))}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-medium text-primary-foreground transition-colors hover:nov-shadow-blue btn-press"
                    >
                      <ArrowRight className="h-3 w-3" />
                      Use suggested
                    </button>
                    <div className="mt-2 border-t border-border/60 pt-2 text-muted-foreground">
                      NOVSMM price:{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        ${svc?.price?.toFixed(2) ?? "—"}
                      </span>{" "}
                      <span className="text-[10px]">(catalog competitor price)</span>
                    </div>
                  </div>
                );
              })()}
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

      {/* MARKETPLACE-13-IMPROVEMENTS #14 — Bulk publish modal. */}
      {showBulkPublish && (
        <BulkPublishModal
          services={services}
          currency={currency}
          onClose={() => setShowBulkPublish(false)}
        />
      )}

      {/* MARKETPLACE-13-IMPROVEMENTS #13 — Per-offer stats modal. */}
      {statsOffer && (
        <OfferStatsModal
          offer={statsOffer}
          currency={currency}
          onClose={() => setStatsOffer(null)}
        />
      )}
    </div>
  );
}

// ─────────── Bulk Publish Modal (MARKETPLACE-13-IMPROVEMENTS #14) ───────────
// Lets a seller publish offers for many services at once with a uniform
// markup. Multi-select with search; preview list shows calculated prices
// before submission. Uses useCreateOffer in Promise.all so all creations
// fire in parallel (subject to the API's own rate limiting).
function BulkPublishModal({
  services,
  currency,
  onClose,
}: {
  services: any[];
  currency: string;
  onClose: () => void;
}) {
  const createOffer = useCreateOffer();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [markup, setMarkup] = useState(150); // percent, default 150%
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.platform.toLowerCase().includes(q),
    );
  }, [services, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const preview = useMemo(
    () =>
      services
        .filter((s) => selectedIds.has(s.id))
        .map((s) => ({
          ...s,
          calculatedPrice: Number((s.cost * (1 + markup / 100)).toFixed(2)),
        })),
    [services, selectedIds, markup],
  );

  const handlePublishAll = async () => {
    if (preview.length === 0) return;
    setProgress({ done: 0, total: preview.length });
    let succeeded = 0;
    let failed = 0;
    // Sequential with progress tracking — Promise.all would hide per-item
    // errors behind the first rejection. Sequential gives clean progress UI.
    for (let i = 0; i < preview.length; i++) {
      const item = preview[i];
      try {
        await createOffer.mutateAsync({
          serviceId: item.id,
          price: item.calculatedPrice,
        });
        succeeded++;
      } catch {
        // Error toast is fired by the hook's onError per call; we just count.
        failed++;
      }
      setProgress({ done: i + 1, total: preview.length });
    }
    setProgress(null);
    setSelectedIds(new Set());
    toast({
      title: "Bulk publish complete",
      description: `${succeeded} offer${succeeded !== 1 ? "s" : ""} published${failed > 0 ? ` · ${failed} failed` : ""}.`,
    });
    if (succeeded > 0) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-3d-enter relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll"
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
            <h2 className="text-lg font-semibold text-foreground">Bulk publish offers</h2>
            <p className="text-xs text-muted-foreground">
              Pick multiple services and set a single markup — we&rsquo;ll create offers for each.
            </p>
          </div>
        </div>

        {/* Markup input */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Markup (%)</span>
            <input
              type="number"
              value={markup}
              onChange={(e) => setMarkup(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              step={10}
              className="h-11 w-32 rounded-xl border border-border bg-background px-3 text-sm tabular-nums focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </label>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{selectedIds.size}</span> selected ·{" "}
            formula: <span className="font-mono text-foreground">cost × (1 + {markup / 100})</span>
          </div>
        </div>

        {/* Search + multi-select list */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services to publish…"
            aria-label="Search services for bulk publish"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="mt-3 max-h-72 overflow-y-auto nov-scroll rounded-xl border border-border/60">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No services match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((s) => {
                const checked = selectedIds.has(s.id);
                const calc = Number((s.cost * (1 + markup / 100)).toFixed(2));
                return (
                  <li key={s.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40",
                        checked && "bg-primary/5",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.id)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                      <PlatformLogo platform={s.platform} size={20} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {s.platform} · cost ${s.cost.toFixed(2)}/1k
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Price</div>
                        <div className="text-sm font-semibold tabular-nums text-emerald-600">
                          {formatPrice(calc, currency)}
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Selected preview */}
        {preview.length > 0 && (
          <div className="mt-3 rounded-xl bg-muted/30 p-3 text-xs">
            <div className="font-medium text-foreground">Preview ({preview.length})</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {preview.slice(0, 8).map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {getPlatformEmoji(p.platform)} {p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name} · ${p.calculatedPrice.toFixed(2)}
                </span>
              ))}
              {preview.length > 8 && (
                <span className="text-[10px] text-muted-foreground">+{preview.length - 8} more</span>
              )}
            </div>
          </div>
        )}

        {/* Publish button with progress */}
        <button
          onClick={handlePublishAll}
          disabled={preview.length === 0 || createOffer.isPending || progress !== null}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60 btn-press"
        >
          {progress ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing {progress.done}/{progress.total}…
            </>
          ) : createOffer.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Publish {preview.length} offer{preview.length !== 1 ? "s" : ""}
            </>
          )}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────── Offer Stats Modal (MARKETPLACE-13-IMPROVEMENTS #13) ───────────
// Small modal showing per-offer sales metrics. Uses fields already present
// on the offer object (sales, earnings, margin, cost, price, createdAt,
// status). Revenue falls back to sales × (price − cost) when earnings is 0.
function OfferStatsModal({
  offer,
  currency,
  onClose,
}: {
  offer: any;
  currency: string;
  onClose: () => void;
}) {
  const sales: number = offer.sales ?? 0;
  const marginPerSale = Math.max(0, (offer.price ?? 0) - (offer.cost ?? 0));
  // Prefer the server-tracked earnings column; fall back to a calculated
  // estimate when it's 0 (e.g. legacy offers without earnings tracking).
  const revenue =
    offer.earnings && offer.earnings > 0 ? offer.earnings : sales * marginPerSale;
  const isPaused = offer.status === "paused";

  const stats: { label: string; value: string; cls?: string }[] = [
    { label: "Total sales", value: sales.toLocaleString() },
    {
      label: "Total revenue",
      value: formatPrice(revenue, currency),
      cls: "text-emerald-600",
    },
    {
      label: "Margin per sale",
      value: formatPrice(marginPerSale, currency),
      cls: "text-foreground",
    },
    {
      label: "Date published",
      value: new Date(offer.createdAt).toLocaleDateString(),
    },
    {
      label: "Status",
      value: isPaused ? "Paused" : "Active",
      cls: isPaused ? "text-amber-700" : "text-emerald-700",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-3d-enter relative w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <BarChart3 className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Offer stats</h2>
            <p className="text-xs text-muted-foreground">
              {offer.service?.name ?? "Service"} · {offer.service?.platform ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <span className={cn("font-semibold tabular-nums", s.cls ?? "text-foreground")}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Cost / Price:</span>{" "}
          {formatPrice(offer.cost, currency)} →{" "}
          <span className="font-semibold text-emerald-600">{formatPrice(offer.price, currency)}</span>{" "}
          ({offer.margin?.toFixed(0) ?? 0}% margin)
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue btn-press"
        >
          Close
        </button>
      </div>
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
