// NanaChat Step 2.30.6 network-first worker.
const BUILD="nanachat-step2-30-6-build-12-0-69-single-neutral-idle";
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys()){if(/^(?:nanachat|nanako)/i.test(k))await caches.delete(k)}await self.clients.claim();})()));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=new URL(e.request.url);
  if(url.origin===self.location.origin&&url.pathname.includes("/static/models/")&&url.pathname.endsWith(".vrm")){
    e.respondWith((async()=>{
      const cache=await caches.open(BUILD),cached=await cache.match(e.request);
      if(cached)return cached;
      const response=await fetch(e.request,{cache:"no-store"});
      if(response.ok)await cache.put(e.request,response.clone());
      return response;
    })());
    return;
  }
  e.respondWith(fetch(e.request,{cache:"no-store"}));
});
