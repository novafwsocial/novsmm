"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: boolean;
  scale?: boolean;
  once?: boolean;
};

/**
 * Scroll Reveal — GPU-accelerated, mobile-first.
 *
 * PERFORMANCE OPTIMIZATION:
 * Previously used framer-motion's useInView + motion.div which adds
 * ~30KB of JS to every page that uses Reveal (which is most landing sections).
 * On mobile, this caused scroll lag because framer-motion runs a rAF loop
 * to track scroll position for every Reveal instance.
 *
 * Now uses native IntersectionObserver (zero JS overhead) + CSS transitions
 * (GPU-composited, no main-thread work). Falls back to immediate show if
 * IntersectionObserver is not available.
 *
 * The visual result is identical: fade + slide-up, optional blur/scale.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  blur = false,
  scale = false,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback: if no IntersectionObserver, show immediately
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: "-10% 0px -10% 0px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  // CSS transition styles — GPU-composited (transform + opacity)
  const initialStyle: React.CSSProperties = {
    opacity: 0,
    transform: `translateY(${y}px)${scale ? " scale(0.96)" : ""}`,
    filter: blur ? "blur(12px)" : "none",
    transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, filter 0.6s ease ${delay}s`,
    willChange: "opacity, transform",
  };

  const visibleStyle: React.CSSProperties = {
    opacity: 1,
    transform: "translateY(0) scale(1)",
    filter: "blur(0px)",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={inView ? { ...initialStyle, ...visibleStyle } : initialStyle}
    >
      {children}
    </div>
  );
}

/**
 * RevealStagger — container that staggers the reveal of its children.
 * Uses CSS transition-delay on each RevealItem (no JS per-item tracking).
 */
type RevealStaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number; // seconds between each item
  once?: boolean;
};

export function RevealStagger({
  children,
  className,
  stagger = 0.08,
  once = true,
}: RevealStaggerProps) {
  return (
    <div className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <Reveal key={(child as any)?.key ?? i} delay={i * stagger} once={once}>
              {child}
            </Reveal>
          ))
        : <Reveal delay={0} once={once}>{children}</Reveal>}
    </div>
  );
}

/**
 * RevealItem — wrapper for items inside a RevealStagger.
 * Accepts the same props as Reveal (blur, scale, y) so existing
 * <RevealItem blur> usage continues to work. When used standalone
 * (not inside RevealStagger), it behaves like a Reveal with delay 0.
 */
type RevealItemProps = {
  children: ReactNode;
  className?: string;
  blur?: boolean;
  scale?: boolean;
  y?: number;
  delay?: number;
  once?: boolean;
};

export function RevealItem({
  children,
  className,
  blur = false,
  scale = false,
  y = 24,
  delay = 0,
  once = true,
}: RevealItemProps) {
  return (
    <Reveal
      className={className}
      blur={blur}
      scale={scale}
      y={y}
      delay={delay}
      once={once}
    >
      {children}
    </Reveal>
  );
}
