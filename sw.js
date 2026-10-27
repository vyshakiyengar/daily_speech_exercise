/* Speech On — offline shell. Only ever removes this app's own caches. */
const CACHE = 'speech-on-v32';
const SHELL = [
 './', './index.html', './app.js', './art.js', './content.js', './analytics.js', './styles.css',
 './page.css', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png',
 './og.png',
 './fonts/dm-sans-latin.woff2', './fonts/dm-sans-latin-ext.woff2',
 './fonts/manrope-latin.woff2', './fonts/manrope-latin-ext.woff2', './fonts/manrope-cyrillic.woff2',
 './routine.html', './safety.html', './privacy.html', './terms.html',
 './accessibility.html', './for-clinicians.html', './handout.html', './handout.js', './optout.js',
 './trio.js', './train.css', './read.html', './read.js', './think.html', './think.js',
 './reading/index.json', './reading/classics.json', './think/estimates.json', './think/prompts.json'
];

self.addEventListener('install', event => {
 event.waitUntil(
  caches.open(CACHE)
   /* One bad URL must not fail the whole install. */
   .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => {}))))
   .then(() => self.skipWaiting())
 );
});

self.addEventListener('activate', event => {
 event.waitUntil(
  caches.keys()
   .then(keys => Promise.all(keys
    .filter(k => (k.startsWith('speech-on-') || k.startsWith('voice-on-')) && k !== CACHE)
    .map(k => caches.delete(k))))
   .then(() => self.clients.claim())
 );
});

self.addEventListener('fetch', event => {
 const request = event.request;
 if (request.method !== 'GET') return;
 const url = new URL(request.url);
 if (url.origin !== self.location.origin) return;
 if (url.pathname.startsWith('/_vercel/')) return;

 /* Network first, so an update is picked up as soon as there is a connection,
    with the cache as the offline fallback. */
 event.respondWith(
  fetch(request)
   .then(response => {
    if (response.ok) {
     const copy = response.clone();
     event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
    }
    return response;
   })
   .catch(async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    if (request.mode === 'navigate') {
     const shell = await caches.match('./index.html');
     if (shell) return shell;
    }
    return new Response(
     '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
     '<style>body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;' +
     'background:#f3f7fd;color:#152b4a;text-align:center;padding:2rem}a{color:#1d4e9c}</style>' +
     '<div><h1>You are offline</h1><p>Speech On works offline once it has loaded at least once. ' +
     'Open <a href="/">the practice page</a> when you have a connection and it will keep working afterwards.</p></div>',
     {status: 200, headers: {'Content-Type': 'text/html; charset=utf-8'}}
    );
   })
 );
});
