"use client";

import { useEffect } from "react";

/**
 * Service Worker registration component.
 * Registers /sw.js in production only (not in dev, to avoid caching issues).
 * Mounted once in the root layout.
 *
 * PERF: Guard against duplicate registration. The browser natively dedupes
 * registrations, but we were logging "registered" on every mount which
 * cluttered the console. Now we only register once per page lifecycle.
 */
let hasRegistered = false;

export function SwRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production" &&
      !hasRegistered
    ) {
      hasRegistered = true;
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // Only log once — browser dedupes but we avoid console spam
          if (typeof console !== "undefined") {
            console.log("[SW] Service worker registered");
          }
        })
        .catch((err) => {
          console.error("[SW] Registration failed:", err);
          hasRegistered = false; // allow retry on failure
        });
    }
  }, []);

  return null;
}
