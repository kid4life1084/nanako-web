const CACHE="nana-talk-v11-3-1";
const SHELL=["./","./index.html","./static/style.css?v=11.3.1","./static/app.js?v=11.3.1","./manifest.webmanifest"];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));});
self.addEventListener("activate",event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const req=event.request;event.respondWith((async()=>{try{const fresh=await fetch(req,{cache:"no-store"});const cache=await caches.open(CACHE);cache.put(req,fresh.clone()).catch(()=>{});return fresh;}catch{const cached=await caches.match(req);if(cached)return cached;throw new Error("offline");}})());});
