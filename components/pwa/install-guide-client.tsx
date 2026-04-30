'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Apple, CheckCircle2, Chrome, Monitor, Share2, Smartphone } from '@/components/ui/icons'
import { DeviceStatusPanel } from '@/components/pwa/device-status-panel'
import { usePwaInstall } from '@/components/pwa/use-pwa-install'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

const INSTALL_STEPS = {
  ios: [
    'Open this page in Safari.',
    'Tap the Share button.',
    'Choose Add to Home Screen.',
    'Confirm the name ChefFlow.',
  ],
  android: [
    'Open this page in Chrome or Edge.',
    'Tap Install when the prompt appears.',
    'If no prompt appears, open the browser menu and choose Install app.',
  ],
  desktop: [
    'Open this page in Chrome or Edge.',
    'Use the Install button in ChefFlow or the install icon in the address bar.',
    'Pin ChefFlow to your taskbar, dock, or desktop launcher after install.',
  ],
} as const

function StepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-brand-400/40 bg-brand-500/15 text-xs font-semibold text-brand-100">
            {index + 1}
          </span>
          <span className="pt-1 text-sm leading-6 text-stone-300">{step}</span>
        </li>
      ))}
    </ol>
  )
}

export function InstallGuideClient() {
  const { browserName, canPromptInstall, install, installed, isAndroid, isIos } = usePwaInstall()
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)

  useEffect(() => {
    const installUrl = `${window.location.origin}/install`
    QRCode.toDataURL(installUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#1c1917',
        light: '#faf9f7',
      },
    })
      .then(setQrCodeUrl)
      .catch(() => setQrCodeUrl(null))

    trackEvent(ANALYTICS_EVENTS.FEATURE_USED, {
      feature: 'pwa_install',
      action: 'install_page_viewed',
      browser: browserName,
    })
  }, [browserName])

  const primarySteps = isIos
    ? INSTALL_STEPS.ios
    : isAndroid
      ? INSTALL_STEPS.android
      : INSTALL_STEPS.desktop

  return (
    <div className="space-y-10">
      <section className="border-y border-stone-800/80 bg-stone-950/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_0.8fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              App install
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-normal text-stone-50 sm:text-5xl">
              Install ChefFlow on this device
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
              ChefFlow installs from the browser as a secure web app. It opens in its own window,
              keeps the app icon on your device, and preserves offline capture for kitchen work.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={!canPromptInstall || installed}
                onClick={() => void install()}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-50"
              >
                {installed
                  ? 'ChefFlow is installed'
                  : canPromptInstall
                    ? 'Install ChefFlow'
                    : 'Use the steps below'}
              </button>
              <a
                href="/auth/signin?portal=chef"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-stone-700 bg-stone-900/80 px-5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
              >
                Sign in
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-5">
            <p className="text-sm font-semibold text-stone-100">Open on your phone</p>
            <p className="mt-1 text-sm leading-6 text-stone-400">
              Scan this from desktop, then install from the mobile browser.
            </p>
            <div className="mt-4 flex h-[236px] items-center justify-center rounded-lg bg-stone-100 p-4">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR code for the ChefFlow install page"
                  className="h-[220px] w-[220px]"
                />
              ) : (
                <div className="h-[220px] w-[220px] animate-pulse rounded-lg bg-stone-300" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-5">
          <Chrome className="h-6 w-6 text-brand-300" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-stone-50">This browser</h2>
          <p className="mt-1 text-sm text-stone-400">{browserName} detected</p>
          <div className="mt-5">
            <StepList steps={primarySteps} />
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-5">
          <Apple className="h-6 w-6 text-stone-200" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-stone-50">iPhone and iPad</h2>
          <p className="mt-1 text-sm text-stone-400">Safari uses a manual home screen flow.</p>
          <div className="mt-5">
            <StepList steps={INSTALL_STEPS.ios} />
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-5">
          <Monitor className="h-6 w-6 text-sky-300" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-stone-50">Desktop</h2>
          <p className="mt-1 text-sm text-stone-400">Keep ChefFlow in its own app window.</p>
          <div className="mt-5">
            <StepList steps={INSTALL_STEPS.desktop} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-stone-50">What works offline</h2>
          </div>
          <div className="mt-5 grid gap-3 text-sm text-stone-300">
            <p>
              Quick capture saves notes, expenses, and event notes locally when the network drops.
            </p>
            <p>Pending items sync after sign-in when the device comes back online.</p>
            <p>
              Previously loaded assets and the offline capture page stay available from the app
              shell.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/65 p-5">
          <div className="flex items-center gap-3">
            <Share2 className="h-6 w-6 text-brand-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-stone-50">Device status</h2>
          </div>
          <div className="mt-5">
            <DeviceStatusPanel compact />
          </div>
        </div>
      </section>
    </div>
  )
}
