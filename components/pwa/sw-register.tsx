'use client'

// SwRegister — Registers the ChefFlow service worker for offline caching.
// On update, prompts the new SW to activate immediately via SKIP_WAITING.

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const host = window.location.hostname
    const isLocalHost =
      host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local')
    const shouldRegister = process.env.NODE_ENV === 'production' && !isLocalHost

    if (!shouldRegister) {
      // Local/dev safety: remove stale SW + caches so auth/network requests hit the live dev server.
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister()
        })
      })
      if ('caches' in window) {
        void caches.keys().then((keys) => {
          keys.forEach((key) => {
            void caches.delete(key)
          })
        })
      }
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.info('[SW] Service worker registered')

        // When a new SW is waiting, tell it to activate immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — activate it
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              console.info('[SW] New service worker activated')
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })

    // When the new SW takes over, reload the page for the latest assets
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        // Don't reload during initial registration (no previous controller)
        // Only reload on subsequent updates
      }
    })
  }, [])

  return null
}
