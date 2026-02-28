// Inbox Push Notification Service Worker
// Handles push events for new inbox messages.
// This runs alongside the existing Workbox sw.js

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'New Message', body: event.data.text() }
  }

  const title = data.title || 'New Inbox Message'
  const options = {
    body: data.body || 'You have a new message in your inbox.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'inbox-notification',
    renotify: true,
    data: {
      url: data.url || '/inbox',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const url = event.notification.data?.url || '/inbox'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes('/inbox') && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
