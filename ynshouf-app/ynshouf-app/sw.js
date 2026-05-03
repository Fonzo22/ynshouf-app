const CACHE = 'ynshouf-v4';

// App shell — cache immediately on install
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// ── Activate: delete old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())  // take over open tabs
  );
});

// ── Fetch strategy ──────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { url, mode } = event.request;

  // 1. Never intercept: AI proxy, GPS, and non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.includes('workers.dev') ||
    url.includes('nominatim.openstreetmap.org')
  ) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Cache hit → return immediately
      if (cached) return cached;

      // Cache miss → fetch from network
      return fetch(event.request)
        .then(response => {
          if (!response || !response.ok) return response;

          // Cache CDN resources (docx.js, proj4.js + Google Fonts) on first load
          const isCDN =
            url.startsWith('https://unpkg.com') ||
            url.startsWith('https://cdnjs.cloudflare.com') ||
            url.startsWith('https://fonts.googleapis.com') ||
            url.startsWith('https://fonts.gstatic.com');

          if (isCDN) {
            const toCache = response.clone();
            caches.open(CACHE).then(c => c.put(event.request, toCache));
          }

          return response;
        })
        .catch(() => {
          // Offline fallback: serve index.html for navigation requests
          if (mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
