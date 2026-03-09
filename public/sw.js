// Service worker cleanup placeholder.
// PWA registration is disabled unless ENABLE_PWA_BUILD=1 during build time.
// This worker removes any previously cached offline assets/pages so old beta
// clients stop serving stale HTML, JS, and CSS after deploys.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))

      await self.registration.unregister()

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      await Promise.all(
        windowClients.map((client) =>
          typeof client.navigate === 'function' ? client.navigate(client.url).catch(() => undefined) : undefined
        )
      )
    })()
  )
})
