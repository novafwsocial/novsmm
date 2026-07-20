"use client";


import { useState, useEffect } from "react";
import {
  User,
  Globe,
  Languages,
  DollarSign,
  Save,
  Loader2,
  CheckCircle2,
  Lock,
  Shield,
  Smartphone,
  Bell,
  Monitor,
  KeyRound,
  Eye,
  EyeOff,
  Gift,
  Copy,
  Crown,
  MessageCircle,
  Twitter,
  Send,
  Trophy,
  ArrowUpRight,
  Sparkles,
  Award,
  ChevronRight,
} from "lucide-react";
import { Reveal } from "./reveal";
import {
  useSession,
  useUpdateProfile,
  usePublicCurrencies,
  usePublicLanguages,
  useReferrals,
  useLoyalty,
} from "@/hooks/use-api";
import { formatPrice } from "@/lib/currency-utils";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useApp } from "./app-store";
import { signOut } from "next-auth/react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useLanguage } from "./language-provider";

export function DashboardProfile() {
  const { t } = useLanguage();
  const { data: sessionData } = useSession();
  const updateProfile = useUpdateProfile();
  const { data: curData } = usePublicCurrencies();
  const { data: langData } = usePublicLanguages();

  const user = (sessionData?.user as any) ?? {};
  const currencies = curData?.currencies ?? [];
  const languages = langData?.languages ?? [];

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<"profile" | "security" | "notifications" | "sessions" | "referrals" | "achievements">("profile");

  const form = {
    name: edits.name ?? user.name ?? "",
    country: edits.country ?? user.country ?? "Mexico",
    currency: edits.currency ?? user.currency ?? "USD",
    // BROAD-FIX-BATCH-1: default to ISO code "en" (not "English") so the
    // PATCH /api/me validation passes — the Language table only has ISO
    // code rows (en/es/pt/fr).
    language: edits.language ?? user.language ?? "en",
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
              {t("profile.title", "Profile settings")}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("profile.personalize", "Personalize your workspace")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("profile.subtitle", "Manage your profile, security, notifications, and sessions.")}
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
            <div className="flex-1">
              <div className="text-xl font-semibold">{user.name}</div>
              <div className="text-sm opacity-70">{user.email}</div>
              <div className="mt-1 flex items-center gap-3 text-xs opacity-80">
                <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />{user.currency}</span>
                <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{user.country}</span>
                <span className="inline-flex items-center gap-1"><Languages className="h-3 w-3" />{user.language}</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Section tabs */}
      <Reveal>
        <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background p-1">
          {[
            { id: "profile", label: t("profile.tabProfile", "Profile"), icon: User },
            { id: "security", label: t("profile.tabSecurity", "Security"), icon: Shield },
            { id: "achievements", label: t("profile.tabAchievements", "Achievements"), icon: Trophy },
            { id: "referrals", label: t("profile.tabReferrals", "Referrals"), icon: Gift },
            { id: "notifications", label: t("profile.tabNotifications", "Notifications"), icon: Bell },
            { id: "sessions", label: t("profile.tabSessions", "Sessions"), icon: Monitor },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id as any)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeSection === t.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeSection === t.id && (
                <span className="absolute inset-0 rounded-full bg-primary" />
              )}
              <t.icon className="relative h-3.5 w-3.5" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* Profile section */}
      {activeSection === "profile" && (
        <>
        <Reveal blur>
          <div className="rounded-2xl border border-border/60 bg-background p-6">
            <div className="flex items-center gap-2 text-base font-semibold"><User className="h-4 w-4 text-primary" />{t("profile.personalInfo", "Personal information")}</div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldInput label={t("profile.fullName", "Full name")} icon={<User className="h-3.5 w-3.5" />} value={form.name} onChange={(v) => setField("name", v)} />
              <FieldInput label={t("profile.country", "Country")} icon={<Globe className="h-3.5 w-3.5" />} value={form.country} onChange={(v) => setField("country", v)} />
            </div>
            <div className="mt-5">
              <div className="flex items-center gap-2 text-base font-semibold"><DollarSign className="h-4 w-4 text-primary" />{t("profile.currency", "Preferred currency")}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t("profile.currencyDescription", "All prices will be displayed in this currency with real-time conversion.")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {currencies.map((c: any) => (
                  <button key={c.code} onClick={() => setField("currency", c.code)} className={cn("flex items-center justify-between rounded-xl border p-3 text-left transition-all", form.currency === c.code ? "border-primary bg-primary/[0.04] nov-ring" : "border-border hover:bg-muted/30")}>
                    <div className="flex items-center gap-2"><span className="text-lg font-semibold">{c.symbol}</span><div><div className="text-sm font-medium">{c.code}</div><div className="text-[11px] text-muted-foreground">{c.name}</div></div></div>
                    {form.currency === c.code && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
              <div className="mt-3 rounded-xl bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("profile.preview", "Preview:")}</span> {t("profile.previewText", "A $2.40 USD service costs")} <span className="font-semibold text-foreground">{formatPrice(2.4, form.currency)}</span> {t("profile.inCurrency", "in")} {form.currency}
              </div>
            </div>
            <div className="mt-5">
              <div className="flex items-center gap-2 text-base font-semibold"><Languages className="h-4 w-4 text-primary" />{t("profile.language", "Preferred language")}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {languages.map((l: any) => (
                  <button key={l.code} onClick={() => setField("language", l.code)} className={cn("flex items-center gap-2 rounded-xl border p-3 text-left transition-all", form.language === l.code ? "border-primary bg-primary/[0.04] nov-ring" : "border-border hover:bg-muted/30")}>
                    <span className="text-xl">{l.flag}</span><div><div className="text-sm font-medium">{l.nativeName}</div><div className="text-[11px] text-muted-foreground">{l.name}</div></div>
                    {form.language === l.code && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSave} disabled={!hasChanges || updateProfile.isPending} className={cn("mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all", hasChanges && !updateProfile.isPending ? "bg-primary text-primary-foreground hover:nov-shadow-blue" : "cursor-not-allowed bg-muted text-muted-foreground")}>
              {updateProfile.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />{t("profile.saving", "Saving…")}</> : <><Save className="h-4 w-4" />{t("profile.save", "Save changes")}</>}
            </button>
          </div>
        </Reveal>

        {/* Danger Zone — GDPR self-service account deletion */}
        <DangerZone />
        </>
      )}

      {/* Security section */}
      {activeSection === "security" && <SecuritySection />}

      {/* Achievements section */}
      {activeSection === "achievements" && <AchievementsSection />}

      {/* Referrals section */}
      {activeSection === "referrals" && <ReferralsSection />}

      {/* Notifications section */}
      {activeSection === "notifications" && <NotificationsSection />}

      {/* Sessions section */}
      {activeSection === "sessions" && <SessionsSection />}
    </div>
  );
}

// ─── Field Input ───
function FieldInput({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]">
        <span className="text-muted-foreground">{icon}</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full bg-transparent text-base text-foreground focus:outline-none" />
      </div>
    </label>
  );
}

// ─── Danger Zone — GDPR self-service account deletion ───
function DangerZone() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { setAuthed, setView } = useApp();
  const [open, setOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const canDelete =
    confirmPassword.trim().length > 0 && acknowledged && !loading;

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      const res = await api.post<{ success?: boolean; error?: string }>(
        "/api/me/delete",
        { confirmPassword }
      );
      if (res?.success) {
        toast({
          title: t("profile.accountDeleted", "Account deleted"),
          description: t("profile.accountDeletedDescription", "Your personal data has been anonymized. Redirecting…"),
        });
        // Clear local app state + sign out of NextAuth, then return to landing
        setAuthed(false, null);
        setView("landing");
        await signOut({ redirect: false });
        // Hard reload to clear any cached client state
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      } else if (res?.error) {
        toast({
          title: "Could not delete account",
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Could not delete account",
        description: e?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setOpen(false);
    setConfirmPassword("");
    setAcknowledged(false);
    setShowPw(false);
  };

  return (
    <Reveal blur>
      <div className="rounded-2xl border-2 border-red-500/40 bg-red-500/[0.03] p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="text-base font-semibold text-red-700 dark:text-red-400">
              {t("profile.dangerZone", "Danger Zone")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("profile.dangerDescription", "Permanently delete your account and anonymize your personal data. This action is irreversible. Orders and transactions are retained for financial audit.")}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("profile.deleteAccount", "Delete account")}
          </button>
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("profile.deleteAccount", "Delete account")}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="text-base font-semibold text-red-700 dark:text-red-400">
                {t("profile.deleteAccount", "Delete account")}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-foreground">
              {t("profile.deleteWarning", "This will permanently delete your account. Your orders and transactions are retained for financial audit but your personal data will be anonymized. This action CANNOT be undone.")}
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("profile.confirmPassword", "Confirm your password")}
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 transition-shadow focus-within:shadow-[0_0_0_4px_rgba(239,68,68,0.18)]">
                <span className="text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("profile.reenterPassword", "Re-enter your password")}
                  className="h-11 w-full bg-transparent text-base text-foreground focus:outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? t("profile.hidePassword", "Hide password") : t("profile.showPassword", "Show password")}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <label className="mt-4 flex items-start gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-red-600"
              />
              <span>
                {t("profile.acknowledgeDelete", "I understand this action is irreversible and that my personal data will be anonymized.")}
              </span>
            </label>

            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className={cn(
                "mt-5 w-full rounded-xl py-3 text-sm font-medium transition-all",
                canDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  {t("profile.deleting", "Deleting…")}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 inline h-4 w-4" />
                  {t("profile.deleteMyAccount", "Delete my account")}
                </>
              )}
            </button>
            <button
              onClick={close}
              className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
            >
              {t("common.cancel", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </Reveal>
  );
}

// ─── Security Section (Password + 2FA) ───
function SecuritySection() {
  const { t } = useLanguage();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 2FA state
  const [twofaData, setTwofaData] = useState<any>(null);
  const [twofaToken, setTwofaToken] = useState("");
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [twofaLoading, setTwofaLoading] = useState(false);
  const [disableToken, setDisableToken] = useState("");

  // Check 2FA status on mount — call /api/me (returns user.twoFactorEnabled)
  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/me")
      .then((d: any) => {
        if (cancelled) return;
        if (d?.user?.twoFactorEnabled) {
          setTwofaEnabled(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return;
    setLoading(true);
    try {
      await api.post("/api/me/password", { currentPassword: currentPw, newPassword: newPw });
      toast({ title: t("profile.passwordChanged", "Password changed"), description: t("profile.passwordUpdated", "Your password has been updated.") });
      setCurrentPw("");
      setNewPw("");
    } catch (e: any) {
      toast({ title: t("profile.failed", "Failed"), description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSetup2FA = async () => {
    setTwofaLoading(true);
    try {
      const res = await api.post("/api/me/2fa/setup", {});
      setTwofaData(res);
    } catch (e: any) {
      toast({ title: t("profile.2faSetupFailed", "2FA setup failed"), description: e.message, variant: "destructive" });
    }
    setTwofaLoading(false);
  };

  const handleVerify2FA = async () => {
    setTwofaLoading(true);
    try {
      await api.post("/api/me/2fa/verify", { token: twofaToken });
      toast({ title: t("profile.2faEnabled", "2FA enabled"), description: t("profile.2faActive", "Two-factor authentication is now active.") });
      setTwofaEnabled(true);
      setTwofaData(null);
      setTwofaToken("");
    } catch (e: any) {
      toast({ title: t("profile.verificationFailed", "Verification failed"), description: e.message, variant: "destructive" });
    }
    setTwofaLoading(false);
  };

  const handleDisable2FA = async () => {
    setTwofaLoading(true);
    try {
      await api.post("/api/me/2fa/disable", { token: disableToken });
      toast({ title: t("profile.2faDisabled", "2FA disabled") });
      setTwofaEnabled(false);
      setDisableToken("");
    } catch (e: any) {
      toast({ title: t("profile.failed", "Failed"), description: e.message, variant: "destructive" });
    }
    setTwofaLoading(false);
  };

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        {/* Password change */}
        <div className="rounded-2xl border border-border/60 bg-background p-6">
          <div className="flex items-center gap-2 text-base font-semibold"><Lock className="h-4 w-4 text-primary" />{t("profile.changePassword", "Change password")}</div>
          <div className="mt-4 flex flex-col gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("profile.currentPassword", "Current password")}</span>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="h-11 w-full bg-transparent text-base focus:outline-none" />
                <button onClick={() => setShowPw(!showPw)} className="text-muted-foreground">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("profile.newPassword", "New password (min 8 characters)")}</span>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-11 w-full bg-transparent text-base focus:outline-none" />
              </div>
            </label>
            <button onClick={handleChangePassword} disabled={loading || !currentPw || newPw.length < 8} className="inline-flex items-center gap-2 self-start rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {t("profile.updatePassword", "Update password")}
            </button>
          </div>
        </div>

        {/* 2FA */}
        <div className="rounded-2xl border border-border/60 bg-background p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-semibold"><Shield className="h-4 w-4 text-primary" />{t("profile.twoFactor", "Two-factor authentication (2FA)")}</div>
            {twofaEnabled && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">✓ {t("profile.enabled", "Enabled")}</span>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("profile.twoFactorDescription", "Protect your account with an authenticator app (Google Authenticator, Authy, etc.).")}</p>

          {!twofaData && !twofaEnabled && (
            <button onClick={handleSetup2FA} disabled={twofaLoading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {twofaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              {t("profile.setup2fa", "Set up 2FA")}
            </button>
          )}

          {twofaData && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/30 p-4">
                <img src={twofaData.qrCode} alt="2FA QR Code" className="h-48 w-48 rounded-lg" />
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">{t("profile.enterCodeManually", "Or enter this code manually:")}</div>
                  <code className="mt-1 block font-mono text-xs text-foreground">{twofaData.secret}</code>
                </div>
              </div>
              {twofaData.backupCodes && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="text-xs font-semibold text-amber-700">⚠ {t("profile.backupCodes", "Backup codes — save these now!")}</div>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {twofaData.backupCodes.map((c: string, i: number) => (
                      <code key={i} className="rounded bg-background px-2 py-1 text-center font-mono text-xs">{c}</code>
                    ))}
                  </div>
                </div>
              )}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("profile.enter6Code", "Enter the 6-digit code from your authenticator app")}</span>
                <input value={twofaToken} onChange={(e) => setTwofaToken(e.target.value)} placeholder="123456" maxLength={6} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-2xl font-semibold tracking-widest focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]" />
              </label>
              <button onClick={handleVerify2FA} disabled={twofaLoading || twofaToken.length !== 6} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {twofaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t("profile.verifyEnable", "Verify and enable")}
              </button>
            </div>
          )}

          {twofaEnabled && (
            <div className="mt-4 flex flex-col gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("profile.enter6Disable", "Enter a 6-digit code to disable 2FA")}</span>
                <input value={disableToken} onChange={(e) => setDisableToken(e.target.value)} placeholder="123456" maxLength={6} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-2xl font-semibold tracking-widest focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]" />
              </label>
              <button onClick={handleDisable2FA} disabled={twofaLoading || disableToken.length !== 6} className="inline-flex items-center gap-2 self-start rounded-xl border border-red-500/30 px-6 py-3 text-sm font-medium text-red-600 disabled:opacity-60">
                {twofaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {t("profile.disable2fa", "Disable 2FA")}
              </button>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

// ─── Notifications Section ───
function NotificationsSection() {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    api.get("/api/me/notification-preferences").then((d: any) => {
      if (cancelled) return;
      setPrefs(d.preferences ?? {});
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (key: string) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/api/me/notification-preferences", prefs);
      toast({ title: t("profile.preferencesSaved", "Preferences saved") });
    } catch (e: any) {
      toast({ title: t("profile.failed", "Failed"), description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const categories = [
    { key: "orders", label: t("profile.prefOrders", "Order updates"), desc: t("profile.prefOrdersDesc", "Start, progress, completion") },
    { key: "sales", label: t("profile.prefSales", "Sales & revenue"), desc: t("profile.prefSalesDesc", "New sales, payouts") },
    { key: "tickets", label: t("profile.prefTickets", "Support tickets"), desc: t("profile.prefTicketsDesc", "Replies, status changes") },
    { key: "recharges", label: t("profile.prefRecharges", "Wallet top-ups"), desc: t("profile.prefRechargesDesc", "Payment confirmations") },
    { key: "withdrawals", label: t("profile.prefWithdrawals", "Withdrawals"), desc: t("profile.prefWithdrawalsDesc", "Approval status changes") },
    { key: "marketplace", label: t("profile.prefMarketplace", "Marketplace"), desc: t("profile.prefMarketplaceDesc", "New offers, sales") },
    { key: "referrals", label: t("profile.prefReferrals", "Referrals"), desc: t("profile.prefReferralsDesc", "New referrals, earnings") },
    { key: "system", label: t("profile.prefSystem", "System & security"), desc: t("profile.prefSystemDesc", "Maintenance, alerts") },
    { key: "emailOrders", label: t("profile.prefEmailOrders", "Email: Orders"), desc: t("profile.prefEmailOrdersDesc", "Receive order emails") },
    { key: "emailTickets", label: t("profile.prefEmailTickets", "Email: Tickets"), desc: t("profile.prefEmailTicketsDesc", "Receive ticket emails") },
    { key: "emailMarketing", label: t("profile.prefEmailMarketing", "Email: Marketing"), desc: t("profile.prefEmailMarketingDesc", "Promotions, newsletters") },
  ];

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Reveal blur>
      <div className="rounded-2xl border border-border/60 bg-background p-6">
        <div className="flex items-center gap-2 text-base font-semibold"><Bell className="h-4 w-4 text-primary" />{t("profile.notificationPreferences", "Notification preferences")}</div>
        <p className="mt-1 text-xs text-muted-foreground">{t("profile.notificationDescription", "Choose which notifications you receive in-app and via email.")}</p>
        <div className="mt-4 flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3.5">
              <div><div className="text-sm font-medium text-foreground">{c.label}</div><div className="text-xs text-muted-foreground">{c.desc}</div></div>
              <button onClick={() => toggle(c.key)} className={cn("relative h-6 w-11 rounded-full transition-colors", prefs[c.key] ? "bg-primary" : "bg-muted")}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-background nov-ring", prefs[c.key] ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("profile.savePreferences", "Save preferences")}
        </button>
      </div>
    </Reveal>
  );
}

// ─── Sessions Section ───
function SessionsSection() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    api.get("/api/me/sessions").then((d: any) => {
      if (cancelled) return;
      setSessions(d.sessions ?? []);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRevokeAll = async () => {
    try {
      await api.delete("/api/me/sessions");
      toast({ title: t("profile.sessionsRevoked", "All sessions revoked") });
      setSessions([]);
    } catch (e: any) {
      toast({ title: t("profile.failed", "Failed"), description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Reveal blur>
      <div className="rounded-2xl border border-border/60 bg-background p-6">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold"><Monitor className="h-4 w-4 text-primary" />{t("profile.activeSessions", "Active sessions")}</div>
          <button onClick={handleRevokeAll} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/5">{t("profile.revokeAll", "Revoke all")}</button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("profile.sessionsDescription", "Recent login activity on your account.")}</p>
        <div className="mt-4 flex flex-col gap-2">
          {sessions.map((s: any, i: number) => (
            <div key={s.id} className={cn("flex items-center justify-between rounded-xl border p-3.5", s.current ? "border-primary/30 bg-primary/[0.02]" : "border-border/60")}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Monitor className="h-4 w-4" /></span>
                <div>
                  <div className="text-sm font-medium text-foreground">{s.device} {s.current && <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{t("profile.current", "CURRENT")}</span>}</div>
                  <div className="text-xs text-muted-foreground">{s.ip} · {new Date(s.lastActive).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">{t("profile.noSessions", "No recent sessions found.")}</div>}
        </div>
      </div>
    </Reveal>
  );
}

// ─── Referrals Section ───
function ReferralsSection() {
  const { t } = useLanguage();
  const { data, isLoading } = useReferrals();
  const { data: sessionData } = useSession();
  const currency = (sessionData?.user as any)?.currency ?? "USD";
  const currentUserId = (sessionData?.user as any)?.id;
  const { toast } = useToast();

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const referrals = data?.referrals ?? [];
  const code = data?.code ?? "";
  const shareUrl = data?.referralLink ?? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${code}`;
  const tier = data?.tier;
  const current = tier?.current;
  const next = tier?.next;
  const progress = tier?.progressToNext ?? 0;
  const remaining = tier?.remainingToNext ?? 0;
  const tierTable = data?.tierTable ?? [];
  const recentPayouts = data?.recentPayouts ?? [];
  const leaderboard = data?.leaderboard ?? [];
  const myRank = data?.myRank ?? null;
  const stats = data?.stats;
  const commissionRate = current?.commissionRate ?? data?.commissionRate ?? 0.05;
  const totalReferrals = stats?.totalReferrals ?? data?.totalReferrals ?? 0;
  const activeReferrals = stats?.activeReferrals ?? 0;
  const totalEarnings = stats?.totalEarnings ?? data?.totalEarnings ?? 0;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: t("profile.referralCopied", "Referral link copied!"), description: shareUrl });
    } catch {
      toast({
        title: t("profile.couldNotCopy", "Couldn't copy"),
        description: t("profile.clipboardBlocked", "Your browser blocked clipboard access."),
        variant: "destructive",
      });
    }
  };

  const shareText = `Únete a NOVSMM y obtén automatización para redes sociales: ${shareUrl}`;
  const shareEnc = encodeURIComponent(shareText);
  const shareUrlEnc = encodeURIComponent(shareUrl);
  const share = (channel: "whatsapp" | "twitter" | "telegram") => {
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${shareEnc}`,
      twitter: `https://twitter.com/intent/tweet?text=${shareEnc}`,
      telegram: `https://t.me/share/url?url=${shareUrlEnc}&text=${shareEnc}`,
    };
    window.open(urls[channel], "_blank", "noopener,noreferrer,width=600,height=600");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hero referral card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-foreground to-foreground/90 p-6 text-background">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Gift className="h-4 w-4" /> {t("profile.referEarn", "Refer & earn")}
            </div>
            {current && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: `${current.color}25`,
                  border: `1px solid ${current.color}`,
                  color: "#fff",
                }}
              >
                <Crown className="h-3 w-3" /> {current.emoji} {current.label}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm opacity-70">
            {t("profile.earnCommission", "Earn")} <span className="font-semibold opacity-100">{(commissionRate * 100).toFixed(0)}%</span> {t("profile.lifetimeCommission", "lifetime commission on every order from users you refer. Scale your network to unlock higher tiers.")}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-background/10 px-3 py-2.5 font-mono text-sm break-all">{shareUrl}</code>
            <button onClick={copyCode} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/10 hover:bg-background/20" title={t("profile.copyReferralLink", "Copy referral link")}>
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => share("whatsapp")} className="inline-flex items-center gap-1.5 rounded-lg bg-background/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-background/20">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </button>
            <button onClick={() => share("twitter")} className="inline-flex items-center gap-1.5 rounded-lg bg-background/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-background/20">
              <Twitter className="h-3.5 w-3.5" /> X
            </button>
            <button onClick={() => share("telegram")} className="inline-flex items-center gap-1.5 rounded-lg bg-background/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-background/20">
              <Send className="h-3.5 w-3.5" /> Telegram
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-60">{t("profile.totalReferrals", "Total referrals")}</div>
              <div className="text-xl font-semibold">{totalReferrals}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-60">{t("profile.active", "Active")}</div>
              <div className="text-xl font-semibold">{activeReferrals}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-60">{t("profile.totalEarned", "Total earned")}</div>
              <div className="text-xl font-semibold">{formatPrice(totalEarnings, currency)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider opacity-60">{t("profile.commission", "Commission")}</div>
              <div className="text-xl font-semibold">{(commissionRate * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier visualization */}
      <div className="rounded-2xl border border-border/60 bg-background p-6">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">{t("profile.yourTier", "Your tier")}</div>
          {myRank != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Trophy className="h-3 w-3" /> {t("profile.rank", "Rank")} #{myRank}
            </span>
          )}
        </div>

        {/* Current → next tier progress */}
        <div className="mt-4">
          {next ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span>{current?.emoji}</span> {current?.label} ({(current?.commissionRate ?? 0) * 100}%)
                </span>
                <span className="text-muted-foreground">
                  {next.emoji} {next.label} ({(next.commissionRate ?? 0) * 100}%) {t("profile.inMore", "in {count} more").replace("{count}", String(remaining))}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    background: `linear-gradient(90deg, ${current?.color ?? "#0052ff"}, ${next.color ?? "#0052ff"})`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                {t("profile.unlockTier", "{current} / {target} successful referrals to unlock {tier}").replace("{current}", String(totalReferrals)).replace("{target}", String(next.minReferrals)).replace("{tier}", next.label)}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <span className="font-medium">{current?.emoji} {current?.label} {t("profile.tierUnlocked", "tier unlocked.")}</span>{" "}
              {t("profile.maximumCommission", "You're earning the maximum {rate}% commission on every referral.").replace("{rate}", (commissionRate * 100).toFixed(0))}
            </div>
          )}
        </div>

        {/* Tier table */}
        <div className="mt-5 overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">{t("profile.tier", "Tier")}</th>
                <th className="px-3 py-2 text-left">{t("profile.referrals", "Referrals")}</th>
                <th className="px-3 py-2 text-right">{t("profile.commission", "Commission")}</th>
                <th className="px-3 py-2 text-right">{t("profile.status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {tierTable.map((t: any) => {
                const isCurrent = t.id === current?.id;
                const isUnlocked = (t.minReferrals ?? 0) <= totalReferrals;
                const rangeLabel =
                  t.maxReferrals == null
                    ? `${t.minReferrals}+`
                    : `${t.minReferrals}–${t.maxReferrals}`;
                return (
                  <tr key={t.id} className={cn("border-t border-border/60", isCurrent && "bg-primary/5")}>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span>{t.emoji}</span> {t.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{rangeLabel}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {(t.commissionRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isCurrent ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{t("profile.currentTier", "Current")}</span>
                      ) : isUnlocked ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{t("profile.unlocked", "Unlocked")}</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{t("profile.locked", "Locked")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent payouts */}
        <div className="rounded-2xl border border-border/60 bg-background p-6">
          <div className="flex items-center gap-2 text-base font-semibold">
            <DollarSign className="h-4 w-4 text-emerald-600" /> {t("profile.recentPayouts", "Recent payouts")}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {recentPayouts.length > 0 ? recentPayouts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                <div>
                  <div className="text-sm font-medium">{p.description || t("profile.referralCommission", "Referral commission")}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {p.publicId} · {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-emerald-600">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {formatPrice(p.amount, currency)}
                </span>
              </div>
            )) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("profile.noPayouts", "No payouts yet. Share your link to start earning.")}
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl border border-border/60 bg-background p-6">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Trophy className="h-4 w-4 text-amber-500" /> {t("profile.topReferrers", "Top referrers")}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {leaderboard.length > 0 ? leaderboard.map((l: any) => {
              const isMe = l.userId === currentUserId;
              return (
                <div
                  key={l.userId}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-border/60 p-2.5",
                    isMe && "border-primary/40 bg-primary/5",
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    l.rank === 1 ? "bg-amber-500/15 text-amber-700" :
                    l.rank === 2 ? "bg-slate-400/15 text-slate-600" :
                    l.rank === 3 ? "bg-orange-500/15 text-orange-700" :
                    "bg-muted text-muted-foreground",
                  )}>
                    {l.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {l.name || `@${l.username}`} {isMe && <span className="text-[11px] text-primary">(you)</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {l.referralCount} {t("profile.referrals", "referrals")} · {l.tierEmoji} {l.tierLabel}
                    </div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-emerald-600">
                    {formatPrice(l.earnings, currency)}
                  </span>
                </div>
              );
            }) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("profile.emptyLeaderboard", "Leaderboard is empty — be the first to refer someone!")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Referred users list */}
      <div className="rounded-2xl border border-border/60 bg-background p-6">
        <div className="text-base font-semibold">{t("profile.referredUsers", "Referred users")}</div>
        <div className="mt-3 flex flex-col gap-2">
          {referrals.filter((r: any) => r.referredEmail).length > 0 ? referrals.filter((r: any) => r.referredEmail).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <div><div className="text-sm font-medium">{r.referredEmail || t("profile.pendingSignup", "Pending signup")}</div><div className="text-[11px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</div></div>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", r.status === "rewarded" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>{r.status}</span>
            </div>
          )) : <div className="py-6 text-center text-sm text-muted-foreground">{t("profile.noReferrals", "No referrals yet. Share your link above!")}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Achievements Section (Loyalty Points + Achievements) ─────────────────
function AchievementsSection() {
  const { t } = useLanguage();
  const { data, isLoading } = useLoyalty();
  const { data: sessionData } = useSession();
  const currency = (sessionData?.user as any)?.currency ?? "USD";

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Defensive: if the API hasn't returned data, render an empty state.
  if (!data) {
    return (
      <Reveal blur>
        <div className="rounded-2xl border border-border/60 bg-background p-6 text-center text-sm text-muted-foreground">
          {t("profile.loyaltyLoading", "Loyalty data is loading. Place an order to start earning points.")}
        </div>
      </Reveal>
    );
  }

  const { totalPoints, tier, achievements, recentPoints, stats } = data;
  const current = tier.current;
  const next = tier.next;

  // Reason → friendly label
  const reasonLabel = (reason: string): string => {
    switch (reason) {
      case "order_completed": return t("profile.reasonOrderCompleted", "Order completed");
      case "referral":        return t("profile.reasonReferral", "Referral bonus");
      case "daily_login":     return t("profile.reasonDailyLogin", "Daily login");
      case "achievement":     return t("profile.reasonAchievement", "Achievement unlocked");
      default:                return reason;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hero — tier + total points + progress */}
      <div
        className="relative overflow-hidden rounded-2xl border p-6"
        style={{
          borderColor: `${current.color}40`,
          background: `linear-gradient(135deg, ${current.color}12, ${current.color}02 60%, transparent)`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
          style={{ background: `${current.color}25` }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4" style={{ color: current.color }} />
              {t("profile.loyaltyProgram", "NOVSMM Loyalty Program")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: current.color }}
              >
                <Crown className="h-3 w-3" /> {current.emoji} {current.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Trophy className="h-3 w-3" /> {totalPoints.toLocaleString()} pts
              </span>
            </div>
            <p className="max-w-md text-xs text-muted-foreground">{current.benefits}</p>
          </div>

          <div className="sm:w-[320px]">
            {next ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {current.emoji} {current.label}
                  </span>
                  <span className="text-muted-foreground">
                    {next.emoji} {next.label} {t("profile.pointsToNext", "in {count} pts").replace("{count}", tier.pointsToNext.toLocaleString())}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(2, Math.round(tier.progress * 100))}%`,
                      background: `linear-gradient(90deg, ${current.color}, ${next.color})`,
                    }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  {totalPoints.toLocaleString()} / {next.minPoints.toLocaleString()} pts
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                <span className="font-medium">{current.emoji} {current.label} {t("profile.tierUnlocked", "tier unlocked.")}</span>{" "}
                {t("profile.maximumRewards", "You're earning the maximum rewards.")}
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="relative mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("profile.achievements", "Achievements")}</div>
            <div className="text-xl font-semibold tabular-nums">{achievements.unlockedCount}/{achievements.total}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("profile.totalSpent", "Total spent")}</div>
            <div className="text-xl font-semibold tabular-nums">{formatPrice(stats.totalSpent, currency)}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("profile.completedOrders", "Completed orders")}</div>
            <div className="text-xl font-semibold tabular-nums">{stats.completedOrders}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("profile.referrals", "Referrals")}</div>
            <div className="text-xl font-semibold tabular-nums">{stats.referralCount}</div>
          </div>
        </div>
      </div>

      {/* Achievements grid */}
      <div className="rounded-2xl border border-border/60 bg-background p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Award className="h-4 w-4 text-amber-500" /> {t("profile.achievements", "Achievements")}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {achievements.unlockedCount}/{achievements.total} {t("profile.unlocked", "unlocked")}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("profile.achievementDescription", "Unlock milestones to earn bonus loyalty points. Each tier-up unlocks bigger rewards.")}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Unlocked first */}
          {achievements.unlocked.map((a) => (
            <div
              key={a.type}
              className="relative flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-2xl">
                {a.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-foreground">{a.label}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                </div>
                <div className="text-xs text-muted-foreground">{a.description}</div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700">
                    +{a.bonus} pts
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(a.unlockedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Locked */}
          {achievements.locked.map((a) => (
            <div
              key={a.type}
              className="relative flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 opacity-90 grayscale"
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background/60 text-2xl">
                {a.icon}
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground nov-ring">
                  <Lock className="h-2.5 w-2.5" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-muted-foreground">{a.label}</div>
                <div className="text-xs text-muted-foreground/80">{a.description}</div>
                {/* Progress bar (hidden for binary achievements like early_adopter) */}
                {a.target > 0 && (
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        {a.type.includes("spent")
                          ? `${formatPrice(a.current, currency)} / ${formatPrice(a.target, currency)}`
                          : `${a.current} / ${a.target}`}
                      </span>
                      <span className="tabular-nums">{Math.round(a.progress * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-muted-foreground/50 transition-all duration-700"
                        style={{ width: `${Math.max(2, Math.round(a.progress * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
                {a.target === 0 && (
                  <div className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" /> {t("profile.locked", "Locked")}
                  </div>
                )}
                <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                  +{a.bonus} {t("profile.pointsOnUnlock", "pts on unlock")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Points history */}
      <div className="rounded-2xl border border-border/60 bg-background p-6">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Trophy className="h-4 w-4 text-primary" /> {t("profile.pointsHistory", "Points history")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("profile.pointsDescription", "Last 20 loyalty point entries.")}</p>

        <div className="mt-4 flex flex-col gap-2">
          {recentPoints.length > 0 ? recentPoints.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    p.points >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                  )}
                >
                  {p.points >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{reasonLabel(p.reason)}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {new Date(p.createdAt).toLocaleString()}
                    {p.orderId && ` · ${t("profile.linkedOrder", "linked to order")}`}
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  p.points >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {p.points >= 0 ? "+" : ""}{p.points.toLocaleString()} pts
              </span>
            </div>
          )) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("profile.noPoints", "No points yet. Place your first order to start earning.")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
