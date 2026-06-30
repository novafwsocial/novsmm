"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  User,
  Globe,
  Languages,
  DollarSign,
  Save,
  Loader2,
  CheckCircle2,
  Wallet,
  Calendar,
} from "lucide-react";
import { Reveal } from "./reveal";
import { Counter } from "./counter";
import {
  useSession,
  useUpdateProfile,
  usePublicCurrencies,
  usePublicLanguages,
} from "@/hooks/use-api";
import { formatPrice } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";

export function DashboardProfile() {
  const { data: sessionData } = useSession();
  const updateProfile = useUpdateProfile();
  const { data: curData } = usePublicCurrencies();
  const { data: langData } = usePublicLanguages();

  const user = (sessionData?.user as any) ?? {};
  const currencies = curData?.currencies ?? [];
  const languages = langData?.languages ?? [];

  // Form state — only tracks user edits; falls back to session values
  const [edits, setEdits] = useState<Record<string, string>>({});

  // Derived form values: use edits if present, otherwise session values
  const form = {
    name: edits.name ?? user.name ?? "",
    country: edits.country ?? user.country ?? "Mexico",
    currency: edits.currency ?? user.currency ?? "USD",
    language: edits.language ?? user.language ?? "English",
  };

  const setField = (key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateProfile.mutate(form);
    setEdits({});
  };

  const hasChanges =
    (edits.name ?? "") !== (user.name ?? "") ||
    (edits.country ?? "") !== (user.country ?? "") ||
    (edits.currency ?? "") !== (user.currency ?? "") ||
    (edits.language ?? "") !== (user.language ?? "");

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Profile settings
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Personalize your workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your name, country, currency, and language. Changes apply instantly across the platform.
          </p>
        </div>
      </Reveal>

      {/* Profile summary card */}
      <Reveal blur>
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-foreground to-foreground/90 p-6 text-background">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
              {(user.name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="text-xl font-semibold">{user.name}</div>
              <div className="text-sm opacity-70">{user.email}</div>
              <div className="mt-1 flex items-center gap-3 text-xs opacity-80">
                <span className="inline-flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {user.currency}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {user.country}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Languages className="h-3 w-3" />
                  {user.language}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <DarkStat label="Balance" value={formatPrice(user.balance ?? 0, user.currency ?? "USD")} />
            <DarkStat label="Held" value={formatPrice(user.heldBalance ?? 0, user.currency ?? "USD")} />
            <DarkStat label="Role" value={user.role ?? "user"} />
            <DarkStat label="Member since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"} />
          </div>
        </div>
      </Reveal>

      {/* Edit form */}
      <Reveal blur delay={0.06}>
        <div className="rounded-2xl border border-border/60 bg-background p-6">
          <div className="flex items-center gap-2 text-base font-semibold">
            <User className="h-4 w-4 text-primary" />
            Personal information
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              icon={<User className="h-3.5 w-3.5" />}
              value={form.name}
              onChange={(v) => setField("name", v)}
            />
            <Field
              label="Country"
              icon={<Globe className="h-3.5 w-3.5" />}
              value={form.country}
              onChange={(v) => setField("country", v)}
            />
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 text-base font-semibold">
              <DollarSign className="h-4 w-4 text-primary" />
              Preferred currency
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              All prices across the platform will be displayed in this currency. Conversion happens in real-time using the current exchange rate.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {currencies.map((c: any) => (
                <button
                  key={c.code}
                  onClick={() => setField("currency", c.code)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3 text-left transition-all",
                    form.currency === c.code
                      ? "border-primary bg-primary/[0.04] nov-ring"
                      : "border-border hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{c.symbol}</span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.code}</div>
                      <div className="text-[10px] text-muted-foreground">{c.name}</div>
                    </div>
                  </div>
                  {form.currency === c.code && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
            {/* Preview */}
            <div className="mt-3 rounded-xl bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Preview:</span> A $2.40 USD service costs{" "}
              <span className="font-semibold text-foreground">
                {formatPrice(2.4, form.currency)}
              </span>{" "}
              in {form.currency}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Languages className="h-4 w-4 text-primary" />
              Preferred language
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              The dashboard interface will use this language where translations are available.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {languages.map((l: any) => (
                <button
                  key={l.code}
                  onClick={() => setField("language", l.code)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
                    form.language === l.code
                      ? "border-primary bg-primary/[0.04] nov-ring"
                      : "border-border hover:bg-muted/30"
                  )}
                >
                  <span className="text-xl">{l.flag}</span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{l.nativeName}</div>
                    <div className="text-[10px] text-muted-foreground">{l.name}</div>
                  </div>
                  {form.language === l.code && (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges || updateProfile.isPending}
            className={cn(
              "mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all",
              hasChanges && !updateProfile.isPending
                ? "bg-primary text-primary-foreground hover:nov-shadow-blue"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save changes
              </>
            )}
          </button>
        </div>
      </Reveal>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]">
        <span className="text-muted-foreground">{icon}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full bg-transparent text-sm text-foreground focus:outline-none"
        />
      </div>
    </label>
  );
}

function DarkStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider opacity-60">{label}</div>
      <div className="mt-0.5 text-sm font-semibold capitalize">{value}</div>
    </div>
  );
}
