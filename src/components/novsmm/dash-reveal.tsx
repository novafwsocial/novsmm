"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type DashRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/**
 * Subtle scroll reveal for dashboard sections.
 * Unlike the landing page's Scroll3DReveal (which uses 3D rotateX),
 * this uses a simpler 2D fade + translateY — better for functional
 * interfaces where users need to read data quickly.
 *
 * Disabled on mobile (content shows immediately).
 */
export function DashReveal({ children, className = "", delay = 0 }: DashRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // On mobile, show immediately (no animation overhead)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setInView(true);
      return;
    }

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
      { rootMargin: "0px 0px -5% 0px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`dash-reveal ${inView ? "in-view" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
