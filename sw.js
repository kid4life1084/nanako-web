const CACHE_NAME = "nanako-shell-v6-idle-blink-fix";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./static/style.css",
  "./static/app.js",
  "./static/characters/nanako/nanako_master.png",
  "./static/characters/nanako/idle/idle_open.png",
  "./static/characters/nanako/idle/idle_half.png",
  "./static/characters/nanako/idle/idle_closed.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
