/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

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

interface PushPayloadData {
  title?: string;
  body?: string;
  message?: string;
  image?: string;
  icon?: string;
  url?: string;
  sound?: boolean;
  tag?: string;
  mediaType?: 'movie' | 'tv' | 'episode';
  mediaId?: string | number;
}

// Receive VAPID-signed Web Push notifications (new movies, series, episodes, or admin broadcasts)
self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayloadData = {};

  if (event.data) {
    try {
      payload = event.data.json() as PushPayloadData;
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'STREAMORA';
  const body =
    payload.body ||
    payload.message ||
    'Un nouveau film vient d’être ajouté au catalogue STREAMORA.';
  const targetUrl = payload.url || '/';

  const options: NotificationOptions & {
    image?: string;
    vibrate?: number[];
    renotify?: boolean;
    actions?: { action: string; title: string }[];
  } = {
    body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    image: payload.image || undefined,
    silent: payload.sound === false,
    vibrate: payload.sound === false ? undefined : [120, 60, 120],
    data: {
      url: targetUrl,
      mediaType: payload.mediaType,
      mediaId: payload.mediaId,
    },
    actions: [{ action: 'open', title: 'Voir la fiche' }],
    tag: payload.tag || `streamora-push-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'STREAMORA_PUSH_RECEIVED',
            payload: { title, body, url: targetUrl, sound: payload.sound !== false },
          });
        });
      }),
    ])
  );
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

// Automatically renew expired/rotated VAPID push subscription using env-configured public key
self.addEventListener('pushsubscriptionchange', ((event: any) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch('/api/push/vapid-public-key');
        if (!res.ok) return;
        const { publicKey, enabled } = await res.json();
        if (!enabled || !publicKey) return;

        const applicationServerKey = urlBase64ToUint8Array(publicKey);
        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSubscription }),
        });
      } catch {
        // Subscription renewal will retry on next page visit
      }
    })()
  );
}) as EventListener);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
