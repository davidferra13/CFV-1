// Build version is stamped by the local build/start scripts when a production
// BUILD_ID exists. If it is ever not stamped, the worker falls back to a
// fail-safe mode that refuses to cache Next.js runtime assets.
const BUILD_VERSION = '15926abff'
const IS_BUILD_VERSION_STAMPED = BUILD_VERSION !== '__BUILD_VERSION__'
const CACHE_NAME = 'chefflow-v-' + BUILD_VERSION
const OFFLINE_URL = '/offline.html'
const CORE_ASSETS = [
  OFFLINE_URL,
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
]

// How often to poll for new build versions (5 minutes)
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          CORE_ASSETS.map((asset) => cache.add(new Request(asset, { cache: 'reload' })))
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete caches from previous stamped builds. If the build version is
      // missing, also strip stale Next.js runtime assets from the fallback cache
      // so an old worker cannot pin removed chunk files forever.
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )

      if (!IS_BUILD_VERSION_STAMPED) {
        const cache = await caches.open(CACHE_NAME)
        const cachedRequests = await cache.keys()
        await Promise.all(
          cachedRequests
            .filter((request) => {
              try {
                return isNextStaticAssetPath(new URL(request.url).pathname)
              } catch {
                return false
              }
            })
            .map((request) => cache.delete(request))
        )
      }

      await self.clients.claim()

      // Start periodic version checking
      startVersionPolling()
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'CHECK_VERSION') {
    checkForNewVersion()
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const url = new URL(event.request.url)

  // Never cache the build-version endpoint or any API routes
  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (!IS_BUILD_VERSION_STAMPED && isNextStaticAssetPath(url.pathname)) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request))
    return
  }

  if (url.origin !== self.location.origin || !isCacheableAsset(url.pathname)) {
    return
  }

  event.respondWith(staleWhileRevalidate(event.request))
})

self.addEventListener('push', (event) => {
  let payload = {}

  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { body: event.data.text() }
    }
  }

  const title = payload.title || 'ChefFlow update'
  const targetUrl = typeof payload.url === 'string' ? payload.url : '/dashboard'
  const options = {
    body: payload.body || 'You have a new notification in ChefFlow.',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'chefflow-notification',
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      url: targetUrl,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const relativeUrl =
    typeof event.notification.data?.url === 'string' ? event.notification.data.url : '/dashboard'
  const destination = new URL(relativeUrl, self.location.origin).href

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const client of windowClients) {
        if (!('focus' in client)) {
          continue
        }

        if ('navigate' in client && client.url !== destination) {
          await client.navigate(destination)
        }

        await client.focus()
        return
      }

      if ('openWindow' in self.clients) {
        await self.clients.openWindow(destination)
      }
    })()
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keyResponse = await fetch(new URL('/api/push/vapid-public-key', self.location.origin), {
          credentials: 'include',
        })
        if (!keyResponse.ok) {
          return
        }

        const { key } = await keyResponse.json()
        if (!key) {
          return
        }

        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        })

        const payload = {
          oldEndpoint: event.oldSubscription?.endpoint ?? null,
          subscription: serializeSubscription(subscription),
        }

        await fetch(new URL('/api/push/resubscribe', self.location.origin), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      } catch (error) {
        console.error('[SW] pushsubscriptionchange failed:', error)
      }
    })()
  )
})

// ---- Version polling ----

let versionPollTimer = null

function startVersionPolling() {
  if (versionPollTimer) return
  // Check immediately on activation, then every 5 minutes
  checkForNewVersion()
  versionPollTimer = setInterval(checkForNewVersion, VERSION_CHECK_INTERVAL)
}

async function checkForNewVersion() {
  // Don't poll if build version was never stamped
  if (!IS_BUILD_VERSION_STAMPED) return

  try {
    const response = await fetch('/api/build-version', { cache: 'no-store' })
    if (!response.ok) return

    const data = await response.json()
    if (data.buildId && data.buildId !== 'unknown' && data.buildId !== BUILD_VERSION) {
      console.info('[SW] New build detected:', data.buildId, '(current:', BUILD_VERSION + ')')
      // Notify all clients to reload
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((client) => {
        client.postMessage({
          type: 'NEW_VERSION_AVAILABLE',
          currentVersion: BUILD_VERSION,
          newVersion: data.buildId,
        })
      })
      // Trigger SW update check (will fetch new sw.js with new BUILD_VERSION)
      await self.registration.update()
    }
  } catch {
    // Silently ignore - network may be offline
  }
}

// ---- Request handlers ----

async function handleNavigationRequest(request) {
  try {
    return await fetch(request)
  } catch {
    const cache = await caches.open(CACHE_NAME)
    const offlineResponse = await cache.match(OFFLINE_URL)
    return offlineResponse || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cachedResponse)

  return cachedResponse || networkPromise
}

function isCacheableAsset(pathname) {
  if (isNextStaticAssetPath(pathname)) {
    return IS_BUILD_VERSION_STAMPED
  }

  return (
    pathname === OFFLINE_URL ||
    pathname === '/manifest.json' ||
    pathname === '/apple-touch-icon.png' ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo.') ||
    /\.(?:css|js|png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/i.test(pathname)
  )
}

function isNextStaticAssetPath(pathname) {
  return pathname.startsWith('/_next/static/')
}

function serializeSubscription(subscription) {
  const rawP256dh = subscription.getKey('p256dh')
  const rawAuth = subscription.getKey('auth')

  if (!rawP256dh || !rawAuth) {
    throw new Error('Push subscription missing required keys')
  }

  return {
    endpoint: subscription.endpoint,
    p256dh: bufferToBase64Url(rawP256dh),
    auth: bufferToBase64Url(rawAuth),
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i)
  }

  return output
}

function bufferToBase64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
