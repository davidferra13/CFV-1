// Feature Tier Resolution — single source of truth for Free vs Pro access
// NOT a server action file — utility imported by actions and server components.
//
// Access hierarchy:
//   grandfathered → Pro (always, forever)
//   active        → Pro (paying subscriber)
//   trialing      → Pro (within trial window) / Free (trial expired)
//   past_due      → Pro (grace period while Stripe retries)
//   canceled      → Free
//   unpaid        → Free
//   null          → Free (safety fallback)

import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

/** Monthly price in dollars — single source of truth for display. */
export const PRO_PRICE_MONTHLY = 29

export type Tier = 'free' | 'pro'

export type TierStatus = {
  tier: Tier
  isGrandfathered: boolean
  subscriptionStatus: string | null
}

/**
 * Resolve the tier for a chef. Cached per-request via React cache()
 * so multiple components/actions in the same render don't re-query.
 */
export const getTierForChef = cache(async (chefId: string): Promise<TierStatus> => {
  const supabase: any = createAdminClient()
  const { data } = await supabase
    .from('chefs')
    .select('subscription_status, trial_ends_at')
    .eq('id', chefId)
    .single()

  const chef = data as any
  const status: string | null = chef?.subscription_status ?? null
  const isGrandfathered = status === 'grandfathered'

  // These statuses always grant Pro
  const alwaysProStatuses = ['grandfathered', 'active', 'past_due']
  if (status && alwaysProStatuses.includes(status)) {
    return { tier: 'pro', isGrandfathered, subscriptionStatus: status }
  }

  // Trialing: Pro only if the trial hasn't expired
  if (status === 'trialing' && chef?.trial_ends_at) {
    const trialEnd = new Date(chef.trial_ends_at)
    if (trialEnd > new Date()) {
      return { tier: 'pro', isGrandfathered: false, subscriptionStatus: status }
    }
  }

  // Everything else (canceled, unpaid, expired trial, null) → Free
  return { tier: 'free', isGrandfathered, subscriptionStatus: status }
})

/**
 * Simple boolean check for server actions that just need a yes/no.
 */
export async function hasProAccess(chefId: string): Promise<boolean> {
  const { tier } = await getTierForChef(chefId)
  return tier === 'pro'
}
