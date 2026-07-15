"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { PartyPopper, ArrowRight, Wallet, Headphones, Globe, Hand } from "lucide-react";
import { Logo } from "./logo";
import { Magnetic } from "./magnetic";

/**
 * WelcomeScreen
 * -------------
 * Transient full-screen welcome overlay shown immediately after a successful
 * login or registration, before the dashboard mounts.
 *
 * Two variants:
 *   • "register" — celebratory but restrained: floating brand-only dots,
 *                  PartyPopper icon, feature highlights; waits for the user
 *                  to click "Continue to dashboard".
 *   • "login"    — subtle: gentle icon float + Hand icon, auto-advances
 *                  after 3s (but the user can also click to advance).
 *
 * Design notes (aligned with the NOVSMM landing DNA):
 *   - Light canvas (`bg-background`) with `nov-grid-bg` + `nov-radial-fade`.
 *   - Card uses `auth-card-3d` / `auth-card-inner` 3D wrappers with a light
 *     surface: `border-border/60 bg-background/95 backdrop-blur-2xl nov-ring-lg`.
 *   - Single accent: electric blue (`primary`) for actions/icons-on-hover;
 *     emerald for positive states (verified-email chip, pulse-dot).
 *   - Pill-shaped CTA wrapped in `<Magnetic>`, `hover:nov-shadow-blue` only
 *     (no animated shadow loop).
 *   - Giant ghost "NOVSMM" wordmark behind the card (footer DNA).
 *   - Subtle CSS-driven floating dots (register only) — no saturated confetti.
 *   - Respects `prefers-reduced-motion`.
 */

export interface WelcomeScreenProps {
  variant: "login" | "register";
  userName: string;
  userEmail: string;
  onComplete: () => void;
}

const LOGIN_AUTO_ADVANCE_MS = 3000;

// Feature highlights shown only on the register variant.
const REGISTER_FEATURES = [
  {
    icon: Wallet,
    title: "Wallet ready",
    desc: "Top up & start ordering in seconds",
  },
  {
    icon: Headphones,
    title: "24/7 support",
    desc: "Real humans, any time zone",
  },
  {
    icon: Globe,
    title: "Global payments",
    desc: "Multi-currency payouts",
  },
] as const;

// Subtle, brand-only floating dots (register only). CSS-driven via the
// existing `float-3d` keyframe — no saturated rainbow confetti.
const FLOATING_DOTS = [
  { left: "9%", top: "20%", size: 8, color: "bg-primary/15", delay: 0, dur: 7 },
  { left: "86%", top: "24%", size: 6, color: "bg-emerald-500/20", delay: 0.6, dur: 8.5 },
  { left: "14%", top: "76%", size: 10, color: "bg-emerald-500/15", delay: 1.2, dur: 9 },
  { left: "83%", top: "72%", size: 7, color: "bg-primary/15", delay: 0.3, dur: 7.5 },
  { left: "48%", top: "12%", size: 5, color: "bg-primary/20", delay: 0.9, dur: 10 },
  { left: "24%", top: "44%", size: 4, color: "bg-emerald-500/20", delay: 1.6, dur: 11 },
  { left: "74%", top: "48%", size: 5, color: "bg-primary/15", delay: 0.4, dur: 9.5 },
] as const;

export function WelcomeScreen({
  variant,
  userName,
  userEmail,
  onComplete,
}: WelcomeScreenProps) {
  const isRegister = variant === "register";
  const reduceMotion = useReducedMotion();

  // Derive a friendly first name from userName (cheap; no memo needed).
  const cleanedName = (userName || "").trim();
  const firstName = cleanedName ? cleanedName.split(/\s+/)[0] : "there";

  // Guard against calling onComplete more than once (auto-advance + click race).
  const completedRef = useRef(false);
  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  // Login auto-advance countdown.
  const [remaining, setRemaining] = useState(
    Math.ceil(LOGIN_AUTO_ADVANCE_MS / 1000)
  );
  useEffect(() => {
    if (isRegister) return; // register waits for the user
    if (reduceMotion) {
      // Still auto-advance, just without the visible countdown ticking motion.
      const t = setTimeout(handleComplete, LOGIN_AUTO_ADVANCE_MS);
      return () => clearTimeout(t);
    }
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, LOGIN_AUTO_ADVANCE_MS - elapsed);
      setRemaining(Math.ceil(left / 1000));
      if (left <= 0) {
        clearInterval(tick);
        handleComplete();
      }
    }, 200);
    return () => clearInterval(tick);
     
  }, [isRegister, reduceMotion]);

  // Keyboard: Escape / Enter advances (friendly for keyboard users).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        handleComplete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
     
  }, []);

  // Simplified, landing-aligned motion variants.
  const containerVariants = {
    hidden: { opacity: 0, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1] as const,
        when: "beforeChildren",
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const headingId = "welcome-screen-heading";
  const Icon = isRegister ? PartyPopper : Hand;
  const iconLabel = isRegister ? "Celebration" : "Welcome";
  const eyebrow = isRegister ? "Welcome" : "Welcome back";

  return (
    <motion.main
      key="welcome-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      {/* sr-only context for screen readers */}
      <span className="sr-only">
        {isRegister
          ? `Registration successful. Welcome to NOVSMM, ${firstName}.`
          : `Login successful. Welcome back, ${firstName}.`}{" "}
        Press Enter or Escape to continue to your dashboard.
      </span>

      {/* Background layers — landing recipe (grid + subtle glow blobs) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 nov-grid-bg nov-radial-fade" />
        <div className="absolute left-1/2 top-[-10%] h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[130px]" />
        <div
          className={`absolute rounded-full blur-[120px] ${
            isRegister
              ? "right-[8%] top-[24%] h-[320px] w-[320px] bg-emerald-400/10"
              : "left-[10%] bottom-[12%] h-[300px] w-[300px] bg-primary/[0.05]"
          }`}
        />
      </div>

      {/* Giant ghost wordmark — footer DNA, behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center px-4"
      >
        <span className="select-none text-center text-[clamp(4rem,18vw,16rem)] font-bold leading-none tracking-tight text-foreground/[0.04]">
          NOVSMM
        </span>
      </div>

      {/* Subtle floating dots (register only, CSS-driven, brand-only palette) */}
      {isRegister && !reduceMotion && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          {FLOATING_DOTS.map((d, i) => (
            <span
              key={i}
              style={{
                left: d.left,
                top: d.top,
                width: d.size,
                height: d.size,
                animation: `float-3d ${d.dur}s ease-in-out ${d.delay}s infinite`,
              }}
              className={`absolute rounded-full ${d.color}`}
            />
          ))}
        </div>
      )}

      {/* Center card */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="auth-card-3d relative z-10 w-full max-w-[460px]"
      >
        {/* Soft outer glow — single-color, landing-level opacity */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-primary/[0.06] blur-[120px]"
        />

        <div className="auth-card-inner nov-grain relative overflow-hidden rounded-3xl border border-border/60 bg-background/95 p-8 backdrop-blur-2xl nov-ring-lg sm:p-10">
          {/* Logo chip — eyebrow-chip recipe */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 backdrop-blur-md">
              <Logo />
            </span>
          </motion.div>

          {/* Animated icon — spring scale + gentle float */}
          <motion.div variants={itemVariants} className="mt-7 flex justify-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: reduceMotion ? 0 : [0, -6, 0],
              }}
              transition={{
                scale: { type: "spring", stiffness: 220, damping: 16, delay: 0.2 },
                opacity: { duration: 0.3, delay: 0.2 },
                y: reduceMotion
                  ? undefined
                  : {
                      duration: 3.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.8,
                    },
              }}
              className="relative flex h-20 w-20 items-center justify-center"
            >
              {/* subtle halo glow */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl"
              />
              {/* thin halo ring */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl border border-primary/20"
              />
              {/* inner icon container — Stats/Services recipe */}
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted">
                <Icon className="h-7 w-7 text-primary" aria-label={iconLabel} />
              </span>
            </motion.div>
          </motion.div>

          {/* Eyebrow */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
          >
            {eyebrow}
          </motion.p>

          {/* Heading — nov-text-gradient (gray vertical gradient) */}
          <motion.h1
            id={headingId}
            variants={itemVariants}
            className="mt-2 text-center text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl"
          >
            <span className="nov-text-gradient">
              {isRegister ? "Welcome to NOVSMM" : "Welcome back"}
            </span>
          </motion.h1>

          {/* Big personalized line */}
          <motion.p
            variants={itemVariants}
            className="mt-3 text-center text-lg font-medium text-foreground/80"
          >
            {isRegister ? `Hi, ${firstName}.` : `Good to see you, ${firstName}.`}
          </motion.p>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground text-pretty"
          >
            {isRegister
              ? "Your workspace is ready. Let's set up your first campaign."
              : "Pick up right where you left off — your dashboard is ready."}
          </motion.p>

          {/* Verified-email chip — footer status-pill recipe */}
          <motion.div variants={itemVariants} className="mt-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="max-w-[260px] truncate">{userEmail || "—"}</span>
            </span>
          </motion.div>

          {/* Feature highlights (register only) — Stats/Services card recipe */}
          {isRegister && (
            <motion.div
              variants={itemVariants}
              className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {REGISTER_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-muted/50 p-4 text-center transition-shadow hover:nov-ring-lg"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {f.title}
                  </span>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    {f.desc}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Continue button — pill, Magnetic, hover:nov-shadow-blue only */}
          <motion.div variants={itemVariants} className="mt-8">
            <Magnetic as="div" strength={0.3}>
              <button
                type="button"
                onClick={handleComplete}
                autoFocus
                aria-label="Continue to dashboard"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span>Continue to dashboard</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Magnetic>
          </motion.div>

          {/* Auto-advance hint (login only) */}
          {!isRegister && (
            <motion.div
              variants={itemVariants}
              className="mt-4 flex flex-col items-center gap-2"
            >
              <p className="text-[11px] text-muted-foreground">
                Continuing automatically in {remaining}s…
              </p>
              <div className="h-0.5 w-40 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: LOGIN_AUTO_ADVANCE_MS / 1000,
                    ease: "linear",
                  }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </motion.div>
          )}

          {/* Register hint */}
          {isRegister && (
            <motion.p
              variants={itemVariants}
              className="mt-4 text-center text-[11px] text-muted-foreground"
            >
              Take your time — click continue when you're ready.
            </motion.p>
          )}
        </div>
      </motion.section>
    </motion.main>
  );
}
