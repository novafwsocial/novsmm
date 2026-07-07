"use client";

import { useEffect } from "react";

/**
 * Service Worker registration component.
 * Registers /sw.js in production only (not in dev, to avoid caching issues).
 * Mounted once in the root layout.
 */
export function SwRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("[SW] Service worker registered");
        })
        .catch((err) => {
          console.error("[SW] Registration failed:", err);
        });
    }
  }, []);

  return null;
}
