// NanaChat Step 1.94 VRM + FBX body-motion network-first worker.
const BUILD="nanachat-step1-94-vrm-fbx-body-motion-network-only";
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys()){if(/^(?:nanachat|nanako)/i.test(k))await caches.delete(k)}await self.clients.claim();})()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request,{cache:"no-store"}));});
