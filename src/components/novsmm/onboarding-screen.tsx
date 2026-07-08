"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  User,
  Globe,
  Languages,
  Bell,
  Compass,
  PartyPopper,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "./app-store";
import { useSession } from "@/hooks/use-api";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "welcome", title: "Welcome to NOVSMM", icon: PartyPopper },
  { key: "profile", title: "Set up your profile", icon: User },
  { key: "currency", title: "Choose your currency", icon: Globe },
  { key: "language", title: "Pick your language", icon: Languages },
  { key: "notifications", title: "Notification preferences", icon: Bell },
  { key: "tour", title: "Take the tour", icon: Compass },
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
];
const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇲🇽" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
];

export function OnboardingScreen() {
  const { setView, signIn } = useApp();
  const { data: sessionData } = useSession();
  const user = (sessionData?.user as any) ?? {};
  const userName = user?.name ?? user?.email ?? "";
  const userEmail = user?.email ?? "";
  // Initials for the avatar — falls back to "U" if no name/email.
  const initials = (user?.name || user?.email || "U")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    role: "Reseller",
    currency: "USD",
    language: "en",
    notifs: { orders: true, sales: true, tickets: true, system: false },
  });

  const next = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Final step — persist onboarding data to DB
      setSaving(true);
      try {
        await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currency: data.currency,
            language: data.language,
            role: (data.role || "").toLowerCase(),
            notificationPreferences: data.notifs,
          }),
        });
      } catch (e) {
        // Non-critical — continue to dashboard even if save fails
      }
      setSaving(false);
      signIn();
    }
  };
  const back = () => (step > 0 ? setStep(step - 1) : setView("register"));

  return (
    <motion.div
      key="onboarding"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 nov-grid-bg nov-radial-fade opacity-60" />
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[560px]"
      >
        {/* progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <Logo />
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted"
              >
                <motion.div
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    i === step ? "bg-primary" : "bg-emerald-500"
                  )}
                />
              </div>
            ))}
          </div>
        </div>

        {/* step card */}
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-7 backdrop-blur-xl nov-ring-lg sm:p-9">
          <motion.div
            key={STEPS[step].key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
              {step === 0 && <WelcomeStep data={data} setData={setData} />}
              {step === 1 && (
                <ProfileStep
                  data={data}
                  setData={setData}
                  initials={initials}
                  userName={userName}
                  userEmail={userEmail}
                />
              )}
              {step === 2 && (
                <CurrencyStep
                  data={data}
                  setData={setData}
                  options={CURRENCIES}
                />
              )}
              {step === 3 && (
                <LanguageStep
                  data={data}
                  setData={setData}
                  options={LANGUAGES}
                />
              )}
              {step === 4 && <NotificationsStep data={data} setData={setData} />}
              {step === 5 && <TourStep />}
            </motion.div>

          {/* nav */}
          <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6">
            <button
              onClick={back}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {step === 0 ? "Back" : "Previous"}
            </button>
            <Magnetic as="div" strength={0.15}>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
              >
                {step === STEPS.length - 1 ? "Enter dashboard" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </Magnetic>
          </div>
        </div>

        <button
          onClick={() => signIn()}
          className="mt-5 block w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip onboarding →
        </button>
      </motion.div>
    </motion.div>
  );
}

type StepProps = {
  data: any;
  setData: React.Dispatch<React.SetStateAction<any>>;
};

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
      >
        <Icon className="h-7 w-7" />
      </motion.div>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground text-pretty">
        {subtitle}
      </p>
    </div>
  );
}

function WelcomeStep({ setData }: StepProps) {
  const roles = [
    { id: "Reseller", desc: "Buy wholesale, resell at your price." },
    { id: "Agency", desc: "Manage multiple creators & brands." },
    { id: "Creator", desc: "Grow your own audience." },
    { id: "Enterprise", desc: "Dedicated infra & SLAs." },
  ];
  return (
    <div>
      <StepHeader
        icon={PartyPopper}
        title="Welcome to NOVSMM"
        subtitle="Tell us how you'll use the platform so we can tailor your workspace."
      />
      <div className="mt-7 grid grid-cols-2 gap-3">
        {roles.map((r, i) => {
          const active = false; // selection tracked below
          return (
            <RoleCard
              key={r.id}
              role={r}
              index={i}
              active={false}
              onSelect={(id) =>
                setData((d: any) => ({ ...d, role: id }))
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function RoleCard({
  role,
  index,
  active,
  onSelect,
}: {
  role: { id: string; desc: string };
  index: number;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const [selected, setSelected] = useState(index === 0);
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -2 }}
      onClick={() => {
        setSelected(true);
        onSelect(role.id);
      }}
      className={cn(
        "group relative flex flex-col gap-1 rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/[0.04] nov-ring"
          : "border-border bg-background hover:border-foreground/20"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{role.id}</span>
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
            selected ? "border-primary bg-primary" : "border-border"
          )}
        >
          {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{role.desc}</p>
    </motion.button>
  );
}

function ProfileStep({
  setData,
  initials,
  userName,
  userEmail,
}: StepProps & { initials: string; userName: string; userEmail: string }) {
  return (
    <div>
      <StepHeader
        icon={User}
        title="Set up your profile"
        subtitle="Add a few details so collaborators can recognize you."
      />
      <div className="mt-7 flex flex-col items-center gap-5">
        <motion.div
          whileHover={{ scale: 1.04 }}
          className="relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-3xl font-semibold text-primary-foreground nov-shadow-blue"
        >
          {initials || "U"}
          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground nov-ring">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </span>
        </motion.div>
        <div className="w-full max-w-sm">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Display name
          </label>
          <input
            defaultValue={userName || ""}
            placeholder="Your name"
            onChange={(e) =>
              setData((d: any) => ({ ...d, name: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground transition-shadow focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
          />
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified email · {userEmail || "—"}
        </div>
      </div>
    </div>
  );
}

function CurrencyStep({ data, setData, options }: StepProps & { options: any[] }) {
  return (
    <div>
      <StepHeader
        icon={Globe}
        title="Choose your currency"
        subtitle="This sets your default wallet, pricing, and payouts. Changeable anytime."
      />
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((c, i) => (
          <motion.button
            key={c.code}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            onClick={() => setData((d: any) => ({ ...d, currency: c.code }))}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border p-4 transition-all",
              data.currency === c.code
                ? "border-primary bg-primary/[0.04] nov-ring"
                : "border-border bg-background hover:border-foreground/20"
            )}
          >
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {c.symbol}
            </span>
            <span className="text-sm font-medium text-foreground">{c.code}</span>
            <span className="text-[10px] text-muted-foreground">{c.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function LanguageStep({ data, setData, options }: StepProps & { options: any[] }) {
  return (
    <div>
      <StepHeader
        icon={Languages}
        title="Pick your language"
        subtitle="We'll localize your dashboard, receipts, and notifications."
      />
      <div className="mt-7 flex flex-col gap-2">
        {options.map((l, i) => (
          <motion.button
            key={l.code}
            type="button"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setData((d: any) => ({ ...d, language: l.code }))}
            className={cn(
              "flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all",
              data.language === l.code
                ? "border-primary bg-primary/[0.04] nov-ring"
                : "border-border bg-background hover:border-foreground/20"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{l.flag}</span>
              <span className="text-sm font-medium text-foreground">{l.name}</span>
            </div>
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                data.language === l.code
                  ? "border-primary bg-primary"
                  : "border-border"
              )}
            >
              {data.language === l.code && (
                <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
              )}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function NotificationsStep({ data, setData }: StepProps) {
  const items = [
    { key: "orders", label: "Order updates", desc: "Start, progress, completion" },
    { key: "sales", label: "Sales & revenue", desc: "New sales, payouts" },
    { key: "tickets", label: "Support tickets", desc: "Replies, status changes" },
    { key: "system", label: "System & security", desc: "Maintenance, alerts" },
  ];
  return (
    <div>
      <StepHeader
        icon={Bell}
        title="Notification preferences"
        subtitle="Choose what lands in your real-time feed. Adjust anytime in Settings."
      />
      <div className="mt-7 flex flex-col gap-2">
        {items.map((it, i) => {
          const on = data.notifs[it.key];
          return (
            <motion.div
              key={it.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-2xl border border-border bg-background p-3.5"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{it.label}</div>
                <div className="text-xs text-muted-foreground">{it.desc}</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setData((d: any) => ({
                    ...d,
                    notifs: { ...d.notifs, [it.key]: !d.notifs[it.key] },
                  }))
                }
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  on ? "bg-primary" : "bg-muted"
                )}
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-background nov-ring",
                    on ? "left-[22px]" : "left-0.5"
                  )}
                />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TourStep() {
  const tour = [
    { icon: Compass, title: "Dashboard", desc: "Your live ops cockpit." },
    { icon: Globe, title: "Marketplace", desc: "Buy, sell, set your margins." },
    { icon: Bell, title: "Notifications", desc: "Real-time, WebSocket-powered." },
    { icon: ShieldCheck, title: "Security", desc: "2FA, sessions, audit logs." },
  ];
  return (
    <div>
      <StepHeader
        icon={Compass}
        title="Take the tour"
        subtitle="Here's what you'll find inside. You can replay this tour anytime from Settings."
      />
      <div className="mt-7 grid grid-cols-2 gap-3">
        {tour.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <t.icon className="h-4 w-4" />
            </span>
            <div className="text-sm font-semibold text-foreground">{t.title}</div>
            <div className="text-xs text-muted-foreground">{t.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
