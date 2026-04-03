const CACHE_NAME = 'nurul-quran-v1';
const STATIC_ASSETS = [
  '/',
  '/library',
  '/courses',
  '/halal-stocks',
  '/support',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls or external audio
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return;
  }

  // Network first, fall back to cache for HTML navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Cache first for static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// Background sync for recently-played when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-recently-played') {
    event.waitUntil(syncRecentlyPlayed());
  }
});

async function syncRecentlyPlayed() {
  const db = await openDB();
  const pending = await db.getAll('pendingPlays');
  for (const item of pending) {
    try {
      await fetch(`/api/users/recently-played/${item.lectureId}`, {
        method: 'POST',
        headers: item.token ? { Authorization: `Bearer ${item.token}` } : {},
      });
      await db.delete('pendingPlays', item.id);
    } catch {}
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('nurul-quran-offline', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pendingPlays')) {
        db.createObjectStore('pendingPlays', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
