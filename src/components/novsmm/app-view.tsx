"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Loader2, X, Lock, CheckCircle2, ArrowRight, AlertCircle, LayoutDashboard } from "lucide-react";
import { useSession } from "@/hooks/use-api";
import { useApp } from "./app-store";
import { LoginScreen } from "./login-screen";
import { RegisterScreen } from "./register-screen";
import { OnboardingScreen } from "./onboarding-screen";
import { DashboardShell } from "./dashboard-shell";
import { DashboardHome } from "./dashboard-home";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Field } from "./auth-fields";
import { Magnetic } from "./magnetic";
import { cn } from "@/lib/utils";

// ── Lazy load heavy components for better initial load ──
const DashboardAnalytics = dynamic(() => import("./dashboard-analytics").then(m => ({ default: m.DashboardAnalytics })), { loading: () => <TabLoader /> });
const DashboardMarketplace = dynamic(() => import("./dashboard-marketplace").then(m => ({ default: m.DashboardMarketplace })), { loading: () => <TabLoader /> });
const DashboardOrders = dynamic(() => import("./dashboard-orders").then(m => ({ default: m.DashboardOrders })), { loading: () => <TabLoader /> });
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
  const { data: session, isLoading } = useSession();
  const { view, dashboardTab, setAuthed, setAuthLoading, setView, authed, browsingLanding, setBrowsingLanding } = useApp();
  const { resetToken, setResetToken } = useUrlParamHandlers();

  // Sync auth state with session
  useEffect(() => {
    setAuthLoading(isLoading);
    const isAuthed = !!session?.user;
    if (isAuthed !== authed) {
      setAuthed(isAuthed, session?.user as any);
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
    // If session is lost (e.g. token expired), return to landing.
    if (!isAuthed && !isLoading && (view === "dashboard" || view === "onboarding")) {
      setView("landing");
      setBrowsingLanding(false);
    }
  }, [session, isLoading, view, authed, browsingLanding, setAuthed, setAuthLoading, setView, setBrowsingLanding]);

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
      {/* Use a single motion.div with key to trigger re-mount on view change.
          No exit animations — prevents "insertBefore" DOM errors. */}
      <motion.div
        key={motionKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>

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
        className="fixed bottom-6 left-6 z-[90] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <LayoutDashboard className="h-4 w-4" />
        Back to dashboard
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-[90] flex items-center gap-3 rounded-2xl border border-border/60 bg-background/95 p-3 pr-4 shadow-xl backdrop-blur-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <LayoutDashboard className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">You&apos;re signed in</div>
        <div className="text-xs text-muted-foreground">Your session is active.</div>
      </div>
      <button
        onClick={handleBack}
        className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Dashboard
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
