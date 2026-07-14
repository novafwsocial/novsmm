"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "./app-store";
import { useLanguage } from "./language-provider";

/**
 * Sticky CTA — appears after the user scrolls past 60% of the hero.
 *
 * UX FIX (U-H-006): previously this was mobile-only (lg:hidden). Desktop
 * users had no persistent CTA after scrolling past the hero — the navbar
 * "Start free" button was the only option, and it blends in after scroll.
 * Now there are TWO variants:
 *   - Mobile: bottom bar (full-width, gradient fade-up) — unchanged
 *   - Desktop: floating pill button (bottom-right, subtle shadow)
 * Both appear after scrolling past 60% of viewport height.
 */
export function StickyCTA() {
  const [visible, setVisible] = useState(false);
  const { setView } = useApp();
  const { t } = useLanguage();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > window.innerHeight * 0.6);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Mobile: bottom bar (full-width gradient fade) */}
      <div
        className={`sticky-cta lg:hidden ${visible ? "visible" : ""}`}
        style={{
          background:
            "linear-gradient(to top, var(--background), var(--background) 80%, transparent)",
          padding: "12px 16px env(safe-area-inset-bottom, 0px)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              {t("landing.stickyCta.title")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("landing.stickyCta.subtitle")}
            </div>
          </div>
          <button
            onClick={() => setView("register")}
            className="relative flex items-center gap-2 overflow-hidden rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shimmer-cta btn-press"
          >
            {t("landing.stickyCta.getStarted")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop: floating pill button (bottom-right, subtle) */}
      <div
        className={`hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-2 transition-all duration-500 ${
          visible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <a
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-muted nov-ring"
        >
          {t("landing.stickyCta.viewPricing")}
        </a>
        <button
          onClick={() => setView("register")}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue btn-press shimmer-cta"
        >
          {t("landing.stickyCta.startFree")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
