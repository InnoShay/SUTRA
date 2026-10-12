// SUTRA Progressive Web App (PWA) Service Worker
// Strictly enforces static asset caching only.
// ZERO caching of sensitive student data, cases, or telemetry per ADR-003 and ADR-004.

const CACHE_NAME = 'sutra-static-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/avatar-sarah.jpg',
];

// Install: Cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SUTRA PWA] Some static assets failed pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-only for all API routes and dynamic data. Cache-first only for static assets.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT PRIVACY POLICY:
  // Never intercept, cache, or store any API requests or authenticated endpoints.
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/auth') ||
    url.pathname.includes('/students/') ||
    event.request.method !== 'GET'
  ) {
    return; // Pass through to live network
  }

  // Static assets (CSS, JS, images, fonts): Cache-first with network fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return response;
          })
        );
      })
    );
    return;
  }

  // Navigation: Network-first with offline fallback
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        return cached || caches.match('/');
      });
    })
  );
});
