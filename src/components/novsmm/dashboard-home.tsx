"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useDashboard, useFavorites, useTickets, useReferrals, useSession, useLoyalty } from "@/hooks/use-api";
import {
  Wallet,
  ShoppingCart,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Star,
  Ticket,
  Activity,
  Zap,
  Store,
  Gift,
  Copy,
  MessageCircle,
  Twitter,
  Send,
  Crown,
  Loader2,
  Trophy,
  Sparkles,
  ChevronRight,
  Lock,
} from "lucide-react";
import { MiniAreaChart } from "./mini-area-chart";
import { Counter } from "./counter";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { DashReveal } from "./dash-reveal";
import { api } from "@/lib/api-client";
import { useApp } from "./app-store";
import { StatusPill } from "./status-pill";
import { PlatformLogo } from "./platform-logo";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency-utils";
import { useToast } from "@/hooks/use-toast";

type Range = "7d" | "30d" | "90d";
const RANGE_LABEL: Record<Range, string> = {
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
};
const RANGE_RANGE_LABEL: Record<Range, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
};

export function DashboardHome() {
  const [range, setRange] = useState<Range>("30d");
  // PERF FIX (P-H-002): use the shared useDashboard hook (with range)
  // instead of a local useQuery. This shares the queryKey with the
  // sidebar/topbar consumers, avoiding a duplicate /api/dashboard
  // request every 30-60s.
  const { data, isLoading } = useDashboard(range);
  const { setDashboardTab } = useApp();
  const { data: favData } = useFavorites();
  const { data: ticketsData } = useTickets();
  const favorites = favData?.favorites ?? [];
  const tickets = ticketsData?.tickets?.slice(0, 3) ?? [];
  const { data: sessionData } = useSession();

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const { user, stats, series, recentOrders, recentNotifications } = data;
  const rangeRevenue = stats.revenueRange ?? stats.revenueMonth ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Workspace overview
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your workspace today.
          </p>
        </div>
      </Reveal>

      <DashReveal>
      <RevealStagger stagger={0.06} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <RevealItem>
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Available balance"
            value={<>$<Counter to={stats.balance} decimals={2} duration={1.5} /></>}
            delta="live"
            up
            tint="primary"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Active orders"
            value={<Counter to={stats.activeOrders} duration={1.5} />}
            delta="in progress"
            tint="amber"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Completed (all)"
            value={<Counter to={stats.completedOrders} duration={2} />}
            delta="total"
            tint="emerald"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Revenue today"
            value={<>$<Counter to={stats.revenueToday} decimals={2} duration={1.5} /></>}
            delta="live"
            up
            tint="violet"
          />
        </RevealItem>
      </RevealStagger>
      </DashReveal>

      <DashReveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Reveal blur className="lg:col-span-2">
            <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Revenue · {RANGE_RANGE_LABEL[range]}
                  </div>
                  <div className="mt-1 text-3xl font-semibold tabular-nums">
                    $<Counter to={rangeRevenue} duration={1.5} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {(["7d", "30d", "90d"] as Range[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      aria-pressed={range === r}
                      className={cn(
                        "rounded-full px-2.5 py-1 font-medium transition-colors",
                        range === r
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {RANGE_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="chart-container mt-5 h-[220px] w-full">
                <MiniAreaChart data={series} height={220} color="#0052ff" formatValue={(v) => `$${v.toFixed(2)}`} />
              </div>
            </div>
          </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal blur delay={0.06}>
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-foreground to-foreground/90 p-5 text-background">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider opacity-70">
                  NOVSMM Wallet
                </span>
                <Wallet className="h-4 w-4 opacity-70" />
              </div>
              <div className="mt-4 text-3xl font-semibold tabular-nums">
                $<Counter to={stats.balance} decimals={2} duration={1.5} />
              </div>
              <div className="mt-1 text-xs opacity-70">
                Held: <span className="tabular-nums">${stats.heldBalance.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setDashboardTab("wallet")}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
                >
                  <Plus className="h-3.5 w-3.5" /> Top up
                </button>
                <button
                  onClick={() => setDashboardTab("wallet")}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-background/20 py-2 text-xs font-medium transition-colors hover:bg-background/10"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal blur delay={0.12}>
            <div className="rounded-2xl border border-border/60 bg-background p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Quick stats
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <QuickStat icon={<Zap className="h-3.5 w-3.5" />} label="Lifetime earnings">
                  $<Counter to={stats.lifetimeEarnings} decimals={2} duration={2} />
                </QuickStat>
                <QuickStat icon={<Activity className="h-3.5 w-3.5" />} label="Open tickets">
                  {stats.openTickets}
                </QuickStat>
              </div>
            </div>
          </Reveal>
        </div>
        </div>
      </DashReveal>

      {/* Loyalty Rewards card — tier badge, total points, progress to next tier,
          recent achievements, "View all" → profile achievements section */}
      <LoyaltyRewardsCard
        onOpenProfile={() => setDashboardTab("profile")}
      />

      {/* Enhanced referral promo card */}
      <ReferralPromoCard
        currency={(sessionData?.user as any)?.currency ?? "USD"}
        onOpenProfile={() => setDashboardTab("profile")}
      />

      {/* Recent orders */}
      <DashReveal delay={0.1}>
      <Reveal blur>
        <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Recent orders
              </div>
              <div className="mt-1 text-base font-semibold">Live activity</div>
            </div>
            <button
              onClick={() => setDashboardTab("orders")}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No orders yet. Browse the marketplace to place your first order.
              </div>
            ) : (
              recentOrders.map((o: any, i: number) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/40"
                >
                  <PlatformLogo platform={o.platform} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {o.platform} · {o.serviceName}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      #{o.publicId} · {timeAgo(o.createdAt)}
                    </div>
                  </div>
                  <StatusPill status={o.status} />
                  <span className="w-16 text-right text-sm font-semibold tabular-nums text-emerald-600">
                    ${o.totalPrice.toFixed(2)}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </Reveal>
      </DashReveal>

      {/* Favorites + Recent tickets */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Favorites */}
        <Reveal blur>
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" /> Favorite services
              </div>
              <button onClick={() => setDashboardTab("marketplace")} className="text-xs font-medium text-primary hover:underline">Browse →</button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {favorites.length > 0 ? favorites.map((f: any) => (
                <div key={f.id} className="group flex items-center gap-3 rounded-xl border border-border/60 p-2.5 transition-colors hover:bg-muted/40">
                  <PlatformLogo platform={f.service?.platform ?? "Other"} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{f.service?.name}</div>
                    <div className="text-[11px] text-muted-foreground">{f.service?.platform} · ${f.service?.price.toFixed(2)}/1000</div>
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No favorites yet. Star a service to pin it here.</div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Recent tickets */}
        <Reveal blur delay={0.06}>
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <Ticket className="h-3.5 w-3.5" /> Recent tickets
              </div>
              <button onClick={() => setDashboardTab("tickets")} className="text-xs font-medium text-primary hover:underline">View all →</button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {tickets.length > 0 ? tickets.map((t: any) => (
                <div key={t.id} className="flex items-start gap-2.5 rounded-xl border border-border/60 p-2.5">
                  <span className={cn("mt-1 h-1.5 w-1.5 rounded-full", t.priority === "high" ? "bg-red-500" : "bg-amber-500")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">#{t.publicId} · {t.subject}</div>
                    <div className="text-[11px] text-muted-foreground">{t.status} · {new Date(t.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No tickets yet.</div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TINTS: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  violet: "bg-violet-500/10 text-violet-600",
};

function StatCard({
  icon,
  label,
  value,
  delta,
  up,
  tint = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delta: string;
  up?: boolean;
  tint?: keyof typeof TINTS;
}) {
  return (
    <div className="stat-card-3d group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-background p-4 transition-shadow hover:nov-ring-lg sm:p-5">
      <div className="flex items-start justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", TINTS[tint])}>
          {icon}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-medium",
            up ? "text-emerald-600" : "text-muted-foreground"
          )}
        >
          {up && <ArrowUpRight className="h-3 w-3" />}
          {delta}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {children}
      </span>
    </div>
  );
}

// ── Enhanced referral promo card ──
function ReferralPromoCard({
  currency,
  onOpenProfile,
}: {
  currency: string;
  onOpenProfile: () => void;
}) {
  const { data, isLoading } = useReferrals();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-border/60 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const code = data?.code ?? "";
  const link = data?.referralLink ?? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${code}`;
  const tier = data?.tier;
  const current = tier?.current;
  const next = tier?.next;
  const progress = tier?.progressToNext ?? 0;
  const remaining = tier?.remainingToNext ?? 0;
  const earnings = data?.stats?.totalEarnings ?? data?.totalEarnings ?? 0;
  const totalReferrals = data?.stats?.totalReferrals ?? 0;
  const commissionRate = current?.commissionRate ?? 0.05;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Referral link copied!", description: link });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  const shareText = `Únete a NOVSMM y obtén automatización para redes sociales: ${link}`;
  const shareEnc = encodeURIComponent(shareText);
  const shareUrlEnc = encodeURIComponent(link);
  const share = (channel: "whatsapp" | "twitter" | "telegram") => {
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${shareEnc}`,
      twitter: `https://twitter.com/intent/tweet?text=${shareEnc}`,
      telegram: `https://t.me/share/url?url=${shareUrlEnc}&text=${shareEnc}`,
    };
    window.open(urls[channel], "_blank", "noopener,noreferrer,width=600,height=600");
  };

  return (
    <Reveal blur>
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-foreground to-foreground/90 p-5 text-background sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: identity + tier */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/10">
                <Gift className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[11px] uppercase tracking-wider opacity-60">
                  Refer &amp; earn
                </div>
                <div className="text-base font-semibold">NOVSMM Referral Program</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: current ? `${current.color}25` : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  border: `1px solid ${current ? current.color : "rgba(255,255,255,0.2)"}`,
                }}
              >
                <Crown className="h-3 w-3" />
                {current?.emoji} {current?.label ?? "Bronze"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-background/10 px-3 py-1 text-xs font-medium">
                {(commissionRate * 100).toFixed(0)}% commission
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                {formatPrice(earnings, currency)} earned
              </span>
            </div>

            {/* Progress to next tier */}
            {next ? (
              <div className="max-w-md">
                <div className="flex items-center justify-between text-[11px] opacity-80">
                  <span>
                    {totalReferrals}/{next.minReferrals} referrals to {next.emoji} {next.label}
                  </span>
                  <span>{remaining} to go</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-background/15">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[11px] opacity-70">
                Maximum tier reached — you&apos;re earning top commission.
              </div>
            )}
          </div>

          {/* Right: copy link + share */}
          <div className="flex flex-col gap-2 lg:w-[360px]">
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-background/10 px-3 py-2.5 font-mono text-xs">
                {link}
              </code>
              <button
                onClick={copyLink}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                title="Copy referral link"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => share("whatsapp")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-background/10 py-2 text-xs font-medium transition-colors hover:bg-background/20"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </button>
              <button
                onClick={() => share("twitter")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-background/10 py-2 text-xs font-medium transition-colors hover:bg-background/20"
              >
                <Twitter className="h-3.5 w-3.5" /> X
              </button>
              <button
                onClick={() => share("telegram")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-background/10 py-2 text-xs font-medium transition-colors hover:bg-background/20"
              >
                <Send className="h-3.5 w-3.5" /> Telegram
              </button>
            </div>
            <button
              onClick={onOpenProfile}
              className="text-[11px] font-medium opacity-70 transition-opacity hover:opacity-100"
            >
              View full referral dashboard →
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ── Loyalty Rewards card (dashboard home) ──────────────────────────────────
// Compact summary: tier badge, total points, progress to next tier, recent
// achievement icons, and a "View all" button that opens the Profile →
// Achievements section.
function LoyaltyRewardsCard({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { data, isLoading } = useLoyalty();

  if (isLoading) {
    return (
      <Reveal blur>
        <div className="flex h-40 items-center justify-center rounded-2xl border border-border/60 bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Reveal>
    );
  }

  // Graceful empty-state: if the API hasn't returned data yet, render a
  // minimal placeholder so the home layout never breaks.
  if (!data) {
    return (
      <Reveal blur>
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" /> Loyalty rewards
          </div>
          <div className="mt-3 py-4 text-center text-sm text-muted-foreground">
            Loyalty data is loading. Place an order to start earning points.
          </div>
        </div>
      </Reveal>
    );
  }

  const { totalPoints, tier, achievements } = data;
  const current = tier.current;
  const next = tier.next;
  const recentUnlocked = achievements.unlocked.slice(0, 6);

  return (
    <Reveal blur>
      <div
        className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
        style={{
          borderColor: `${current.color}40`,
          background: `linear-gradient(135deg, ${current.color}10, ${current.color}02 60%, transparent)`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
          style={{ background: `${current.color}25` }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: identity + tier + progress */}
          <div className="flex flex-col gap-3 lg:max-w-[60%]">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: `${current.color}20`, color: current.color }}
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Loyalty rewards
                </div>
                <div className="text-base font-semibold text-foreground">
                  NOVSMM Loyalty Program
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{
                  background: current.color,
                  boxShadow: `0 6px 18px -8px ${current.color}80`,
                }}
              >
                <Crown className="h-3 w-3" />
                {current.emoji} {current.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Trophy className="h-3 w-3" />
                {totalPoints.toLocaleString()} pts
              </span>
            </div>

            {next ? (
              <div className="max-w-md">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {tier.pointsToNext.toLocaleString()} pts to{" "}
                    <span className="font-medium text-foreground">
                      {next.emoji} {next.label}
                    </span>
                  </span>
                  <span>{Math.round(tier.progress * 100)}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(2, Math.round(tier.progress * 100))}%`,
                      background: `linear-gradient(90deg, ${current.color}, ${next.color})`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">
                Maximum tier reached — you&apos;re earning top rewards.
              </div>
            )}
          </div>

          {/* Right: recent achievements + View all */}
          <div className="flex flex-col gap-3 lg:w-[300px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Recent achievements
              </span>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {achievements.unlockedCount}/{achievements.total}
              </span>
            </div>
            {recentUnlocked.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {recentUnlocked.map((a) => (
                  <span
                    key={a.type}
                    title={`${a.label} — ${a.description} (+${a.bonus} pts)`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background text-lg transition-transform hover:scale-110"
                  >
                    {a.icon}
                  </span>
                ))}
                {achievements.locked.length > 0 && (
                  <span
                    title={`${achievements.locked.length} more achievements to unlock`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30 text-muted-foreground"
                  >
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                Place an order to unlock your first achievement.
              </div>
            )}
            <button
              onClick={onOpenProfile}
              className="inline-flex items-center gap-1 self-start rounded-lg px-2 py-1 text-xs font-medium text-primary hover:underline"
            >
              View all achievements <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
