// Nanako v9.4: service worker intentionally disabled during Omni stabilization.
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));await self.registration.unregister();})()));
self.addEventListener("fetch",()=>{});
