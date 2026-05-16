const CACHE = 'jeppy-exe-v2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/audio.js',
  './js/background.js',
  './js/character.js',
  './js/ai.js',
  './js/main.js',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin.includes('generativelanguage.googleapis.com')) return;
  if (url.origin.includes('api.deepseek.com')) return;
  if (url.origin.includes('cdnjs.cloudflare.com')) return;
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
