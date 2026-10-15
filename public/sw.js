/* CERMIN service worker — installability + light offline shell.
 * Do not cache authenticated HTML/API responses.
 */
const CACHE_VERSION = "cermin-static-v0.2.0";
const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => {
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("cermin-") && key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept auth/API/media — always network.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/belajar/")
  ) {
    return;
  }

  // Navigations: network-first, offline → offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/offline.html");
        return cached || Response.error();
      }),
    );
    return;
  }

  // Static icons/fonts: cache-first.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/offline.html"
  ) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          const copy = res.clone();
          if (res.ok) {
            void caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      }),
    );
  }
});
