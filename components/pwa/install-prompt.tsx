'use client'

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'cf-pwa-install-prompt-dismissed'
const INSTALLED_KEY = 'cf-pwa-installed'

type BeforeInstallPromptChoice = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptChoice>
}

function isDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // localStorage can be unavailable in restricted browsing modes.
  }
}

function markInstalled() {
  try {
    window.localStorage.setItem(INSTALLED_KEY, '1')
    window.localStorage.removeItem(DISMISS_KEY)
  } catch {
    // Install still succeeded even if localStorage is unavailable.
  }
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()

      if (isDismissed()) {
        setInstallEvent(null)
        setVisible(false)
        return
      }

      setInstallEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    function handleAppInstalled() {
      markInstalled()
      setInstallEvent(null)
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installEvent) return

    setVisible(false)
    await installEvent.prompt()

    const choice = await installEvent.userChoice
    if (choice.outcome === 'dismissed') {
      markDismissed()
    }

    setInstallEvent(null)
  }

  function handleDismiss() {
    markDismissed()
    setVisible(false)
    setInstallEvent(null)
  }

  if (!visible || !installEvent) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-stone-700/70 bg-stone-950/95 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-100">Install ChefFlow</p>
          <p className="mt-1 text-xs leading-5 text-stone-300">
            Add ChefFlow to this device for faster access from your home screen.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md px-1.5 py-0.5 text-sm text-stone-500 transition-colors hover:text-stone-200"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >
          x
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
          onClick={handleDismiss}
        >
          Not now
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          onClick={handleInstall}
        >
          Install
        </button>
      </div>
    </div>
  )
}
