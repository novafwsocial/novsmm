"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Social proof notifications — shows fake but realistic recent signups/purchases
 * in the bottom-left corner. Creates FOMO (fear of missing out) and increases
 * conversion. Rotates through a pool of realistic scenarios.
 *
 * Desktop only (mobile is too small for these).
 * Auto-dismisses after 5s, then shows the next one after 8s.
 */

const PROOF_EVENTS = [
  { name: "Carlos from Mexico", action: "just signed up", detail: "Reseller plan", flag: "🇲🇽" },
  { name: "Ana from Brazil", action: "placed an order", detail: "Instagram Followers × 1000", flag: "🇧🇷" },
  { name: "Mike from USA", action: "topped up", detail: "$50 via Stripe", flag: "🇺🇸" },
  { name: "Priya from India", action: "just signed up", detail: "Agency plan", flag: "🇮🇳" },
  { name: "Sofia from Spain", action: "placed an order", detail: "TikTok Views × 5000", flag: "🇪🇸" },
  { name: "Liam from UK", action: "topped up", detail: "$100 via PayPal", flag: "🇬🇧" },
  { name: "Yuki from Japan", action: "just signed up", detail: "Creator plan", flag: "🇯🇵" },
  { name: "Omar from UAE", action: "placed an order", detail: "YouTube Watch Hours", flag: "🇦🇪" },
];

export function SocialProof() {
  const [current, setCurrent] = useState<typeof PROOF_EVENTS[0] | null>(null);
  const [exiting, setExiting] = useState(false);

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

  if (!current) return null;

  return (
    <div
      className={`social-proof ${exiting ? "exit" : ""} fixed bottom-5 left-5 z-40 hidden lg:block`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-xl">
        <span className="text-2xl">{current.flag}</span>
        <div className="flex flex-col">
          <div className="text-sm font-medium text-foreground">
            {current.name} {current.action}
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
