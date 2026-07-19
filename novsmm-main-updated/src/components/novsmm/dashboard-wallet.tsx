"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/currency-utils";
import { PaymentLogo } from "./payment-logo";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Plus,
  TrendingUp,
  Clock,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";
import { MiniAreaChart } from "./mini-area-chart";
import { Counter } from "./counter";
import { Reveal, RevealStagger, RevealItem } from "./reveal";
import {
  useWallet,
  useTopup,
  useWithdraw,
  usePaymentMethods,
} from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function DashboardWallet() {
  const { data, isLoading } = useWallet();
  const [showTopup, setShowTopup] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const { balance, heldBalance, lifetimeEarnings, currency, transactions, series } = data;

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Wallet
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Balance & activity
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time balance, top up, withdraw, and export statements.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.open("/api/export/transactions?format=csv", "_blank")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={() => setShowTopup(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
            >
              <Plus className="h-3.5 w-3.5" /> Top up
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowUpRight className="h-3.5 w-3.5" /> Withdraw
            </button>
          </div>
        </div>
      </Reveal>

      <RevealStagger stagger={0.06} className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        <RevealItem>
          <div className="h-full rounded-2xl border border-border/60 bg-gradient-to-br from-foreground to-foreground/90 p-5 text-background">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider opacity-70">Available</span>
              <Wallet className="h-4 w-4 opacity-70" />
            </div>
            <div className="mt-3 text-3xl font-semibold tabular-nums">
              {formatPrice(balance, currency)}
            </div>
            <div className="mt-1 text-xs opacity-70">{currency} · live</div>
          </div>
        </RevealItem>
        <RevealItem>
          <BalanceCard label="Held" value={heldBalance} currency={currency} icon={<Clock className="h-4 w-4" />} sub="Pending order completion" tone="amber" />
        </RevealItem>
        <RevealItem>
          <BalanceCard label="Lifetime earnings" value={lifetimeEarnings} currency={currency} icon={<TrendingUp className="h-4 w-4" />} sub="All-time revenue" tone="emerald" />
        </RevealItem>
      </RevealStagger>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Reveal blur className="lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Cash flow · 30 days
                </div>
                <div className="text-base font-semibold">Live from transactions</div>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Revenue
                </span>
              </div>
            </div>
            <div className="mt-4 h-[200px] w-full">
              <MiniAreaChart data={series} height={200} color="#0052ff" formatValue={(v) => `$${v.toFixed(2)}`} />
            </div>
          </div>
        </Reveal>

        <Reveal blur delay={0.06}>
          <PaymentMethodsList />
        </Reveal>
      </div>

      {/* Transactions */}
      <Reveal blur>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Transaction history
              </div>
              <div className="text-base font-semibold">{transactions.length} transactions</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Encrypted
            </span>
          </div>
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-2.5 text-left font-medium">Txn</th>
                  <th scope="col" className="px-5 py-2.5 text-left font-medium">Description</th>
                  <th scope="col" className="px-5 py-2.5 text-left font-medium">Type</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th scope="col" className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No transactions yet.
                    </td>
                  </tr>
                )}
                {transactions.map((t: any, i: number) => (
                  <tr
                    key={t.id}
                    className="fm-fade-up transition-colors hover:bg-muted/30"
                    style={{ animationDelay: `${i * 0.02}s` }}
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted-foreground">{t.publicId}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{t.description}</td>
                    <td className="px-5 py-3"><TypePill type={t.type} /></td>
                    <td className={cn(
                      "px-5 py-3 text-right font-semibold tabular-nums",
                      t.amount > 0 ? "text-emerald-600" : "text-foreground"
                    )}>
                      {t.amount > 0 ? "+" : "-"}{formatPrice(Math.abs(t.amount), currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                        t.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : t.status === "pending"
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-red-500/10 text-red-700"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          t.status === "completed" ? "bg-emerald-500" : t.status === "pending" ? "bg-amber-500" : "bg-red-500"
                        )} />
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {showTopup && <TopupModal onClose={() => setShowTopup(false)} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} balance={balance} currency={currency} />}
    </div>
  );
}

function BalanceCard({ label, value, currency, icon, sub, tone }: { label: string; value: number; currency: string; icon: React.ReactNode; sub: string; tone: "amber" | "emerald" }) {
  const toneCls = tone === "amber" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600";
  return (
    <div className="h-full rounded-2xl border border-border/60 bg-background p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", toneCls)}>{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">
        {formatPrice(value, currency)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function PaymentMethodsList() {
  const { data } = usePaymentMethods();
  const methods = data?.methods ?? [];
  return (
    <div className="h-full rounded-2xl border border-border/60 bg-background p-5 sm:p-6">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Top-up methods
      </div>
      <div className="text-base font-semibold">{methods.length} rails available</div>
      <div className="mt-3 flex flex-col gap-1.5">
        {methods.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No payment methods configured yet.
          </div>
        )}
        {methods.map((m: any) => (
          <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-border/60 p-2.5 transition-colors hover:bg-muted/30">
            <PaymentLogo name={m.name} size={32} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground">{m.name}</div>
              <div className="text-[11px] text-muted-foreground">{m.settleTime} · {m.fee}</div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPE_META: Record<string, { label: string; cls: string; icon: any }> = {
  sale: { label: "Sale", cls: "bg-emerald-500/10 text-emerald-700", icon: ArrowUpRight },
  topup: { label: "Top-up", cls: "bg-primary/10 text-primary", icon: ArrowDownLeft },
  withdrawal: { label: "Withdrawal", cls: "bg-muted text-muted-foreground", icon: ArrowUpRight },
  fee: { label: "Fee", cls: "bg-amber-500/10 text-amber-700", icon: ArrowUpRight },
  referral: { label: "Referral", cls: "bg-violet-500/10 text-violet-700", icon: ArrowDownLeft },
  held: { label: "Held", cls: "bg-amber-500/10 text-amber-700", icon: Clock },
  release: { label: "Release", cls: "bg-emerald-500/10 text-emerald-700", icon: ArrowDownLeft },
};

function TypePill({ type }: { type: string }) {
  const m = TYPE_META[type] ?? TYPE_META.sale;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", m.cls)}>
      <m.icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function TopupModal({ onClose }: { onClose: () => void }) {
  const { data: pmData } = usePaymentMethods();
  const topup = useTopup();
  const { toast } = useToast();
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState("PayPal");
  const methods = pmData?.methods ?? [];

  const presets = [50, 100, 500, 1000, 5000];

  const handleSubmit = async () => {
    try {
      const result = await topup.mutateAsync({ amount, method });
      // ── NowPayments ──
      if (result?.provider === "nowpayments" && result?.checkoutUrl) {
        toast({
          title: "Redirecting to NowPayments…",
          description: "Complete your crypto payment on NowPayments. Your balance will update after confirmation.",
        });
        window.location.href = result.checkoutUrl;
        return;
      }
      // ── Manual Payment ──
      // Opens WhatsApp with a pre-filled message so the user can contact
      // our team. Balance is credited manually by an admin after payment.
      if (result?.provider === "manual" && result?.whatsappUrl) {
        toast({
          title: "Contact us on WhatsApp",
          description: "We'll credit your balance manually after confirming your payment.",
        });
        window.open(result.whatsappUrl, "_blank");
        onClose();
        return;
      }
      // ── PayPal / Mercado Pago / NowPayments ──
      if (result?.checkoutUrl) {
        toast({
          title: `Redirecting to ${method}…`,
          description: "Complete your payment. Your balance will update after payment.",
        });
        window.location.href = result.checkoutUrl;
        return;
      }
      // ── Sandbox (no real credentials configured) ──
      if (result?.provider === "sandbox") {
        toast({
          title: "Top-up successful (sandbox)",
          description: `$${amount.toFixed(2)} credited to your wallet via ${method}. Configure real credentials in Admin → Payments for live payments.`,
        });
        onClose();
        return;
      }
      // Fallback
      toast({ title: "Top-up processed", description: result?.message ?? "Done." });
      onClose();
    } catch (e: any) {
      toast({
        title: "Top-up failed",
        description: e?.message ?? "Please try again or contact support.",
        variant: "destructive",
      });
      // Don't close modal — let user retry
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Top up wallet" className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fm-scale-in relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="sticky top-0 z-10 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Top up wallet</div>
        <h2 className="mt-1 text-xl font-semibold">Add funds</h2>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">$</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={amount}
              onChange={(e) => setAmount(Math.min(10000, Math.max(1, Number(e.target.value))))}
              className="h-12 w-full rounded-xl border border-border bg-background pl-8 pr-4 text-lg font-semibold text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
          <div className="mt-2 flex gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors",
                  amount === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                ${p}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Payment method</label>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m: any) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.name)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all",
                  method === m.name ? "border-primary bg-primary/[0.04] nov-ring" : "border-border hover:bg-muted/30"
                )}
              >
                <PaymentLogo name={m.name} size={32} />
                <span className="text-xs font-medium text-foreground">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={topup.isPending || amount < 1}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
        >
          {topup.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing payment…
            </>
          ) : (
            <>Top up ${amount.toFixed(2)}</>
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Sandbox mode · no real charge · processes in ~2s
        </p>
      </div>
    </div>
  );
}

function WithdrawModal({ onClose, balance, currency }: { onClose: () => void; balance: number; currency: string }) {
  const withdraw = useWithdraw();
  const { data: pmData } = usePaymentMethods();
  const { toast } = useToast();
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState("PayPal");
  const [destination, setDestination] = useState("");
  const methods = pmData?.methods ?? [];
  const sufficient = balance >= amount;

  const handleSubmit = async () => {
    try {
      await withdraw.mutateAsync({ amount, method, destination });
      toast({
        title: "Withdrawal requested",
        description: `$${amount.toFixed(2)} withdrawal via ${method} is pending admin approval.`,
      });
      onClose();
    } catch (e: any) {
      toast({
        title: "Withdrawal failed",
        description: e?.message ?? "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Withdraw funds" className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fm-scale-in relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="sticky top-0 z-10 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Withdraw funds</div>
        <h2 className="mt-1 text-xl font-semibold">Withdraw from wallet</h2>
        <p className="mt-1 text-xs text-muted-foreground">Available: {formatPrice(balance, currency)} · Pending admin approval</p>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">$</span>
            <input
              type="number"
              value={amount}
              min={1}
              max={10000}
              onChange={(e) => setAmount(Math.min(10000, Math.max(1, Number(e.target.value))))}
              className="h-12 w-full rounded-xl border border-border bg-background pl-8 pr-4 text-lg font-semibold text-foreground focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </div>
          {!sufficient && <p className="mt-1 text-xs text-red-600">Insufficient balance</p>}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
          >
            {/* BROAD-FIX-BATCH-1: removed the hardcoded "Wise" option (Wise was
                dropped from the canonical 5 payment methods in
                PAYMENT-CLEANUP-1). The dropdown now renders exactly the 5
                canonical methods + any additional active methods the admin
                has configured (fetched via usePaymentMethods). The previous
                broken JSX-in-`map` (returning `false` for matching methods,
                which React renders as nothing) is replaced with a clean
                `.filter(...).map(...)` so every option is a real <option>. */}
            
            <option value="PayPal">PayPal</option>
            <option value="Mercado Pago">Mercado Pago</option>
            <option value="NowPayments">NowPayments (Crypto)</option>
            <option value="Manual">Manual (WhatsApp / Zelle / Wire)</option>
            {methods
              .filter(
                (m: any) =>
                  !["PayPal", "Mercado Pago", "NowPayments", "Manual"].includes(m.name)
              )
              .map((m: any) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Destination (account / address / email)</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. IBAN, USDT wallet address, PayPal email"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={withdraw.isPending || !sufficient || !destination}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
        >
          {withdraw.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>Withdraw {formatPrice(amount, currency)}</>
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Withdrawals are reviewed by admin before processing · 1% fee applies
        </p>
      </div>
    </div>
  );
}
