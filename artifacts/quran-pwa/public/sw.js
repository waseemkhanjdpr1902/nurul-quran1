const CACHE_NAME = 'nurul-quran-v1';
const QURAN_CACHE = 'nurul-quran-api-v1';
const STATIC_ASSETS = [
  '/',
  '/quran',
  '/prayer-times',
  '/qibla',
  '/hijri',
  '/search',
  '/manifest.json',
];

const QURAN_API_BASE = 'https://api.alquran.cloud';
const PRAYER_API_BASE = 'https://api.aladhan.com';

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== QURAN_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first for Quran API (immutable Quran data)
  if (url.origin === QURAN_API_BASE) {
    event.respondWith(
      caches.open(QURAN_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return new Response(JSON.stringify({ error: 'Offline' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  // Network-first for prayer times (time-sensitive)
  if (url.origin === PRAYER_API_BASE) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(QURAN_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for app shell (Next.js static assets)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && request.method === 'GET') {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
  }
});

// Handle push notifications (future-ready)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'Nurul Quran', {
    body: data.body || 'New content available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  });
});
