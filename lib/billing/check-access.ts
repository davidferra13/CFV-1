'use server'

import { createServerClient } from '@/lib/db/server'
import {
  type SubscriptionTier,
  FEATURE_TIER_REQUIREMENTS,
  tierMeetsRequirement,
} from './subscription-tiers'

export async function getChefTier(tenantId: string): Promise<SubscriptionTier> {
  const db = createServerClient({ admin: true })
  const { data } = await db
    .from('chefs')
    .select('subscription_tier')
    .eq('id', tenantId)
    .single()
  return ((data as any)?.subscription_tier as SubscriptionTier) || 'free'
}

export async function checkFeatureAccess(
  tenantId: string,
  feature: string
): Promise<boolean> {
  const requiredTier = FEATURE_TIER_REQUIREMENTS[feature]
  if (!requiredTier || requiredTier === 'free') return true
  const currentTier = await getChefTier(tenantId)
  return tierMeetsRequirement(currentTier, requiredTier)
}
