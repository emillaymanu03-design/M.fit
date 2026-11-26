/* M.Fit: guarda o aplicativo no aparelho para funcionar sem internet */
const CACHE='mfit-app-3436ce640e',FONTS='mfit-fonts';
const FILES=['./','./manifest.webmanifest','./pdf-lib.min.js','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
const FONT_CSS='https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=Figtree:wght@400;500;600;700&display=swap';
async function cacheFonts(){
  const cache=await caches.open(FONTS),res=await fetch(FONT_CSS);if(!res.ok)return;
  await cache.put(FONT_CSS,res.clone());
  const urls=[...(await res.text()).matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m=>m[1]);
  await Promise.all(urls.map(u=>cache.add(u).catch(()=>{})));
}
self.addEventListener('install',e=>e.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(FILES.map(f=>new Request(f,{cache:'reload'})));
  /* as fontes são um extra: se falharem, o app usa a fonte do aparelho */
  await Promise.race([cacheFonts().catch(()=>{}),new Promise(r=>setTimeout(r,5000))]);
  await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k.startsWith('mfit-app-')&&k!==CACHE)await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET')return;
  if(/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith((async()=>{const cache=await caches.open(FONTS),hit=await cache.match(req.url);if(hit)return hit;
      const res=await fetch(req);if(res.ok||res.type==='opaque')cache.put(req.url,res.clone());return res})().catch(()=>Response.error()));
    return;
  }
  if(url.origin!==location.origin)return;
  e.respondWith((async()=>{const cache=await caches.open(CACHE);
    return await cache.match(req.mode==='navigate'?'./':req,{ignoreSearch:true})||fetch(req)})());
});
