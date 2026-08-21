const CACHE_NAME = "nanako-shell-v9-layered-talking";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./static/style.css",
  "./static/app.js",
  "./static/characters/nanako/nanako_master.png",
  "./static/characters/nanako/idle/idle_open.png",
  "./static/characters/nanako/idle/idle_half.png",
  "./static/characters/nanako/idle/idle_closed.png",
  "./static/characters/nanako/talk/talk_0.png",
  "./static/characters/nanako/talk/talk_1.png",
  "./static/characters/nanako/talk/talk_2.png",
  "./static/characters/nanako/talk/talk_3.png",
  "./static/characters/nanako/talk/talk_4.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
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
