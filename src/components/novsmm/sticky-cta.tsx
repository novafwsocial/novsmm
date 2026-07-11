"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "./app-store";

/**
 * Sticky CTA bar — appears after user scrolls past 60% of the hero.
 * Mobile only (desktop has CTAs in navbar + hero).
 * Increases conversion by keeping the primary CTA always accessible.
 */
export function StickyCTA() {
  const [visible, setVisible] = useState(false);
  const { setView } = useApp();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Show after scrolling past 60% of viewport height (past hero)
        setVisible(window.scrollY > window.innerHeight * 0.6);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hidden on desktop (lg breakpoint)
  return (
    <div
      className={`sticky-cta lg:hidden ${visible ? "visible" : ""}`}
      style={{
        background: "linear-gradient(to top, var(--background), var(--background) 80%, transparent)",
        padding: "12px 16px env(safe-area-inset-bottom, 0px)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">Start free today</div>
          <div className="text-xs text-muted-foreground">No credit card required</div>
        </div>
        <button
          onClick={() => setView("register")}
          className="relative flex items-center gap-2 overflow-hidden rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shimmer-cta"
        >
          Get started
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
