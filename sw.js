const CACHE_NAME="nanako-v9-1-disabled";
self.addEventListener("install",e=>{self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));await self.clients.claim();try{await self.registration.unregister();}catch{}})());});
self.addEventListener("fetch",()=>{});
