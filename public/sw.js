// ChefFlow Service Worker — Offline-First Caching
// Strategies:
//   - App shell (HTML pages): Network-first, fall back to cache, then offline.html
//   - Static assets (JS, CSS, fonts, images): Cache-first (immutable hashed filenames)
//   - API calls: Network-only (server actions must go through the online queue)
//   - Health check: Network-only (used for connectivity detection)
//
// Cache versioning: bump CACHE_VERSION to bust all caches on deploy.

const CACHE_VERSION = 'v1'
const SHELL_CACHE = `chefflow-shell-${CACHE_VERSION}`
const STATIC_CACHE = `chefflow-static-${CACHE_VERSION}`

// Pages to pre-cache for offline navigation
const SHELL_URLS = ['/offline.html']

// --- Install: pre-cache the offline fallback ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  )
})

// --- Activate: clean old caches, claim clients ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// --- Fetch: route requests to the right strategy ---
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // Skip non-GET requests (server actions are POST)
  if (request.method !== 'GET') return

  // API routes — network only, never cache
  if (url.pathname.startsWith('/api/')) return

  // Next.js data routes — network only
  if (url.pathname.startsWith('/_next/data/')) return

  // Static assets with hashed filenames — cache first (immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Fonts and images in public/ — cache first
  if (
    url.pathname.match(/\.(woff2?|ttf|otf|eot|ico|png|jpg|jpeg|gif|svg|webp)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // HTML pages — network first, fall back to cache, then offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // Everything else (CSS, JS loaded dynamically) — stale while revalidate
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
})

// --- Caching strategies ---

/** Cache first — return cached version, only fetch if not cached */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // If fetch fails and nothing cached, return a basic error
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

/** Network first — try network, fall back to cache, then offline.html */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      // Cache the successful response for offline use
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Network failed — try cache
    const cached = await caches.match(request)
    if (cached) return cached

    // Nothing cached — return the offline page
    const offline = await caches.match('/offline.html')
    if (offline) return offline

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

/** Stale while revalidate — return cached immediately, update in background */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached || new Response('Offline', { status: 503 }))

  return cached || fetchPromise
}

// --- Push notification handler ---
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    }
    event.waitUntil(self.registration.showNotification(data.title || 'ChefFlow', options))
  } catch {
    // Malformed push data — ignore
  }
})

// --- Notification click handler ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new tab
      return self.clients.openWindow(url)
    })
  )
})

// --- Message handler (for manual cache busting from the app) ---
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  }
})
