/* Offline shell for the DevOps Field Manual. */
const CACHE = "dfm-site-v2";
const CORE = [
  "./",
  "./index.html",
  "./explorer.html",
  "./lab.html",
  "./quiz.html",
  "./atlas.html",
  "./game.html",
  "./cheatsheet.html",
  "./assets/css/site.css",
  "./assets/js/site.js",
  "./assets/js/index.js",
  "./assets/js/explorer.js",
  "./assets/js/lab.js",
  "./assets/js/quiz.js",
  "./assets/js/atlas.js",
  "./assets/js/game.js",
  "./assets/js/hero3d.js",
  "./assets/js/cheatsheet.js",
  "./assets/js/three.module.min.js",
  "./assets/js/three.core.min.js",
  "./assets/data/manifest.json",
  "./assets/data/stats.json",
  "./assets/data/labs.json",
  "./assets/data/quiz.json",
  "./assets/img/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const update = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => hit);
      return hit || update;
    })
  );
});
