"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollProgress — top-of-viewport scroll progress indicator.
 *
 * PERFORMANCE: Previously used framer-motion's useScroll + useSpring which
 * runs a rAF loop on every scroll event. On mobile, this caused scroll jank.
 *
 * Now uses a lightweight passive scroll listener with rAF throttling.
 * The progress bar is GPU-composited via transform: scaleX().
 *
 * Visual result is identical: electric blue bar at top that fills as you scroll.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(Math.min(1, Math.max(0, pct)));
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(updateProgress);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateProgress(); // initial

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        transform: `scaleX(${progress})`,
      }}
      className="fixed left-0 top-0 z-[60] h-[2px] w-full origin-left bg-primary transition-transform duration-75 ease-out"
    />
  );
}
