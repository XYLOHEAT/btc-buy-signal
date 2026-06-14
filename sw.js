/* BTC Accumulation Signal — service worker (offline + fast repeat loads) */
const CACHE = "btc-accum-v7";
const SHELL = [
  "./", "./index.html", "./indicators.js?v=4", "./app.js?v=1", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./coin.svg",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// data hosts: network-first (fresh, fall back to last-cached when offline).
// Exact-hostname match (not a substring regex) so look-alike hosts don't match.
const DATA_HOSTS = new Set([
  "api.binance.com", "api.coingecko.com", "bitcoin-data.com", "raw.githubusercontent.com",
]);

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;
  let host = "";
  try { host = new URL(url).hostname; } catch (_) {}
  // network-first for the HTML shell (so deploys reach installed users) + live data
  if (e.request.mode === "navigate" || url.endsWith("/index.html") || DATA_HOSTS.has(host) || url.endsWith("/data.json")) {
    e.respondWith(
      fetch(e.request).then((r) => {
        const cp = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, cp));
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // shell / static: cache-first, then network (and cache it)
    e.respondWith(
      caches.match(e.request).then((c) => c || fetch(e.request).then((r) => {
        const cp = r.clone();
        caches.open(CACHE).then((ca) => ca.put(e.request, cp));
        return r;
      }))
    );
  }
});
