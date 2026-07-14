"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Loader2, X, Lock, CheckCircle2, ArrowRight, AlertCircle, LayoutDashboard } from "lucide-react";
import { useSession } from "@/hooks/use-api";
import { useApp } from "./app-store";
import { LoginScreen } from "./login-screen";
import { RegisterScreen } from "./register-screen";
import { OnboardingScreen } from "./onboarding-screen";
import { WelcomeScreen } from "./welcome-screen";
import { DashboardShell } from "./dashboard-shell";
const DashboardHome = dynamic(() => import("./dashboard-home").then(m => ({ default: m.DashboardHome })), { loading: () => <TabLoader /> });
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Field } from "./auth-fields";
import { Magnetic } from "./magnetic";
import { cn } from "@/lib/utils";

// ── Lazy load heavy components for better initial load ──
const DashboardAnalytics = dynamic(() => import("./dashboard-analytics").then(m => ({ default: m.DashboardAnalytics })), { loading: () => <TabLoader /> });
const DashboardMarketplace = dynamic(() => import("./dashboard-marketplace").then(m => ({ default: m.DashboardMarketplace })), { loading: () => <TabLoader /> });
const DashboardOrders = dynamic(() => import("./dashboard-orders").then(m => ({ default: m.DashboardOrders })), { loading: () => <TabLoader /> });
const DashboardSubscriptions = dynamic(() => import("./dashboard-subscriptions").then(m => ({ default: m.DashboardSubscriptions })), { loading: () => <TabLoader /> });
const DashboardChildPanels = dynamic(() => import("./dashboard-child-panels").then(m => ({ default: m.DashboardChildPanels })), { loading: () => <TabLoader /> });
const DashboardWallet = dynamic(() => import("./dashboard-wallet").then(m => ({ default: m.DashboardWallet })), { loading: () => <TabLoader /> });
const DashboardTickets = dynamic(() => import("./dashboard-tickets").then(m => ({ default: m.DashboardTickets })), { loading: () => <TabLoader /> });
const DashboardNotifications = dynamic(() => import("./dashboard-notifications").then(m => ({ default: m.DashboardNotifications })), { loading: () => <TabLoader /> });
const DashboardProfile = dynamic(() => import("./dashboard-profile").then(m => ({ default: m.DashboardProfile })), { loading: () => <TabLoader /> });
const AdminPanel = dynamic(() => import("./admin-panel").then(m => ({ default: m.AdminPanel })), { loading: () => <TabLoader /> });

function TabLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

// ── URL param handling ─────────────────────────────────────────────────
// On mount we inspect window.location.search for one of:
//   ?verify=<token>     → POST /api/auth/verify-email
//   ?reset=<token>      → show the ResetPasswordModal
// `history.replaceState` strips the param from the URL after handling.

function stripParam(key: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  const newPath = `${url.pathname}${url.search ? `?${url.searchParams.toString()}` : ""}${url.hash}`;
  window.history.replaceState({}, document.title, newPath);
}

function useUrlParamHandlers() {
  const { toast } = useToast();
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const verify = params.get("verify");
    const reset = params.get("reset");
    // FIX (OAuth): NextAuth redirects to /?error=... when OAuth fails.
    // Previously the frontend ignored this param, so the user just saw
    // the landing page with no explanation. Now we show a toast.
    const oauthError = params.get("error");

    if (verify) {
      (async () => {
        try {
          await api.post("/api/auth/verify-email", { token: verify });
          toast({ title: "Email verified!", description: "Thanks for confirming your address." });
        } catch (e: any) {
          toast({
            title: "Verification failed",
            description: e?.message ?? "The link is invalid or expired.",
            variant: "destructive",
          });
        } finally {
          stripParam("verify");
        }
      })();
    }

    if (reset) {
      setResetToken(reset);
      stripParam("reset");
    }

    if (oauthError) {
      // Map common NextAuth error codes to human-readable messages.
      const errorMessages: Record<string, string> = {
        OAuthSignin: "Could not start Google sign-in. Please try again.",
        OAuthCallback: "Google sign-in failed. The credentials may be misconfigured.",
        OAuthCreateAccount: "Could not create your account with Google. Please try again or use email sign-up.",
        EmailCreateAccount: "Could not create your account. Please try again.",
        Callback: "Sign-in callback failed. Please try again.",
        Configuration: "Server configuration error. Please contact support.",
        AccessDenied: "Access denied. If this is unexpected, please contact support.",
        Verification: "The sign-in link is invalid or expired.",
        default: "Sign-in failed. Please try again or use a different method.",
      };
      const message = errorMessages[oauthError] ?? errorMessages.default;
      toast({
        title: "Sign-in failed",
        description: message,
        variant: "destructive",
      });
      stripParam("error");
    }
  }, []);

  return { resetToken, setResetToken };
}

// ── Reset password modal ───────────────────────────────────────────────
function ResetPasswordModal({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { setView } = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const pwValid = password.length >= 8;
  const confirmValid = confirm.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwValid || !confirmValid) return;
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
      toast({
        title: "Password reset",
        description: "You can now sign in with your new password.",
      });
      setTimeout(() => {
        onClose();
        setView("login");
      }, 1400);
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err?.message ?? "The link is invalid or expired.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reset password"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Password updated</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Taking you to the sign-in screen…
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Reset your password</h2>
                <p className="text-xs text-muted-foreground">Choose a new password for your account.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <Field
                label="New password"
                icon={<Lock className="h-4 w-4" />}
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                valid={pwValid && password.length > 0}
              />
              <Field
                label="Confirm password"
                icon={<Lock className="h-4 w-4" />}
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                valid={confirmValid}
              />
              {confirm && !confirmValid && (
                <div className="-mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" /> Passwords don&apos;t match
                </div>
              )}
              <Magnetic as="button" strength={0.2}>
                <span
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue",
                    (loading || !pwValid || !confirmValid) && "opacity-60"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Resetting…
                    </>
                  ) : (
                    <>
                      Reset password <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </span>
              </Magnetic>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Top-level view router — now driven by the REAL NextAuth session.
 *
 * Session persistence rules:
 * - An authenticated user NEVER loses their session by navigating.
 * - The session is only cleared by an explicit signOut() call.
 * - Authed users can browse the public landing page (browsingLanding=true)
 *   without being signed out — a floating "Back to dashboard" button brings
 *   them back to the dashboard.
 * - The auto-redirect to dashboard only fires on initial load (when the user
 *   lands on "/" with a session but hasn't explicitly asked to see the landing).
 */
export function AppView({ landing }: { landing: ReactNode }) {
  const { data: session, isLoading, refetch: refetchSession } = useSession();
  const { view, dashboardTab, setAuthed, setAuthLoading, setView, authed, browsingLanding, setBrowsingLanding, setOnboardingStep, welcomeVariant, setWelcomeVariant } = useApp();
  const { resetToken, setResetToken } = useUrlParamHandlers();

  // Sync auth state with session
  useEffect(() => {
    setAuthLoading(isLoading);
    const isAuthed = !!session?.user;
    if (isAuthed !== authed) {
      setAuthed(isAuthed, session?.user as any);
    }

    // C-3 fix: Check if we just registered and need to show onboarding.
    // FIX: Show the "register" welcome screen FIRST (celebratory), then
    // proceed to onboarding. The welcome screen's onComplete will trigger
    // the onboarding flow via the novsmm_show_onboarding flag being preserved.
    const showOnboarding = typeof window !== "undefined" && sessionStorage.getItem("novsmm_show_onboarding") === "true";
    if (showOnboarding && isAuthed && view !== "onboarding" && welcomeVariant !== "register") {
      // Show the register welcome screen first — when the user clicks
      // "Continue", the welcomeVariant clears and we fall through to the
      // onboarding check again (the flag is still set).
      setWelcomeVariant("register");
      // Don't remove the onboarding flag yet — it's consumed after the welcome
      return;
    }
    // If welcome was just dismissed (welcomeVariant became null) but the
    // onboarding flag is still set, now show the onboarding flow.
    if (showOnboarding && isAuthed && view !== "onboarding") {
      sessionStorage.removeItem("novsmm_show_onboarding");
      setOnboardingStep(0);
      setView("onboarding");
      return;
    }

    // FIX (OAuth redirect): After a successful OAuth login, NextAuth redirects
    // to /?authed=1 (we set this as the callbackUrl in login/register screens).
    // When we see this param, we set a "post-login" flag in sessionStorage
    // that prevents the "session lost → redirect to landing" logic from
    // firing for 10 seconds, giving the session cookie time to be detected.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("authed") === "1") {
        // Set a post-login flag with a timestamp (valid for 10 seconds)
        sessionStorage.setItem("novsmm_post_login", Date.now().toString());
        // FIX: Set a "show welcome" flag so the welcome screen appears once
        // the session is detected. We don't call setWelcomeVariant here
        // because isAuthed might still be false at this point (the session
        // cookie hasn't been detected yet). The flag is consumed below when
        // isAuthed becomes true.
        if (!showOnboarding) {
          sessionStorage.setItem("novsmm_show_welcome_login", "true");
        }
        setBrowsingLanding(false);
        if (view !== "dashboard") {
          setView("dashboard");
        }
        // Strip the param so a manual refresh doesn't force-redirect again
        params.delete("authed");
        const newSearch = params.toString();
        const newPath = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}${window.location.hash}`;
        window.history.replaceState({}, document.title, newPath);
        return;
      }
    }

    // FIX: Show the "login" welcome screen once the session is detected AND
    // the novsmm_show_welcome_login flag is set (from the ?authed=1 redirect).
    if (
      isAuthed &&
      welcomeVariant === null &&
      typeof window !== "undefined" &&
      sessionStorage.getItem("novsmm_show_welcome_login") === "true"
    ) {
      sessionStorage.removeItem("novsmm_show_welcome_login");
      setWelcomeVariant("login");
    }

    // Only auto-redirect to dashboard on the very first load when the user
    // is authed but still on the landing view AND hasn't explicitly chosen
    // to browse the landing page (browsingLanding=false).
    // Once they explicitly navigate to the landing (via Exit/Home button),
    // browsingLanding=true and we respect their choice.
    if (isAuthed && view === "landing" && !browsingLanding) {
      setView("dashboard");
    }
    // If an authed user somehow lands on login/register (e.g. clicked "Sign in"
    // while browsing the landing), send them to the dashboard — they're already
    // signed in, no need to login again.
    if (isAuthed && (view === "login" || view === "register")) {
      setBrowsingLanding(false);
      setView("dashboard");
    }

    // FIX: Check if we're in a post-login grace period (10 seconds after
    // login redirect). During this period, DON'T redirect to landing even
    // if the session hasn't been detected yet — the cookie might still be
    // propagating. If the grace period expires and there's still no session,
    // THEN redirect to landing.
    const postLoginTs = typeof window !== "undefined" ? sessionStorage.getItem("novsmm_post_login") : null;
    const inPostLoginGrace = postLoginTs && (Date.now() - parseInt(postLoginTs, 10)) < 10_000;

    if (inPostLoginGrace && isAuthed) {
      // Session detected during grace period — clear the flag
      sessionStorage.removeItem("novsmm_post_login");
    }

    // If session is lost (e.g. token expired), return to landing.
    // BUT: skip this redirect if we're in the post-login grace period and
    // the session is still loading — the cookie might not be detected yet.
    if (!isAuthed && !isLoading && (view === "dashboard" || view === "onboarding")) {
      if (inPostLoginGrace) {
        // Grace period active but session not detected yet — force a refetch.
        // The cookie might not have been detected on the first fetch.
        refetchSession();
      } else {
        // No grace period, session definitively lost — redirect to landing
        setView("landing");
        setBrowsingLanding(false);
      }
    }
  }, [session, isLoading, view, authed, browsingLanding, setAuthed, setAuthLoading, setView, setBrowsingLanding, setOnboardingStep, refetchSession]);

  const isAuthed = !!session?.user;

  // Determine what to render. Use simple conditional rendering instead of
  // AnimatePresence mode="wait" to avoid DOM "insertBefore" errors that
  // occur when framer-motion tries to reconcile rapid state changes
  // (e.g. session loading → authed → dashboard).
  let content: ReactNode = null;
  let motionKey = "loading";

  if (isLoading && !isAuthed) {
    // Loading state — show nothing (landing will appear once loaded)
    motionKey = "loading";
    content = landing;
  } else if (isAuthed && view === "dashboard") {
    motionKey = "dashboard";
    content = (
      <DashboardShell>
        {dashboardTab === "home" && <DashboardHome />}
        {dashboardTab === "analytics" && <DashboardAnalytics />}
        {dashboardTab === "marketplace" && <DashboardMarketplace />}
        {dashboardTab === "orders" && <DashboardOrders />}
        {dashboardTab === "subscriptions" && <DashboardSubscriptions />}
        {dashboardTab === "child-panels" && <DashboardChildPanels />}
        {dashboardTab === "wallet" && <DashboardWallet />}
        {dashboardTab === "tickets" && <DashboardTickets />}
        {dashboardTab === "notifications" && <DashboardNotifications />}
        {dashboardTab === "profile" && <DashboardProfile />}
        {dashboardTab === "admin" && <AdminPanel />}
      </DashboardShell>
    );
  } else if (isAuthed && view === "onboarding") {
    motionKey = "onboarding";
    content = <OnboardingScreen />;
  } else if (isAuthed && view === "landing" && browsingLanding) {
    motionKey = "landing-authed";
    content = (
      <>
        {landing}
        <BackToDashboardButton />
      </>
    );
  } else if (!isAuthed) {
    motionKey = view;
    content = (
      <>
        {view === "login" && <LoginScreen />}
        {view === "register" && <RegisterScreen />}
        {(view === "landing" || (!isAuthed && isLoading)) && landing}
      </>
    );
  }

  return (
    <>
      {/* FIX: Removed motion.div — framer-motion causes "removeChild" DOM
          errors when view changes rapidly (login → dashboard). Using a
          plain div with CSS animation instead. */}
      <div
        key={motionKey}
        className="tab-content-enter"
      >
        {content}
      </div>

      {/* Welcome screen overlay — shown after successful login or registration.
          Two variants: "login" (welcome back, auto-advances after 3s) and
          "register" (celebratory, waits for user to click Continue). */}
      {welcomeVariant && isAuthed && session?.user && (
        <WelcomeScreen
          variant={welcomeVariant}
          userName={(session.user as any).name || (session.user as any).email || "there"}
          userEmail={(session.user as any).email || ""}
          onComplete={() => setWelcomeVariant(null)}
        />
      )}

      {/* Reset password modal — overlay regardless of session state */}
      {resetToken && (
        <ResetPasswordModal
          token={resetToken}
          onClose={() => setResetToken(null)}
        />
      )}
    </>
  );
}

/**
 * Floating "Back to dashboard" button shown when an authenticated user is
 * browsing the public landing page. One click returns them to the dashboard
 * without any login flow — the session is still active.
 */
function BackToDashboardButton() {
  const { setView, setBrowsingLanding } = useApp();
  const [dismissed, setDismissed] = useState(false);

  const handleBack = () => {
    setBrowsingLanding(false);
    setView("dashboard");
  };

  if (dismissed) {
    // Collapsed — small floating pill to bring back the full banner
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-24 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <LayoutDashboard className="h-4 w-4" />
        Back to dashboard
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-2xl border border-border/60 bg-background/95 p-3 pr-4 shadow-xl backdrop-blur-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <LayoutDashboard className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">You&apos;re signed in</div>
        <div className="text-xs text-muted-foreground">Your session is active.</div>
      </div>
      <button
        onClick={handleBack}
        className="ml-2 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Dashboard
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
