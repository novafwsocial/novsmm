"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useApp } from "./app-store";
import { Field, SocialButton } from "./auth-fields";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";

export function LoginScreen() {
  const { setView, signIn } = useApp();
  const [email, setEmail] = useState("daniela@pulsemedia.io");
  const [password, setPassword] = useState("novsmm2024");
  const [remember, setRemember] = useState(true);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const pwValid = password.length >= 6;

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12"
    >
      {/* Background continues from landing — same grid + soft glows */}
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
        {/* back to landing */}
        <button
          onClick={() => setView("landing")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </button>

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-7 backdrop-blur-xl nov-ring-lg sm:p-8">
          {/* Header */}
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
            <SocialButton provider="google" onClick={() => signIn()} />
            <SocialButton provider="discord" onClick={() => signIn()} />
            <SocialButton provider="telegram" onClick={() => signIn()} />
            <SocialButton provider="apple" onClick={() => signIn()} />
          </div>

          {/* divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              or continue with email
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
            className="flex flex-col gap-4"
          >
            <Field
              label="Email or username"
              icon={<Mail className="h-4 w-4" />}
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              valid={emailValid && email.length > 0}
              error={
                email.length > 0 && !emailValid
                  ? "Enter a valid email address"
                  : undefined
              }
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
                className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
              >
                Forgot password?
              </a>
            </div>

            <Magnetic as="button" strength={0.15} className="mt-1 block w-full">
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </span>
            </Magnetic>
          </form>

          {/* switch to register */}
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

        {/* trust footer */}
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
    </motion.div>
  );
}
