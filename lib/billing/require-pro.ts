'use server'

// requirePro() - tier enforcement for paid-tier features.
//
// Checks the feature slug against lib/billing/feature-classification.ts.
// If the feature is in the 'paid' tier and the chef does not have paid access,
// redirects to /settings/billing?feature=<slug> (the upgrade page).
//
// For free-tier features or chefs with paid access, returns the AuthUser as normal.
//
// Access bypass: VIP, Admin, and Owner users in platform_admins always pass
// (handled inside hasProAccess, which checks platform privilege as fallback).
//
// Call sites: 73 across pages, API routes, and server actions.
// Signature is identical to before - no call site changes needed.
//
// NOTE: Some feature slugs passed by legacy call sites (e.g. 'operations', 'marketing',
// 'protection') pre-date the classification map and remain free. isPaidFeature() returns
// false for unrecognized slugs so legacy calls degrade safely to auth-only.

import { redirect } from 'next/navigation'
import { requireChef, type AuthUser } from '@/lib/auth/get-user'
import { isPaidFeature } from '@/lib/billing/feature-classification'
import { hasProAccess } from '@/lib/billing/tier'

export async function requirePro(featureSlug: string): Promise<AuthUser> {
  const user = await requireChef()

  // Free feature or unrecognized slug - no tier check needed
  if (!isPaidFeature(featureSlug)) {
    return user
  }

  // Paid feature - check subscription status
  const hasPaid = await hasProAccess(user.entityId)
  if (!hasPaid) {
    redirect(`/settings/billing?feature=${encodeURIComponent(featureSlug)}`)
  }

  return user
}
