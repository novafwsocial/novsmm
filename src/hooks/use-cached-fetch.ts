"use client";

import { useEffect, useState } from "react";

/**
 * Shared cache for public API requests on the landing page.
 *
 * PROBLEM: Multiple landing sections (Hero, Stats, AffiliateSection) all
 * fetch /api/status independently, causing 3 duplicate HTTP requests on
 * every page load. Same issue with /api/public/offers (Marketplace loads
 * it twice) and /api/auth/session (called multiple times).
 *
 * SOLUTION: In-memory cache keyed by URL. The first caller triggers the
 * fetch; subsequent callers within 30s get the cached response. This
 * reduces duplicate requests from 8+ down to 3 unique endpoints.
 *
 * The cache is per-tab (in-memory, not persisted). TTL is 30 seconds —
 * short enough to stay fresh, long enough to dedupe across rapid mounts.
 */

type CacheEntry = {
  data: any;
  timestamp: number;
  promise: Promise<any> | null;
};

const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000; // 30 seconds

/**
 * Fetch a URL with shared caching. Multiple components calling this with
 * the same URL will share a single network request.
 *
 * @param url - The URL to fetch
 * @param ttl - Cache TTL in ms (default 30s)
 * @returns The cached/fetched data, or null on error
 */
export function useCachedFetch<T = any>(url: string | null, ttl: number = TTL_MS): T | null {
  const [data, setData] = useState<T | null>(() => {
    if (!url) return null;
    const entry = cache.get(url);
    if (entry && Date.now() - entry.timestamp < ttl) {
      return entry.data as T;
    }
    return null;
  });

  useEffect(() => {
    if (!url) {
      setData(null);
      return;
    }

    let cancelled = false;
    const entry = cache.get(url);

    // Cache hit — use it
    if (entry && Date.now() - entry.timestamp < ttl) {
      setData(entry.data as T);
      return;
    }

    // Cache miss but request in-flight — wait for it
    if (entry?.promise) {
      entry.promise.then((d) => {
        if (!cancelled) setData(d as T);
      });
      return;
    }

    // New request
    const promise = fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        cache.set(url, { data: d, timestamp: Date.now(), promise: null });
        return d;
      })
      .catch(() => {
        cache.delete(url); // allow retry on next mount
        return null;
      });

    cache.set(url, { data: null, timestamp: Date.now(), promise });

    promise.then((d) => {
      if (!cancelled) setData(d as T);
    });

    return () => {
      cancelled = true;
    };
  }, [url, ttl]);

  return data;
}

/**
 * Prefetch a URL into the cache without subscribing to it.
 * Useful for warming the cache before a component mounts.
 */
export function prefetch(url: string) {
  const entry = cache.get(url);
  if (entry && Date.now() - entry.timestamp < TTL_MS) return;
  if (entry?.promise) return;

  const promise = fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      cache.set(url, { data: d, timestamp: Date.now(), promise: null });
      return d;
    })
    .catch(() => {
      cache.delete(url);
      return null;
    });

  cache.set(url, { data: null, timestamp: Date.now(), promise });
}
