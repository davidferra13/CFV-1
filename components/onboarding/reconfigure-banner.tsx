'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Settings, X } from '@/components/ui/icons'

const DISMISS_KEY = 'onboarding-reconfigure-dismissed'

export function ReconfigureBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  if (!visible) return null

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="rounded-lg bg-stone-700 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Settings className="h-3.5 w-3.5 text-stone-400" />
        <p className="text-xs text-stone-300">
          Want to change your setup?{' '}
          <Link
            href="/onboarding?reconfigure=true"
            className="text-brand-400 hover:text-brand-300 underline underline-offset-2"
          >
            You can reconfigure anytime.
          </Link>
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-stone-500 hover:text-stone-300 transition-colors flex-shrink-0"
        aria-label="Dismiss reconfigure banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
