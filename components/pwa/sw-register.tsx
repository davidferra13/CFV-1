'use client'

// SwRegister - Registers the ChefFlow service worker for offline caching.
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

    let isMounted = true
    let refreshing = false
    const hadController = Boolean(navigator.serviceWorker.controller)

    const activateWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }

    const handleControllerChange = () => {
      if (!hadController || refreshing) return
      refreshing = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(async (registration) => {
        if (!isMounted) return
        console.info('[SW] Service worker registered')
        activateWaitingWorker(registration)

        // When a new SW is waiting, tell it to activate immediately
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              activateWaitingWorker(registration)
            }
          })
        })

        await registration.update().catch((err) => {
          console.warn('[SW] Update check failed:', err)
        })
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })

    return () => {
      isMounted = false
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  return null
}
