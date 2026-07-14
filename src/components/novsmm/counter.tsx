"use client";

import { useEffect, useRef, useState } from "react";

type CounterProps = {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  format?: (n: number) => string;
};

/**
 * Animated count-up that triggers on scroll into view.
 *
 * PERFORMANCE: Previously used framer-motion's animate + useInView, which
 * added ~30KB JS and ran a rAF loop per Counter instance (10+ counters on
 * the hero = 10 rAF loops on load).
 *
 * Now uses native IntersectionObserver + a single rAF loop per Counter
 * that auto-stops when the animation completes. Zero external deps.
 *
 * The visual result is identical: smooth count-up with easing.
 */
export function Counter({
  to,
  from = 0,
  duration = 2,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  format,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(from);
  const startedRef = useRef(false);

  // Phase 0 FIX: moved animateCount BEFORE useEffect to avoid temporal dead
  // zone (const is not hoisted — calling it before declaration is a TDZ
  // violation that eslint correctly flags as "Cannot access variable before
  // it is declared").
  const animateCount = () => {
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // cubic ease-out

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const t = Math.min(1, elapsed / duration);
      const eased = ease(t);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(to); // ensure exact final value
      }
    };
    requestAnimationFrame(tick);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback: if no IntersectionObserver, animate immediately
    if (!("IntersectionObserver" in window)) {
      animateCount();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          animateCount();
          observer.disconnect();
        }
      },
      { rootMargin: "-15% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const formatted = format
    ? format(display)
    : `${prefix}${display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}
