const CACHE = 'ynshouf-v10';
const CORE_ASSETS = [
  './', './index.html', './docx.min.js',
  './css/style.css', './css/auth.css',
  './js/config.js', './js/photos.js', './js/signature.js',
  './js/ui.js', './js/gps.js', './js/ai.js',
  './js/storage.js', './js/report.js', './js/drive.js', './js/auth.js',
  './YNSHOUF_Template.docx',
];
const CDN_ASSETS = [];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await c.addAll(CORE_ASSETS);
      for (const url of CDN_ASSETS) {
        try { await c.add(url); } catch (_) {}
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.anthropic.com')) return;
  if (e.request.url.includes('googleapis.com')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    })).catch(() => caches.match('./index.html'))
  );
});
