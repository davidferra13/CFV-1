'use client'

// Trial Banner UI - dismissable per session via sessionStorage.
// Two states: 'expiring' (≤3 days left, amber) and 'expired' (orange).

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from '@/components/ui/icons'

type Props = {
  type: 'expiring' | 'expired'
  daysLeft: number | null
}

export function TrialBannerClient({ type, daysLeft }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const key = `trial_banner_dismissed_${type}`
    if (!sessionStorage.getItem(key)) setVisible(true)
  }, [type])

  if (!visible) return null

  const isExpired = type === 'expired'
  const wrapperClass = isExpired
    ? 'bg-orange-950 border-b border-orange-200 text-orange-900'
    : 'bg-amber-950 border-b border-amber-200 text-amber-900'

  const message = isExpired
    ? 'Your free trial has ended. Upgrade to Pro to unlock all features.'
    : `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade to Pro to keep full access.`

  function dismiss() {
    sessionStorage.setItem(`trial_banner_dismissed_${type}`, '1')
    setVisible(false)
  }

  return (
    <div className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm ${wrapperClass}`}>
      <AlertTriangle size={15} className="shrink-0" />
      <p className="flex-1 font-medium">{message}</p>
      <Link
        href="/settings/billing"
        className="font-semibold underline underline-offset-2 shrink-0"
      >
        Upgrade to Pro →
      </Link>
      <button
        onClick={dismiss}
        className="p-0.5 rounded hover:bg-black/10 transition-colors shrink-0"
        aria-label="Dismiss trial banner"
      >
        <X size={14} />
      </button>
    </div>
  )
}
