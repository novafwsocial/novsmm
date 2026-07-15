"use client";

import { useEffect } from "react";

/**
 * Service Worker registration component.
 * Registers /sw.js in production only (not in dev, to avoid caching issues).
 * Mounted once in the root layout.
 *
 * MOBILE-CACHE-FIX: The SW registration URL now includes a `?v=<CACHE_VERSION>`
 * query param. This is critical for iOS Safari, which aggressively caches the
 * SW registration URL itself. When CACHE_VERSION changes, the registration URL
 * changes, forcing iOS Safari to register the NEW SW instead of the stale one.
 *
 * IMPORTANT: This version string MUST be kept in sync with CACHE_VERSION in
 * public/sw.js. When you bump CACHE_VERSION in sw.js, also bump SW_VERSION
 * here. The build pipeline could automate this, but manual sync is fine for
 * small deploys.
 *
 * PERF: Guard against duplicate registration. The browser natively dedupes
 * registrations, but we were logging "registered" on every mount which
 * cluttered the console. Now we only register once per page lifecycle.
 */
const SW_VERSION = "v6"; // MUST match CACHE_VERSION in public/sw.js
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
        // MOBILE-CACHE-FIX: ?v= query param forces iOS Safari to re-register
        // the SW when the version changes. Without this, Safari may keep
        // running the old SW indefinitely.
        .register(`/sw.js?v=${SW_VERSION}`)
        .then(() => {
          // Only log once — browser dedupes but we avoid console spam
          if (typeof console !== "undefined") {
            console.log(`[SW] Service worker registered (${SW_VERSION})`);
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
