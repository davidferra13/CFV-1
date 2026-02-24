'use client'

// Desktop App Settings
// Shows auto-start toggle ONLY when running inside the Tauri desktop shell.
// When running in a normal browser, shows a download prompt instead.

import { useEffect, useState } from 'react'

type AutostartState = 'loading' | 'enabled' | 'disabled' | 'unavailable'

export function DesktopAppSettings() {
  const [autostartState, setAutostartState] = useState<AutostartState>('loading')
  const [updating, setUpdating] = useState(false)
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    // Tauri injects __TAURI_INTERNALS__ on the window object
    const inTauri =
      typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)

    setIsTauri(inTauri)

    if (!inTauri) {
      setAutostartState('unavailable')
      return
    }

    // Load current auto-start state
    import('@tauri-apps/plugin-autostart')
      .then(async ({ isEnabled }) => {
        const enabled = await isEnabled()
        setAutostartState(enabled ? 'enabled' : 'disabled')
      })
      .catch(() => setAutostartState('unavailable'))
  }, [])

  async function toggleAutostart() {
    if (updating || autostartState === 'loading' || autostartState === 'unavailable') return
    setUpdating(true)
    try {
      const { enable, disable, isEnabled } = await import('@tauri-apps/plugin-autostart')
      if (autostartState === 'enabled') {
        await disable()
      } else {
        await enable()
      }
      const current = await isEnabled()
      setAutostartState(current ? 'enabled' : 'disabled')
    } catch (err) {
      console.error('[desktop-app] autostart toggle failed', err)
    } finally {
      setUpdating(false)
    }
  }

  // In browser: show a download callout
  if (!isTauri && autostartState !== 'loading') {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-800 p-4">
        <p className="font-medium text-stone-100">ChefFlow Desktop App</p>
        <p className="mt-1 text-sm text-stone-400">
          Run ChefFlow as a native app that lives in your system tray — always one click away, with
          desktop notifications and auto-start on login.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          You&apos;re currently using ChefFlow in a browser. Download the desktop app to unlock
          system tray and native notification support.
        </p>
        <p className="mt-2 text-xs text-stone-400 italic">Desktop app download coming soon.</p>
      </div>
    )
  }

  // Loading state
  if (autostartState === 'loading') {
    return <div className="h-16 animate-pulse rounded-lg bg-stone-800" />
  }

  // Inside Tauri — show the real toggle
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-stone-700 p-4">
        <div>
          <p className="font-medium text-stone-100">Launch at login</p>
          <p className="text-sm text-stone-500 mt-0.5">
            Start ChefFlow automatically when you log into Windows
          </p>
        </div>
        <button
          onClick={toggleAutostart}
          disabled={updating}
          aria-pressed={autostartState === 'enabled'}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
            autostartState === 'enabled' ? 'bg-brand-600' : 'bg-stone-700'
          }`}
        >
          <span className="sr-only">
            {autostartState === 'enabled' ? 'Disable launch at login' : 'Enable launch at login'}
          </span>
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ${
              autostartState === 'enabled' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="rounded-lg border border-stone-800 bg-stone-800 px-4 py-3">
        <p className="text-xs text-stone-500">
          Running as desktop app — system tray is active. Close the window to minimize to tray.
          Right-click the tray icon to open, start a new event or inquiry, or quit.
        </p>
      </div>
    </div>
  )
}
