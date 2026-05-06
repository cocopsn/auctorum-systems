/**
 * Auctorum Med — Service Worker
 *
 * Strategy:
 *  - Static shell (login, dashboard, manifest) precached on install for fast
 *    cold-start + offline launch
 *  - GET requests: network-first with cache fallback (always fresh when
 *    online, graceful degrade when offline)
 *  - API/POST/PUT/DELETE: never cached (let the network do its thing)
 *  - Push notifications: showNotification with click → open the relevant URL
 *    (deep-linked through `data.url` from the push payload)
 *  - skipWaiting + clients.claim so a new SW takes over immediately on next
 *    page load (no stale tab waiting for user to close all medconcierge tabs)
 */

const CACHE_VERSION = 'auctorum-med-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      // addAll fails the entire install if any asset 404s. Use individual
      // adds so a missing icon doesn't break SW activation.
      .then(async (cache) => {
        await Promise.all(
          STATIC_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET. POST/PUT/DELETE always hit the network.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (Supabase, Stripe, fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // Never cache API calls — they're tenant-scoped and time-sensitive.
  if (url.pathname.startsWith('/api/')) return;

  // Never cache auth callbacks
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/login')) {
    return;
  }

  // Network-first with runtime cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful, basic (same-origin) responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, clone).catch(() => {});
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback for navigation requests when fully offline
        if (request.mode === 'navigate') {
          const shell = await caches.match('/dashboard');
          if (shell) return shell;
        }
        return new Response(
          'Sin conexión — conecta a internet para usar Auctorum Med',
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }
        );
      })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: 'Auctorum Med', body: event.data?.text?.() || 'Nueva notificación' };
  }

  const title = payload.title || 'Auctorum Med';
  const body = payload.body || 'Nueva notificación';
  const tag = payload.tag || 'auctorum-notification';
  const targetUrl = payload.url || '/dashboard';

  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [180, 80, 180],
    tag,
    renotify: Boolean(payload.renotify),
    data: { url: targetUrl, ...(payload.data || {}) },
    requireInteraction: Boolean(payload.requireInteraction),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab if one is open on the same origin
      for (const client of windowClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && 'focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
            return;
          }
        } catch (_e) {
          // ignore malformed client URLs
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
