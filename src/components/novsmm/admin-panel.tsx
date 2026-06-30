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
} from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const ADMIN_NAV: { id: AdminTab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "users", label: "Users", icon: Users },
  { id: "services", label: "Services", icon: Store },
  { id: "providers", label: "Providers", icon: Server },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "security", label: "Security", icon: Lock },
  { id: "roles", label: "Roles & permissions", icon: KeyRound },
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
  return (
    <RevealStagger stagger={0.05} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {ROLES.map((r) => (
        <RevealItem key={r.name}>
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-1.5 rounded-full" style={{ background: r.color }} />
                <div>
                  <div className="text-sm font-semibold text-foreground">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.permissions}</div>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {r.users.toLocaleString()}
              </span>
            </div>
            <button className="mt-4 w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              Configure permissions
            </button>
          </div>
        </RevealItem>
      ))}
    </RevealStagger>
  );
}
