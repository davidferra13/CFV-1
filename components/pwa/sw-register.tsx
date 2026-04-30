'use client'

// SwRegister - Registers the ChefFlow service worker for offline caching.
// On update, shows a user-controlled reload prompt instead of interrupting active work.

import { useEffect, useState } from 'react'
import { RefreshCw, X } from '@/components/ui/icons'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

type PendingUpdate = {
  currentVersion: string
  newVersion: string
}

export function SwRegister() {
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null)

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
    const hadController = Boolean(navigator.serviceWorker.controller)

    const handleControllerChange = () => {
      if (!hadController) return
      setPendingUpdate(
        (current) =>
          current ?? {
            currentVersion: 'current',
            newVersion: 'latest',
          }
      )
    }

    // Listen for version change messages from the service worker.
    // When a new build is deployed, the SW detects it via /api/build-version
    // and posts NEW_VERSION_AVAILABLE. The user chooses when to reload.
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_VERSION_AVAILABLE') {
        console.info(
          '[SW] New version available:',
          event.data.newVersion,
          '(was:',
          event.data.currentVersion + ')'
        )
        setPendingUpdate({
          currentVersion: String(event.data.currentVersion ?? 'unknown'),
          newVersion: String(event.data.newVersion ?? 'unknown'),
        })
        trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
          feature: 'pwa_update',
          action: 'update_ready',
        })
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    navigator.serviceWorker.addEventListener('message', handleSwMessage)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(async (registration) => {
        if (!isMounted) return
        console.info('[SW] Service worker registered')

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setPendingUpdate(
                (current) =>
                  current ?? {
                    currentVersion: 'current',
                    newVersion: 'latest',
                  }
              )
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
      navigator.serviceWorker.removeEventListener('message', handleSwMessage)
    }
  }, [])

  if (!pendingUpdate) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-brand-500/30 bg-stone-950/95 shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-md">
      <div className="h-1 bg-brand-500" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-100">Update ready</p>
            <p className="mt-1 text-xs leading-5 text-stone-300">
              A newer ChefFlow version is available. Update when you are not in the middle of a
              form.
            </p>
            <p className="mt-2 text-[11px] text-stone-500">
              {pendingUpdate.currentVersion} to {pendingUpdate.newVersion}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-200"
            onClick={() => setPendingUpdate(null)}
            aria-label="Dismiss update notice"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          onClick={() => {
            trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
              feature: 'pwa_update',
              action: 'update_clicked',
            })
            window.location.reload()
          }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Update ChefFlow
        </button>
      </div>
    </div>
  )
}
