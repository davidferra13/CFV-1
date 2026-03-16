// Pro Feature Gating - Stub Implementation
// Checks whether the current chef has access to a Pro module.
// Currently always grants access (billing system not yet wired to Stripe).
// When Stripe subscriptions are live, this will check the chef's active plan.

import { requireChef } from '@/lib/auth/get-user'

export type ProModuleSlug =
  | 'payroll'
  | 'client-intelligence'
  | 'advanced-calendar'
  | 'commerce'
  | 'intelligence-hub'
  | 'meal-prep'
  | 'community'

/**
 * Require Pro access for a given module.
 * Throws if the chef does not have access.
 * Returns the authenticated chef user on success.
 *
 * TODO: Wire to Stripe subscription check when billing goes live.
 * For now, all authenticated chefs get Pro access (beta period).
 */
export async function requirePro(moduleSlug: ProModuleSlug) {
  const user = await requireChef()

  // During beta, all chefs have Pro access.
  // When billing is live, this will check:
  //   1. Chef's Stripe subscription status
  //   2. Whether the subscription includes this module
  //   3. Admin bypass (admins always have full Pro)

  return user
}
