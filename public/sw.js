const CACHE_NAME = "kanak-pwa-v1";
const STATIC_ASSETS = [
  "/offline",
  "/favicon.ico",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png"
];

// Install: Precache shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Never cache authenticated Supabase API or signed bills
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Security: Do NOT cache Supabase endpoints, signed URLs, or POST/mutation requests
  if (
    event.request.method !== "GET" ||
    url.hostname.includes("supabase.co") ||
    url.pathname.includes("/api/") ||
    url.pathname.includes("/storage/") ||
    url.searchParams.has("token")
  ) {
    return;
  }

  // Handle navigation requests (Network first -> Cache offline fallback)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline");
      })
    );
    return;
  }

  // Handle static assets (Stale-while-revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});

