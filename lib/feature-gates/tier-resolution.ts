// lib/feature-gates/tier-resolution.ts
// Pure plan-tier resolution from a chef's subscription snapshot.
// Storage: chefs.subscription_status and chefs.trial_ends_at
// (lib/db/schema/schema.ts:20091-20092), written by lib/stripe/subscription.ts.
// Rules mirror the contract in tests/unit/billing.tier.test.ts.

import type { GateTier } from './gate-types'

export type SubscriptionSnapshot = {
  subscriptionStatus: string | null
  trialEndsAt: string | null
}

const ALWAYS_PRO_STATUSES = ['grandfathered', 'active', 'past_due'] as const

export function resolveTierFromSubscription(
  snapshot: SubscriptionSnapshot,
  now: Date = new Date()
): GateTier {
  const { subscriptionStatus, trialEndsAt } = snapshot

  if (
    subscriptionStatus &&
    (ALWAYS_PRO_STATUSES as readonly string[]).includes(subscriptionStatus)
  ) {
    return 'pro'
  }

  if (subscriptionStatus === 'trialing' && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt)
    if (!Number.isNaN(trialEnd.getTime()) && trialEnd > now) {
      return 'pro'
    }
  }

  // Canceled, unpaid, expired trial, null, unknown: free. Fail closed.
  return 'free'
}
