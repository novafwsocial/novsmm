"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, Lock, ArrowRight, ArrowLeft, Sparkles, Loader2, X, CheckCircle2 } from "lucide-react";
import { useApp } from "./app-store";
import { Field, SocialButton } from "./auth-fields";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

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
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const pwValid = password.length >= 1;

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
      // Use redirect: false so we get the result and can handle errors.
      // With redirect: true, signIn() never returns — if the redirect is
      // slow or fails (common behind reverse proxies), the button stays
      // on "Signing in..." forever.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      clearTimeout(safetyTimeout);

      if (result?.error) {
        // NextAuth returns error: "CredentialsSignin" for wrong credentials
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      // Success — session cookie is now set. Do a full page reload so the
      // app-view picks up the new session and shows the dashboard.
      // Using reload() instead of redirect avoids URL construction issues
      // behind reverse proxies.
      window.location.reload();
    } catch (err: any) {
      clearTimeout(safetyTimeout);
      setError("Login failed. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const handleSocial = async (provider: string) => {
    setLoading(true);
    setError(null);
    if (provider === "telegram" || provider === "apple") {
      setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login is coming soon. Please use email or Google.`);
      setLoading(false);
      return;
    }
    await signIn(provider, { callbackUrl: "/" });
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
        className="relative w-full max-w-[440px]"
      >
        <button
          onClick={() => setView("landing")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </button>

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-7 backdrop-blur-xl nov-ring-lg sm:p-8">
          <div className="flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-balance">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              Sign in to your NOVSMM workspace
            </p>
          </div>

          {/* Social */}
          <div className="mt-7 grid grid-cols-4 gap-2">
            <SocialButton provider="google" onClick={() => handleSocial("google")} />
            <SocialButton provider="discord" onClick={() => handleSocial("discord")} />
            <SocialButton provider="telegram" onClick={() => handleSocial("telegram")} />
            <SocialButton provider="apple" onClick={() => handleSocial("apple")} />
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              or continue with email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

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
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
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
            SOC 2 controls
          </span>
          <span>·</span>
          <span>256-bit encryption</span>
          <span>·</span>
          <span>99.99% uptime</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {showForgot && (
          <ForgotPasswordModal onClose={() => setShowForgot(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
