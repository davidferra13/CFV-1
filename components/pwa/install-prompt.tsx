'use client'

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'cf-pwa-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * PWA install prompt banner. Shows on mobile when the app is installable
 * and the user hasn't dismissed it recently. Uses the beforeinstallprompt
 * event to trigger the native install flow.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show on iOS Safari standalone
    if ((navigator as unknown as { standalone?: boolean }).standalone) return

    // Check dismiss timestamp
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt)
      if (elapsed < DISMISS_DURATION_MS) return
    }

    // Only show on mobile-ish screens
    const isMobileWidth = window.innerWidth < 768

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (isMobileWidth) {
        setVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
    setDeferredPrompt(null)
  }, [])

  if (!visible) return null

  return (
    <div
      role="banner"
      aria-label="Install ChefFlow app"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto max-w-md rounded-2xl border border-stone-700 bg-stone-900/95 px-4 py-3 shadow-overlay backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-100">Install ChefFlow</p>
            <p className="text-xs text-stone-400">Get the full app experience on your device</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-2 text-sm text-stone-400 transition-colors hover:text-stone-200"
              style={{ minHeight: 44, minWidth: 44 }}
              aria-label="Dismiss install prompt"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              style={{ minHeight: 44 }}
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
