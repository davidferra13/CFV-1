// Self-destructing service worker.
// Replaces the old Workbox SW that cached stale JS and broke React hydration.
// When the browser picks up this new SW, it unregisters itself and clears all caches.
// This is safe — the app works perfectly without a service worker in development.
// To rebuild a real SW for production, set ENABLE_PWA_BUILD=1 and run `npx next build`.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.registration.unregister())
     .then(() => self.clients.matchAll())
     .then((clients) => {
       clients.forEach((client) => client.navigate(client.url))
     })
  )
})
