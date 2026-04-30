'use client'

// Desktop App Settings
// Shows auto-start toggle ONLY when running inside the Tauri desktop shell.
// When running in a normal browser, shows web app install and device status.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DeviceStatusPanel } from '@/components/pwa/device-status-panel'
import { usePwaInstall } from '@/components/pwa/use-pwa-install'
import { Monitor, Smartphone } from '@/components/ui/icons'

type AutostartState = 'loading' | 'enabled' | 'disabled' | 'unavailable'

export function DesktopAppSettings() {
  const [autostartState, setAutostartState] = useState<AutostartState>('loading')
  const [updating, setUpdating] = useState(false)
  const [isTauri, setIsTauri] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const { canPromptInstall, install, installed } = usePwaInstall()

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
    setToggleError(null)
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
      setToggleError('Could not update launch-at-login setting. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  // In browser: show the installable web app status.
  if (!isTauri && autostartState !== 'loading') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-brand-400/30 bg-brand-500/10 text-brand-200">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-stone-100">Installable ChefFlow app</p>
              <p className="mt-1 text-sm leading-6 text-stone-400">
                Add ChefFlow to this device from the browser for standalone launch, app icon access,
                offline capture, and update-managed sessions.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!canPromptInstall || installed}
              onClick={() => void install()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {installed
                ? 'Installed on this device'
                : canPromptInstall
                  ? 'Install ChefFlow'
                  : 'Open install guide'}
            </button>
            <Link
              href="/install"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-stone-700 bg-stone-900 px-4 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Install guide
            </Link>
          </div>
        </div>

        <DeviceStatusPanel compact />

        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4">
          <div className="flex items-start gap-3">
            <Monitor className="mt-0.5 h-5 w-5 flex-shrink-0 text-stone-400" aria-hidden="true" />
            <div>
              <p className="font-medium text-stone-300">Native desktop shell</p>
              <p className="mt-1 text-sm leading-6 text-stone-500">
                The browser-installed app is the primary cross-device install path. The native
                desktop shell remains reserved for system tray and launch-at-login workflows.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (autostartState === 'loading') {
    return <div className="h-16 animate-pulse rounded-lg bg-stone-800" />
  }

  // Inside Tauri - show the real toggle
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
            className={`inline-block h-5 w-5 transform rounded-full bg-stone-900 shadow ring-0 transition duration-200 ${
              autostartState === 'enabled' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="rounded-lg border border-stone-800 bg-stone-800 px-4 py-3">
        <p className="text-xs text-stone-500">
          Running as desktop app - system tray is active. Close the window to minimize to tray.
          Right-click the tray icon to open, start a new event or inquiry, or quit.
        </p>
      </div>
      {toggleError && (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300"
          role="alert"
        >
          {toggleError}
        </div>
      )}
    </div>
  )
}
