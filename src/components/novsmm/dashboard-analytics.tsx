"use client";

import { MiniAreaChart } from "./mini-area-chart";
import { ArrowUpRight, TrendingUp, ShoppingCart, DollarSign, Repeat2, Gift, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Counter } from "./counter";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { useAnalytics, useRefreshAnalytics } from "@/hooks/use-api";
import { formatPrice } from "@/lib/currency-utils";
import { useSession } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "./language-provider";

export function DashboardAnalytics() {
  const { t } = useLanguage();
  const { data, isLoading } = useAnalytics();
  const refresh = useRefreshAnalytics();
  const { data: sessionData } = useSession();
  const { toast } = useToast();
  const currency = (sessionData?.user as any)?.currency ?? "USD";
  const user = (sessionData?.user as any) ?? {};

  const handleShareReferral = async () => {
    const username = user.username ?? user.id;
    if (!username) return;
    const url = `${window.location.origin}/?ref=${username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("analytics.referralCopied", "Referral link copied!"), description: url });
    } catch {
      toast({
        title: t("analytics.couldNotCopy", "Couldn't copy"),
        description: t("analytics.clipboardBlocked", "Your browser blocked clipboard access."),
        variant: "destructive",
      });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { kpis, series, hourlyOrders, marketplaceBreakdown, referrals, aiInsights } = data;

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("analytics.eyebrow", "Analytics")}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("analytics.title", "Performance")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("analytics.subtitle", "Real-time metrics from your transaction history.")}
          </p>
        </div>
      </Reveal>

      {/* AI Insights */}
      <AiInsightsCard
        content={aiInsights?.content}
        generatedAt={aiInsights?.generatedAt}
        refreshed={aiInsights?.refreshed}
        eligible={aiInsights?.eligible}
        onRefresh={() => refresh.mutate()}
        isRefreshing={refresh.isPending}
      />

      {/* KPI strip */}
      <RevealStagger stagger={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <RevealItem>
          <Kpi icon={<ShoppingCart className="h-3.5 w-3.5" />} label={t("analytics.orders30d", "Orders (30d)")} value={<Counter to={kpis.totalOrders} duration={1.5} />} delta={t("analytics.live", "live")} />
        </RevealItem>
        <RevealItem>
          <Kpi icon={<DollarSign className="h-3.5 w-3.5" />} label={t("analytics.revenue30d", "Revenue (30d)")} value={formatPrice(kpis.totalRevenue, currency)} delta={t("analytics.live", "live")} />
        </RevealItem>
        <RevealItem>
          <Kpi icon={<TrendingUp className="h-3.5 w-3.5" />} label={t("analytics.conversion", "Conversion")} value={<><Counter to={kpis.conversionRate} decimals={1} duration={1.5} />%</>} delta={t("analytics.live", "live")} />
        </RevealItem>
        <RevealItem>
          <Kpi icon={<Repeat2 className="h-3.5 w-3.5" />} label={t("analytics.activeOrders", "Active orders")} value={<Counter to={kpis.activeOrders} duration={1.5} />} delta={t("analytics.live", "live")} />
        </RevealItem>
      </RevealStagger>

      {/* Revenue + orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal blur className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("analytics.revenueOrders", "Revenue & orders")}
                </div>
                <div className="mt-1 text-xl font-semibold">{t("analytics.last30Days", "Last 30 days")}</div>
              </div>
              <Legend />
            </div>
            <div className="mt-4 h-[260px] w-full">
              <MiniAreaChart data={series} height={260} color="#0052ff" formatValue={(v) => `$${v.toFixed(2)}`} />
            </div>
          </div>
        </Reveal>

        {/* Marketplace breakdown */}
        <Reveal blur delay={0.06}>
          <div className="h-full rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t("analytics.byPlatform", "By platform")}
            </div>
            <div className="text-base font-semibold">{t("analytics.marketplaceShare", "Marketplace share")}</div>
            {marketplaceBreakdown.length > 0 ? (
              <div>
                {/* P-002: PieChart replaced with CSS conic-gradient donut */}
                <div className="mx-auto mt-2 h-[150px] w-full flex items-center justify-center">
                  {(() => {
                    const total = marketplaceBreakdown.reduce((s: number, e: any) => s + e.value, 0) || 1;
                    const segments = marketplaceBreakdown.map((e: any) => ({ ...e, pct: (e.value / total) * 100 }));
                    let cumulative = 0;
                    const gradient = segments.map((s: any) => {
                      const start = cumulative;
                      cumulative += s.pct;
                      return `${s.color} ${start}% ${cumulative}%`;
                    }).join(", ");
                    return (
                      <div className="relative h-[120px] w-[120px]">
                        <div
                          className="h-full w-full rounded-full"
                          style={{ background: `conic-gradient(${gradient})` }}
                        />
                        <div className="absolute inset-[20%] rounded-full bg-background" />
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {marketplaceBreakdown.map((m: any) => (
                    <div key={m.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                      <span className="flex-1 text-muted-foreground">{m.name}</span>
                      <span className="font-medium tabular-nums text-foreground">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                {t("analytics.noCompletedOrders", "No completed orders yet")}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Hourly orders + referrals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal blur className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {t("analytics.hourlyOrders", "Hourly orders · today")}
                </div>
                <div className="text-base font-semibold">
                  {t("analytics.peak", "Peak: {count} orders/hour").replace("{count}", String(Math.max(...hourlyOrders.map((h: any) => h.v))))}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ArrowUpRight className="h-3 w-3" /> {t("analytics.live", "live")}
              </span>
            </div>
            {/* P-002: BarChart replaced with CSS flex bars — full width + hover */}
            <div className="mt-4 h-[200px] w-full flex items-end gap-[4px]">
              {(() => {
                const maxV = Math.max(...hourlyOrders.map((h: any) => h.v), 1);
                return hourlyOrders.map((h: any, i: number) => (
                  <div
                    key={i}
                    className="group relative flex-1 transition-opacity hover:opacity-100"
                    style={{ opacity: 0.85 }}
                    title={t("analytics.hourTooltip", "{hour}:00 — {count} orders").replace("{hour}", String(h.h)).replace("{count}", String(h.v))}
                  >
                    <div
                      className="w-full rounded-t-md bg-primary/80 transition-all group-hover:bg-primary group-hover:opacity-100"
                      style={{ height: `${(h.v / maxV) * 100}%`, minHeight: h.v > 0 ? "3px" : "0" }}
                    />
                  </div>
                ));
              })()}
            </div>
          </div>
        </Reveal>

        <Reveal blur delay={0.06}>
          <div className="h-full rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <Gift className="h-3.5 w-3.5" /> {t("analytics.referrals", "Referrals")}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
              <Counter to={referrals.count} duration={1.5} />{" "}
              <span className="text-sm font-normal text-muted-foreground">{t("analytics.referrals", "referrals")}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600">{formatPrice(referrals.total, currency)}</span> {t("analytics.earnedLifetime", "earned · 5% lifetime")}
            </div>
            <div className="mt-4 h-[120px] w-full">
              <MiniAreaChart data={referrals.series.map((s: any) => ({ d: s.d, revenue: s.revenue }))} height={120} color="#10b981" formatValue={(v) => `$${v.toFixed(2)}`} />
            </div>
            <button onClick={handleShareReferral} className="mt-3 w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              {t("analytics.shareReferral", "Share referral link")}
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  delta: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
          <ArrowUpRight className="h-3 w-3" />
          {delta}
        </span>
      </div>
      <div className="mt-2.5 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Legend() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" /> {t("analytics.revenue", "Revenue")}
      </span>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("analytics.orders", "Orders")}
      </span>
    </div>
  );
}

function AiInsightsCard({
  content,
  generatedAt,
  refreshed,
  eligible,
  onRefresh,
  isRefreshing,
}: {
  content?: string;
  generatedAt?: string | null;
  refreshed?: boolean;
  eligible?: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const { t } = useLanguage();
  // Render insight content with simple line breaks and bullet styling.
  const rendered = (content ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <Reveal blur>
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("analytics.aiInsights", "AI Insights")}
              </div>
              <div className="text-base font-semibold">
                {t("analytics.autoAnalysis", "Automatic analysis of your activity")}
              </div>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing || !eligible}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            title={eligible ? t("analytics.regenerate", "Regenerate insights") : t("analytics.availableAfter", "Available after 5 orders")}
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {isRefreshing ? t("analytics.generating", "Generating…") : t("analytics.refresh", "Refresh")}
          </button>
        </div>

        <div className="relative mt-4">
          {eligible ? (
            rendered.length > 0 ? (
              <div className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/90">
                {rendered.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="whitespace-pre-wrap">{line}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t("analytics.noInsights", "No insights available yet. Click refresh to generate.")}
              </div>
            )
          ) : (
            <div className="text-sm text-muted-foreground">
              {t("analytics.unlockInsights", "Place at least 6 orders to unlock AI-powered spending insights and growth recommendations.")}
            </div>
          )}
        </div>

        {(generatedAt || refreshed) && eligible && (
          <div className="relative mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            {refreshed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t("analytics.fresh", "Fresh")}
              </span>
            )}
            {generatedAt && (
              <span>
                {t("analytics.generatedCached", "Generated {date} · cached 1h").replace("{date}", new Date(generatedAt).toLocaleString())}
              </span>
            )}
          </div>
        )}
      </div>
    </Reveal>
  );
}
