// Feature Tier Resolution - single source of truth for Free vs Pro access
// NOT a server action file - utility imported by actions and server components.
//
// Access hierarchy:
//   grandfathered → Pro (always, forever)
//   comped        → Pro (admin-granted, no payment required)
//   active        → Pro (paying subscriber)
//   trialing      → Pro (within trial window) / Free (trial expired)
//   past_due      → Pro (grace period while Stripe retries)
//   canceled      → Free
//   unpaid        → Free
//   null          → Free (safety fallback)

import { cache } from 'react'
import { createAdminClient } from '@/lib/db/admin'
import { PRO_PRICE_MONTHLY } from '@/lib/billing/constants'
import { hasPrivilegedAccess } from '@/lib/auth/admin-access'

/** Monthly price in dollars - single source of truth for display. */
export { PRO_PRICE_MONTHLY }

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
  const db: any = createAdminClient()
  const { data } = await db
    .from('chefs')
    .select('subscription_status, trial_ends_at, subscription_current_period_end')
    .eq('id', chefId)
    .single()

  const chef = data as any
  const status: string | null = chef?.subscription_status ?? null
  const isGrandfathered = status === 'grandfathered'

  // These statuses always grant Pro
  const alwaysProStatuses = ['grandfathered', 'comped', 'active', 'past_due']
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

  // Canceled: honor the remaining paid period before downgrading.
  // Chef already paid through current_period_end; revoking early is unfair.
  if (status === 'canceled' && chef?.subscription_current_period_end) {
    const periodEnd = new Date(chef.subscription_current_period_end)
    if (periodEnd > new Date()) {
      return { tier: 'pro', isGrandfathered: false, subscriptionStatus: status }
    }
  }

  // Everything else (canceled past period, unpaid, expired trial, null) → Free
  return { tier: 'free', isGrandfathered, subscriptionStatus: status }
})

/**
 * Simple boolean check for server actions that just need a yes/no.
 * Checks billing tier first, then falls back to platform privilege (VIP/Admin/Owner).
 */
export async function hasProAccess(chefId: string): Promise<boolean> {
  const { tier } = await getTierForChef(chefId)
  if (tier === 'pro') return true

  // Billing says free, but VIP/Admin/Owner bypass billing entirely.
  // Resolve authUserId from chefId via user_roles.
  return hasPrivilegedAccessByChefId(chefId)
}

/**
 * Check if a chef has VIP/Admin/Owner platform access (bypasses billing).
 * Resolves chefId -> authUserId -> platform_admins.
 */
async function hasPrivilegedAccessByChefId(chefId: string): Promise<boolean> {
  const db: any = createAdminClient()
  const { data: role } = await db
    .from('user_roles')
    .select('auth_user_id')
    .eq('role', 'chef')
    .eq('entity_id', chefId)
    .maybeSingle()

  if (!role?.auth_user_id) return false
  return hasPrivilegedAccess(role.auth_user_id)
}
