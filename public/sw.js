/* VYSNER offline: pages and app files are kept, so the app opens and works without network.
   The data itself lives on the device anyway (until the server sync comes).
   Every build registers this worker with a new ?v=… – then all old copies are thrown away. */
const VERSION = "vysner-" + (new URL(self.location.href).searchParams.get("v") || "dev");
const SHELL = ["/dashboard", "/projekte", "/planung", "/team", "/einstellungen"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => undefined))))
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

const keep = (req, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // build files carry a hash in their name and never change: cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => keep(req, res))));
    return;
  }

  // everything else (pages, page data, pictures): always the newest from the network, the last copy only offline
  event.respondWith(
    fetch(req)
      .then((res) => keep(req, res))
      .catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? (await caches.match("/dashboard")) || Response.error() : Response.error()))
  );
});
