// NanaChat Step 2.22.0 network-first worker.
const BUILD="nanachat-step2-22-0-build-12-0-40-network-only";
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys()){if(/^(?:nanachat|nanako)/i.test(k))await caches.delete(k)}await self.clients.claim();})()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request,{cache:"no-store"}));});
