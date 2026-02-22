'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // In development, unregister any existing service worker to prevent stale
    // cached JS from breaking hydration (buttons stop responding to taps).
    const isDev =
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '3000' ||
      window.location.port === '3100'

    if (isDev) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
          console.info('[SW] Unregistered stale service worker in dev mode')
        }
      })
      return
    }

    // Production: register the service worker normally
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('[SW] Registration failed', err)
    })
  }, [])

  return null
}
