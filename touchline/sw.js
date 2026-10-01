// Touchline offline cache. The game is one file, so once it has been opened online it plays with no connection.
// Each launch shows the saved copy straight away and quietly checks for a newer version for next time.
const CACHE = 'touchline-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function tellPages(message) {
  for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage(message);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const isPage = request.mode === 'navigate';
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = isPage ? './index.html' : request;
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(request, { cache: 'no-cache' }).then(async response => {
      if (response && response.ok) {
        const changed = isPage && cached && (cached.headers.get('etag') || cached.headers.get('last-modified')) !== (response.headers.get('etag') || response.headers.get('last-modified'));
        await cache.put(key, response.clone());
        if (changed) await tellPages({ type: 'touchline-updated' });
      }
      return response;
    }).catch(() => null);
    if (cached) { event.waitUntil(fresh); return cached; }
    return (await fresh) || new Response('Touchline is offline and has not been saved on this device yet. Open it once with a connection.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
