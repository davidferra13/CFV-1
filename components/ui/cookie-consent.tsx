'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent')
    if (!consent) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border border-stone-200 shadow-lg rounded-xl px-6 py-4 z-50 flex flex-col md:flex-row items-center gap-4 max-w-lg w-full">
      <span className="text-stone-700 text-sm flex-1">
        This site uses cookies for basic functionality and analytics. By using ChefFlow, you accept
        our{' '}
        <Link href="/privacy" className="underline hover:text-brand-700 transition-colors">
          Privacy Policy
        </Link>
        .
      </span>
      <button
        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 transition-all"
        onClick={() => {
          localStorage.setItem('cookieConsent', 'true')
          setVisible(false)
        }}
        aria-label="Accept cookies"
      >
        Accept
      </button>
    </div>
  )
}
