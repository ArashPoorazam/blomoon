/* Bump this version whenever offline.html changes. No app or media caching. */
const OFFLINE_CACHE = "blomoon-offline-v1";
const OFFLINE_URL = "/offline.html";
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const response = await fetch(new Request(new URL(OFFLINE_URL, self.location.origin), { cache: "reload", redirect: "error" }));
    if (!response.ok || response.redirected || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Offline document unavailable");
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.put(OFFLINE_URL, response);
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("blomoon-offline-") && key !== OFFLINE_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    return await cache.match(OFFLINE_URL) || Response.error();
  }));
});
