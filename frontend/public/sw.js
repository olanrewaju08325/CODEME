// CODEME Academy Service Worker v1.0
// Provides offline caching for app shell and downloaded notes

const CACHE_NAME = 'codeme-v1.0.0';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/codeme.jpg',
];

// Network-first resources (always require connection)
const NETWORK_ONLY_PATTERNS = [
  /supabase\.co/,          // All API calls
  /youtube\.com/,           // Video content
  /meet\.google\.com/,      // Live classes
  /zoom\.us/,               // Live classes
];

// ──────────────── Install ────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ──────────────── Activate ────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ──────────────── Fetch Strategy ────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network-only for API and media
  const isNetworkOnly = NETWORK_ONLY_PATTERNS.some((pattern) => pattern.test(request.url));
  if (isNetworkOnly) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first for app shell assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        }).catch(() => {
          // Fallback to index.html for SPA navigation
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
    );
    return;
  }

  event.respondWith(fetch(request));
});

// ──────────────── Push Notifications ────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'You have a new notification from CodeMe Academy',
    icon: '/codeme.jpg',
    badge: '/codeme.jpg',
    tag: data.tag || 'codeme-notification',
    data: { url: data.url || '/' },
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'CodeMe Academy', options)
  );
});

// ──────────────── Notification Click ────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ──────────────── Background Sync (offline progress) ────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncOfflineProgress());
  }
});

async function syncOfflineProgress() {
  try {
    const db = await openOfflineDB();
    const pending = await db.getAll('pending-progress');
    for (const item of pending) {
      await fetch('/api/sync-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      await db.delete('pending-progress', item.id);
    }
  } catch (e) {
    console.error('[SW] Background sync failed:', e);
  }
}

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('codeme-offline', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('pending-progress', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
