import { cache } from 'react'
import { SUPPORT_PRICE_MONTHLY_CENTS } from '@/lib/billing/constants'
import { getSupportStatus } from '@/lib/monetization/status'

export const PRO_PRICE_MONTHLY = SUPPORT_PRICE_MONTHLY_CENTS / 100

export type Tier = 'free' | 'pro'

export type TierStatus = {
  tier: Tier
  isGrandfathered: boolean
  subscriptionStatus: string | null
}

// Compatibility helper for legacy imports. Access is universal, so callers that
// still ask for a tier receive the permissive value while support state remains
// available through lib/monetization/status.
export const getTierForChef = cache(async (chefId: string): Promise<TierStatus> => {
  const supportStatus = await getSupportStatus(chefId)
  return {
    tier: 'pro',
    isGrandfathered: supportStatus.subscriptionStatus === 'grandfathered',
    subscriptionStatus: supportStatus.subscriptionStatus,
  }
})

export async function hasProAccess(_chefId: string): Promise<boolean> {
  return true
}
