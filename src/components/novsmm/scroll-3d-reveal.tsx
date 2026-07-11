"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Scroll3DRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/**
 * 3D scroll reveal — cards rotate in from perspective on scroll.
 * Uses IntersectionObserver (no JS scroll tracking = zero perf cost).
 * Falls back to immediate show if IntersectionObserver not available.
 *
 * On mobile: uses simpler 2D translateY (no 3D perspective) for performance.
 */
export function Scroll3DReveal({ children, className = "", delay = 0 }: Scroll3DRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-5% 0px -5% 0px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-3d ${inView ? "in-view" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
