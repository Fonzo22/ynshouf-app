const CACHE = 'ynshouf-v5';

// App shell — cache immediately on install (ללא index.html)
const SHELL = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: מחק כל קאש ישן ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { url, mode } = event.request;

  // אל תיירט בקשות non-GET
  if (event.request.method !== 'GET') return;

  // index.html — תמיד מהרשת (לא מהקאש)
  if (url.includes('index.html') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // workers.dev ו-nominatim — אל תיירט
  if (
    url.includes('workers.dev') ||
    url.includes('nominatim.openstreetmap.org')
  ) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || !response.ok) return response;

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
          if (mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
