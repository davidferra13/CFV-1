'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Always unregister any existing service worker.
    // The old Workbox SW cached stale JS with CacheFirst strategy, which broke
    // React hydration on mobile (buttons stopped responding to taps).
    // PWA is bypassed in next.config.js unless ENABLE_PWA_BUILD=1, so there is
    // no valid SW to register. If a stale one exists, kill it.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
        console.info('[SW] Unregistered service worker')
      }
    })
  }, [])

  return null
}
