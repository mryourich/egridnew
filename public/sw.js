/* VYSNER offline: pages and app files are kept, so the app opens and works without network.
   The data itself lives on the device anyway (until the server sync comes). */
const VERSION = "vysner-v1";
const SHELL = ["/dashboard", "/aufgaben", "/projekte", "/notizen", "/dokumente", "/brand/vysner-icon.png", "/brand/vysner-mark-small.png", "/brand/vysner-word.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // built files never change under the same name: cache first
  if (url.pathname.startsWith("/_next/static/") || /\.(png|jpe?g|svg|webp|woff2?|mjs)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // pages and page data: network first, the last copy when offline
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? (await caches.match("/dashboard")) || Response.error() : Response.error()))
  );
});
