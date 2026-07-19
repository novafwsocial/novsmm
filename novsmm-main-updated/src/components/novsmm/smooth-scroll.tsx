"use client";

import { useEffect, type ReactNode } from "react";

/**
 * SmoothScroll — DISABLED on mobile for performance.
 *
 * Lenis (the smooth-scroll library) causes scroll lag on mobile devices
 * because it overrides native momentum scroll. Native scroll on mobile
 * is already buttery smooth and GPU-accelerated — Lenis only adds overhead.
 *
 * On desktop, Lenis provides the premium "linear" scroll feel that
 * Linear/Vercel use. We keep it there.
 *
 * Detection: window.innerWidth < 768 OR touch device → skip Lenis.
 *
 * Respects prefers-reduced-motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    // Skip on mobile/touch devices — native scroll is better there
    const isMobile = window.innerWidth < 768;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isMobile || isTouch) return;

    // Lazy-load Lenis only when needed (desktop, no reduced motion)
    let lenis: any = null;
    let rafId = 0;
    let cancelled = false;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
        lerp: 0.1,
      });

      function raf(time: number) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);

      // Anchor links → lenis.scrollTo
      const handleAnchorClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
        if (!anchor) return;
        const id = anchor.getAttribute("href");
        if (!id || id === "#") return;
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          lenis.scrollTo(el as HTMLElement, { offset: -80, duration: 1.4 });
        }
      };
      document.addEventListener("click", handleAnchorClick);
      (lenis as any).__handleAnchorClick = handleAnchorClick;
    });

    return () => {
      cancelled = true;
      if (lenis) {
        const handler = (lenis as any).__handleAnchorClick;
        if (handler) document.removeEventListener("click", handler);
        cancelAnimationFrame(rafId);
        lenis.destroy();
      }
    };
  }, []);

  return <>{children}</>;
}
