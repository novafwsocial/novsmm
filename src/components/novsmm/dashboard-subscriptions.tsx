"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  Plus,
  X,
  Loader2,
  Pause,
  Play,
  Ban,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Clock,
  Hash,
  CheckCircle2,
} from "lucide-react";
import {
  useSmmSubscriptions,
  useCreateSmmSubscription,
  useUpdateSmmSubscription,
  useAllServices,
  useWallet,
  useSession,
} from "@/hooks/use-api";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { Counter } from "./counter";
import { PlatformLogo } from "./platform-logo";
import { formatPrice } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";

/**
 * SMM Subscriptions dashboard tab.
 *
 * "Auto-deliver X likes to every new post for N days" — a standard SMM panel
 * feature. The user picks a service, a target @username, a per-post quantity
 * range, and how many posts to cover. The backend debits the full upfront cost
 * (max quantity × posts × service.price / 1000) and a background worker polls
 * the platform's Graph API for new posts, auto-creating a zero-charge order
 * for each new post detected.
 *
 * Status badges map directly to the SmmSubscription.status enum:
 *   active    — worker is polling for new posts
 *   paused    — user paused auto-delivery (can resume)
 *   completed — all N posts have been delivered
 *   expired   — expiry date passed before all posts were covered
 *   cancelled — user cancelled (no further auto-deliveries)
 */

// ── Status badge styles ──
const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  active:    { label: "Active",    cls: "bg-emerald-500/10 text-emerald-700",  dot: "bg-emerald-500" },
  paused:    { label: "Paused",    cls: "bg-amber-500/10 text-amber-700",      dot: "bg-amber-500" },
  completed: { label: "Completed", cls: "bg-blue-500/10 text-blue-700",        dot: "bg-blue-500" },
  expired:   { label: "Expired",   cls: "bg-muted text-muted-foreground",      dot: "bg-muted-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/10 text-red-700",          dot: "bg-red-500" },
};

export function DashboardSubscriptions() {
  const { data, isLoading } = useSmmSubscriptions();
  const [showCreate, setShowCreate] = useState(false);

  const subscriptions = data?.subscriptions ?? [];

  // Aggregate stats for the top row
  const stats = useMemo(() => {
    const active = subscriptions.filter((s: any) => s.status === "active").length;
    const totalPosts = subscriptions.reduce((sum: number, s: any) => sum + (s.posts ?? 0), 0);
    const postsProcessed = subscriptions.reduce((sum: number, s: any) => sum + (s.postsProcessed ?? 0), 0);
    const totalSpent = subscriptions.reduce((sum: number, s: any) => sum + (s.totalSpent ?? 0), 0);
    return { active, totalPosts, postsProcessed, totalSpent };
  }, [subscriptions]);

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Subscriptions
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              SMM Subscriptions
            </h1>
            <p className="text-sm text-muted-foreground">
              Auto-deliver likes/followers to every new post.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
          >
            <Plus className="h-3.5 w-3.5" /> Create subscription
          </button>
        </div>
      </Reveal>

      {/* Top stats */}
      <RevealStagger stagger={0.06} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <RevealItem>
          <StatCard label="Active" value={stats.active} icon={<Sparkles className="h-4 w-4" />} />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Posts delivered"
            value={stats.postsProcessed}
            sub={`/ ${stats.totalPosts}`}
            icon={<Hash className="h-4 w-4" />}
          />
        </RevealItem>
        <RevealItem>
          <StatCard label="Total subscriptions" value={subscriptions.length} icon={<CalendarClock className="h-4 w-4" />} />
        </RevealItem>
        <RevealItem>
          <StatCard label="Total spent" value={`$${stats.totalSpent.toFixed(2)}`} icon={<TrendingUp className="h-4 w-4" />} />
        </RevealItem>
      </RevealStagger>

      {/* Subscription list / empty state */}
      <Reveal blur>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : subscriptions.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {subscriptions.map((s: any, i: number) => (
              <SubscriptionCard key={s.id} subscription={s} index={i} />
            ))}
          </div>
        )}
      </Reveal>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateSubscriptionModal onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────── Stat card ───────────
function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="h-full rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? <Counter to={value} duration={1.2} /> : value}
        {sub && <span className="ml-1 text-sm font-normal text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

// ─────────── Empty state ───────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CalendarClock className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">No subscriptions yet</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Create one to auto-deliver to every new post. Pick a service, target @username,
        and per-post quantity range — we&apos;ll handle the rest.
      </p>
      <button
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
      >
        <Plus className="h-4 w-4" /> Create subscription
      </button>
    </div>
  );
}

// ─────────── Subscription card ───────────
function SubscriptionCard({ subscription: s, index }: { subscription: any; index: number }) {
  const updateMutation = useUpdateSmmSubscription();
  const status = STATUS_STYLES[s.status] ?? STATUS_STYLES.active;
  const progressPct = s.posts > 0 ? Math.round((s.postsProcessed / s.posts) * 100) : 0;
  const expired = new Date(s.expiry).getTime() < Date.now();
  const canPause = s.status === "active";
  const canResume = s.status === "paused";
  const canCancel = s.status === "active" || s.status === "paused";

  const setStatus = (status: string) => {
    updateMutation.mutate({ id: s.id, status });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <PlatformLogo platform={s.platform} size={24} />
          </span>
          <div>
            <div className="font-mono text-sm font-semibold text-foreground">{s.publicId}</div>
            <div className="text-[11px] text-muted-foreground">{s.serviceName}</div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
            status.cls,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      {/* Target + range */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Target</div>
          <div className="mt-0.5 truncate font-medium text-foreground">@{s.username}</div>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Per-post qty</div>
          <div className="mt-0.5 font-medium text-foreground">
            {s.minQuantity.toLocaleString()}–{s.maxQuantity.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Expiry</div>
          <div className={cn("mt-0.5 font-medium", expired ? "text-red-600" : "text-foreground")}>
            {new Date(s.expiry).toLocaleDateString()}
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Total spent</div>
          <div className="mt-0.5 font-semibold tabular-nums text-emerald-600">${s.totalSpent.toFixed(2)}</div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Posts covered</span>
          <span className="tabular-nums">
            {s.postsProcessed} / {s.posts} · {progressPct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "h-full rounded-full",
              s.status === "completed" ? "bg-blue-500" : "bg-primary",
            )}
          />
        </div>
      </div>

      {/* Last checked + last post */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {s.lastCheckedAt
            ? `Last check ${new Date(s.lastCheckedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Pending first check"}
        </span>
        {s.lastPostUrl && (
          <a
            href={s.lastPostUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" /> Last post
          </a>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {canPause && (
          <button
            onClick={() => setStatus("paused")}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            <Pause className="h-3 w-3" /> Pause
          </button>
        )}
        {canResume && (
          <button
            onClick={() => setStatus("active")}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <Play className="h-3 w-3" /> Resume
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setStatus("cancelled")}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <Ban className="h-3 w-3" /> Cancel
          </button>
        )}
        {s.status === "completed" && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-700">
            <CheckCircle2 className="h-3 w-3" /> All posts delivered
          </span>
        )}
        {s.status === "expired" && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" /> Expired before completion
          </span>
        )}
        {s.status === "cancelled" && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Ban className="h-3 w-3" /> Cancelled
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─────────── Create subscription modal ───────────
function CreateSubscriptionModal({ onClose }: { onClose: () => void }) {
  const { data: servicesData, isLoading: servicesLoading } = useAllServices();
  const { data: walletData } = useWallet();
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";
  const balance = walletData?.balance ?? 0;

  const services = servicesData?.services ?? [];

  const [serviceId, setServiceId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [link, setLink] = useState("");
  const [minQuantity, setMinQuantity] = useState<number>(0);
  const [maxQuantity, setMaxQuantity] = useState<number>(0);
  const [posts, setPosts] = useState<number>(10);
  const [delayMinutes, setDelayMinutes] = useState<number>(0);
  const [expiryDays, setExpiryDays] = useState<number>(30);

  const selectedService = services.find((s: any) => s.id === serviceId) ?? null;

  // ── Initialize min/max from service defaults on first selection ──
  // When the user picks a service, pre-fill min and max with that service's
  // minQty and a sensible default max (5x min, capped at service max).
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find((s: any) => s.id === id);
    if (svc) {
      setMinQuantity(svc.minQty);
      const defaultMax = Math.min(svc.maxQty, Math.max(svc.minQty * 5, 1000));
      setMaxQuantity(defaultMax);
    }
  };

  // ── Live cost estimate (charged for max quantity per post, to be safe) ──
  const estimatedCost = selectedService
    ? (selectedService.price * maxQuantity * posts) / 1000
    : 0;
  const sufficient = balance >= estimatedCost;

  // ── Validation ──
  const valid =
    !!serviceId &&
    !!selectedService &&
    username.trim().length >= 1 &&
    minQuantity >= selectedService.minQty &&
    maxQuantity <= selectedService.maxQty &&
    minQuantity <= maxQuantity &&
    posts >= 1 && posts <= 365 &&
    expiryDays >= 1 && expiryDays <= 365 &&
    sufficient;

  const createMutation = useCreateSmmSubscription();

  const handleSubmit = async () => {
    if (!valid) return;
    await createMutation.mutateAsync({
      serviceId,
      username: username.trim(),
      link: link || undefined,
      minQuantity,
      maxQuantity,
      posts,
      delayMinutes: delayMinutes || undefined,
      expiryDays,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
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
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">New SMM subscription</h2>
            <p className="text-xs text-muted-foreground">
              Auto-deliver to every new post for {expiryDays} days (or until {posts} posts covered).
            </p>
          </div>
        </div>

        {/* Service select */}
        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Service
          </label>
          {servicesLoading ? (
            <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
            </div>
          ) : (
            <select
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            >
              <option value="">Select a service…</option>
              {services.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.platform} · {s.name} ({formatPrice(s.price, currency)}/1k)
                </option>
              ))}
            </select>
          )}
          {selectedService && (
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              Min {selectedService.minQty.toLocaleString()} · Max {selectedService.maxQty.toLocaleString()} ·{" "}
              {formatPrice(selectedService.price, currency)} per 1000 units
            </div>
          )}
        </div>

        {/* Username + link */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Profile link (optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://instagram.com/username"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
        </div>

        {/* Quantity range */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Min qty / post
            </label>
            <input
              type="number"
              value={minQuantity || ""}
              min={selectedService?.minQty ?? 1}
              max={maxQuantity}
              onChange={(e) => setMinQuantity(Number(e.target.value) || 0)}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Max qty / post
            </label>
            <input
              type="number"
              value={maxQuantity || ""}
              min={minQuantity}
              max={selectedService?.maxQty ?? 100000}
              onChange={(e) => setMaxQuantity(Number(e.target.value) || 0)}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
        </div>

        {/* Posts + delay + expiry */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Posts (1-365)
            </label>
            <input
              type="number"
              value={posts}
              min={1}
              max={365}
              onChange={(e) => setPosts(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Delay (min)
            </label>
            <input
              type="number"
              value={delayMinutes}
              min={0}
              max={60 * 24}
              onChange={(e) => setDelayMinutes(Math.max(0, Number(e.target.value) || 0))}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Expiry (days)
            </label>
            <input
              type="number"
              value={expiryDays}
              min={1}
              max={365}
              onChange={(e) => setExpiryDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
        </div>

        {/* Cost estimate */}
        <div className="mt-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Per-post cost (max)</span>
            <span className="font-semibold tabular-nums">
              {formatPrice(selectedService ? (selectedService.price * maxQuantity) / 1000 : 0, currency)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">× {posts} posts</span>
            <span className="font-semibold tabular-nums">
              {formatPrice(estimatedCost, currency)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-sm">
            <span className="text-muted-foreground">Your balance</span>
            <span className={cn("font-semibold tabular-nums", sufficient ? "text-emerald-600" : "text-red-600")}>
              {formatPrice(balance, currency)}
            </span>
          </div>
          {!sufficient && estimatedCost > 0 && (
            <div className="mt-2 rounded-lg bg-red-500/5 px-3 py-2 text-[11px] text-red-600">
              Insufficient balance. Top up your wallet to cover the estimated cost.
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!valid || createMutation.isPending}
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue",
            (!valid || createMutation.isPending) && "opacity-60",
          )}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating…
            </>
          ) : (
            <>
              <CalendarClock className="h-4 w-4" /> Create subscription
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
