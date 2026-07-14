"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, Lock, ArrowRight, ArrowLeft, Sparkles, Loader2, X, CheckCircle2, Shield } from "lucide-react";
import { useApp } from "./app-store";
import { Field, SocialButton, type SocialProviderId } from "./auth-fields";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

/**
 * BROAD-FIX-BATCH-1: fetch the list of OAuth providers that the admin has
 * configured (via env vars or the admin panel). We render one
 * "Continue with X" button per configured provider — unconfigured providers
 * are hidden so users never click a button that fails.
 *
 * Falls back to ["google"] if the request fails (e.g. during build), which
 * is a safe no-op since the Google button just triggers a redirect.
 */
function useConfiguredSocialProviders() {
  const [providers, setProviders] = useState<SocialProviderId[]>([]);
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ providers: string[] }>("/api/auth/social-providers")
      .then((data) => {
        if (cancelled) return;
        const valid = (data?.providers ?? []).filter((p) =>
          ["google", "facebook", "github", "twitter"].includes(p)
        ) as SocialProviderId[];
        setProviders(valid);
      })
      .catch(() => {
        // Network/DB error — leave providers empty (no social buttons shown).
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return providers;
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return;
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
      toast({
        title: "Reset link sent",
        description: "If that email exists, a reset link has been sent.",
      });
    } catch (err: any) {
      toast({
        title: "Request failed",
        description: err?.message ?? "Please try again in a moment.",
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
      aria-label="Forgot password"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {sent ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Check your inbox</h2>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              If that email exists, a reset link has been sent.
            </p>
            <button
              onClick={onClose}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Reset your password</h2>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              Enter your account email and we&apos;ll send you a secure link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <Field
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                valid={emailValid && email.length > 0}
              />
              <button
                type="submit"
                disabled={loading || !emailValid}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending link…
                  </>
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
            <button
              onClick={onClose}
              className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { setView } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  // BROAD-FIX-BATCH-1: render a button per configured OAuth provider.
  const socialProviders = useConfiguredSocialProviders();
  const [socialLoading, setSocialLoading] = useState<SocialProviderId | null>(null);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const pwValid = password.length >= 1;
  const totpValid = /^\d{6}$/.test(totp);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Safety timeout: if signIn doesn't respond in 15s, reset the loading
    // state so the user can try again (instead of being stuck forever)
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      setError("Login timed out. Please check your connection and try again.");
    }, 15_000);

    try {
      // Use redirect: false so we get the result and can handle errors + 2FA flow.
      const result = await signIn("credentials", {
        email,
        password,
        totp: totp || undefined,
        redirect: false,
      });

      clearTimeout(safetyTimeout);

      if (result?.error) {
        if (result.error === "2FA_REQUIRED") {
          // Password was correct but 2FA is required — show the TOTP input
          setNeeds2FA(true);
          setError(null);
          setLoading(false);
          return;
        }
        // A-4 FIX: The server now returns "CredentialsSignin" (generic) for
        // BOTH wrong password AND wrong 2FA code (to prevent threshold
        // detection). When the user is in the 2FA step, show a 2FA-specific
        // message. When in the password step, show a password-specific message.
        // The server error is the same in both cases — the frontend decides
        // which UX message to show based on the current step.
        if (needs2FA) {
          setError("Invalid 2FA code. Please try again.");
        } else {
          setError("Invalid email or password. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Success — session cookie is now set. Redirect to /?authed=1 so the
      // app-view forces the dashboard view even if session polling hasn't
      // picked up the new cookie yet (fixes "login redirects to landing" bug).
      window.location.href = "/?authed=1";
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      setError("Login failed. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleSocial = async (provider: SocialProviderId) => {
    setSocialLoading(provider);
    setError(null);
    // FIX: callbackUrl includes ?authed=1 so the frontend knows this is a
    // post-OAuth redirect and should force-redirect to the dashboard even
    // if the session polling hasn't picked up the new cookie yet.
    await signIn(provider, { callbackUrl: "/?authed=1" });
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 nov-grid-bg nov-radial-fade opacity-60" />
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute right-[10%] bottom-[8%] h-[280px] w-[280px] rounded-full bg-emerald-400/10 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="auth-card-3d relative w-full max-w-[440px]"
      >
        <button
          onClick={() => setView("landing")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </button>

        <div className="auth-card-inner overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-7 backdrop-blur-xl nov-ring-lg sm:p-8">
          <div className="flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-balance">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              Sign in to your NOVSMM workspace
            </p>
          </div>

          {/* Social — render one button per configured OAuth provider. */}
          {socialProviders.length > 0 && (
            <div className="mt-7 flex flex-col gap-2.5">
              {socialProviders.map((p) => (
                <div key={p} className="social-btn-3d">
                  <SocialButton
                    provider={p}
                    onClick={() => handleSocial(p)}
                    loading={socialLoading === p}
                  />
                </div>
              ))}
            </div>
          )}

          {socialProviders.length > 0 && (
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                or continue with email
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          {socialProviders.length === 0 && <div className="mt-7" />}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-600"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="auth-input-3d">
              <Field
                label="Email or username"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                valid={emailValid && email.length > 0}
              />
            </div>
            <div className="auth-input-3d">
              <Field
                label="Password"
                icon={<Lock className="h-4 w-4" />}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                valid={pwValid && password.length > 0}
              />
            </div>

            {needs2FA && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-xl border border-primary/30 bg-primary/5 p-4"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  Two-factor authentication required
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app.
                </p>
                <Field
                  label="2FA code"
                  icon={<Shield className="h-4 w-4" />}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                  valid={totpValid && totp.length > 0}
                />
              </motion.div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRemember((r) => !r)}
                className="group inline-flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-md border transition-colors ${
                    remember
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background group-hover:border-foreground/40"
                  }`}
                >
                  {remember && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      viewBox="0 0 24 24"
                      className="h-2.5 w-2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                    >
                      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  )}
                </span>
                Remember me
              </button>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgot(true);
                }}
                className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
              >
                Forgot password?
              </a>
            </div>

            <Magnetic as="div" strength={0.15} className="mt-1 block w-full">
              <button
                type="submit"
                disabled={loading || (needs2FA && !totpValid)}
                className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : needs2FA ? (
                  <>
                    Verify &amp; sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </Magnetic>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => setView("register")}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create one
            </button>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            SOC 2-aligned controls
          </span>
          <span>·</span>
          <span>256-bit encryption</span>
          <span>·</span>
          <span>99.9% uptime</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {showForgot && (
          <ForgotPasswordModal onClose={() => setShowForgot(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
