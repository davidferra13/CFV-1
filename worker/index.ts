/// <reference lib="webworker" />
export {} // Makes this a TypeScript module — prevents 'declare const self' from conflicting with lib.dom.d.ts global
// ChefFlow Push Notification Service Worker Extension
// Injected into the Workbox-generated sw.js by next-pwa at build time.
// Handles: push event (show notification), notificationclick (navigate),
//          pushsubscriptionchange (automatic re-subscription on endpoint rotation).
//
// next-pwa merges this file into public/sw.js automatically during `next build`.
// Do NOT manually edit public/sw.js — changes will be overwritten.

declare const self: ServiceWorkerGlobalScope

// ─── Push Event ──────────────────────────────────────────────────────────────
// Fired when the push service delivers a message to this device.
// The payload JSON shape mirrors PushPayload in lib/push/send.ts.

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: {
    title: string
    body?: string
    icon?: string
    action_url?: string
  } = { title: 'ChefFlow' }

  try {
    payload = event.data.json()
  } catch {
    payload.body = event.data.text()
  }

  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.action_url ?? 'chefflow-general',
    data: { action_url: payload.action_url ?? '/' },
    vibrate: [200, 100, 200],
    // renotify: show a new alert even if the same tag is already visible
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

// ─── Notification Click ───────────────────────────────────────────────────────
// Fired when the user taps/clicks a notification shown by this service worker.
// Navigates an existing open tab or opens a new one.

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const actionUrl: string = (event.notification.data?.action_url as string) ?? '/'
  const fullUrl = new URL(actionUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Navigate an already-open ChefFlow window if one exists
      for (const client of clientList) {
        if (
          client.url.startsWith(self.location.origin) &&
          'focus' in client &&
          'navigate' in client
        ) {
          return (client as WindowClient).navigate(fullUrl).then((c) => c?.focus())
        }
      }
      // No existing window — open a new one
      return self.clients.openWindow(fullUrl)
    })
  )
})

// ─── Push Subscription Change ─────────────────────────────────────────────────
// Fired when the browser silently rotates the push endpoint (rare but real).
// We fetch a fresh VAPID key, re-subscribe, and notify the server.

self.addEventListener('pushsubscriptionchange', (event) => {
  const changeEvent = event as PushSubscriptionChangeEvent

  event.waitUntil(
    fetch('/api/push/vapid-public-key')
      .then((res) => res.json())
      .then((data: { key?: string }) => {
        if (!data.key) throw new Error('VAPID key unavailable')
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: _cfUrlBase64ToUint8Array(data.key),
        })
      })
      .then((newSubscription) => {
        const sub = newSubscription.toJSON()
        return fetch('/api/push/resubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: changeEvent.oldSubscription?.endpoint ?? null,
            subscription: {
              endpoint: sub.endpoint,
              p256dh: sub.keys?.p256dh ?? '',
              auth: sub.keys?.auth ?? '',
            },
          }),
        })
      })
      .catch((err) => {
        console.error('[sw] pushsubscriptionchange failed:', err)
      })
  )
})

// ─── Utility ─────────────────────────────────────────────────────────────────
// Prefixed to avoid collisions with any Workbox globals.

function _cfUrlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}
