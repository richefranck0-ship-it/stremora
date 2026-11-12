/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Never cache API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
);

// Cache TMDB poster & backdrop images efficiently
registerRoute(
  ({ url }) => url.hostname === 'image.tmdb.org',
  new CacheFirst({
    cacheName: 'streamora-tmdb-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 180,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

// Cache navigation HTML with NetworkFirst fallback
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'streamora-pages',
    networkTimeoutSeconds: 4,
  })
);

// Handle real Web Push notifications
self.addEventListener('push', (event: PushEvent) => {
  let payload: {
    title?: string;
    body?: string;
    message?: string;
    image?: string;
    icon?: string;
    url?: string;
    sound?: boolean;
  } = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'STREAMORA';
  const body = payload.body || payload.message || 'Nouveau contenu disponible sur STREAMORA.';
  const targetUrl = payload.url || '/';

  const options: NotificationOptions & { image?: string; vibrate?: number[]; renotify?: boolean } = {
    body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    image: payload.image || undefined,
    silent: payload.sound === false,
    vibrate: payload.sound === false ? undefined : [120, 60, 120],
    data: {
      url: targetUrl,
    },
    tag: `streamora-push-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click: focus existing tab or open target link (/movie/..., /series/..., /episode/...)
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || '/';
  const absoluteUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(absoluteUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }
      return undefined;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
