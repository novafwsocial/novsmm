"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
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
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import {
  useAdminOverview,
  useAdminUsers,
  useAdminServices,
  useAdminProviders,
  useAdminPaymentMethods,
  useCreateService,
  useCreateProvider,
  useCreatePaymentMethod,
  useBroadcastNotification,
  useUpdateUser,
  useAdminCurrencies,
  useCreateCurrency,
  useUpdateCurrency,
  useAdminLanguages,
  useCreateLanguage,
  useUpdateLanguage,
  useAdminApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useAdminLicenses,
  useCreateLicense,
  useUpdateLicense,
  useAdminWithdrawals,
  useProcessWithdrawal,
  useAdminWebhooks,
  useAdminSettings,
  useUpdateSettings,
} from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const ADMIN_NAV: { id: AdminTab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "users", label: "Users", icon: Users },
  { id: "services", label: "Services", icon: Store },
  { id: "providers", label: "Providers", icon: Server },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { id: "apiKeys", label: "API Keys", icon: FileKey },
  { id: "licenses", label: "Licenses", icon: KeyRound },
  { id: "currencies", label: "Currencies", icon: DollarSign },
  { id: "languages", label: "Languages", icon: Languages },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "security", label: "Security", icon: Lock },
  { id: "roles", label: "Roles", icon: ShieldCheck },
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

      <AnimatePresence mode="wait">
        <motion.div
          key={adminTab}
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {adminTab === "overview" && <AdminOverview />}
          {adminTab === "users" && <AdminUsers />}
          {adminTab === "services" && <AdminServices />}
          {adminTab === "providers" && <AdminProviders />}
          {adminTab === "payments" && <AdminPayments />}
          {adminTab === "withdrawals" && <AdminWithdrawals />}
          {adminTab === "apiKeys" && <AdminApiKeys />}
          {adminTab === "licenses" && <AdminLicenses />}
          {adminTab === "currencies" && <AdminCurrencies />}
          {adminTab === "languages" && <AdminLanguages />}
          {adminTab === "webhooks" && <AdminWebhooks />}
          {adminTab === "settings" && <AdminSettingsTab />}
          {adminTab === "security" && <AdminSecurity />}
          {adminTab === "roles" && <AdminRoles />}
        </motion.div>
      </AnimatePresence>
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
  const users = data?.users ?? [];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search users by name, email, role…" className="w-full bg-transparent focus:outline-none" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-right font-medium">Orders</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u: any) => (
                  <tr key={u.id} className="transition-colors hover:bg-muted/30">
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
                    <td className="px-4 py-3 text-right tabular-nums">${u.balance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{(u._count?.orders ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><UserStatus status={u.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Reveal>
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
  const [showAdd, setShowAdd] = useState(false);
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
                <th className="px-4 py-3 text-left font-medium">Service</th>
                <th className="px-4 py-3 text-left font-medium">Platform</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Min/Max</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Rate</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && <AddServiceModal onClose={() => setShowAdd(false)} onCreate={createService.mutateAsync} />}
    </Reveal>
  );
}

function AddServiceModal({ onClose, onCreate }: { onClose: () => void; onCreate: (d: any) => Promise<any> }) {
  const [form, setForm] = useState({
    name: "", platform: "Instagram", cost: 1, price: 2, minQty: 50, maxQty: 100000, rate: "0/d",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await onCreate(form);
      onClose();
    } catch { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
        <div className="text-base font-semibold">Add service</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Platform" value={form.platform} onChange={(v) => setForm({ ...form, platform: v })} />
          <Input label="Cost" type="number" value={String(form.cost)} onChange={(v) => setForm({ ...form, cost: Number(v) })} />
          <Input label="Price" type="number" value={String(form.price)} onChange={(v) => setForm({ ...form, price: Number(v) })} />
          <Input label="Min qty" type="number" value={String(form.minQty)} onChange={(v) => setForm({ ...form, minQty: Number(v) })} />
          <Input label="Max qty" type="number" value={String(form.maxQty)} onChange={(v) => setForm({ ...form, maxQty: Number(v) })} />
        </div>
        <button onClick={submit} disabled={loading || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Creating…" : "Create service"}
        </button>
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
  const [showAdd, setShowAdd] = useState(false);
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
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", p.status === "healthy" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", p.status === "healthy" ? "bg-emerald-500" : "bg-amber-500")} />
                {p.status}
              </span>
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
      </div>
      {showAdd && (
        <AddProviderModal onClose={() => setShowAdd(false)} onCreate={createProvider.mutateAsync} />
      )}
    </Reveal>
  );
}

function AddProviderModal({ onClose, onCreate }: { onClose: () => void; onCreate: (d: any) => Promise<any> }) {
  const [form, setForm] = useState({ name: "", apiUrl: "https://", apiKey: "" });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try { await onCreate(form); onClose(); } catch { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
        <div className="text-base font-semibold">Add API provider</div>
        <div className="mt-4 flex flex-col gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="API URL" value={form.apiUrl} onChange={(v) => setForm({ ...form, apiUrl: v })} />
          <Input label="API key (optional)" value={form.apiKey} onChange={(v) => setForm({ ...form, apiKey: v })} />
        </div>
        <button onClick={submit} disabled={loading || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Adding…" : "Add provider"}
        </button>
      </div>
    </div>
  );
}

/* ─────────── Payments ─────────── */
function AdminPayments() {
  const { data } = useAdminPaymentMethods();
  const createPm = useCreatePaymentMethod();
  const [showAdd, setShowAdd] = useState(false);
  const methods = data?.methods ?? [];

  return (
    <Reveal blur>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="text-base font-semibold">Payment gateways · {methods.length} configured</div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add method
          </button>
        </div>
        <div className="overflow-x-auto nov-scroll">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Gateway</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Settle</th>
                <th className="px-4 py-3 text-right font-medium">Fee</th>
                <th className="px-4 py-3 text-right font-medium">Currencies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {methods.map((m: any) => (
                <tr key={m.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", m.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", m.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{m.settleTime}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{m.fee}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{m.currencies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && <AddPaymentMethodModal onClose={() => setShowAdd(false)} onCreate={createPm.mutateAsync} />}
    </Reveal>
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
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
function AdminRoles() {
  const { data: usersData } = useAdminUsers();
  const users = usersData?.users ?? [];

  // Count users per role
  const roleCounts: Record<string, number> = {};
  users.forEach((u: any) => {
    roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1;
  });

  const roleInfo: Record<string, { color: string; permissions: string }> = {
    admin: { color: "#0052ff", permissions: "Full platform access" },
    agency: { color: "#10b981", permissions: "Manage creators, orders, analytics" },
    reseller: { color: "#f59e0b", permissions: "Marketplace, own orders, wallet" },
    user: { color: "#64748b", permissions: "Buy services, view own data" },
  };
  const roles = Object.entries(roleCounts).map(([name, count]) => ({
    name,
    count,
    ...roleInfo[name],
  }));

  return (
    <RevealStagger stagger={0.05} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {roles.map((r) => (
        <RevealItem key={r.name}>
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-1.5 rounded-full" style={{ background: r.color }} />
                <div>
                  <div className="text-sm font-semibold capitalize text-foreground">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.permissions}</div>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {r.count.toLocaleString()}
              </span>
            </div>
          </div>
        </RevealItem>
      ))}
    </RevealStagger>
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
                <th className="px-4 py-3 text-left font-medium">Txn</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Destination</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
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
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ userId: "", name: "", permissions: "read,order" });
  const keys = data?.apiKeys ?? [];

  const handleCreate = async () => {
    const res: any = await createKey.mutateAsync(form);
    if (res?.key) {
      setNewKey(res.key);
      setShowCreate(false);
      setForm({ userId: "", name: "", permissions: "read,order" });
    }
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
                onClick={() => { navigator.clipboard.writeText(newKey); }}
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
                  <th className="px-4 py-3 text-left font-medium">Public ID</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Permissions</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Last used</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {keys.map((k: any) => (
                  <tr key={k.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.publicId}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{k.user?.email}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{k.permissions}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", k.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700")}>
                        {k.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {k.status === "active" && (
                        <button
                          onClick={() => revokeKey.mutate({ id: k.id, action: "revoke" })}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-500/20"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {keys.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No API keys yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
            <div className="text-base font-semibold">Generate API key</div>
            <div className="mt-4 flex flex-col gap-3">
              <Input label="User ID" value={form.userId} onChange={(v) => setForm({ ...form, userId: v })} />
              <Input label="Key name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Input label="Permissions (comma-separated)" value={form.permissions} onChange={(v) => setForm({ ...form, permissions: v })} />
            </div>
            <button onClick={handleCreate} disabled={createKey.isPending || !form.userId || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {createKey.isPending ? "Generating…" : "Generate key"}
            </button>
            <button onClick={() => setShowCreate(false)} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
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
              <button onClick={() => navigator.clipboard.writeText(newLicense)} className="rounded-lg bg-background p-2 text-muted-foreground hover:text-foreground">
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
                  <th className="px-4 py-3 text-left font-medium">License key</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-left font-medium">Domain</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Expires</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
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
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Symbol</th>
                <th className="px-4 py-3 text-right font-medium">Rate (vs USD)</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Toggle</th>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
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
                <th className="px-4 py-3 text-left font-medium">Flag</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Native</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Toggle</th>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg">
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

  // Sync form with fetched settings
  const settings = data?.settings ?? {};
  const formValues = Object.keys(form).length > 0 ? form : settings;

  const handleSave = () => {
    // Only send changed values
    const changes: Record<string, string> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (settings[k] !== v) changes[k] = v;
    });
    if (Object.keys(changes).length > 0) {
      updateSettings.mutate(changes);
    }
  };

  const editableKeys = [
    { key: "platform.name", label: "Platform name", type: "text" },
    { key: "platform.whatsapp", label: "WhatsApp number (with country code)", type: "text" },
    { key: "platform.supportEmail", label: "Support email", type: "email" },
    { key: "fees.marketplace", label: "Marketplace fee (0.03 = 3%)", type: "text" },
    { key: "fees.withdrawal", label: "Withdrawal fee (0.01 = 1%)", type: "text" },
    { key: "limits.minTopup", label: "Minimum top-up ($)", type: "number" },
    { key: "limits.maxTopup", label: "Maximum top-up ($)", type: "number" },
    { key: "limits.minWithdrawal", label: "Minimum withdrawal ($)", type: "number" },
    { key: "security.rateLimitPerMinute", label: "Rate limit (req/min per IP)", type: "number" },
  ];

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-base font-semibold">Platform settings</div>
          <div className="text-xs text-muted-foreground">Configure platform, fees, limits, and security</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {editableKeys.map((s) => (
              <Input
                key={s.key}
                label={s.label}
                type={s.type}
                value={formValues[s.key] ?? ""}
                onChange={(v) => setForm({ ...form, [s.key]: v })}
              />
            ))}
          </div>
          <button onClick={handleSave} disabled={updateSettings.isPending} className="mt-5 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {updateSettings.isPending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </Reveal>
  );
}
