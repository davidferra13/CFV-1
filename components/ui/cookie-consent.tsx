'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useIsDemoMode } from '@/lib/demo-mode'

const DISMISS_KEY = 'cf-cookie-consent-dismissed-until'
const DISMISS_DAYS = 7

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export function CookieConsent() {
  const isDemo = useIsDemoMode()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isDemo) return
    const consent = getCookie('cookieConsent')
    if (consent) return

    try {
      const dismissedUntilRaw = window.localStorage.getItem(DISMISS_KEY)
      const dismissedUntil = dismissedUntilRaw ? Number(dismissedUntilRaw) : 0
      if (dismissedUntil && dismissedUntil > Date.now()) return
    } catch {
      // Ignore localStorage read failures and continue showing banner.
    }

    setVisible(true)
  }, [isDemo])

  function handleConsent(value: 'accepted' | 'declined') {
    setCookie('cookieConsent', value, 365)
    window.dispatchEvent(new CustomEvent('cf:cookie-consent', { detail: value }))
    setVisible(false)
  }

  function handleDismiss() {
    try {
      const dismissUntil = Date.now() + DISMISS_DAYS * 864e5
      window.localStorage.setItem(DISMISS_KEY, String(dismissUntil))
    } catch {
      // Ignore localStorage write failures and just hide this render.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-2 left-2 right-2 z-50 overflow-hidden animate-slide-up-fade rounded-xl border border-stone-700/60 bg-stone-900/92 px-3 py-2.5 shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-md sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[min(42rem,calc(100vw-2rem))] sm:max-w-none sm:-translate-x-1/2 sm:rounded-2xl sm:px-6 sm:py-4">
      <button
        type="button"
        className="absolute right-2 top-2 hidden rounded-md p-1 text-stone-500 transition-colors hover:text-stone-200 sm:block"
        onClick={handleDismiss}
        aria-label="Dismiss cookie banner"
      >
        <span aria-hidden>x</span>
      </button>

      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <p className="flex-1 text-xs leading-[1.125rem] text-stone-200">
            Cookies keep core features working and help us improve ChefFlow.
          </p>
          <button
            type="button"
            className="shrink-0 rounded-md px-1 py-0.5 text-[11px] font-medium text-stone-400 transition-colors hover:text-stone-100"
            onClick={handleDismiss}
            aria-label="Dismiss cookie banner for now"
          >
            Not now
          </button>
        </div>
        <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
          <Link
            href="/privacy"
            className="text-[11px] text-stone-400 underline underline-offset-2 transition-colors hover:text-brand-300"
          >
            Privacy
          </Link>
          <button
            type="button"
            className="min-w-0 rounded-lg border border-stone-700 bg-stone-950/80 px-2.5 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100"
            onClick={() => handleConsent('declined')}
            aria-label="Decline cookies"
          >
            Decline
          </button>
          <button
            type="button"
            className="min-w-0 rounded-lg bg-brand-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            onClick={() => handleConsent('accepted')}
            aria-label="Accept cookies"
          >
            Accept
          </button>
        </div>
      </div>

      <div className="hidden flex-col items-start gap-4 sm:flex md:flex-row md:items-center">
        <span className="flex-1 text-sm text-stone-300">
          This site uses cookies for basic functionality and analytics. See our{' '}
          <Link href="/privacy" className="underline transition-colors hover:text-brand-400">
            Privacy Policy
          </Link>
          .
        </span>
        <div className="grid w-full shrink-0 grid-cols-3 gap-2 md:w-auto md:grid-cols-none md:auto-cols-max md:grid-flow-col">
          <button
            type="button"
            className="min-w-0 rounded-lg px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:text-stone-100 md:px-4"
            onClick={handleDismiss}
            aria-label="Dismiss cookie banner for now"
          >
            Not now
          </button>
          <button
            type="button"
            className="min-w-0 rounded-lg px-3 py-2 text-sm font-medium text-stone-400 transition-colors hover:text-stone-200 md:px-4"
            onClick={() => handleConsent('declined')}
            aria-label="Decline cookies"
          >
            Decline
          </button>
          <button
            type="button"
            className="min-w-0 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700 md:px-4"
            onClick={() => handleConsent('accepted')}
            aria-label="Accept cookies"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
