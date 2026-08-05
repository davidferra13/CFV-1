'use server'

import { redirect } from 'next/navigation'
import { requireChef, type AuthUser } from '@/lib/auth/get-user'
import { checkGate } from '@/lib/feature-gates/gate-check'
import { BILLING_SLUG_GATES, type BillingFeatureSlug } from '@/lib/feature-gates/billing-slug-map'

/**
 * Plan gate for pro features. Authenticates the chef, then checks the
 * feature gate mapped from the billing slug. Admin accounts and per-chef
 * chef_feature_flags overrides are honored inside checkGate.
 *
 * Denied: redirects to plan settings (works in pages, server actions,
 * and route handlers). Unmapped slug: throws, so a typo fails loudly in
 * development instead of silently granting access. The map is kept
 * complete by tests/unit/feature-gates.billing-slug-map.test.ts.
 */
export async function requirePro(featureSlug: string): Promise<AuthUser> {
  const user = await requireChef()

  const gateKey = BILLING_SLUG_GATES[featureSlug as BillingFeatureSlug]
  if (!gateKey) {
    throw new Error(`Unregistered billing feature slug: ${featureSlug}`)
  }

  const result = await checkGate(user.entityId, gateKey)
  if (!result.allowed) {
    redirect(`/settings/billing?feature=${encodeURIComponent(featureSlug)}`)
  }

  return user
}
