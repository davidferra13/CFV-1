'use client'

// UpgradePrompt - contextual upgrade surface for paid-tier features.
//
// Design principle: paid features are never locked buttons. The free version
// executes first. This component surfaces the upgrade opportunity inline,
// after the free action completes - not before, not instead.
//
// Two variants:
//   'inline' (default) - one-line banner, minimal, appears below the completed action
//   'card'             - more prominent, for higher-intent moments
//
// Usage (feature-slug driven - reads trigger copy from feature-classification.ts):
//   <UpgradePrompt featureSlug="menu-costing-live" show={hasManuallyCosted} />
//
// Usage (custom copy):
//   <UpgradePrompt featureSlug="menu-costing-live" show={true} message="..." cta="..." />

import { useState } from 'react'
import { getUpgradeTrigger } from '@/lib/billing/feature-classification'

type UpgradePromptProps = {
  /** The paid feature slug from lib/billing/feature-classification.ts */
  featureSlug: string
  /** Controls visibility - set true after the free action completes */
  show: boolean
  /** Optional copy override */
  message?: string
  /** Optional CTA text override */
  cta?: string
  /** Called when user clicks the CTA. Defaults to navigate to /settings/billing */
  onUpgrade?: () => void
  /** 'inline' = subtle one-liner, 'card' = prominent block */
  variant?: 'inline' | 'card'
  className?: string
}

export function UpgradePrompt({
  featureSlug,
  show,
  message: messageProp,
  cta: ctaProp,
  onUpgrade,
  variant = 'inline',
  className,
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false)

  if (!show || dismissed) return null

  const trigger = getUpgradeTrigger(featureSlug)
  const message = messageProp ?? trigger?.message ?? 'Upgrade to unlock more.'
  const cta = ctaProp ?? trigger?.cta ?? 'Learn more'

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      window.location.href = '/settings/billing'
    }
  }

  if (variant === 'card') {
    return (
      <div
        className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className ?? ''}`}
        role="region"
        aria-label="Upgrade opportunity"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm text-amber-900">{message}</p>
            <button
              type="button"
              onClick={handleUpgrade}
              className="mt-2 text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              {cta} &rarr;
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-amber-400 hover:text-amber-600"
            aria-label="Dismiss"
          >
            <DismissIcon />
          </button>
        </div>
      </div>
    )
  }

  // Default: inline variant - single-line, non-intrusive
  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800 ${className ?? ''}`}
      role="region"
      aria-label="Upgrade opportunity"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={handleUpgrade}
        className="whitespace-nowrap font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
      >
        {cta}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600"
        aria-label="Dismiss"
      >
        <DismissIcon size={12} />
      </button>
    </div>
  )
}

function DismissIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M1 1l12 12M13 1L1 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// =============================================================================
// Hook: useUpgradePrompt
// =============================================================================
// Tracks prompt state per feature. Use when you want "show once per session."
//
// const { shouldShow, trigger, dismiss } = useUpgradePrompt('menu-costing-live')
// // After free action completes:
// trigger()
// // In JSX:
// <UpgradePrompt featureSlug="menu-costing-live" show={shouldShow} />

export function useUpgradePrompt(_featureSlug: string) {
  const [shown, setShown] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  return {
    shouldShow: shown && !dismissed,
    trigger: () => setShown(true),
    dismiss: () => setDismissed(true),
  }
}
