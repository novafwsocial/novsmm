"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Social proof notifications — shows illustrative examples of platform activity.
 *
 * IMPORTANT: These are ILLUSTRATIVE EXAMPLES, not real-time data. Each
 * notification is labeled with a "Demo" badge to comply with consumer
 * protection regulations (FTC, EU unfair commercial practices directive).
 *
 * In a future version, this will be connected to a real /api/public/recent-activity
 * endpoint that returns anonymized recent signups/orders. Until then, the
 * "Demo" label makes it clear these are sample notifications, not live data.
 */

const PROOF_EVENTS = [
  { name: "Carlos from Mexico", action: "just signed up", detail: "Reseller plan", flag: "🇲🇽" },
  { name: "Ana from Brazil", action: "placed an order", detail: "Instagram Followers × 1000", flag: "🇧🇷" },
  { name: "Mike from USA", action: "topped up", detail: "$50 via PayPal", flag: "🇺🇸" },
  { name: "Priya from India", action: "just signed up", detail: "Agency plan", flag: "🇮🇳" },
  { name: "Sofia from Spain", action: "placed an order", detail: "TikTok Views × 5000", flag: "🇪🇸" },
  { name: "Liam from UK", action: "topped up", detail: "$100 via PayPal", flag: "🇬🇧" },
  { name: "Yuki from Japan", action: "just signed up", detail: "Creator plan", flag: "🇯🇵" },
  { name: "Omar from UAE", action: "placed an order", detail: "YouTube Watch Hours", flag: "🇦🇪" },
];

export function SocialProof() {
  const [current, setCurrent] = useState<typeof PROOF_EVENTS[0] | null>(null);
  const [exiting, setExiting] = useState(false);
  const [inHero, setInHero] = useState(true);

  // Track scroll position — only show social proof in hero section
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Only show when user is in the top 80% of the first viewport (hero area)
        setInHero(window.scrollY < window.innerHeight * 0.8);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let timeout1: ReturnType<typeof setTimeout>;
    let timeout2: ReturnType<typeof setTimeout>;
    let index = Math.floor(Math.random() * PROOF_EVENTS.length);

    const showNext = () => {
      setCurrent(PROOF_EVENTS[index]);
      setExiting(false);
      index = (index + 1) % PROOF_EVENTS.length;

      // Auto-dismiss after 5s
      timeout1 = setTimeout(() => {
        setExiting(true);
        // Show next after 3s gap (total 8s cycle)
        timeout2 = setTimeout(showNext, 3000);
      }, 5000);
    };

    // Start after 4s delay (let the page load first)
    const startTimeout = setTimeout(showNext, 4000);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

  // Don't render if no current event OR user has scrolled past hero
  if (!current || !inHero) return null;

  return (
    <div
      className={`social-proof ${exiting ? "exit" : ""} fixed bottom-5 left-5 z-40 hidden lg:block`}
      // A2-M-002 FIX: aria-live=polite so screen readers announce new notifications
      aria-live="polite"
      aria-label="Platform activity"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-xl">
        <span className="text-2xl">{current.flag}</span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {current.name} {current.action}
            <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70" title="Illustrative example — not real-time data">Illustrative</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {current.detail}
          </div>
        </div>
        <button
          onClick={() => setExiting(true)}
          className="ml-2 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
