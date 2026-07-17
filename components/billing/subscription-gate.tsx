'use client'

import { type ReactNode } from 'react'
import type { SubscriptionTier } from '@/lib/billing/subscription-tiers'
import { TIER_LABELS } from '@/lib/billing/subscription-tiers'
import Link from 'next/link'

type SubscriptionGateProps = {
  allowed: boolean
  requiredTier: SubscriptionTier
  children: ReactNode
  message?: string
}

export function SubscriptionGate({
  allowed,
  requiredTier,
  children,
  message,
}: SubscriptionGateProps) {
  if (allowed) return <>{children}</>

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
        <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-foreground">
        {message || `This feature requires the ${TIER_LABELS[requiredTier]} plan.`}
      </p>
      <Link
        href="/pricing"
        className="mt-3 inline-flex items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
      >
        View Plans
      </Link>
    </div>
  )
}
