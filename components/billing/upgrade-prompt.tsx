'use client'

import Link from 'next/link'
import type { SubscriptionTier } from '@/lib/billing/subscription-tiers'
import { TIER_LABELS } from '@/lib/billing/subscription-tiers'

type UpgradePromptProps = {
  featureSlug: string
  show: boolean
  requiredTier?: SubscriptionTier
  message?: string
  cta?: string
  onUpgrade?: () => void
  variant?: 'inline' | 'card'
  className?: string
}

export function UpgradePrompt({
  show,
  requiredTier = 'pro',
  message,
  cta,
  variant = 'inline',
  className = '',
}: UpgradePromptProps) {
  if (!show) return null

  const tierLabel = TIER_LABELS[requiredTier]
  const defaultMessage = `Upgrade to ${tierLabel} to unlock this feature.`
  const defaultCta = `Upgrade to ${tierLabel}`

  if (variant === 'card') {
    return (
      <div className={`rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 ${className}`}>
        <p className="text-sm text-foreground">{message || defaultMessage}</p>
        <Link
          href="/pricing"
          className="mt-3 inline-flex items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
        >
          {cta || defaultCta}
        </Link>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 ${className}`}>
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">{message || defaultMessage}</p>
      <Link
        href="/pricing"
        className="shrink-0 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500"
      >
        {cta || defaultCta}
      </Link>
    </div>
  )
}

export function useUpgradePrompt(_featureSlug: string) {
  return {
    shouldShow: false,
    trigger: () => undefined,
    dismiss: () => undefined,
  }
}
