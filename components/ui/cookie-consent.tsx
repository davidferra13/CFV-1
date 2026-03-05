'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
    if (!consent) setVisible(true)
  }, [])

  function handleConsent(value: 'accepted' | 'declined') {
    setCookie('cookieConsent', value, 365)
    window.dispatchEvent(new CustomEvent('cf:cookie-consent', { detail: value }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 backdrop-blur-md bg-stone-900/90 border border-stone-700/60 shadow-lg rounded-xl px-6 py-4 z-50 flex flex-col md:flex-row items-center gap-4 max-w-lg w-full animate-slide-up-fade">
      <span className="text-stone-300 text-sm flex-1">
        This site uses cookies for basic functionality and analytics. See our{' '}
        <Link href="/privacy" className="underline hover:text-brand-400 transition-colors">
          Privacy Policy
        </Link>
        .
      </span>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          className="text-stone-400 hover:text-stone-200 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          onClick={() => handleConsent('declined')}
          aria-label="Decline cookies"
        >
          Decline
        </button>
        <button
          type="button"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 transition-all"
          onClick={() => handleConsent('accepted')}
          aria-label="Accept cookies"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
