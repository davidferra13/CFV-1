'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  const [visible, setVisible] = useState(false)

  useEffect(() => {
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
  }, [])

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
    <div className="fixed inset-x-2 bottom-2 z-50 animate-slide-up-fade rounded-xl border border-stone-700/60 bg-stone-900/90 px-4 py-4 shadow-lg backdrop-blur-md sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:px-6">
      <button
        type="button"
        className="absolute right-2 top-2 rounded-md p-1 text-stone-400 transition-colors hover:text-stone-200"
        onClick={handleDismiss}
        aria-label="Dismiss cookie banner"
      >
        <span aria-hidden>×</span>
      </button>
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
      <span className="text-stone-300 text-sm flex-1">
        This site uses cookies for basic functionality and analytics. See our{' '}
        <Link href="/privacy" className="underline hover:text-brand-400 transition-colors">
          Privacy Policy
        </Link>
        .
      </span>
      <div className="flex w-full shrink-0 flex-wrap gap-2 md:w-auto md:flex-nowrap">
        <button
          type="button"
          className="min-w-[88px] flex-1 rounded-lg px-4 py-2 text-sm font-medium text-stone-300 transition-all hover:text-stone-100 md:flex-none"
          onClick={handleDismiss}
          aria-label="Dismiss cookie banner for now"
        >
          Not now
        </button>
        <button
          type="button"
          className="min-w-[88px] flex-1 rounded-lg px-4 py-2 text-sm font-medium text-stone-400 transition-all hover:text-stone-200 md:flex-none"
          onClick={() => handleConsent('declined')}
          aria-label="Decline cookies"
        >
          Decline
        </button>
        <button
          type="button"
          className="min-w-[88px] flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-brand-700 md:flex-none"
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
