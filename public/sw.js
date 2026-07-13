/**
 * NOVSMM Service Worker — minimal app-shell caching for PWA offline support.
 *
 * Strategy:
 * - Network-first for navigation requests (always get fresh HTML)
 * - Cache-first for static assets (icons, fonts, JS/CSS chunks)
 * - No caching for API requests (always network)
 *
 * The SW is registered only in production (see sw-register.tsx) to avoid
 * caching issues during development.
 *
 * BROAD-FIX-BATCH-1: added a cache-versioning strategy. The CACHE_VERSION
 * constant is bumped on every deploy (the build step can rewrite this file
 * to inject a content-hash version). On activate, any cache key that isn't
 * the current version is deleted — so users get the fresh app shell on the
 * first navigation after a deploy instead of stale content from the
 * previous version.
 *
 * The previous single "novsmm-v1" cache was hardcoded and never bumped, so
 * new deploys could leave users with a stale app shell until they manually
 * cleared the SW cache.
 */

// Bumped on each deploy. The build pipeline can rewrite this to a content
// hash (e.g. `novsmm-<git-sha>`) to force a cache refresh on every change.
// Manual bump is also fine for small deploys.
// v3: bumped after mobile performance optimizations (Reveal CSS, dynamic imports, virtualization)
const CACHE_VERSION = "novsmm-v4";
const CACHE = CACHE_VERSION;
// PERF FIX (P-L-006): removed /icon.png from APP_SHELL precache.
// Was 186KB (now 11KB after Lote A resize), but still unnecessary to
// precache — the browser fetches it on first page load anyway via the
// <link rel="icon"> tag. Precaching it during SW install delays
// activation. /manifest.webmanifest is also fetched on load but is
// tiny (1KB) — kept for reliability.
const APP_SHELL = ["/", "/manifest.webmanifest"];

// Track whether this is the first install vs an upgrade.
let isFirstInstall = true;

// Install — pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  // skipWaiting() so the new SW takes over immediately on the next navigation,
  // rather than waiting for all tabs to close.
  self.skipWaiting();
});

// Activate — clean up old caches (any cache whose key isn't the current
// CACHE_VERSION). This is the cache-versioning strategy: when CACHE_VERSION
// is bumped (either manually or by the build pipeline), the old cache is
// evicted on the next activation so users get the fresh app shell.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k.startsWith("novsmm-"))
          .map((k) => {
            console.log(`[sw] evicting stale cache: ${k}`);
            return caches.delete(k);
          })
      )
    )
  );
  // clients.claim() so the new SW controls the current tab immediately
  // (rather than waiting for the next navigation).
  self.clients.claim();
  isFirstInstall = false;
});

// Fetch — routing strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API requests — always network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // S-03 FIX: Routes that must NEVER be cached (authenticated content).
  // Prevents data leakage between users on shared devices.
  const NEVER_CACHE = [
    "/api/auth/",
    "/api/me",
    "/api/admin/",
    "/api/wallet/",
    "/api/orders/",
    "/api/offers",
    "/api/tickets",
    "/api/notifications",
    "/api/child-panels",
    "/api/subscriptions",
    "/api/uploads",
    "/api/v1/",
  ];

  // Navigation requests (HTML pages) — network-first, fallback to cache
  if (request.mode === "navigate") {
    const shouldCache = !NEVER_CACHE.some((path) => url.pathname.startsWith(path));
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache if NOT in the never-cache list
          if (response.status === 200 && shouldCache) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Static assets — cache-first, fallback to network, fallback to "/" cache
  // so a missing asset offline doesn't leave the user with a blank page.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});
