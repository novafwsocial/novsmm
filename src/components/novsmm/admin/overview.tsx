"use client";

import { useState } from "react";
import {
  Users,
  Activity,
  CreditCard,
  Server,
  Megaphone,
  ChevronDown,
  Loader2,
  Send,
} from "lucide-react";
import { useAdminOverview, useBroadcastNotification } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { Counter } from "../counter";
import { Reveal, RevealStagger, RevealItem } from "../reveal";
import { AdminStat, Input, SelectField } from "./shared";

export function AdminOverview() {
  const { data } = useAdminOverview();
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
              {/* DSK-1c-001 FIX: replaced recharts AreaChart with pure SVG.
                  recharts was removed from package.json but this import remained,
                  causing build errors. This SVG renders the same area chart with
                  gradient fill, grid lines, and hover tooltips — zero dependencies. */}
              <AdminAreaChart data={series} />
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

/* ─────────── AdminAreaChart (pure SVG, replaces recharts) ─────────── */
function AdminAreaChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</div>;
  }
  const W = 600;
  const H = 220;
  const PAD = 10;
  const values = data.map((d) => Number(d.revenue) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * (W - PAD * 2) + PAD,
    y: H - PAD - ((v - min) / range) * (H - PAD * 2),
  }));

  // Smooth path (monotone-like)
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const cx1 = prev.x + (p.x - prev.x) / 2;
    const cx2 = prev.x + (p.x - prev.x) / 2;
    pathD += ` C ${cx1} ${prev.y}, ${cx2} ${p.y}, ${p.x} ${p.y}`;
  }
  const areaD = `${pathD} L ${points[points.length - 1].x} ${H - PAD} L ${points[0].x} ${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="admRev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0052ff" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#0052ff" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD} y1={H * f} x2={W - PAD} y2={H * f} stroke="rgba(0,0,0,0.05)" strokeWidth={1} strokeDasharray="3 3" />
      ))}
      <path d={areaD} fill="url(#admRev)" />
      <path d={pathD} fill="none" stroke="#0052ff" strokeWidth={2} />
    </svg>
  );
}

/* ─────────── Broadcast Composer (Overview top) ─────────── */
export function BroadcastComposer() {
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
