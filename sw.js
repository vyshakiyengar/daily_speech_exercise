/* Voice On — versioned offline shell. Only remove this app's own caches. */
const CACHE = 'voice-on-v7';
const SHELL = ['./', './index.html', './app.js', './analytics.js', './styles.css', './fluency.html', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('voice-on-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if(new URL(request.url).pathname.startsWith('/_vercel/')) return;
  if(request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(request).then(response => {
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}
    return response;
  }).catch(async () => (await caches.match(request)) || (request.mode==='navigate' && new URL(request.url).pathname.endsWith('/') ? await caches.match('./index.html') : null) || Response.error()));
});
