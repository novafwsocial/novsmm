"use client";

import { useEffect } from "react";

/**
 * WebVitals — measures Core Web Vitals (LCP, FID, CLS, INP, TTFB) in production
 * and logs them to the console. Can be extended to send to an analytics endpoint.
 *
 * PERF: Use this to verify that mobile performance optimizations are working
 * on real user devices. Values are:
 *   LCP < 2500ms = good, < 4000ms = needs improvement, > 4000ms = poor
 *   FID < 100ms = good, < 300ms = needs improvement, > 300ms = poor
 *   CLS < 0.1 = good, < 0.25 = needs improvement, > 0.25 = poor
 *   INP < 200ms = good, < 500ms = needs improvement, > 500ms = poor
 *   TTFB < 800ms = good, < 1800ms = needs improvement, > 1800ms = poor
 *
 * This component loads the web-vitals library dynamically (only in production)
 * to avoid adding to the initial bundle.
 */
export function WebVitals() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    // Lazy-load web-vitals only in production
    import("web-vitals")
      .then(({ onLCP, onCLS, onINP, onTTFB, onFCP }) => {
        const log = (metric: any) => {
          // Color-coded console log for debugging
          const rating = metric.rating; // "good" | "needs-improvement" | "poor"
          const color =
            rating === "good" ? "✅" :
            rating === "needs-improvement" ? "⚠️" : "🔴";
          console.log(
            `${color} ${metric.name}: ${metric.value.toFixed(0)}${metric.name === "CLS" ? "" : "ms"} (${rating})`
          );

          // Send to analytics endpoint (optional — currently just logs)
          // Could send to /api/metrics/web-vitals if we want server-side tracking
          if (navigator.sendBeacon) {
            const data = JSON.stringify({
              name: metric.name,
              value: metric.value,
              rating: metric.rating,
              id: metric.id,
              page: window.location.pathname,
              timestamp: Date.now(),
            });
            // Use sendBeacon for reliability (works even if page unloads)
            navigator.sendBeacon("/api/metrics/web-vitals", data);
          }
        };

        onLCP(log);
        onCLS(log);
        onINP(log); // INP replaced FID in web-vitals v5
        onTTFB(log);
        onFCP(log);
      })
      .catch(() => {
        // web-vitals not installed — skip silently
      });
  }, []);

  return null; // renders nothing
}
