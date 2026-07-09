"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Users,
  Server,
  CreditCard,
  Lock,
  KeyRound,
  LayoutGrid,
  Store,
  Activity,
  Search,
  Plus,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  Pencil,
  AlertTriangle,
  Fingerprint,
  Globe2,
  Clock,
  Languages,
  DollarSign,
  Webhook,
  Settings,
  FileKey,
  ScrollText,
  Copy,
  X,
  Loader2,
  ArrowUpRight,
  Trash2,
  Send,
  RotateCcw,
  ShoppingCart,
  Megaphone,
  ChevronDown,
  MessageCircle,
  Zap,
  Mail,
  Newspaper,
  LogIn,
  Eye,
  Save,
  ExternalLink,
  Ticket,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
} from "recharts";
import { useApp, type AdminTab } from "./app-store";
import { Counter } from "./counter";
import { PaymentLogo } from "./payment-logo";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import { signIn, useSession as useNextAuthSession } from "next-auth/react";
import {
  useAdminOverview,
  useAdminUsers,
  useAdminServices,
  useAdminProviders,
  useAdminPaymentMethods,
  useAdminPromotions,
  useAdminCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useCreateProvider,
  useUpdateProvider,
  useCreatePromotion,
  useUpdatePromotion,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useTestPaymentMethod,
  useBroadcastNotification,
  useUpdateUser,
  useBulkAction,
  useAdminSearch,
  useAdminCurrencies,
  useCreateCurrency,
  useUpdateCurrency,
  useAdminLanguages,
  useCreateLanguage,
  useUpdateLanguage,
  useAdminApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useUpdateApiKeyIpAllowlist,
  useAdminLicenses,
  useCreateLicense,
  useUpdateLicense,
  useAdminWithdrawals,
  useProcessWithdrawal,
  useAdminWebhooks,
  useAdminSettings,
  useUpdateSettings,
  useAdminRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useCreateManualOrder,
  useRefund,
  useServices,
} from "@/hooks/use-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ADMIN_NAV: { id: AdminTab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "users", label: "Users", icon: Users },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "services", label: "Services", icon: Store },
  { id: "providers", label: "Providers", icon: Server },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "promotions", label: "Promotions", icon: Megaphone },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
  { id: "apiKeys", label: "API Keys", icon: FileKey },
  { id: "licenses", label: "Licenses", icon: KeyRound },
  { id: "currencies", label: "Currencies", icon: DollarSign },
  { id: "languages", label: "Languages", icon: Languages },
  // ADMIN-FIX-BATCH-1: renamed "Webhooks" → "Webhook Logs" — the panel only
  // shows inbound WebhookLog rows. Outbound webhooks (OutboundWebhook model +
  // /api/admin/webhooks/outbound route) are managed via the API for now.
  { id: "webhooks", label: "Webhook Logs", icon: Webhook },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "security", label: "Security", icon: Lock },
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "socialAuth", label: "Social Auth", icon: KeyRound },
  { id: "version", label: "Version", icon: ScrollText },
  { id: "emailTemplates", label: "Email Templates", icon: Mail },
  { id: "cms", label: "CMS / Blog", icon: Newspaper },
];

export function AdminPanel() {
  const { adminTab, setAdminTab } = useApp();

  return (
    <div className="flex flex-col gap-6">
      {/* Admin header */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3 w-3" />
              Admin · Operations central
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {ADMIN_NAV.find((n) => n.id === adminTab)?.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              Full operational control over the NOVSMM platform.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-2.5">
            <span className="relative flex h-2 w-2">
              <span className="nov-pulse-dot absolute inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-foreground">Real-time · 184,500 users</span>
          </div>
        </div>
      </Reveal>

      {/* Admin sub-nav */}
      <Reveal>
        <div className="flex items-center gap-1 overflow-x-auto nov-scroll rounded-2xl border border-border/60 bg-background p-1">
          {ADMIN_NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setAdminTab(n.id)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors",
                adminTab === n.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {adminTab === n.id && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-0 rounded-xl bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <n.icon className="relative h-3.5 w-3.5" />
              <span className="relative">{n.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      <motion.div
        key={adminTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
          {adminTab === "overview" && <AdminOverview />}
          {adminTab === "users" && <AdminUsers />}
          {adminTab === "orders" && <AdminOrders />}
          {adminTab === "services" && <AdminServices />}
          {adminTab === "providers" && <AdminProviders />}
          {adminTab === "payments" && <AdminPayments />}
          {adminTab === "promotions" && <AdminPromotions />}
          {adminTab === "coupons" && <AdminCoupons />}
          {adminTab === "withdrawals" && <AdminWithdrawals />}
          {adminTab === "refunds" && <AdminRefunds />}
          {adminTab === "apiKeys" && <AdminApiKeys />}
          {adminTab === "licenses" && <AdminLicenses />}
          {adminTab === "currencies" && <AdminCurrencies />}
          {adminTab === "languages" && <AdminLanguages />}
          {adminTab === "webhooks" && <AdminWebhooks />}
          {adminTab === "settings" && <AdminSettingsTab />}
          {adminTab === "security" && <AdminSecurity />}
          {adminTab === "roles" && <AdminRoles />}
          {adminTab === "socialAuth" && <AdminSocialAuth />}
          {adminTab === "version" && <AdminVersion />}
          {adminTab === "emailTemplates" && <AdminEmailTemplates />}
          {adminTab === "cms" && <AdminCms />}
        </motion.div>
    </div>
  );
}

/* ─────────── Overview ─────────── */
function AdminOverview() {
  const { data, isLoading } = useAdminOverview();
  const s = data?.stats;
  const series = data?.series ?? [];
  const health = data?.health ?? [];

  return (
    <div className="flex flex-col gap-4">
      <BroadcastComposer />

      <RevealStagger stagger={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <RevealItem><AdminStat icon={<Users className="h-4 w-4" />} label="Total users" value={<Counter to={s?.totalUsers ?? 0} duration={2} />} delta="live" /></RevealItem>
        <RevealItem><AdminStat icon={<Activity className="h-4 w-4" />} label="Orders (24h)" value={<Counter to={s?.orders24h ?? 0} duration={2} />} delta="live" /></RevealItem>
        <RevealItem><AdminStat icon={<CreditCard className="h-4 w-4" />} label="Revenue (30d)" value={<>$<Counter to={s?.revenue30d ?? 0} duration={2} /></>} delta="live" /></RevealItem>
        <RevealItem><AdminStat icon={<Server className="h-4 w-4" />} label="Active services" value={<Counter to={s?.services ?? 0} duration={1.5} />} delta={`${s?.providers ?? 0} providers`} /></RevealItem>
      </RevealStagger>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal blur className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Platform revenue · 30d</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">$<Counter to={s?.revenue30d ?? 0} duration={2} /></div>
            <div className="mt-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="admRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0052ff" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0052ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="d" hide />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#0052ff" strokeWidth={2} fill="url(#admRev)" animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Reveal>

        <Reveal blur delay={0.06}>
          <div className="h-full rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">System health</div>
            <div className="mt-3 flex flex-col gap-3">
              {health.map((h: any) => (
                <div key={h.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{h.label}</span>
                  <span className={cn("inline-flex items-center gap-1.5 font-medium tabular-nums", h.ok ? "text-emerald-600" : "text-amber-600")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", h.ok ? "bg-emerald-500" : "bg-amber-500")} />
                    {h.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ─────────── Broadcast Composer (Overview top) ─────────── */
function BroadcastComposer() {
  const broadcast = useBroadcastNotification();
  const [form, setForm] = useState({
    title: "",
    message: "",
    audience: "all" as "all" | "users" | "admins",
    type: "system" as "order" | "sale" | "marketplace" | "ticket" | "recharge" | "withdrawal" | "referral" | "system",
    severity: "info" as "info" | "success" | "warning" | "error",
  });
  const [expanded, setExpanded] = useState(false);

  const submit = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    try {
      await broadcast.mutateAsync({
        ...form,
        broadcast: true,
      } as any);
      setForm({ title: "", message: "", audience: "all", type: "system", severity: "info" });
      setExpanded(false);
    } catch {
      /* toast handled by hook */
    }
  };

  return (
    <Reveal blur>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold">Broadcast notification</div>
              <div className="text-[11px] text-muted-foreground">Push a real-time message to a chosen audience</div>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            {expanded ? "Hide" : "Compose"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 flex flex-col gap-3">
            <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Message</span>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                placeholder="Type your broadcast…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,82,255,0.12)]"
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <SelectField label="Audience" value={form.audience} onChange={(v) => setForm({ ...form, audience: v as any })} options={[{ value: "all", label: "All users" }, { value: "users", label: "Users only" }, { value: "admins", label: "Admins only" }]} />
              <SelectField label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v as any })} options={[
                { value: "system", label: "System" },
                { value: "order", label: "Order" },
                { value: "sale", label: "Sale" },
                { value: "marketplace", label: "Marketplace" },
                { value: "ticket", label: "Ticket" },
                { value: "recharge", label: "Recharge" },
                { value: "withdrawal", label: "Withdrawal" },
                { value: "referral", label: "Referral" },
              ]} />
              <SelectField label="Severity" value={form.severity} onChange={(v) => setForm({ ...form, severity: v as any })} options={[
                { value: "info", label: "Info" },
                { value: "success", label: "Success" },
                { value: "warning", label: "Warning" },
                { value: "error", label: "Error" },
              ]} />
            </div>
            <button
              onClick={submit}
              disabled={broadcast.isPending || !form.title.trim() || !form.message.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {broadcast.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {broadcast.isPending ? "Sending…" : "Broadcast now"}
            </button>
          </div>
        )}
      </div>
    </Reveal>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,82,255,0.12)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function AdminStat({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: React.ReactNode; delta: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <span className="text-[11px] font-medium text-emerald-600">{delta}</span>
      </div>
      <div className="mt-2.5 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/* ─────────── Users ─────────── */
function AdminUsers() {
  const { data } = useAdminUsers();
  const updateUser = useUpdateUser();
  const bulkAction = useBulkAction();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [impersonateTarget, setImpersonateTarget] = useState<any | null>(null);

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Trigger admin search when debounced query is non-empty
  const search = useAdminSearch(debounced);
  const searching = debounced.length >= 2;
  const searchUsers = search.data?.users ?? [];
  const fallbackUsers = data?.users ?? [];
  const users = searching ? searchUsers : fallbackUsers;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u: any) => u.id)));
    }
  };

  const runBulk = (action: "suspend" | "activate" | "promote" | "delete") => {
    if (selected.size === 0) return;
    // C-2 fix: Confirm destructive bulk actions before executing
    const actionLabels: Record<string, string> = {
      suspend: "suspend",
      activate: "activate",
      promote: "promote to admin",
      delete: "DELETE (suspend)",
    };
    const verb = actionLabels[action] || action;
    if (!window.confirm(`Are you sure you want to ${verb} ${selected.size} user(s)? This action cannot be undone.`)) {
      return;
    }
    const ids = Array.from(selected);
    bulkAction.mutate(
      { entity: "user", action, ids },
      { onSuccess: () => setSelected(new Set()) }
    );
  };

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name, email, role…"
            className="w-full bg-transparent focus:outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setSelected(new Set()); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
          {searching && search.isFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/[0.04] px-4 py-3">
            <span className="text-xs font-semibold text-primary">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button onClick={() => runBulk("suspend")} disabled={bulkAction.isPending} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-500/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60">
                Suspend {selected.size}
              </button>
              <button onClick={() => runBulk("activate")} disabled={bulkAction.isPending} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60">
                Activate {selected.size}
              </button>
              <button onClick={() => runBulk("promote")} disabled={bulkAction.isPending} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60">
                Promote {selected.size} to admin
              </button>
              <button onClick={() => runBulk("delete")} disabled={bulkAction.isPending} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-500/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60">
                Delete {selected.size}
              </button>
              <button onClick={() => setSelected(new Set())} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium w-10">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selected.size === users.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">User</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Balance</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Orders</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Joined</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u: any) => (
                  <tr key={u.id} className={cn("transition-colors hover:bg-muted/30", selected.has(u.id) && "bg-primary/[0.04]")}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-[10px] font-semibold text-primary-foreground">
                          {(u.name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">${(u.balance ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{(u._count?.orders ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><UserStatus status={u.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === "active" ? (
                          <IconBtn
                            icon={Ban}
                            danger
                            onClick={() => updateUser.mutate({ id: u.id, status: "suspended" })}
                          />
                        ) : (
                          <IconBtn
                            icon={CheckCircle2}
                            onClick={() => updateUser.mutate({ id: u.id, status: "active" })}
                          />
                        )}
                        <IconBtn
                          icon={ShieldCheck}
                          onClick={() => updateUser.mutate({ id: u.id, role: "admin" })}
                        />
                        {/* Impersonate — admin-only, active non-admin users only */}
                        {u.status === "active" && u.role !== "admin" && (
                          <button
                            onClick={() => setImpersonateTarget(u)}
                            title={`Impersonate ${u.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-600"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {searching ? `No users match “${debounced}”` : "No users found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {impersonateTarget && (
        <ImpersonateModal
          user={impersonateTarget}
          onClose={() => setImpersonateTarget(null)}
        />
      )}
    </Reveal>
  );
}

/**
 * Impersonation modal — prompts the admin for their password, then
 * triggers `signIn("impersonate", ...)` to mint a new session for the
 * target user. The page reloads on success.
 */
function ImpersonateModal({ user, onClose }: { user: any; onClose: () => void }) {
  const { data: session } = useNextAuthSession();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const adminEmail = (session?.user as any)?.email ?? "";

  const handleImpersonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !adminEmail) return;
    setLoading(true);
    try {
      // Pre-flight: validate the target is impersonate-able
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Pre-flight check failed");
      }

      // Mint the new session via the "impersonate" credentials provider.
      // This will overwrite the current session cookie.
      const result = await signIn("impersonate", {
        adminEmail,
        adminPassword: password,
        targetUserId: user.id,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Impersonating user",
        description: `You are now logged in as ${user.name}.`,
      });
      // Reload to pick up the new session
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast({
        title: "Impersonation failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleImpersonate}
        className="relative w-full max-w-md rounded-3xl border border-amber-500/40 bg-background p-6 nov-ring-lg"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Impersonate user</h2>
            <p className="text-xs text-muted-foreground">
              All actions will be audited under your admin identity.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-xs">
          <div className="font-medium text-amber-700">You will be logged in as:</div>
          <div className="mt-1 text-foreground">
            {user.name} · <span className="text-muted-foreground">{user.email}</span>
          </div>
          <div className="mt-1 text-muted-foreground">
            Role: {user.role} · A &quot;Return to admin&quot; banner will let you
            switch back any time.
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Your admin password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:outline-none focus:shadow-[0_0_0_4px_rgba(245,158,11,0.15)]"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting impersonation…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Impersonate {user.name}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cls: Record<string, string> = {
    Admin: "bg-primary/10 text-primary",
    Enterprise: "bg-violet-500/10 text-violet-700",
    Agency: "bg-emerald-500/10 text-emerald-700",
    Reseller: "bg-amber-500/10 text-amber-700",
  };
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", cls[role] ?? "bg-muted text-muted-foreground")}>{role}</span>;
}

function UserStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-700",
    suspended: "bg-red-500/10 text-red-700",
    pending: "bg-amber-500/10 text-amber-700",
  };
  const dot: Record<string, string> = { active: "bg-emerald-500", suspended: "bg-red-500", pending: "bg-amber-500" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", map[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status])} />
      {status}
    </span>
  );
}

function IconBtn({ icon: Icon, danger, onClick }: { icon: any; danger?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
        danger ? "text-muted-foreground hover:bg-red-500/10 hover:text-red-600" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/* ─────────── Services ─────────── */
function AdminServices() {
  const { data } = useAdminServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const services = data?.services ?? [];

  return (
    <Reveal blur>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="text-base font-semibold">Catalog · {services.length} services</div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add service
          </button>
        </div>
        <div className="overflow-x-auto nov-scroll">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Service</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Platform</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Cost</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Min/Max</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Rate</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {services.map((s: any) => (
                <tr key={s.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{s.name}</div>
                    {s.provider && <div className="text-[11px] text-muted-foreground">{s.provider.name}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.platform}</td>
                  <td className="px-4 py-3 text-right tabular-nums">${s.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600">${s.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{s.minQty} / {s.maxQty.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", s.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{s.rate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn icon={Pencil} onClick={() => setEditing(s)} />
                      <IconBtn icon={Trash2} danger onClick={() => setDeleting(s)} />
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No services yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && (
        <ServiceModal
          mode="create"
          onClose={() => setShowAdd(false)}
          onSubmit={async (d) => { await createService.mutateAsync(d); setShowAdd(false); }}
          loading={createService.isPending}
        />
      )}
      {editing && (
        <ServiceModal
          mode="edit"
          service={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (d) => { await updateService.mutateAsync({ id: editing.id, ...d }); setEditing(null); }}
          loading={updateService.isPending}
        />
      )}
      {deleting && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete service?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark <span className="font-semibold text-foreground">{deleting.name}</span> as deleted. Existing orders are unaffected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { deleteService.mutate(deleting.id); setDeleting(null); }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Reveal>
  );
}

/** Unified service modal — handles both create and edit modes.
 *
 * In edit mode, an extra "Providers" section is shown: a list of
 * ServiceProvider mappings for this service, each with a provider (select),
 * priority (1-5), providerServiceId (the service ID at that provider), and
 * optional cost. The admin can add/remove mappings — they're submitted as a
 * `providers` array and the backend PATCH replaces the service's mappings
 * atomically.
 *
 * In create mode the providers section is hidden (the service doesn't exist
 * yet, so we can't attach mappings until after creation — admin re-opens the
 * service to add them).
 */
function ServiceModal({
  mode,
  service,
  onClose,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  service?: any;
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
  loading?: boolean;
}) {
  const { data: providersData } = useAdminProviders();
  const allProviders = providersData?.providers ?? [];

  const [form, setForm] = useState({
    name: service?.name ?? "",
    platform: service?.platform ?? "Instagram",
    cost: service?.cost ?? 1,
    price: service?.price ?? 2,
    minQty: service?.minQty ?? 50,
    maxQty: service?.maxQty ?? 100000,
    rate: service?.rate ?? "0/d",
    status: service?.status ?? "active",
  });

  // ── Provider mappings (edit mode only) ──
  // Initialise from the service's existing ServiceProvider mappings. Each
  // entry: { providerId, priority, providerServiceId, cost }.
  const [providers, setProviders] = useState<any[]>(() => {
    if (mode !== "edit" || !service?.serviceProviders) return [];
    return service.serviceProviders.map((sp: any) => ({
      providerId: sp.providerId,
      priority: sp.priority ?? 1,
      providerServiceId: sp.providerServiceId ?? "",
      cost: sp.cost ?? "",
    }));
  });

  const addProvider = () => {
    if (allProviders.length === 0) return;
    // Default to the first provider not already in the list.
    const used = new Set(providers.map((p) => p.providerId));
    const next = allProviders.find((p: any) => !used.has(p.id));
    if (!next) return;
    setProviders([
      ...providers,
      {
        providerId: next.id,
        priority: providers.length + 1,
        providerServiceId: "",
        cost: "",
      },
    ]);
  };

  const removeProvider = (idx: number) => {
    setProviders(providers.filter((_, i) => i !== idx));
  };

  const updateProvider = (idx: number, patch: any) => {
    setProviders(providers.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const submit = async () => {
    if (!form.name) return;
    const payload: any = { ...form };
    if (mode === "edit") {
      // Always send providers in edit mode (even if empty) so the backend can
      // clear them when the admin removes all mappings.
      payload.providers = providers.map((p) => ({
        providerId: p.providerId,
        priority: Number(p.priority) || 1,
        providerServiceId: p.providerServiceId || undefined,
        cost: p.cost === "" || p.cost === null ? undefined : Number(p.cost),
      }));
    }
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll">
        <div className="text-base font-semibold">{mode === "create" ? "Add service" : "Edit service"}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Platform" value={form.platform} onChange={(v) => setForm({ ...form, platform: v })} />
          <Input label="Cost" type="number" value={String(form.cost)} onChange={(v) => setForm({ ...form, cost: Number(v) })} />
          <Input label="Price" type="number" value={String(form.price)} onChange={(v) => setForm({ ...form, price: Number(v) })} />
          <Input label="Min qty" type="number" value={String(form.minQty)} onChange={(v) => setForm({ ...form, minQty: Number(v) })} />
          <Input label="Max qty" type="number" value={String(form.maxQty)} onChange={(v) => setForm({ ...form, maxQty: Number(v) })} />
          <Input label="Rate (e.g. 100/d)" value={form.rate} onChange={(v) => setForm({ ...form, rate: v })} />
          <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
            { value: "deleted", label: "Deleted" },
          ]} />
        </div>

        {/* ── Providers section (edit mode only) ── */}
        {mode === "edit" && (
          <div className="mt-5 rounded-xl border border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">Providers (failover)</div>
                <div className="text-[10px] text-muted-foreground">
                  Tried in priority order on every order. If #1 fails, #2 takes over.
                </div>
              </div>
              <button
                onClick={addProvider}
                disabled={allProviders.length === 0 || providers.length >= 5 || providers.length >= allProviders.length}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>

            {providers.length === 0 ? (
              <div className="rounded-lg bg-muted/40 px-3 py-3 text-center text-[11px] text-muted-foreground">
                No providers mapped. Fulfillment will fall back to the legacy single-provider flow.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {providers.map((p, idx) => {
                  const provider = allProviders.find((pr: any) => pr.id === p.providerId);
                  return (
                    <div key={`${p.providerId}-${idx}`} className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <div className="flex items-start gap-2">
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          <label className="block">
                            <span className="mb-0.5 block text-[10px] text-muted-foreground">Provider</span>
                            <select
                              value={p.providerId}
                              onChange={(e) => updateProvider(idx, { providerId: e.target.value })}
                              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            >
                              {allProviders.map((pr: any) => (
                                <option key={pr.id} value={pr.id}>{pr.name}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-0.5 block text-[10px] text-muted-foreground">Priority</span>
                            <select
                              value={p.priority}
                              onChange={(e) => updateProvider(idx, { priority: Number(e.target.value) })}
                              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n} {n === 1 ? "(primary)" : `(fallback ${n - 1})`}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-0.5 block text-[10px] text-muted-foreground">Provider service ID</span>
                            <input
                              type="text"
                              value={p.providerServiceId}
                              onChange={(e) => updateProvider(idx, { providerServiceId: e.target.value })}
                              placeholder="e.g. 12345"
                              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-0.5 block text-[10px] text-muted-foreground">Cost / 1k (optional)</span>
                            <input
                              type="number"
                              value={String(p.cost ?? "")}
                              onChange={(e) => updateProvider(idx, { cost: e.target.value })}
                              placeholder="auto"
                              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            />
                          </label>
                        </div>
                        <button
                          onClick={() => removeProvider(idx)}
                          className="mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                          aria-label="Remove provider mapping"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {provider && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {provider.name} · {provider.apiUrl}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={submit} disabled={loading || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Saving…" : mode === "create" ? "Create service" : "Save changes"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,82,255,0.12)]"
      />
    </label>
  );
}

/* ─────────── Providers ─────────── */
function AdminProviders() {
  const { data } = useAdminProviders();
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const providers = data?.providers ?? [];

  return (
    <Reveal blur>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add provider
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {providers.map((p: any) => (
          <div key={p.id} className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Server className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.apiUrl}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", p.status === "healthy" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", p.status === "healthy" ? "bg-emerald-500" : "bg-amber-500")} />
                  {p.status}
                </span>
                <IconBtn icon={Pencil} onClick={() => setEditing(p)} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latency</div>
                <div className={cn("font-semibold tabular-nums", p.latency < 150 ? "text-emerald-600" : "text-amber-600")}>{p.latency}ms</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Services</div>
                <div className="font-semibold tabular-nums text-foreground">{p._count?.services ?? 0}</div>
              </div>
            </div>
          </div>
        ))}
        {providers.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No providers yet — click “Add provider” to connect one.
          </div>
        )}
      </div>
      {showAdd && (
        <ProviderModal
          mode="create"
          onClose={() => setShowAdd(false)}
          onSubmit={async (d) => { await createProvider.mutateAsync(d); setShowAdd(false); }}
          loading={createProvider.isPending}
        />
      )}
      {editing && (
        <ProviderModal
          mode="edit"
          provider={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (d) => { await updateProvider.mutateAsync({ id: editing.id, ...d }); setEditing(null); }}
          loading={updateProvider.isPending}
        />
      )}
    </Reveal>
  );
}

/** Unified provider modal — create or edit. Edit mode masks the existing apiKey (blank = keep). */
function ProviderModal({
  mode,
  provider,
  onClose,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  provider?: any;
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
  loading?: boolean;
}) {
  const [form, setForm] = useState({
    name: provider?.name ?? "",
    apiUrl: provider?.apiUrl ?? "https://",
    apiKey: "",
    status: provider?.status ?? "healthy",
    latency: provider?.latency ?? 0,
  });

  const submit = async () => {
    if (!form.name) return;
    const payload: any = {
      name: form.name,
      apiUrl: form.apiUrl,
      status: form.status,
      latency: Number(form.latency) || 0,
    };
    // Only send apiKey when set; blank in edit mode = keep existing.
    if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
        <div className="text-base font-semibold">{mode === "create" ? "Add API provider" : "Edit provider"}</div>
        <div className="mt-4 flex flex-col gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="API endpoint" value={form.apiUrl} onChange={(v) => setForm({ ...form, apiUrl: v })} />
          <Input
            label={mode === "edit" ? "API key (blank = keep existing)" : "API key (optional)"}
            value={form.apiKey}
            onChange={(v) => setForm({ ...form, apiKey: v })}
            type="password"
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[
              { value: "healthy", label: "Healthy" },
              { value: "degraded", label: "Degraded" },
              { value: "down", label: "Down" },
            ]} />
            <Input label="Latency (ms)" type="number" value={String(form.latency)} onChange={(v) => setForm({ ...form, latency: Number(v) })} />
          </div>
        </div>
        <button onClick={submit} disabled={loading || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Saving…" : mode === "create" ? "Add provider" : "Save changes"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

/* ─────────── Payments ─────────── */
function AdminPayments() {
  const { data } = useAdminPaymentMethods();
  const createPm = useCreatePaymentMethod();
  const [showAdd, setShowAdd] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const methods = data?.methods ?? [];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        {/* Payment method cards with logos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m: any) => (
            <div key={m.id} className="rounded-2xl border border-border/60 bg-background p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <PaymentLogo name={m.name} size={40} />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">{m.settleTime} · {m.fee}</div>
                  </div>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", m.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", m.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                  {m.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-md bg-muted/40 px-2 py-1">{m.currencies}</span>
                {m.config && <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700">✓ Credentials set</span>}
                {!m.config && <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-700">⚠ No credentials</span>}
              </div>
              <button
                onClick={() => setEditingMethod(m)}
                className="mt-4 w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Configure credentials
              </button>
            </div>
          ))}
        </div>

        {/* Add new method */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add payment method
          </button>
        </div>
      </div>

      {showAdd && <AddPaymentMethodModal onClose={() => setShowAdd(false)} onCreate={createPm.mutateAsync} />}
      {editingMethod && <ConfigureCredentialsModal method={editingMethod} onClose={() => setEditingMethod(null)} />}
    </Reveal>
  );
}

// ─── Configure Credentials Modal ───
function ConfigureCredentialsModal({ method, onClose }: { method: any; onClose: () => void }) {
  const updatePm = useUpdatePaymentMethod();
  const testPm = useTestPaymentMethod();
  const { toast } = useToast();

  // Define credential fields per payment method
  const credentialFields: Record<string, { key: string; label: string; type?: string; placeholder?: string }[]> = {
    Stripe: [
      { key: "secretKey", label: "Secret Key", placeholder: "sk_live_... or sk_test_..." },
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_..." },
    ],
    PayPal: [
      { key: "clientId", label: "Client ID", placeholder: "AY..." },
      { key: "clientSecret", label: "Client Secret", placeholder: "EL..." },
      { key: "webhookId", label: "Webhook ID", placeholder: "WH-..." },
    ],
    "Mercado Pago": [
      { key: "accessToken", label: "Access Token", placeholder: "APP_USR-..." },
      { key: "publicKey", label: "Public Key", placeholder: "APP_USR-..." },
      { key: "webhookUrl", label: "Webhook URL (auto)", placeholder: "https://yourdomain.com/api/webhooks/mercadopago" },
    ],
    NowPayments: [
      { key: "apiKey", label: "API Key", placeholder: "NP-XXXX-XXXX-XXXX" },
      { key: "ipnSecret", label: "IPN Secret", placeholder: "whsec_..." },
      { key: "payCurrency", label: "Default Pay Currency (optional)", placeholder: "usdttrc20" },
      { key: "payoutCurrency", label: "Payout Currency (optional)", placeholder: "usd" },
    ],
  };

  // Manual payment has no credentials — just a note
  const isManual = method.name === "Manual";
  // Stripe has its own help panel — fields + help
  const isStripe = method.name === "Stripe";

  const fields = credentialFields[method.name] ?? [
    { key: "apiKey", label: "API Key", placeholder: "" },
    { key: "apiSecret", label: "API Secret", placeholder: "" },
  ];

  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Parse existing config (masked) — show "configured" but don't pre-fill
  const existingConfig = method.config ? (() => { try { return JSON.parse(method.config); } catch { return {}; } })() : {};

  const handleSave = async () => {
    setLoading(true);
    try {
      // Only send non-empty fields (don't overwrite with empty if admin didn't change)
      const config: Record<string, string> = {};
      for (const field of fields) {
        if (credentials[field.key]) {
          config[field.key] = credentials[field.key];
        }
      }
      await updatePm.mutateAsync({ id: method.id, config });
      toast({ title: "Credentials saved", description: `${method.name} configuration updated successfully.` });
      onClose();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      // If the admin typed any new credentials, test those ad-hoc; otherwise test the saved ones.
      const hasNewCreds = Object.values(credentials).some((v) => v && v.trim());
      const payload = hasNewCreds
        ? { method: method.name, credentials }
        : { methodId: method.id };
      const res: any = await testPm.mutateAsync(payload as any);
      if (res?.ok) {
        setTestResult({ ok: true, message: res.message ?? "Connected" });
      } else {
        setTestResult({ ok: false, message: res?.error ?? "Connection failed" });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message ?? "Connection failed" });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <PaymentLogo name={method.name} size={48} />
          <div>
            <div className="text-lg font-semibold">{method.name}</div>
            <div className="text-xs text-muted-foreground">Configure payment credentials</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {isManual ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <MessageCircle className="h-4 w-4" />
                Manual Payment — No credentials needed
              </div>
              <p className="mt-2 text-xs text-emerald-700/80">
                When users select "Manual" as their payment method, they are
                redirected to WhatsApp to contact our team. The transaction
                stays <strong>pending</strong> until an admin manually credits
                the balance via the admin panel after confirming receipt of
                payment.
              </p>
              <p className="mt-2 text-xs text-emerald-700/80">
                Configure the WhatsApp number in <strong>Admin → Settings → platform.whatsapp</strong>.
              </p>
            </div>
          ) : (
            <>
              {isStripe && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                    <CreditCard className="h-4 w-4" />
                    Stripe — API keys & webhook
                  </div>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-violet-700/80">
                    <li>
                      Get your API keys at{" "}
                      <a
                        href="https://dashboard.stripe.com/apikeys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline underline-offset-2 hover:text-violet-900"
                      >
                        dashboard.stripe.com/apikeys
                      </a>
                      .
                    </li>
                    <li>
                      Required fields: <strong>Secret Key</strong> (<code>sk_live_…</code> or <code>sk_test_…</code>) and <strong>Webhook Secret</strong> (<code>whsec_…</code>).
                    </li>
                    <li>
                      Webhook URL to configure in Stripe:&nbsp;
                      <code className="break-all">https://novsmm.shop/api/webhooks/stripe</code>
                    </li>
                    <li>
                      Subscribe to these events:&nbsp;
                      <code>checkout.session.completed</code>,&nbsp;
                      <code>payment_intent.payment_failed</code>,&nbsp;
                      <code>charge.refunded</code>.
                    </li>
                  </ol>
                </div>
              )}
              {fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {field.label}
                    {existingConfig[field.key] && <span className="ml-2 text-emerald-600">✓ Currently set ({existingConfig[field.key]})</span>}
                  </span>
                  <input
                    type={field.type ?? "text"}
                    value={credentials[field.key] ?? ""}
                    onChange={(e) => { setCredentials({ ...credentials, [field.key]: e.target.value }); setTestResult(null); }}
                    placeholder={field.placeholder ?? `Enter ${field.label}`}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
                  />
                </label>
              ))}
            </>
          )}
        </div>

        {testResult && (
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
              testResult.ok
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                : "border-red-500/30 bg-red-500/5 text-red-700"
            )}
          >
            {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span className="font-medium">{testResult.ok ? "✓ Connected" : "✗ Failed"}</span>
            <span className="text-muted-foreground">· {testResult.message}</span>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
          <p className="text-xs text-amber-700">
            🔒 Credentials are encrypted and stored securely. Leave a field blank to keep the existing value.
            Changes take effect immediately after saving.
          </p>
        </div>

        {!isManual && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={handleTest}
              disabled={testPm.isPending}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {testPm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {testPm.isPending ? "Testing…" : "Test connection"}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Save credentials
                </>
              )}
            </button>
          </div>
        )}

        {isManual && (
          <div className="mt-5">
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
            >
              <CheckCircle2 className="h-4 w-4" />
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddPaymentMethodModal({ onClose, onCreate }: { onClose: () => void; onCreate: (d: any) => Promise<any> }) {
  const [form, setForm] = useState({ name: "", glyph: "$", tone: "from-primary/15 to-primary/5 text-primary", settleTime: "Instant", fee: "0%", currencies: "USD" });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try { await onCreate(form); onClose(); } catch { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
        <div className="text-base font-semibold">Add payment method</div>
        <div className="mt-4 flex flex-col gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Glyph" value={form.glyph} onChange={(v) => setForm({ ...form, glyph: v })} />
            <Input label="Settle time" value={form.settleTime} onChange={(v) => setForm({ ...form, settleTime: v })} />
          </div>
          <Input label="Fee" value={form.fee} onChange={(v) => setForm({ ...form, fee: v })} />
          <Input label="Currencies" value={form.currencies} onChange={(v) => setForm({ ...form, currencies: v })} />
        </div>
        <button onClick={submit} disabled={loading || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Adding…" : "Add method"}
        </button>
      </div>
    </div>
  );
}

/* ─────────── Security ─────────── */
function AdminSecurity() {
  const layers = [
    { icon: Fingerprint, title: "2FA enforcement", desc: "TOTP / WebAuthn / passkeys", status: "92% adoption", ok: true },
    { icon: Globe2, title: "IP allowlists", desc: "Per-role geographic restrictions", status: "48 rules", ok: true },
    { icon: Activity, title: "Anomaly detection", desc: "ML-based fraud scoring", status: "0.01% FP", ok: true },
    { icon: Ban, title: "Bot protection", desc: "Rate limit + WAF + CAPTCHA", status: "2.4M blocked", ok: true },
    { icon: AlertTriangle, title: "CSRF / XSS / SQLi", desc: "Edge-filtered on every request", status: "0 breaches", ok: true },
    { icon: Clock, title: "Audit logs", desc: "Immutable, 12-month retention", status: "8.2M events", ok: true },
  ];
  return (
    <RevealStagger stagger={0.05} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {layers.map((l) => (
        <RevealItem key={l.title}>
          <div className="h-full rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <l.icon className="h-4 w-4" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                active
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-foreground">{l.title}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">{l.desc}</p>
            <div className="mt-3 rounded-md bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground/70 tabular-nums">{l.status}</div>
          </div>
        </RevealItem>
      ))}
    </RevealStagger>
  );
}

/* ─────────── Roles ─────────── */
// Permission resources grouped by category for the role editor.
const PERMISSION_GROUPS: { category: string; resources: string[] }[] = [
  { category: "Users", resources: ["user"] },
  { category: "Orders", resources: ["order"] },
  { category: "Services", resources: ["service", "provider"] },
  { category: "Payments", resources: ["wallet", "payment_method", "refund"] },
  { category: "Settings", resources: ["setting", "currency", "language"] },
  { category: "Admin", resources: ["license", "api_key", "notification", "ticket", "webhook", "coupon"] },
];
const PERMISSION_ACTIONS = ["read", "create", "update", "delete", "approve"];

function AdminRoles() {
  const { data } = useAdminRoles();
  const deleteRole = useDeleteRole();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const roles = data?.roles ?? [];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Roles & Permissions · {roles.length}</div>
            <div className="text-xs text-muted-foreground">Granular access control per resource and action</div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Create role
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {roles.map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-background p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-9 w-1.5 rounded-full" style={{ background: r.color }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold capitalize text-foreground">{r.name}</span>
                      {r.isSystem && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">SYSTEM</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{r.description}</div>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {r.userCount} users
                </span>
              </div>
              {/* Permissions grid */}
              <div className="mt-3 flex flex-wrap gap-1">
                {r.permissions?.map((p: any) => (
                  <span key={p.resource} className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                    <span className="text-muted-foreground">{p.resource}:</span>
                    {p.actions}
                  </span>
                ))}
                {(!r.permissions || r.permissions.length === 0) && (
                  <span className="text-[10px] text-muted-foreground">No specific permissions (inherits all)</span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setEditing(r)}
                  className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Pencil className="mr-1 inline h-3 w-3" /> Edit
                </button>
                {!r.isSystem && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete role "${r.name}"? This will remove all permissions assigned to this role. Users with this role will lose their permissions.`)) {
                        deleteRole.mutate(r.id);
                      }
                    }}
                    className="flex-1 rounded-lg border border-red-500/30 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/5"
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {roles.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No roles yet — click “Create role” to define one.
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <RoleModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={async (d) => {
            // Create role then update permissions in second call if any were chosen.
            const res: any = await createRole.mutateAsync({
              name: d.name,
              description: d.description,
              color: d.color,
            });
            if (d.permissions.length > 0 && res?.role?.id) {
              await updateRole.mutateAsync({ roleId: res.role.id, permissions: d.permissions });
            }
            setShowCreate(false);
          }}
          loading={createRole.isPending || updateRole.isPending}
        />
      )}

      {editing && (
        <RoleModal
          mode="edit"
          role={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (d) => {
            await updateRole.mutateAsync({
              id: editing.id,
              description: d.description,
              color: d.color,
              permissions: d.permissions,
              roleId: editing.id,
            } as any);
            setEditing(null);
          }}
          loading={updateRole.isPending}
        />
      )}
    </Reveal>
  );
}

/**
 * Role create/edit modal.
 * - Create: name + description + color + permission checkboxes
 * - Edit: description + color + permission checkboxes (name is locked for system roles)
 * The PATCH /api/admin/roles route accepts both { id, description, color } and
 * { roleId, permissions[] }; we send both shapes and let the server pick the right branch.
 */
function RoleModal({
  mode,
  role,
  onClose,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  role?: any;
  onClose: () => void;
  onSubmit: (d: { name: string; description: string; color: string; permissions: { resource: string; actions: string }[] }) => Promise<void>;
  loading?: boolean;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [color, setColor] = useState(role?.color ?? "#64748b");
  // Build a flat map of resource -> Set<action> for fast toggling.
  const initialPerms: Record<string, Set<string>> = {};
  PERMISSION_GROUPS.forEach((g) => g.resources.forEach((r) => (initialPerms[r] = new Set())));
  if (role?.permissions) {
    role.permissions.forEach((p: any) => {
      if (!initialPerms[p.resource]) initialPerms[p.resource] = new Set();
      p.actions.split(",").forEach((a: string) => initialPerms[p.resource].add(a.trim()));
    });
  }
  const [perms, setPerms] = useState<Record<string, Set<string>>>(() => {
    // Deep clone to avoid mutating the source
    const clone: Record<string, Set<string>> = {};
    Object.keys(initialPerms).forEach((k) => (clone[k] = new Set(initialPerms[k])));
    return clone;
  });

  const toggle = (resource: string, action: string) => {
    setPerms((prev) => {
      const next: Record<string, Set<string>> = {};
      Object.keys(prev).forEach((k) => (next[k] = new Set(prev[k])));
      if (next[resource].has(action)) next[resource].delete(action);
      else next[resource].add(action);
      return next;
    });
  };

  const submit = async () => {
    if (mode === "create" && !name.trim()) return;
    const permissionList = Object.entries(perms)
      .filter(([, actions]) => actions.size > 0)
      .map(([resource, actions]) => ({ resource, actions: Array.from(actions).join(",") }));
    await onSubmit({ name: name.trim().toLowerCase(), description, color, permissions: permissionList });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll">
        <div className="text-base font-semibold">{mode === "create" ? "Create role" : `Edit · ${role?.name}`}</div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Name (lowercase)" value={name} onChange={setName} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 rounded-lg border border-border bg-background p-1"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
          </label>
        </div>
        <div className="mt-3">
          <Input label="Description" value={description} onChange={setDescription} />
        </div>

        <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissions</div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.category} className="rounded-xl border border-border/60 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground">{group.category}</div>
              <div className="flex flex-col gap-2">
                {group.resources.map((resource) => (
                  <div key={resource} className="rounded-lg bg-muted/30 px-2 py-1.5">
                    <div className="mb-1 font-mono text-[10px] text-muted-foreground">{resource}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PERMISSION_ACTIONS.map((action) => {
                        const checked = perms[resource]?.has(action) ?? false;
                        return (
                          <label
                            key={action}
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
                              checked ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(resource, action)}
                              className="h-3 w-3 rounded border-border"
                            />
                            {action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={submit} disabled={loading || (mode === "create" && !name.trim())} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Saving…" : mode === "create" ? "Create role" : "Save changes"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

/* ─────────── Withdrawals ─────────── */
function AdminWithdrawals() {
  const { data } = useAdminWithdrawals("pending");
  const processWd = useProcessWithdrawal();
  const withdrawals = data?.withdrawals ?? [];

  return (
    <Reveal blur>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="text-base font-semibold">Pending withdrawals · {withdrawals.length}</div>
          <div className="text-xs text-muted-foreground">Approve or reject user withdrawal requests</div>
        </div>
        <div className="overflow-x-auto nov-scroll">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Txn</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">User</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Destination</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Date</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {withdrawals.map((w: any) => (
                <tr key={w.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{w.publicId}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{w.user?.name}</div>
                    <div className="text-[11px] text-muted-foreground">{w.user?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{w.description}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">${Math.abs(w.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => processWd.mutate({ id: w.id, action: "approve" })}
                        className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => processWd.mutate({ id: w.id, action: "reject" })}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/20"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No pending withdrawals
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Reveal>
  );
}

/* ─────────── API Keys ─────────── */
function AdminApiKeys() {
  const { data } = useAdminApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const updateIp = useUpdateApiKeyIpAllowlist();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ userId: "", name: "", permissions: "read,order", ipAllowlist: "" });
  const [editingIp, setEditingIp] = useState<{ id: string; value: string } | null>(null);
  const keys = data?.apiKeys ?? [];

  const handleCreate = async () => {
    const res: any = await createKey.mutateAsync(form);
    if (res?.key) {
      setNewKey(res.key);
      setShowCreate(false);
      setForm({ userId: "", name: "", permissions: "read,order", ipAllowlist: "" });
    }
  };

  const handleSaveIp = async () => {
    if (!editingIp) return;
    await updateIp.mutateAsync({ id: editingIp.id, action: "update_ip", ipAllowlist: editingIp.value });
    setEditingIp(null);
  };

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">API Keys · {keys.length}</div>
            <div className="text-xs text-muted-foreground">Reseller integration keys — shown once at creation</div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Generate key
          </button>
        </div>

        {newKey && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> API key created — copy it now!
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-background px-3 py-2 font-mono text-xs text-foreground break-all">
                {newKey}
              </code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(newKey);
                  } catch {
                    // Clipboard API may be blocked (permissions, non-HTTPS,
                    // etc.) — user can still select the code above and copy
                    // manually.
                  }
                }}
                className="rounded-lg bg-background p-2 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Public ID</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">User</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Permissions</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">IP Allowlist</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Last used</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {keys.map((k: any) => (
                  <tr key={k.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.publicId}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{k.user?.email}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{k.permissions}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {k.ipAllowlist ? (
                        <span className="font-mono text-[11px]">{k.ipAllowlist}</span>
                      ) : (
                        <span className="text-muted-foreground/60">Any IP</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", k.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700")}>
                        {k.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {k.status === "active" && (
                          <>
                            <button
                              onClick={() => setEditingIp({ id: k.id, value: k.ipAllowlist ?? "" })}
                              className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-500/20"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => revokeKey.mutate({ id: k.id, action: "revoke" })}
                              className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-500/20"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No API keys yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
            <div className="text-base font-semibold">Generate API key</div>
            <div className="mt-4 flex flex-col gap-3">
              <Input label="User ID" value={form.userId} onChange={(v) => setForm({ ...form, userId: v })} />
              <Input label="Key name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Input label="Permissions (comma-separated)" value={form.permissions} onChange={(v) => setForm({ ...form, permissions: v })} />
              <Input label="IP Allowlist (comma-separated, optional)" value={form.ipAllowlist} onChange={(v) => setForm({ ...form, ipAllowlist: v })} />
              <p className="text-[11px] text-muted-foreground">
                Restrict this key to specific IPs. Leave empty to allow any IP.
              </p>
            </div>
            <button onClick={handleCreate} disabled={createKey.isPending || !form.userId || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {createKey.isPending ? "Generating…" : "Generate key"}
            </button>
            <button onClick={() => setShowCreate(false)} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {editingIp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setEditingIp(null)}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
            <div className="text-base font-semibold">Edit IP Allowlist</div>
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated list of allowed IPs. Leave empty to allow any IP.</p>
            <div className="mt-4 flex flex-col gap-3">
              <Input label="Allowed IPs" value={editingIp.value} onChange={(v) => setEditingIp({ ...editingIp, value: v })} />
            </div>
            <button onClick={handleSaveIp} disabled={updateIp.isPending} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {updateIp.isPending ? "Saving…" : "Save allowlist"}
            </button>
            <button onClick={() => setEditingIp(null)} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </Reveal>
  );
}

/* ─────────── Licenses ─────────── */
function AdminLicenses() {
  const { data } = useAdminLicenses();
  const createLic = useCreateLicense();
  const updateLic = useUpdateLicense();
  const [showCreate, setShowCreate] = useState(false);
  const [newLicense, setNewLicense] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: "", customerEmail: "", plan: "reseller", domain: "", maxUsers: 1, maxOrders: 10000,
  });
  const licenses = data?.licenses ?? [];

  const handleCreate = async () => {
    const res: any = await createLic.mutateAsync(form);
    if (res?.license?.licenseKey) {
      setNewLicense(res.license.licenseKey);
      setShowCreate(false);
      setForm({ customerName: "", customerEmail: "", plan: "reseller", domain: "", maxUsers: 1, maxOrders: 10000 });
    }
  };

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Licenses · {licenses.length}</div>
            <div className="text-xs text-muted-foreground">Panel rental/sale system — anti-replication</div>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Issue license
          </button>
        </div>

        {newLicense && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> License issued — copy the key now!
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-background px-3 py-2 font-mono text-sm font-bold text-foreground">{newLicense}</code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(newLicense);
                  } catch {
                    // Clipboard API may be blocked — user can still select
                    // the code above and copy manually.
                  }
                }}
                className="rounded-lg bg-background p-2 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button onClick={() => setNewLicense(null)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">License key</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Plan</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Domain</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Expires</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {licenses.map((l: any) => (
                  <tr key={l.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{l.licenseKey}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{l.customerName}</div>
                      <div className="text-[11px] text-muted-foreground">{l.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium capitalize text-primary">{l.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.domain ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", l.status === "active" ? "bg-emerald-500/10 text-emerald-700" : l.status === "suspended" ? "bg-amber-500/10 text-amber-700" : "bg-red-500/10 text-red-700")}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {l.status === "active" ? (
                        <button onClick={() => updateLic.mutate({ id: l.id, action: "suspend" })} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-500/20">Suspend</button>
                      ) : (
                        <button onClick={() => updateLic.mutate({ id: l.id, action: "activate" })} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
                {licenses.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No licenses issued yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
            <div className="text-base font-semibold">Issue new license</div>
            <div className="mt-4 flex flex-col gap-3">
              <Input label="Customer name" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
              <Input label="Customer email" value={form.customerEmail} onChange={(v) => setForm({ ...form, customerEmail: v })} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Plan</span>
                <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="reseller">Reseller</option>
                  <option value="agency">Agency</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="white_label">White Label</option>
                </select>
              </label>
              <Input label="Domain (optional)" value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Max users" type="number" value={String(form.maxUsers)} onChange={(v) => setForm({ ...form, maxUsers: Number(v) })} />
                <Input label="Max orders" type="number" value={String(form.maxOrders)} onChange={(v) => setForm({ ...form, maxOrders: Number(v) })} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={createLic.isPending || !form.customerName || !form.customerEmail} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {createLic.isPending ? "Issuing…" : "Issue license"}
            </button>
            <button onClick={() => setShowCreate(false)} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </Reveal>
  );
}

/* ─────────── Currencies ─────────── */
function AdminCurrencies() {
  const { data } = useAdminCurrencies();
  const createCur = useCreateCurrency();
  const updateCur = useUpdateCurrency();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", symbol: "$", rate: 1.0 });
  const currencies = data?.currencies ?? [];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Currencies · {currencies.length}</div>
            <div className="text-xs text-muted-foreground">Manage available currencies + exchange rates</div>
          </div>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Add currency
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Code</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Name</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Symbol</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Rate (vs USD)</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {currencies.map((c: any) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">{c.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-lg">{c.symbol}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{c.rate.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", c.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => updateCur.mutate({ id: c.id, status: c.status === "active" ? "disabled" : "active" })}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      {c.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
            <div className="text-base font-semibold">Add currency</div>
            <div className="mt-4 flex flex-col gap-3">
              <Input label="Code (e.g. USD)" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} />
              <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Symbol" value={form.symbol} onChange={(v) => setForm({ ...form, symbol: v })} />
                <Input label="Rate vs USD" type="number" value={String(form.rate)} onChange={(v) => setForm({ ...form, rate: Number(v) })} />
              </div>
            </div>
            <button onClick={async () => { await createCur.mutateAsync(form); setShowAdd(false); setForm({ code: "", name: "", symbol: "$", rate: 1.0 }); }} disabled={!form.code || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              Add currency
            </button>
            <button onClick={() => setShowAdd(false)} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </Reveal>
  );
}

/* ─────────── Languages ─────────── */
function AdminLanguages() {
  const { data } = useAdminLanguages();
  const createLang = useCreateLanguage();
  const updateLang = useUpdateLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", nativeName: "", flag: "🌍" });
  const languages = data?.languages ?? [];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Languages · {languages.length}</div>
            <div className="text-xs text-muted-foreground">Manage available UI languages</div>
          </div>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Add language
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Flag</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Code</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Name</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Native</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {languages.map((l: any) => (
                <tr key={l.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 text-xl">{l.flag}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">{l.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.nativeName}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", l.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => updateLang.mutate({ id: l.id, status: l.status === "active" ? "disabled" : "active" })} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                      {l.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
            <div className="text-base font-semibold">Add language</div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Code (e.g. en)" value={form.code} onChange={(v) => setForm({ ...form, code: v.toLowerCase() })} />
                <Input label="Flag emoji" value={form.flag} onChange={(v) => setForm({ ...form, flag: v })} />
              </div>
              <Input label="Name (English)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Input label="Native name" value={form.nativeName} onChange={(v) => setForm({ ...form, nativeName: v })} />
            </div>
            <button onClick={async () => { await createLang.mutateAsync(form); setShowAdd(false); setForm({ code: "", name: "", nativeName: "", flag: "🌍" }); }} disabled={!form.code || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              Add language
            </button>
            <button onClick={() => setShowAdd(false)} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}
    </Reveal>
  );
}

/* ─────────── Webhooks ─────────── */
function AdminWebhooks() {
  const { data } = useAdminWebhooks();
  const webhooks = data?.webhooks ?? [];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-base font-semibold">Webhook logs · {webhooks.length}</div>
          <div className="text-xs text-muted-foreground">Payment provider webhook delivery history</div>
        </div>
        {/* ADMIN-FIX-BATCH-1: clarify scope — outbound webhooks (notifications
            sent to child panels) are managed via the /api/admin/webhooks/outbound
            API and are not yet surfaced here. */}
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-xs text-foreground/80">
          <strong>Inbound webhook logs</strong> from payment providers. Outbound webhooks (notifications sent to child panels) are managed via the API at{" "}
          <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px]">/api/admin/webhooks/outbound</code>.
        </div>
        <div className="grid grid-cols-1 gap-3">
          {webhooks.map((w: any) => (
            <div key={w.id} className="rounded-2xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg capitalize", w.provider === "stripe" ? "bg-violet-500/10 text-violet-700" : w.provider === "mercadopago" ? "bg-cyan-500/10 text-cyan-700" : "bg-muted text-muted-foreground")}>
                    <Webhook className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{w.provider} · {w.eventType}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", w.status === "processed" ? "bg-emerald-500/10 text-emerald-700" : w.status === "failed" ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-700")}>
                  {w.status}
                </span>
              </div>
              {w.error && <div className="mt-2 rounded-lg bg-red-500/5 px-3 py-1.5 text-xs text-red-600">{w.error}</div>}
            </div>
          ))}
          {webhooks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No webhooks received yet
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

/* ─────────── Settings ─────────── */
function AdminSettingsTab() {
  const { data } = useAdminSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<Record<string, string>>({});

  // ADMIN-FIX-BATCH-2: the list of editable keys used to be hardcoded — that
  // meant any Setting row added later (by the admin via the API, by the
  // social-auth flow, or by a future seed migration) was invisible in the UI.
  // The Setting model only has `key` + `value` (no category/type/description),
  // so we:
  //   1. Render every key the API returns.
  //   2. Group by the prefix before the first "." (platform, fees, limits,
  //      security, oauth, ...) for visual organisation.
  //   3. Use a `number` input when the stored value parses as a finite number
  //      (handles limits.* / fees.* / security.rateLimitPerMinute correctly),
  //      otherwise text. Encrypted `oauth:*` rows show their raw encrypted
  //      blob — read-only, since editing ciphertext would corrupt the creds.
  //   4. Send only changed values via the existing PATCH (preserves the
  //      "save only what changed" behaviour).
  const settings = data?.settings ?? {};
  const formValues = Object.keys(form).length > 0 ? { ...settings, ...form } : settings;

  const handleSave = () => {
    const changes: Record<string, string> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (settings[k] !== v) changes[k] = v;
    });
    if (Object.keys(changes).length > 0) {
      updateSettings.mutate(changes);
    }
  };

  // Group settings by prefix (the segment before the first ".").
  // Keys without a dot land in a "General" bucket so nothing is hidden.
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; value: string }[]>();
    const orderedKeys = Object.keys(settings).sort();
    for (const key of orderedKeys) {
      const prefix = key.includes(".") ? key.split(".")[0] : "General";
      if (!map.has(prefix)) map.set(prefix, []);
      map.get(prefix)!.push({ key, value: settings[key] });
    }
    // Sort groups: General last (it usually only catches stragglers).
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "General") return 1;
      if (b[0] === "General") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [settings]);

  const isNumeric = (v: string) => v !== "" && v !== "-" && Number.isFinite(Number(v));
  const isEncrypted = (k: string) => k.startsWith("oauth:") || k.startsWith("payments:");

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-base font-semibold">Platform settings</div>
          <div className="text-xs text-muted-foreground">
            All platform settings ({Object.keys(settings).length} keys) — grouped by category.
            Numeric values use a number input; encrypted credential blobs are read-only.
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {groups.length === 0 && (
            <div className="rounded-2xl border border-border/60 bg-background p-6 text-sm text-muted-foreground">
              No settings found.
            </div>
          )}
          {groups.map(([group, items]) => (
            <div key={group} className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold capitalize text-foreground">{group}</div>
                <div className="text-[11px] text-muted-foreground">{items.length} setting{items.length === 1 ? "" : "s"}</div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {items.map((s) => {
                  const numeric = isNumeric(s.value);
                  const encrypted = isEncrypted(s.key);
                  return (
                    <div key={s.key}>
                      {encrypted ? (
                        // Read-only encrypted credential blob — never editable
                        // from this panel (use the dedicated Social Auth /
                        // Payments tabs). Displaying it lets the admin verify
                        // a value exists.
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-muted-foreground">{s.key}</span>
                          <input
                            type="text"
                            value={formValues[s.key] ?? ""}
                            readOnly
                            placeholder="(not set)"
                            className="h-10 w-full cursor-not-allowed rounded-lg border border-dashed border-border bg-muted/40 px-3 font-mono text-xs text-muted-foreground"
                          />
                        </label>
                      ) : (
                        <Input
                          label={s.key}
                          type={numeric ? "number" : "text"}
                          value={formValues[s.key] ?? ""}
                          onChange={(v) => setForm({ ...form, [s.key]: v })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={updateSettings.isPending} className="mt-1 self-start rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {updateSettings.isPending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </Reveal>
  );
}

/* ─────────── Promotions ─────────── */
function AdminPromotions() {
  const { data } = useAdminPromotions();
  const createPromo = useCreatePromotion();
  const updatePromo = useUpdatePromotion();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const promotions = data?.promotions ?? [];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Promotions · {promotions.length}</div>
            <div className="text-xs text-muted-foreground">Discount campaigns across the catalog</div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New promotion
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((p: any) => (
            <div key={p.id} className="rounded-2xl border border-border/60 bg-background p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.description || "—"}</div>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                  p.status === "active" ? "bg-emerald-500/10 text-emerald-700" :
                  p.status === "scheduled" ? "bg-amber-500/10 text-amber-700" :
                  p.status === "ended" ? "bg-muted text-muted-foreground" :
                  "bg-red-500/10 text-red-700")}>
                  {p.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Discount</div>
                  <div className="font-semibold tabular-nums text-primary">{p.discount}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Window</div>
                  <div className="text-[11px] text-foreground">
                    {new Date(p.startsAt).toLocaleDateString()} → {new Date(p.endsAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setEditing(p)}
                  className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Pencil className="mr-1 inline h-3 w-3" /> Edit
                </button>
                {p.status !== "cancelled" && (
                  <button
                    onClick={() => updatePromo.mutate({ id: p.id, status: "cancelled" })}
                    className="flex-1 rounded-lg border border-red-500/30 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/5"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
          {promotions.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No promotions yet — click “New promotion” to start one.
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <PromotionModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={async (d) => { await createPromo.mutateAsync(d); setShowCreate(false); }}
          loading={createPromo.isPending}
        />
      )}
      {editing && (
        <PromotionModal
          mode="edit"
          promotion={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (d) => { await updatePromo.mutateAsync({ id: editing.id, ...d }); setEditing(null); }}
          loading={updatePromo.isPending}
        />
      )}
    </Reveal>
  );
}

/** Unified promotion modal — create or edit. */
function PromotionModal({
  mode,
  promotion,
  onClose,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  promotion?: any;
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
  loading?: boolean;
}) {
  // Convert ISO strings to datetime-local input format (yyyy-MM-ddTHH:mm)
  const toLocal = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    name: promotion?.name ?? "",
    description: promotion?.description ?? "",
    discount: promotion?.discount ?? 10,
    startsAt: toLocal(promotion?.startsAt) ?? toLocal(new Date().toISOString()),
    endsAt: toLocal(promotion?.endsAt) ?? toLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    status: promotion?.status ?? "scheduled",
  });

  const submit = async () => {
    if (!form.name.trim() || !form.startsAt || !form.endsAt) return;
    await onSubmit({
      name: form.name.trim(),
      description: form.description,
      discount: Number(form.discount),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      ...(mode === "edit" ? { status: form.status } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
        <div className="text-base font-semibold">{mode === "create" ? "New promotion" : "Edit promotion"}</div>
        <div className="mt-4 flex flex-col gap-3">
          <Input label="Title" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,82,255,0.12)]"
            />
          </label>
          <Input label="Discount (%)" type="number" value={String(form.discount)} onChange={(v) => setForm({ ...form, discount: Number(v) })} />
          <Input label="Starts at" type="datetime-local" value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} />
          <Input label="Ends at" type="datetime-local" value={form.endsAt} onChange={(v) => setForm({ ...form, endsAt: v })} />
          {mode === "edit" && (
            <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[
              { value: "scheduled", label: "Scheduled" },
              { value: "active", label: "Active" },
              { value: "ended", label: "Ended" },
              { value: "cancelled", label: "Cancelled" },
            ]} />
          )}
        </div>
        <button onClick={submit} disabled={loading || !form.name.trim()} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Saving…" : mode === "create" ? "Create promotion" : "Save changes"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

/* ─────────── Coupons (ADMIN-FIX-BATCH-1) ─────────── */
function AdminCoupons() {
  const { data } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  // Confirmation dialog state for delete
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const coupons = data?.coupons ?? [];

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCoupon.mutateAsync(pendingDelete.id);
    } catch {
      // toast is fired by the hook's onError
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Coupons · {coupons.length}</div>
            <div className="text-xs text-muted-foreground">
              Discount codes redeemed at checkout
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Create coupon
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Code</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Type</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Value</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Usage</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Expires</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {coupons.map((c: any) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-muted/60 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{c.type}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {c.type === "percent" ? `${c.value}%` : `$${c.value.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {c.usedCount} / {c.maxUses}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : c.status === "expired"
                              ? "bg-amber-500/10 text-amber-700"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditing(c)}
                          className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 hover:bg-amber-500/20"
                          aria-label={`Edit ${c.code}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(c)}
                          className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-500/20"
                          aria-label={`Delete ${c.code}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No coupons yet — click “Create coupon” to add the first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <CouponModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={async (d) => {
            await createCoupon.mutateAsync(d);
            setShowCreate(false);
          }}
          loading={createCoupon.isPending}
        />
      )}
      {editing && (
        <CouponModal
          mode="edit"
          coupon={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (d) => {
            await updateCoupon.mutateAsync({ id: editing.id, ...d });
            setEditing(null);
          }}
          loading={updateCoupon.isPending}
        />
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <span className="font-mono font-semibold">{pendingDelete?.code}</span>.
              {pendingDelete && pendingDelete.usedCount > 0 && (
                <> It has been used {pendingDelete.usedCount} time(s) — audit history will be lost. Consider disabling it instead.</>
              )}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteCoupon.isPending ? "Deleting…" : "Delete coupon"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Reveal>
  );
}

/** Coupon create/edit modal — fields mirror the Coupon schema. */
function CouponModal({
  mode,
  coupon,
  onClose,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  coupon?: any;
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
  loading?: boolean;
}) {
  // Convert ISO → yyyy-MM-ddTHH:mm for datetime-local inputs.
  const toLocal = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState({
    code: coupon?.code ?? "",
    type: coupon?.type ?? "percent",
    value: coupon?.value ?? 10,
    maxUses: coupon?.maxUses ?? 100,
    expiresAt: toLocal(coupon?.expiresAt),
    status: coupon?.status ?? "active",
  });

  const submit = async () => {
    if (!form.code.trim() || form.value <= 0) return;
    const payload: Record<string, unknown> = {
      type: form.type,
      value: Number(form.value),
      maxUses: Number(form.maxUses),
      // Empty string → null (no expiry). The PATCH schema accepts both.
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    if (mode === "create") {
      payload.code = form.code.trim().toUpperCase();
    }
    if (mode === "edit") {
      payload.status = form.status;
    }
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
        <div className="text-base font-semibold">{mode === "create" ? "Create coupon" : "Edit coupon"}</div>
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label="Code"
            value={form.code}
            onChange={(v) => setForm({ ...form, code: v.toUpperCase() })}
            // Code is immutable post-create — disable when editing.
            // (Changing it would break already-distributed codes.)
          />
          {form.code && (
            <p className="text-[11px] text-muted-foreground">
              Customers enter this code at checkout to apply the discount.
            </p>
          )}
          <SelectField
            label="Type"
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v })}
            options={[
              { value: "percent", label: "Percentage (% off)" },
              { value: "fixed", label: "Fixed amount ($ off)" },
            ]}
          />
          <Input
            label={form.type === "percent" ? "Value (% off)" : "Value ($ off)"}
            type="number"
            value={String(form.value)}
            onChange={(v) => setForm({ ...form, value: Number(v) })}
          />
          <Input
            label="Max uses"
            type="number"
            value={String(form.maxUses)}
            onChange={(v) => setForm({ ...form, maxUses: Number(v) })}
          />
          <Input
            label="Expires at (leave empty for no expiry)"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(v) => setForm({ ...form, expiresAt: v })}
          />
          {mode === "edit" && (
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={[
                { value: "active", label: "Active" },
                { value: "disabled", label: "Disabled" },
                { value: "expired", label: "Expired" },
              ]}
            />
          )}
        </div>
        <button
          onClick={submit}
          disabled={loading || !form.code.trim() || form.value <= 0}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Saving…" : mode === "create" ? "Create coupon" : "Save changes"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ─────────── Orders (admin) ─────────── */
function AdminOrders() {
  const { data } = useAdminOverview();
  const createOrder = useCreateManualOrder();
  const [showCreate, setShowCreate] = useState(false);
  const orders = data?.recentOrders ?? [];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Orders · {orders.length} recent</div>
            <div className="text-xs text-muted-foreground">All platform orders (joined with user)</div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Create order
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Order</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">User</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Service</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Qty</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Priority</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((o: any) => (
                  <tr key={o.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.publicId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{o.user?.name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{o.user?.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{o.serviceName}</div>
                      <div className="text-[11px] text-muted-foreground">{o.platform}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{o.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">${o.totalPrice.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        o.priority === "highest" ? "bg-violet-500/10 text-violet-700" :
                        o.priority === "priority" ? "bg-blue-500/10 text-blue-700" :
                        "bg-muted text-muted-foreground")}>
                        {o.priority === "highest" && <Zap className="h-2.5 w-2.5" />}
                        {o.priority ?? "standard"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        o.status === "completed" ? "bg-emerald-500/10 text-emerald-700" :
                        o.status === "cancelled" ? "bg-red-500/10 text-red-700" :
                        "bg-amber-500/10 text-amber-700")}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No orders yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateManualOrderModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (d) => { await createOrder.mutateAsync(d); setShowCreate(false); }}
          loading={createOrder.isPending}
        />
      )}
    </Reveal>
  );
}

function CreateManualOrderModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
  loading?: boolean;
}) {
  // U-15 fix: Load more services + add search filter
  const { data: servicesData } = useServices({ limit: 500 });
  const [serviceSearch, setServiceSearch] = useState("");
  const allServices = servicesData?.services ?? [];
  // Client-side filter (search by name or platform)
  const services = serviceSearch.trim()
    ? allServices.filter((s: any) =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.platform.toLowerCase().includes(serviceSearch.toLowerCase())
      ).slice(0, 100)
    : allServices.slice(0, 100);
  const [form, setForm] = useState({
    userId: "",
    serviceId: "",
    quantity: 100,
    link: "",
    notes: "",
  });

  const submit = async () => {
    if (!form.userId.trim() || !form.serviceId) return;
    await onSubmit({
      userId: form.userId.trim(),
      serviceId: form.serviceId,
      quantity: Number(form.quantity),
      link: form.link || undefined,
      // notes aren't accepted by the API, but kept for UI completeness
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
        <div className="text-base font-semibold">Create manual order</div>
        <div className="text-[11px] text-muted-foreground">Admin-created orders are complimentary (no balance debit).</div>
        <div className="mt-4 flex flex-col gap-3">
          <Input label="User ID" value={form.userId} onChange={(v) => setForm({ ...form, userId: v })} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Service</span>
            {/* U-15 fix: Search input to filter 6382 services */}
            <input
              type="text"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="Search services by name or platform…"
              className="mb-2 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,82,255,0.12)]"
            />
            <select
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,82,255,0.12)]"
            >
              <option value="">Select a service…</option>
              {services.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.platform} · {s.name} — ${s.price.toFixed(2)}/1k
                </option>
              ))}
            </select>
          </label>
          <Input label="Quantity" type="number" value={String(form.quantity)} onChange={(v) => setForm({ ...form, quantity: Number(v) })} />
          <Input label="Link (optional)" value={form.link} onChange={(v) => setForm({ ...form, link: v })} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Notes (internal)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Optional context for this manual order…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,82,255,0.12)]"
            />
          </label>
        </div>
        <button onClick={submit} disabled={loading || !form.userId.trim() || !form.serviceId} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Creating…" : "Create order"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

/* ─────────── Refunds ─────────── */
function AdminRefunds() {
  const { data } = useAdminOverview();
  const refund = useRefund();
  const [confirming, setConfirming] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  // ADMIN-FIX-BATCH-2: only `topup` and `sale` transactions are refundable
  // from this panel. Withdrawals/referrals/fees/release/hold/held can't be
  // reversed here — they need different (or no) flows. The overview endpoint
  // already returns `status: "completed"` rows, so the only extra filter is
  // on `type`.
  const allTransactions = data?.recentTransactions ?? [];
  const refundable = allTransactions.filter(
    (t: any) => ["topup", "sale"].includes(t.type) && t.status === "completed"
  );

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-base font-semibold">Refunds · {refundable.length} refundable transactions</div>
          <div className="text-xs text-muted-foreground">Issue a refund for any completed top-up or sale</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-800">
          Showing refundable transactions only (top-ups and sales). Withdrawals, referral bonuses, fees, and existing refunds are excluded.
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Txn</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">User</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Type</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Method</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {refundable.map((t: any) => (
                  <tr key={t.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.publicId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{t.user?.name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{t.user?.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{t.type}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", t.amount >= 0 ? "text-emerald-600" : "text-foreground")}>
                      ${Math.abs(t.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{t.method ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setConfirming(t); setReason(""); }}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/20"
                      >
                        Refund
                      </button>
                    </td>
                  </tr>
                ))}
                {refundable.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No refundable transactions</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirming && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setConfirming(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refund this transaction?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to refund <span className="font-semibold text-foreground">${Math.abs(confirming.amount).toFixed(2)}</span> for transaction{" "}
                <span className="font-mono text-foreground">{confirming.publicId}</span> ({confirming.user?.email}).
                {confirming.method === "stripe" && confirming.reference?.startsWith("pi_") && (
                  <span className="mt-1 block">A real Stripe refund will be issued.</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Reason (optional)</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer request / duplicate / fraud…"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,82,255,0.12)]"
              />
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  refund.mutate({ transactionId: confirming.id, reason: reason || undefined });
                  setConfirming(null);
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Confirm refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Reveal>
  );
}

/* ─────────── Social Auth ─────────── */
// ADMIN-FIX-BATCH-2: previously this panel only handled Google. It now
// renders a card per supported OAuth provider (google, facebook, github,
// twitter), each with its own enable/disable toggle, Client ID + Secret
// inputs, and a read-only redirect URL.
type SocialAuthProvider = "google" | "facebook" | "github" | "twitter";

const SOCIAL_PROVIDERS: {
  id: SocialAuthProvider;
  label: string;
  redirectUrl: string;
  glyph: React.ReactNode;
  idPlaceholder: string;
  secretPlaceholder: string;
}[] = [
  {
    id: "google",
    label: "Google",
    redirectUrl: "https://novsmm.shop/api/auth/callback/google",
    idPlaceholder: "xxxxxxxxxx.apps.googleusercontent.com",
    secretPlaceholder: "GOCSPX-xxxxxxxxxxxxx",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z" />
        <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8L6 14.4z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.4L6 10.2c.9-2.6 3.2-4.8 6-4.8z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    redirectUrl: "https://novsmm.shop/api/auth/callback/facebook",
    idPlaceholder: "1234567890123456 (App ID)",
    secretPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (App Secret)",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6 4.39 10.97 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.04 24 18.07 24 12.07z" />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    redirectUrl: "https://novsmm.shop/api/auth/callback/github",
    idPlaceholder: "Iv1.1234567890abcdef (Client ID)",
    secretPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Client Secret)",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#181717" d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.21.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
      </svg>
    ),
  },
  {
    id: "twitter",
    label: "Twitter / X",
    redirectUrl: "https://novsmm.shop/api/auth/callback/twitter",
    idPlaceholder: "YTVk... (API Key / Client ID)",
    secretPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxx (API Secret / Client Secret)",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="#000" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
      </svg>
    ),
  },
];

function AdminSocialAuth() {
  const { toast } = useToast();
  // Per-provider form state.
  const [creds, setCreds] = useState<
    Record<SocialAuthProvider, { clientId: string; clientSecret: string }>
  >({
    google: { clientId: "", clientSecret: "" },
    facebook: { clientId: "", clientSecret: "" },
    github: { clientId: "", clientSecret: "" },
    twitter: { clientId: "", clientSecret: "" },
  });
  const [statuses, setStatuses] = useState<
    Record<SocialAuthProvider, { configured: boolean; source: "db" | "env" | null }>
  >({
    google: { configured: false, source: null },
    facebook: { configured: false, source: null },
    github: { configured: false, source: null },
    twitter: { configured: false, source: null },
  });
  const [savingProvider, setSavingProvider] = useState<SocialAuthProvider | null>(null);
  const [removingProvider, setRemovingProvider] = useState<SocialAuthProvider | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<SocialAuthProvider | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social-auth");
      if (res.ok) {
        const data = await res.json();
        setStatuses({
          google: data.google ?? { configured: false, source: null },
          facebook: data.facebook ?? { configured: false, source: null },
          github: data.github ?? { configured: false, source: null },
          twitter: data.twitter ?? { configured: false, source: null },
        });
      }
    } catch {
      // Network error — leave status as-is.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (provider: SocialAuthProvider) => {
    const { clientId, clientSecret } = creds[provider];
    if (!clientId || !clientSecret) {
      toast({
        title: "Missing credentials",
        description: "Both Client ID and Client Secret are required.",
        variant: "destructive",
      });
      return;
    }
    setSavingProvider(provider);
    try {
      const res = await fetch("/api/admin/social-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, clientId, clientSecret }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error("Session expired. Please log out and log back in.");
        }
        throw new Error(data.error || `Failed to save (HTTP ${res.status})`);
      }
      toast({
        title: `${SOCIAL_PROVIDERS.find((p) => p.id === provider)!.label} credentials saved`,
        description: "OAuth provider updated successfully.",
      });
      setCreds((c) => ({ ...c, [provider]: { clientId: "", clientSecret: "" } }));
      await refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setSavingProvider(null);
  };

  const handleRemove = async (provider: SocialAuthProvider) => {
    setRemovingProvider(provider);
    setConfirmRemove(null);
    try {
      const res = await fetch("/api/admin/social-auth", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to disable (HTTP ${res.status})`);
      }
      toast({
        title: `${SOCIAL_PROVIDERS.find((p) => p.id === provider)!.label} disabled`,
        description: "Stored credentials have been removed.",
      });
      setCreds((c) => ({ ...c, [provider]: { clientId: "", clientSecret: "" } }));
      await refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setRemovingProvider(null);
  };

  return (
    <Reveal>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Social Authentication</h2>
          <p className="text-sm text-muted-foreground">
            Configure OAuth providers for login. Credentials are encrypted with AES-256-GCM
            and stored per-provider in the Setting table.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SOCIAL_PROVIDERS.map((p) => {
            const status = statuses[p.id];
            const isEnv = status.source === "env";
            return (
              <div key={p.id} className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/50">
                      {p.glyph}
                    </div>
                    <div>
                      <div className="font-semibold">{p.label} OAuth</div>
                      <div className="text-xs text-muted-foreground">
                        {status.configured
                          ? `✅ Configured${isEnv ? " (via env var)" : ""} — users can sign in with ${p.label}`
                          : `Not configured — users can only use email/password`}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      status.configured
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {status.configured ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {p.label} Client ID
                    </label>
                    <input
                      type="text"
                      value={creds[p.id].clientId}
                      onChange={(e) =>
                        setCreds((c) => ({
                          ...c,
                          [p.id]: { ...c[p.id], clientId: e.target.value },
                        }))
                      }
                      placeholder={p.idPlaceholder}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      {p.label} Client Secret
                    </label>
                    <input
                      type="password"
                      value={creds[p.id].clientSecret}
                      onChange={(e) =>
                        setCreds((c) => ({
                          ...c,
                          [p.id]: { ...c[p.id], clientSecret: e.target.value },
                        }))
                      }
                      placeholder={p.secretPlaceholder}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Redirect URL (read-only)
                    </label>
                    <div className="flex h-10 items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-3">
                      <code className="flex-1 truncate font-mono text-[11px] text-muted-foreground">
                        {p.redirectUrl}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(p.redirectUrl);
                            toast({ title: "Redirect URL copied" });
                          } catch {
                            // Clipboard blocked — user can select manually.
                          }
                        }}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
                        aria-label={`Copy ${p.label} redirect URL`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => handleSave(p.id)}
                      disabled={
                        savingProvider === p.id ||
                        (!creds[p.id].clientId && !creds[p.id].clientSecret)
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {savingProvider === p.id
                        ? "Saving..."
                        : status.configured
                        ? "Update credentials"
                        : "Save & enable"}
                    </button>
                    {status.configured && (
                      <button
                        onClick={() => setConfirmRemove(p.id)}
                        disabled={removingProvider === p.id || isEnv}
                        title={
                          isEnv
                            ? "Configured via environment variable — remove the env var to disable."
                            : "Remove stored credentials"
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/5 px-4 text-sm font-medium text-red-700 disabled:opacity-50"
                      >
                        {removingProvider === p.id ? "Removing…" : "Disable"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
                  <strong>Setup:</strong> create an OAuth app at the provider&rsquo;s developer
                  console, add <code className="font-mono">{p.redirectUrl}</code> as an authorized
                  redirect URI, then paste the Client ID + Secret above.
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirmRemove && (
        <AlertDialog
          open
          onOpenChange={(o) => {
            if (!o) setConfirmRemove(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Disable {SOCIAL_PROVIDERS.find((p) => p.id === confirmRemove)!.label} sign-in?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This deletes the stored credentials. Users currently signed in via this provider
                will keep their session, but new sign-in attempts will fail until you re-configure
                it. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleRemove(confirmRemove)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Disable provider
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Reveal>
  );
}

/* ─────────── Version ─────────── */
function AdminVersion() {
  const { toast } = useToast();
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/version");
        if (res.ok) {
          const data = await res.json();
          setCurrent(data);
        }
      } catch {}
    })();
  }, []);

  const handlePublish = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, notes }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      toast({ title: "Version published", description: `v${version} is now live.` });
      setVersion("");
      setNotes("");
      const updated = await res.json();
      setCurrent(updated);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Reveal>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Version Announcements</h2>
          <p className="text-sm text-muted-foreground">
            Publish version announcements that users see as a dismissible banner.
          </p>
        </div>

        {current && (
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <div className="text-sm font-medium">Current: v{current.version}</div>
            {current.notes && <div className="mt-1 text-sm text-muted-foreground">{current.notes}</div>}
            <div className="mt-1 text-xs text-muted-foreground">
              Published: {new Date(current.publishedAt).toLocaleDateString()}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-background p-6">
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Version number
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.2.0"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Release notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's new in this version..."
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handlePublish}
              disabled={loading || !version}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Publishing..." : "Publish version"}
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ─────────── Email Templates Editor ─────────── */
function AdminEmailTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (e: any) {
      toast({
        title: "Failed to load templates",
        description: e?.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (t: any) => {
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, isActive: !t.isActive }),
      });
      if (!res.ok) throw new Error("Update failed");
      await load();
      toast({
        title: t.isActive ? "Template deactivated" : "Template activated",
        description: t.name,
      });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">Email Templates · {templates.length}</div>
            <div className="text-xs text-muted-foreground">
              Editable email templates with <code className="rounded bg-muted px-1">{"{{variable}}"}</code> interpolation
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New template
          </button>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
            <div className="overflow-x-auto nov-scroll">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Name</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Key</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Subject</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {templates.map((t: any) => (
                    <tr key={t.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">{t.key}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          t.isActive
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            t.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                          )} />
                          {t.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn icon={Pencil} onClick={() => setEditing(t)} />
                          <button
                            onClick={() => toggleActive(t)}
                            className="rounded-lg border border-border px-2.5 py-1 text-[10px] font-medium text-foreground hover:bg-muted"
                          >
                            {t.isActive ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No email templates yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EmailTemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {showCreate && (
        <EmailTemplateEditor
          template={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </Reveal>
  );
}

function EmailTemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!template;
  const [form, setForm] = useState({
    key: template?.key ?? "",
    name: template?.name ?? "",
    subject: template?.subject ?? "",
    body: template?.body ?? "",
    isActive: template?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const sampleVars: Record<string, string> = {
    name: "Alex",
    orderId: "A-10432",
    serviceName: "Instagram followers (HQ)",
    quantity: "1000",
    total: "9.99",
    ticketId: "T-201",
    ticketSubject: "Order delay",
    replyText: "Hi, your order is now in progress.",
    balance: "12.50",
    amount: "5.00",
    referredName: "Jordan",
  };

  const previewSubject = useMemo(
    () => form.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => sampleVars[k] ?? ""),
    [form.subject]
  );
  const previewBody = useMemo(
    () => form.body.replace(/\{\{(\w+)\}\}/g, (_, k) => sampleVars[k] ?? ""),
    [form.body]
  );

  const handleSave = async () => {
    if (!form.key || !form.name || !form.subject || !form.body) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = isEdit
        ? "/api/admin/email-templates"
        : "/api/admin/email-templates";
      const body = isEdit
        ? { id: template.id, name: form.name, subject: form.subject, body: form.body, isActive: form.isActive }
        : { key: form.key, name: form.name, subject: form.subject, body: form.body, isActive: form.isActive };
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Save failed");
      }
      toast({ title: isEdit ? "Template updated" : "Template created" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {isEdit ? "Edit template" : "New email template"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Use <code className="rounded bg-muted px-1">{"{{variable}}"}</code> placeholders for dynamic content.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Editor */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Template key
              </label>
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                placeholder="e.g. welcome, order_completed"
                disabled={isEdit}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Display name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Welcome Email"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Subject
              </label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Welcome to NOVSMM, {{name}}!"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Body (plaintext, supports {"{{variables}}"})
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={8}
                placeholder="Hi {{name}},&#10;&#10;Welcome to NOVSMM..."
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-border"
              />
              <span>Active (templates that are inactive won&apos;t be sent)</span>
            </label>
          </div>

          {/* Live preview */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Live preview (sample variables)
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Subject
              </div>
              <div className="mt-1 text-sm font-medium text-foreground break-words">
                {previewSubject || <span className="text-muted-foreground/50">—</span>}
              </div>
              <div className="mt-3 border-t border-border/60 pt-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Body
                </div>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-foreground">
                  {previewBody || <span className="text-muted-foreground/50">—</span>}
                </pre>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Sample variables used: name=Alex, orderId=A-10432, serviceName=Instagram followers (HQ),
              quantity=1000, total=9.99, ticketId=T-201, balance=12.50, amount=5.00, referredName=Jordan
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isEdit ? "Save changes" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── CMS / Blog / FAQ ─────────── */
function AdminCms() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [editing, setEditing] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/cms${typeFilter ? `?type=${typeFilter}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load CMS content");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e: any) {
      toast({
        title: "Failed to load content",
        description: e?.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [typeFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/cms/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Content deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-base font-semibold">CMS / Blog / FAQ · {items.length}</div>
            <div className="text-xs text-muted-foreground">
              Blog posts, FAQ entries, announcements, and static pages.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs"
            >
              <option value="">All types</option>
              <option value="blog_post">Blog posts</option>
              <option value="faq">FAQ</option>
              <option value="announcement">Announcements</option>
              <option value="page">Pages</option>
            </select>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> New content
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
            <div className="overflow-x-auto nov-scroll">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Title</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Type</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Category</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Views</th>
                    <th scope="col" className="px-4 py-3 text-left font-medium">Published</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item: any) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{item.title}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">/{item.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {item.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                          item.status === "published"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : item.status === "archived"
                            ? "bg-muted text-muted-foreground"
                            : "bg-amber-500/10 text-amber-700"
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {(item.views ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn icon={Pencil} onClick={() => setEditing(item)} />
                          <IconBtn icon={Trash2} danger onClick={() => handleDelete(item)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No CMS content yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <CmsEditor
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {showCreate && (
        <CmsEditor
          item={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </Reveal>
  );
}

function CmsEditor({
  item,
  onClose,
  onSaved,
}: {
  item: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!item;
  const [form, setForm] = useState({
    type: item?.type ?? "blog_post",
    slug: item?.slug ?? "",
    title: item?.title ?? "",
    excerpt: item?.excerpt ?? "",
    body: item?.body ?? "",
    category: item?.category ?? "general",
    tags: item?.tags ?? "",
    status: item?.status ?? "draft",
    sortOrder: item?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);

  // Auto-generate slug from title (only when creating or slug is empty)
  useEffect(() => {
    if (!isEdit && form.title && !form.slug) {
      const slug = form.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80);
      setForm((f) => ({ ...f, slug }));
    }
  }, [form.title, isEdit]);

  const handleSave = async () => {
    if (!form.type || !form.title) {
      toast({ title: "Type and title are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/cms/${item.id}` : "/api/admin/cms";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Save failed");
      }
      toast({ title: isEdit ? "Content updated" : "Content created" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">
              {isEdit ? "Edit content" : "New content"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Body supports markdown — rendered on the public site.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="blog_post">Blog post</option>
              <option value="faq">FAQ</option>
              <option value="announcement">Announcement</option>
              <option value="page">Page</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="auto-generated-from-title"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort order (FAQ)</label>
            <input
              type="number"
              value={String(form.sortOrder)}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="guide, beginners"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Excerpt (short summary)</label>
            <input
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="One-line summary shown in cards/lists"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Body (markdown)
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={10}
              placeholder="# Heading&#10;&#10;Write your content in markdown..."
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isEdit ? "Save changes" : "Create content"}
          </button>
        </div>
      </div>
    </div>
  );
}
