/* Elanjai FM service worker (F-3.2).
 *
 * Scope is deliberately narrow:
 *  - precache the offline shell for each UI locale
 *  - network-first for page navigations, falling back to the localized
 *    offline page
 *  - cache-first for static assets (_next/static, icons, logos, shots)
 *
 * Audio is NEVER cached: /api/* (stream proxy, beacons, metadata) and
 * all cross-origin requests pass straight through. Caching audio would
 * resurrect dead streams and bloat device storage.
 */

const VERSION = "v1";
const SHELL_CACHE = `emfm-shell-${VERSION}`;
const STATIC_CACHE = `emfm-static-${VERSION}`;

const OFFLINE_PATHS = ["/en/offline", "/ta/offline", "/hi/offline"];
const PRECACHE = [
  ...OFFLINE_PATHS,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, STATIC_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

const neverCache = (url, request) => {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true; // streams & fonts
  if (url.pathname.startsWith("/api/")) return true;
  if (request.destination === "audio" || request.destination === "video")
    return true;
  if (request.headers.has("range")) return true;
  return false;
};

const staticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/logos/") ||
    url.pathname.startsWith("/screenshots/"));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (neverCache(url, request)) return; // straight to network

  // Navigations: network-first, offline shell as the safety net.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const lang = /^\/(en|ta|hi)(\/|$)/.test(url.pathname)
          ? url.pathname.split("/")[1]
          : "en";
        const cache = await caches.open(SHELL_CACHE);
        return (
          (await cache.match(`/${lang}/offline`)) ||
          (await cache.match("/en/offline")) ||
          Response.error()
        );
      })
    );
    return;
  }

  // Static assets: cache-first, refresh in the background.
  if (staticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        const fetched = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        return hit || (await fetched) || Response.error();
      })
    );
  }
});
