/* pedidos-panaderia service worker (vanilla JS, no build step). */
const CACHE_NAME = 'pedidos-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((name) => name.startsWith('pedidos-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin requests (no caching of third-party assets).
  if (url.origin !== self.location.origin) return;

  // Always go to the network for API traffic.
  if (isApiRequest(url)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = (await cache.match('/index.html')) || (await cache.match('/'));
          if (cached) return cached;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }),
    );
    return;
  }

  // Same-origin static: cache-first, refresh cache in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetch(request)
          .then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

// Web-push handlers. Without these the browser receives the push but has
// nothing to dispatch it to, so the message is dropped silently. The
// backend (pedidos-api WebpushService.sendToDevice) sends a JSON payload of
// shape { title, body, tag? }; data.url is optional and falls back to
// `/orders`. Bumping CACHE_NAME above also forces an upgrade on existing
// service-worker registrations so cached old SWs pick this up.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_err) {
    payload = {
      title: 'Pedidos',
      body: event.data ? event.data.text() : '',
    };
  }
  const title = payload.title || 'Pedidos';
  const options = {
    body: payload.body || '',
    tag: payload.tag,
    data: payload,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/orders';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow ? self.clients.openWindow(target) : null;
      }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Browsers can invalidate a push subscription (e.g. on key rotation).
  // We don't re-subscribe here because the applicationServerKey lives in
  // the page context; we just notify open clients so the frontend can
  // refresh the subscription.
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'push-subscription-changed' });
        }
      }),
  );
});