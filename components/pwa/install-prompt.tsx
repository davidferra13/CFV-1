'use client'

import { Smartphone, X } from '@/components/ui/icons'
import { usePwaInstall } from '@/components/pwa/use-pwa-install'

export function InstallPrompt() {
  const { canPromptInstall, dismissed, dismiss, install, installed } = usePwaInstall()

  async function handleInstall() {
    await install()
  }

  if (!canPromptInstall || dismissed || installed) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-stone-700/70 bg-stone-950/95 shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-md">
      <div className="h-1 bg-gradient-to-r from-brand-500 via-amber-300 to-stone-500" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-brand-400/30 bg-brand-500/15 text-brand-200">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-100">Install ChefFlow</p>
              <p className="mt-1 text-xs leading-5 text-stone-300">
                Add ChefFlow to this device for faster launch, standalone windows, and
                kitchen-friendly access.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-200"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
            onClick={dismiss}
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
    </div>
  )
}
