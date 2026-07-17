'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getConnectAccountStatus } from '@/lib/stripe/connect'

export function StripeConnectBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('stripe-connect-banner-dismissed')
    if (wasDismissed) return

    getConnectAccountStatus()
      .then((status) => {
        if (!status.connected && !status.pending) {
          setShow(true)
        }
      })
      .catch(() => {})
  }, [])

  if (!show || dismissed) return null

  return (
    <div className="flex items-center gap-4 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Connect Stripe to accept payments
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Set up Stripe Connect so clients can pay you directly through ChefFlow.
        </p>
      </div>
      <Link
        href="/settings/stripe-connect"
        className="shrink-0 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500"
      >
        Set up
      </Link>
      <button
        type="button"
        onClick={() => {
          setDismissed(true)
          sessionStorage.setItem('stripe-connect-banner-dismissed', '1')
        }}
        className="shrink-0 text-amber-400 hover:text-amber-300"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
