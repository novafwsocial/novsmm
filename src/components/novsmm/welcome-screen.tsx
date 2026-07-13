"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PartyPopper,
  ArrowRight,
  Wallet,
  Headphones,
  Globe,
  Hand,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Logo } from "./logo";

/**
 * WelcomeScreen
 * -------------
 * Transient full-screen celebration / welcome overlay shown immediately after
 * a successful login or registration, before the dashboard mounts.
 *
 * Two variants:
 *   • "register" — celebratory: confetti, PartyPopper icon, feature highlights,
 *                  waits for the user to click "Continue to dashboard".
 *   • "login"    — subtle: gentle pulse + Hand icon, auto-advances after 3s
 *                  (but the user can also click to advance immediately).
 *
 * Design notes:
 *   - Built as an explicit dark overlay (regardless of app theme) so the first
 *     impression after auth feels premium and cinematic.
 *   - Uses the project's custom utility classes: nov-grid-bg, nov-radial-fade,
 *     nov-ring-lg, auth-card-3d, auth-card-inner, nov-shadow-blue.
 *   - Respects prefers-reduced-motion (disables confetti + floating loops).
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

// Vibrant-but-premium confetti palette.
const CONFETTI_COLORS = [
  "bg-primary",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-sky-300",
  "bg-white",
];

export function WelcomeScreen({
  variant,
  userName,
  userEmail,
  onComplete,
}: WelcomeScreenProps) {
  const isRegister = variant === "register";
  const reduceMotion = useReducedMotion();

  // Derive a friendly first name from userName; fall back gracefully.
  const firstName = useMemo(() => {
    const cleaned = (userName || "").trim();
    if (!cleaned) return "there";
    return cleaned.split(/\s+/)[0];
  }, [userName]);

  // Guard against calling onComplete more than once (auto-advance + click race).
  const completedRef = useRef(false);
  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  // Only render randomized confetti after mount (avoids SSR/client mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegister, reduceMotion]);

  // Keyboard: Escape advances (friendly for keyboard users).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        handleComplete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Precompute confetti particles once (register only).
  const confetti = useMemo(() => {
    if (!isRegister || reduceMotion) return [];
    const COUNT = 28;
    return Array.from({ length: COUNT }).map((_, i) => {
      const leftPct = Math.random() * 100;
      const size = 6 + Math.random() * 8;
      const delay = Math.random() * 0.6;
      const duration = 2.6 + Math.random() * 1.8;
      const drift = (Math.random() - 0.5) * 160;
      const rotate = (Math.random() - 0.5) * 720;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const round = Math.random() > 0.6;
      return { id: i, leftPct, size, delay, duration, drift, rotate, color, round };
    });
  }, [isRegister, reduceMotion]);

  // Shared motion variants.
  const containerVariants = {
    hidden: { opacity: 0, filter: "blur(12px)" },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
        when: "beforeChildren",
        staggerChildren: 0.1,
        delayChildren: 0.15,
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

  return (
    <AnimatePresence>
      <motion.main
        key="welcome-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-neutral-950 px-4 py-10"
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

        {/* Background layers */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 nov-grid-bg nov-radial-fade opacity-50" />
          <div className="absolute left-1/2 top-[-12%] h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/[0.18] blur-[140px]" />
          <div
            className={`absolute rounded-full blur-[120px] ${
              isRegister
                ? "right-[8%] bottom-[6%] h-[320px] w-[320px] bg-emerald-400/15"
                : "left-[10%] bottom-[10%] h-[280px] w-[280px] bg-primary/10"
            }`}
          />
          {/* top + bottom vignette for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/40 via-transparent to-neutral-950/60" />
        </div>

        {/* Confetti (register only) */}
        {mounted && confetti.length > 0 && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {confetti.map((p) => (
              <motion.span
                key={p.id}
                initial={{
                  x: 0,
                  y: -40,
                  opacity: 0,
                  rotate: 0,
                }}
                animate={{
                  x: p.drift,
                  y: window.innerHeight + 60,
                  opacity: [0, 1, 1, 0.9, 0],
                  rotate: p.rotate,
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: [0.16, 1, 0.3, 1] as const,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 0.8,
                }}
                style={{
                  left: `${p.leftPct}%`,
                  width: p.size,
                  height: p.size * (p.round ? 1 : 1.6),
                }}
                className={`absolute top-0 ${p.color} ${
                  p.round ? "rounded-full" : "rounded-[2px]"
                } shadow-[0_0_8px_currentColor]`}
              />
            ))}
          </div>
        )}

        {/* Center card */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="auth-card-3d relative w-full max-w-[460px]"
        >
          {/* Outer glow ring */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-b from-primary/20 via-transparent to-emerald-400/10 blur-2xl"
          />

          <div className="auth-card-inner overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 p-8 backdrop-blur-2xl nov-ring-lg sm:p-10">
            {/* Logo */}
            <motion.div variants={itemVariants} className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                <Logo className="[&>span]:text-white/90" />
              </span>
            </motion.div>

            {/* Animated icon */}
            <motion.div variants={itemVariants} className="mt-7 flex justify-center">
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -12 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  rotate: 0,
                  y: reduceMotion ? 0 : [0, -8, 0],
                }}
                transition={{
                  scale: { type: "spring", stiffness: 220, damping: 14, delay: 0.2 },
                  opacity: { duration: 0.3, delay: 0.2 },
                  rotate: { type: "spring", stiffness: 220, damping: 14, delay: 0.2 },
                  y: reduceMotion
                    ? undefined
                    : {
                        duration: 3.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.8,
                      },
                }}
                className="relative flex h-20 w-20 items-center justify-center"
              >
                {/* glow halo */}
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full blur-xl ${
                    isRegister ? "bg-primary/30" : "bg-primary/20"
                  }`}
                />
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full ${
                    isRegister
                      ? "bg-gradient-to-br from-primary/40 to-emerald-400/30"
                      : "bg-gradient-to-br from-primary/30 to-sky-400/20"
                  }`}
                />
                {/* pulse ring (login) */}
                {!isRegister && !reduceMotion && (
                  <motion.span
                    aria-hidden
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.8,
                    }}
                    className="absolute inset-0 rounded-full border border-primary/40"
                  />
                )}
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-neutral-950/60 backdrop-blur-sm">
                  <Icon
                    className={`h-8 w-8 ${
                      isRegister ? "text-primary" : "text-sky-300"
                    }`}
                    aria-label={iconLabel}
                  />
                </span>
              </motion.div>
            </motion.div>

            {/* Heading */}
            <motion.h1
              id={headingId}
              variants={itemVariants}
              className="mt-6 text-center text-3xl font-semibold tracking-tight sm:text-[34px]"
            >
              <span className="bg-gradient-to-br from-white via-white to-primary-200 bg-clip-text text-transparent">
                {isRegister ? "Welcome to NOVSMM" : "Welcome back"}
              </span>{" "}
              <span aria-hidden>🎉</span>
            </motion.h1>

            {/* Big personalized line */}
            <motion.p
              variants={itemVariants}
              className="mt-2 text-center text-lg font-medium text-white/80"
            >
              {isRegister ? `Hi, ${firstName}!` : `Good to see you, ${firstName}.`}
            </motion.p>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="mx-auto mt-2 max-w-sm text-center text-sm text-white/55 text-pretty"
            >
              {isRegister
                ? "Your workspace is ready. Let's set up your first campaign."
                : "Pick up right where you left off — your dashboard is ready."}
            </motion.p>

            {/* Verified email chip */}
            <motion.div
              variants={itemVariants}
              className="mt-5 flex justify-center"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="max-w-[260px] truncate">{userEmail || "—"}</span>
              </span>
            </motion.div>

            {/* Feature highlights (register only) */}
            {isRegister && (
              <motion.div
                variants={itemVariants}
                className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {REGISTER_FEATURES.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold text-white/90">
                      {f.title}
                    </span>
                    <span className="text-[11px] leading-tight text-white/45">
                      {f.desc}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Continue button */}
            <motion.div variants={itemVariants} className="mt-8">
              <motion.button
                type="button"
                onClick={handleComplete}
                autoFocus
                aria-label="Continue to dashboard"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                animate={
                  reduceMotion
                    ? undefined
                    : { boxShadow: [
                        "0 1px 2px rgba(0,82,255,0.20), 0 8px 24px -6px rgba(0,82,255,0.35)",
                        "0 1px 2px rgba(0,82,255,0.30), 0 12px 36px -4px rgba(0,82,255,0.55)",
                        "0 1px 2px rgba(0,82,255,0.20), 0 8px 24px -6px rgba(0,82,255,0.35)",
                      ] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                }
                className="nov-shadow-blue group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              >
                {/* shine sweep */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
                <Sparkles className="h-4 w-4" />
                <span>Continue to dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.div>

            {/* Auto-advance hint (login only) */}
            {!isRegister && (
              <motion.div
                variants={itemVariants}
                className="mt-4 flex flex-col items-center gap-2"
              >
                <p className="text-[11px] text-white/40">
                  Continuing automatically in {remaining}s…
                </p>
                <div className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
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
                className="mt-4 text-center text-[11px] text-white/40"
              >
                Take your time — click continue when you're ready.
              </motion.p>
            )}
          </div>
        </motion.section>
      </motion.main>
    </AnimatePresence>
  );
}
