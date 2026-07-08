"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Mail,
  Lock,
  User,
  Globe,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useApp } from "./app-store";
import { Field, PasswordStrength, SocialButton } from "./auth-fields";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";
import { LegalPages, type LegalPageType } from "./legal-pages";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

const COUNTRIES = [
  "Mexico", "United States", "Brazil", "Argentina", "Spain", "Colombia",
  "Chile", "Peru", "United Kingdom", "Germany", "France", "India", "Japan",
];
const CURRENCIES = ["USD", "EUR", "MXN", "BRL", "ARS", "COP", "GBP", "INR"];
const LANGUAGES = ["English", "Español", "Português", "Français", "Deutsch"];

export function RegisterScreen() {
  const { setView, setOnboardingStep } = useApp();
  const [legalPageOpen, setLegalPageOpen] = useState<LegalPageType | null>(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
    country: "Mexico",
    currency: "USD",
    language: "English",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email);
  const usernameValid = /^[a-zA-Z0-9_]{3,}$/.test(form.username);
  const pwValid = form.password.length >= 8;
  const confirmValid = form.confirm.length > 0 && form.confirm === form.password;
  const nameValid = form.name.trim().length >= 2;
  const canSubmit =
    nameValid && usernameValid && emailValid && pwValid && confirmValid && !loading;

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    // signIn redirects to Google's consent screen, then back to "/".
    // NextAuth + PrismaAdapter will create the user account on first login.
    await signIn("google", { callbackUrl: "/" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Register
      await api.post("/api/auth/register", {
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password,
        confirm: form.confirm,
        country: form.country,
        currency: form.currency,
        language: form.language,
      });

      // 2. Auto-login with NextAuth (C-3 fix: redirect:false so onboarding shows)
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
        callbackUrl: "/",
      });

      // 3. If login succeeded, set onboarding flag + reload to pick up session
      if (result && !result.error) {
        // Set a flag so app-view.tsx knows to show onboarding after reload
        sessionStorage.setItem("novsmm_show_onboarding", "true");
        window.location.href = "/";
      } else {
        // Login failed after registration — go to login screen
        setView("login");
      }
    } catch (e: any) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 nov-grid-bg nov-radial-fade opacity-60" />
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute left-[8%] bottom-[8%] h-[280px] w-[280px] rounded-full bg-emerald-400/10 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[460px]"
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
              Create your workspace
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              Start automating in minutes. No credit card required.
            </p>
          </div>

          <div className="my-6">
            <SocialButton
              onClick={handleGoogle}
              loading={googleLoading}
              label="Sign up with Google"
            />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              or sign up with email
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

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Full name"
                icon={<User className="h-4 w-4" />}
                placeholder="Daniela Ríos"
                value={form.name}
                onChange={update("name")}
                valid={nameValid}
              />
              <Field
                label="Username"
                icon={<span className="text-sm font-medium">@</span>}
                placeholder="daniela"
                value={form.username}
                onChange={update("username")}
                valid={usernameValid}
                error={
                  form.username.length > 0 && !usernameValid
                    ? "3+ chars, letters/numbers/_"
                    : undefined
                }
              />
            </div>

            <Field
              label="Email"
              icon={<Mail className="h-4 w-4" />}
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={update("email")}
              valid={emailValid}
              error={
                form.email.length > 0 && !emailValid
                  ? "Enter a valid email address"
                  : undefined
              }
            />

            <div>
              <Field
                label="Password"
                icon={<Lock className="h-4 w-4" />}
                type="password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={update("password")}
                valid={pwValid && form.password.length > 0}
              />
              <PasswordStrength value={form.password} />
            </div>

            <Field
              label="Confirm password"
              icon={<Lock className="h-4 w-4" />}
              type="password"
              placeholder="Re-enter password"
              value={form.confirm}
              onChange={update("confirm")}
              valid={confirmValid}
              error={
                form.confirm.length > 0 && !confirmValid
                  ? "Passwords don't match"
                  : undefined
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SelectField
                label="Country"
                icon={<Globe className="h-3.5 w-3.5" />}
                value={form.country}
                onChange={update("country")}
                options={COUNTRIES}
              />
              <SelectField
                label="Currency"
                value={form.currency}
                onChange={update("currency")}
                options={CURRENCIES}
              />
              <SelectField
                label="Language"
                value={form.language}
                onChange={update("language")}
                options={LANGUAGES}
              />
            </div>

            <Magnetic as="div" strength={0.15} className="mt-2 block w-full">
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all",
                  canSubmit
                    ? "bg-primary text-primary-foreground hover:nov-shadow-blue"
                    : "cursor-not-allowed bg-muted text-muted-foreground"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </Magnetic>

            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              By creating an account you agree to our{" "}
              <button
                type="button"
                onClick={() => setLegalPageOpen("terms")}
                className="underline transition-colors hover:text-foreground"
              >
                Terms
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setLegalPageOpen("privacy")}
                className="underline transition-colors hover:text-foreground"
              >
                Privacy Policy
              </button>
              .
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => setView("login")}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3 w-3 text-emerald-500" />
            Free 14-day trial
          </span>
          <span>·</span>
          <span>No credit card</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            Cancel anytime
          </span>
        </div>
      </motion.div>

      <LegalPages page={legalPageOpen} onClose={() => setLegalPageOpen(null)} />
    </motion.div>
  );
}

function SelectField({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="relative flex items-center gap-2 rounded-xl border border-border bg-background px-3 transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <select
          value={value}
          onChange={onChange}
          className="h-11 w-full appearance-none bg-transparent text-sm text-foreground focus:outline-none"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </label>
  );
}
