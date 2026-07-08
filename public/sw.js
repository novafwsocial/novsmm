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
 */

const CACHE = "novsmm-v1";
const APP_SHELL = ["/", "/icon.png"];

// Install — pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
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

  // Navigation requests (HTML pages) — network-first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
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
