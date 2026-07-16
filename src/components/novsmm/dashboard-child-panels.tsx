"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Globe,
  Plus,
  X,
  Loader2,
  Ban,
  Play,
  Pause,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Clock,
  Hash,
  CheckCircle2,
  Copy,
  KeyRound,
  Pencil,
  DollarSign,
} from "lucide-react";
import {
  useChildPanels,
  useCreateChildPanel,
  useUpdateChildPanel,
  useCancelChildPanel,
  useWallet,
  useSession,
} from "@/hooks/use-api";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { Counter } from "./counter";
import { formatPrice } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";

/**
 * Child Panels dashboard tab.
 *
 * White-label sub-panels for the reseller business. The user purchases a
 * child panel (reseller $49/mo / agency $149/mo / enterprise $499/mo) — a
 * subdomain + API key are auto-provisioned. The child panel runs the same
 * NOVSMM UI on a subdomain (e.g. `acme.novsmm.shop`), uses the parent's
 * catalog and fulfils via the parent's providers. The parent earns a margin
 * on every order placed through the child panel (markupPercent over parent
 * prices).
 *
 * The API key is shown ONCE at creation time, in a highlighted box with a
 * copy button — same pattern as License keys. The plaintext key is never
 * retrievable again (only its bcrypt hash + SHA-256 lookup hash + AES-
 * encrypted form are persisted).
 */

// ── Plan metadata (kept in sync with the backend PLAN_FEES map) ──
const PLANS: Record<
  string,
  { label: string; monthly: number; tagline: string }
> = {
  reseller: {
    label: "Reseller",
    monthly: 49,
    tagline: "Solo resellers · 1 sub-panel · 20% default markup",
  },
  agency: {
    label: "Agency",
    monthly: 149,
    tagline: "Small agencies · up to 5 admins · priority support",
  },
  enterprise: {
    label: "Enterprise",
    monthly: 499,
    tagline: "High-volume · white-glove onboarding · dedicated IP",
  },
};

// ── Status badge styles ──
const STATUS_STYLES: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  active: { label: "Active", cls: "bg-emerald-500/10 text-emerald-700", dot: "bg-emerald-500" },
  suspended: { label: "Suspended", cls: "bg-amber-500/10 text-amber-700", dot: "bg-amber-500" },
  expired: { label: "Expired", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-red-500/10 text-red-700", dot: "bg-red-500" },
};

export function DashboardChildPanels() {
  const { t } = useLanguage();
  const { data, isLoading } = useChildPanels();
  const [showCreate, setShowCreate] = useState(false);
  // The just-created API key — shown in a highlighted banner above the list.
  // Set when the create mutation succeeds, cleared on user dismiss.
  const [createdKey, setCreatedKey] = useState<{
    panel: any;
    apiKey: string;
  } | null>(null);

  const panels = data?.panels ?? [];

  // ── Aggregate stats for the top row ──
  const stats = useMemo(() => {
    const active = panels.filter((p: any) => p.status === "active").length;
    const totalMonthly = panels
      .filter((p: any) => p.status === "active")
      .reduce((sum: number, p: any) => sum + (p.monthlyFee ?? 0), 0);
    // Markup earned is simulated as markupPercent × monthlyFee (proxy until
    // the child panel starts routing real orders through the parent).
    const markupEarned = panels
      .filter((p: any) => p.status === "active")
      .reduce(
        (sum: number, p: any) =>
          sum + ((p.monthlyFee ?? 0) * (p.markupPercent ?? 50)) / 100,
        0,
      );
    return { active, totalMonthly, markupEarned };
  }, [panels]);

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {t("childPanels.eyebrow", "Reseller")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("childPanels.title", "Child Panels")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("childPanels.subtitle", "White-label sub-panels for your reseller business.")}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
          >
            <Plus className="h-3.5 w-3.5" /> {t("childPanels.purchase", "Purchase child panel")}
          </button>
        </div>
      </Reveal>

      {/* Top stats */}
      <RevealStagger stagger={0.06} className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
        <RevealItem>
          <StatCard label={t("childPanels.activePanels", "Active panels")} value={stats.active} icon={<Globe className="h-4 w-4" />} />
        </RevealItem>
        <RevealItem>
          <StatCard
            label={t("childPanels.monthlyFees", "Monthly fees")}
            value={`$${stats.totalMonthly.toFixed(2)}`}
            icon={<DollarSign className="h-4 w-4" />}
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            label={t("childPanels.markupEarned", "Markup earned (est.)")}
            value={`$${stats.markupEarned.toFixed(2)}`}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </RevealItem>
      </RevealStagger>

      {/* Just-created API key banner (shown once after creation) */}
      <AnimatePresence mode="wait">
        {createdKey && (
          <CreatedKeyBanner
            panel={createdKey.panel}
            apiKey={createdKey.apiKey}
            onClose={() => setCreatedKey(null)}
          />
        )}
      </AnimatePresence>

      {/* Panel list / empty state */}
      <Reveal blur>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : panels.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {panels.map((p: any, i: number) => (
              <ChildPanelCard key={p.id} panel={p} index={i} />
            ))}
          </div>
        )}
      </Reveal>

      {/* Create modal */}
      <AnimatePresence mode="wait">
        {showCreate && (
          <CreateChildPanelModal
            onClose={() => setShowCreate(false)}
            onCreated={(panel, apiKey) => {
              setCreatedKey({ panel, apiKey });
              setShowCreate(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────── Stat card ───────────
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="h-full rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? <Counter to={value} duration={1.2} /> : value}
      </div>
    </div>
  );
}

// ─────────── Empty state ───────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Globe className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{t("childPanels.emptyTitle", "No child panels yet")}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {t("childPanels.emptyDescription", "Purchase one to start your white-label reseller business. You'll get a subdomain + API key auto-provisioned — your customers see your brand, we do the fulfilment.")}
      </p>
      <button
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
      >
        <Plus className="h-4 w-4" /> {t("childPanels.purchase", "Purchase child panel")}
      </button>
    </div>
  );
}

// ─────────── Child panel card ───────────
function ChildPanelCard({ panel: p, index }: { panel: any; index: number }) {
  const { t } = useLanguage();
  const updateMutation = useUpdateChildPanel();
  const cancelMutation = useCancelChildPanel();
  const [editing, setEditing] = useState(false);

  const status = STATUS_STYLES[p.status] ?? STATUS_STYLES.active;
  const planMeta = PLANS[p.plan] ?? PLANS.reseller;
  const paidUntilDate = new Date(p.paidUntil);
  const expired = paidUntilDate.getTime() < Date.now();
  const canSuspend = p.status === "active";
  const canResume = p.status === "suspended";
  const canCancel = p.status === "active" || p.status === "suspended";

  const setStatus = (status: string) => {
    updateMutation.mutate({ id: p.id, status: status as "active" | "suspended" | "cancelled" });
  };

  const handleCancel = () => {
    if (confirm(t("childPanels.confirmCancel", "Cancel {name}? The subdomain will be released.").replace("{name}", p.name))) {
      cancelMutation.mutate(p.id);
    }
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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </span>
          <div>
            <div className="font-mono text-sm font-semibold text-foreground">{p.publicId}</div>
            <div className="text-[11px] text-muted-foreground">{p.name}</div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
            status.cls,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {t(`childPanels.status.${p.status}` as any, status.label)}
        </span>
      </div>

      {/* Subdomain + plan + markup + paidUntil */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("childPanels.subdomain", "Subdomain")}</div>
          <a
            href={`https://${p.subdomain}.novsmm.shop`}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {p.subdomain}.novsmm.shop
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("childPanels.plan", "Plan")}</div>
          <div className="mt-0.5 font-medium text-foreground">{t(`childPanels.plan.${p.plan}` as any, planMeta.label)}</div>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("childPanels.markup", "Markup")}</div>
          <div className="mt-0.5 font-semibold tabular-nums text-emerald-600">
            {p.markupPercent}%
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("childPanels.monthlyFee", "Monthly fee")}</div>
          <div className="mt-0.5 font-medium tabular-nums text-foreground">
            ${p.monthlyFee.toFixed(2)}/mo
          </div>
        </div>
        <div className="col-span-2 rounded-lg bg-muted/40 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("childPanels.paidUntil", "Paid until")}</div>
          <div className={cn("mt-0.5 font-medium", expired ? "text-red-600" : "text-foreground")}>
            {paidUntilDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {expired && ` · ${t("childPanels.expired", "expired")}`}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Pencil className="h-3 w-3" /> {t("childPanels.edit", "Edit")}
        </button>
        {canSuspend && (
          <button
            onClick={() => setStatus("suspended")}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            <Pause className="h-3 w-3" /> {t("childPanels.suspend", "Suspend")}
          </button>
        )}
        {canResume && (
          <button
            onClick={() => setStatus("active")}
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <Play className="h-3 w-3" /> {t("childPanels.resume", "Resume")}
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <Ban className="h-3 w-3" /> {t("childPanels.cancel", "Cancel")}
          </button>
        )}
        {p.status === "cancelled" && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Ban className="h-3 w-3" /> {t("childPanels.cancelled", "Cancelled")}
          </span>
        )}
      </div>

      {/* Edit modal */}
      <AnimatePresence mode="wait">
        {editing && (
          <EditChildPanelModal
            panel={p}
            onClose={() => setEditing(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────── Created-key banner (shown once after creation) ───────────
function CreatedKeyBanner({
  panel,
  apiKey,
  onClose,
}: {
  panel: any;
  apiKey: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be blocked — user can still select+copy manually
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {t("childPanels.provisioned", "Child panel {id} provisioned").replace("{id}", panel.publicId)}
            </h3>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("childPanels.saveApiKey", "Save this API key now — it won't be shown again. Your panel is live at")}{" "}
            <a
              href={`https://${panel.subdomain}.novsmm.shop`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {panel.subdomain}.novsmm.shop
            </a>
            .
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs text-foreground">
              {apiKey}
            </code>
            <button
              onClick={copy}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("childPanels.copied", "Copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> {t("childPanels.copy", "Copy")}
                </>
              )}
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("childPanels.dismiss", "Dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────── Create child panel modal ───────────
function CreateChildPanelModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (panel: any, apiKey: string) => void;
}) {
  const { t } = useLanguage();
  const { data: walletData } = useWallet();
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as any) ?? {};
  const currency = user?.currency ?? "USD";
  const balance = walletData?.balance ?? 0;

  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [plan, setPlan] = useState<"reseller" | "agency" | "enterprise">("reseller");
  const [markupPercent, setMarkupPercent] = useState<number>(50);
  const [monthlyDays, setMonthlyDays] = useState<number>(30);

  // ── Live cost estimate ──
  const monthlyFee = PLANS[plan].monthly;
  const totalCost = Number(((monthlyFee * monthlyDays) / 30).toFixed(2));
  const sufficient = balance >= totalCost;

  // ── Validation ──
  const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
  const valid =
    name.trim().length >= 1 &&
    name.trim().length <= 50 &&
    SUBDOMAIN_RE.test(subdomain.toLowerCase()) &&
    markupPercent >= 0 &&
    markupPercent <= 100 &&
    monthlyDays >= 1 &&
    monthlyDays <= 365 &&
    sufficient;

  const createMutation = useCreateChildPanel();

  const handleSubmit = async () => {
    if (!valid) return;
    try {
      const res: any = await createMutation.mutateAsync({
        name: name.trim(),
        subdomain: subdomain.toLowerCase(),
        plan,
        markupPercent,
        monthlyDays,
      });
      onCreated(res.panel, res.apiKey);
    } catch {
      // toast handled by hook
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("childPanels.createDialog", "Create child panel")}
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
          aria-label={t("common.close", "Close")}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("childPanels.newTitle", "New child panel")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("childPanels.newSubtitle", "Auto-provisioned subdomain + API key · billed upfront for {days} days.").replace("{days}", String(monthlyDays))}
            </p>
          </div>
        </div>

        {/* Name + subdomain */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("childPanels.panelName", "Panel name")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme SMM"
              maxLength={50}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("childPanels.subdomain", "Subdomain")} <span className="text-red-500">*</span>
            </label>
            <div className="flex h-11 items-center rounded-xl border border-border bg-background pl-4 pr-2 text-sm">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="acme"
                className="h-full flex-1 bg-transparent text-foreground focus:outline-none"
              />
              <span className="rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                .novsmm.shop
              </span>
            </div>
          </div>
        </div>

        {/* Plan select */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("childPanels.plan", "Plan")}</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(PLANS) as ("reseller" | "agency" | "enterprise")[]).map((k) => (
              <button
                key={k}
                onClick={() => setPlan(k)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  plan === k
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{t(`childPanels.plan.${k}` as any, PLANS[k].label)}</span>
                  {plan === k && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div className="mt-0.5 text-[11px] font-medium tabular-nums text-emerald-600">
                  ${PLANS[k].monthly}/mo
                </div>
                <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {t(`childPanels.tagline.${k}` as any, PLANS[k].tagline)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Markup slider */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t("childPanels.markupOver", "Markup over parent prices:")} <span className="font-semibold text-foreground">{markupPercent}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={markupPercent}
            onChange={(e) => setMarkupPercent(Number(e.target.value))}
            className="h-2 w-full appearance-none rounded-full bg-muted accent-primary"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{t("childPanels.atCost", "0% (at cost)")}</span>
            <span>50%</span>
            <span>{t("childPanels.doubleCost", "100% (2× cost)")}</span>
          </div>
        </div>

        {/* Duration */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t("childPanels.duration", "Duration (days, 1-365)")}
          </label>
          <div className="flex flex-wrap gap-2">
            {[30, 90, 365].map((d) => (
              <button
                key={d}
                onClick={() => setMonthlyDays(d)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  monthlyDays === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground hover:bg-muted"
                )}
              >
                {d === 30 ? t("childPanels.30Days", "30 days") : d === 90 ? t("childPanels.90Days", "90 days") : t("childPanels.year365", "1 year (365d)")}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={365}
              value={monthlyDays}
              onChange={(e) =>
                setMonthlyDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))
              }
              className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
            />
          </div>
        </div>

        {/* Cost estimate */}
        <div className="mt-4 rounded-xl border border-border/60 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("childPanels.monthlyFeeFor", "Monthly fee ({plan})").replace("{plan}", t(`childPanels.plan.${plan}` as any, PLANS[plan].label))}</span>
            <span className="font-semibold tabular-nums">
              {formatPrice(monthlyFee, currency)}/mo
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">× {monthlyDays} {t("childPanels.days", "days")}</span>
            <span className="font-semibold tabular-nums">
              {formatPrice(totalCost, currency)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-sm">
            <span className="text-muted-foreground">{t("childPanels.yourBalance", "Your balance")}</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                sufficient ? "text-foreground" : "text-red-600"
              )}
            >
              {formatPrice(balance, currency)}
            </span>
          </div>
          {!sufficient && (
            <div className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-700">
              {t("childPanels.insufficientBalance", "Insufficient balance — top up your wallet first.")}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending || !valid}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("childPanels.provisioning", "Provisioning…")}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> {t("childPanels.purchaseProvision", "Purchase & provision")}
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {t("common.cancel", "Cancel")}
        </button>
      </motion.div>
    </div>
  );
}

// ─────────── Edit child panel modal (name + markup only) ───────────
function EditChildPanelModal({
  panel,
  onClose,
}: {
  panel: any;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const updateMutation = useUpdateChildPanel();
  const [name, setName] = useState(panel.name);
  // BROAD-FIX-BATCH-1: aligned the fallback default with the Create modal
  // (50%). The previous `?? 20` would reset the slider to 20% when reopening
  // the Edit modal of a freshly-created panel (which defaults to 50% in the
  // Create modal) — confusing UX. `panel.markupPercent` is normally set from
  // the DB so the fallback only fires for legacy rows; 50% matches the
  // Create modal's default.
  const [markupPercent, setMarkupPercent] = useState<number>(panel.markupPercent ?? 50);

  const valid = name.trim().length >= 1 && name.trim().length <= 50 && markupPercent >= 0 && markupPercent <= 100;

  const handleSubmit = async () => {
    if (!valid) return;
    await updateMutation.mutateAsync({
      id: panel.id,
      name: name.trim(),
      markupPercent,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("childPanels.editDialog", "Edit child panel")}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("common.close", "Close")}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Pencil className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("childPanels.editTitle", "Edit {id}").replace("{id}", panel.publicId)}</h2>
            <p className="text-xs text-muted-foreground">
              {panel.subdomain}.novsmm.shop
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t("childPanels.panelName", "Panel name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t("childPanels.markupLabel", "Markup:")} <span className="font-semibold text-foreground">{markupPercent}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={markupPercent}
            onChange={(e) => setMarkupPercent(Number(e.target.value))}
            className="h-2 w-full appearance-none rounded-full bg-muted accent-primary"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending || !valid}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {updateMutation.isPending ? t("childPanels.saving", "Saving…") : t("childPanels.saveChanges", "Save changes")}
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {t("common.cancel", "Cancel")}
        </button>
      </motion.div>
    </div>
  );
}
