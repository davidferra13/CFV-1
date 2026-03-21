'use server'

// Server action wrapper - previously enforced Pro access.
// Now a pass-through: all features are free. Retained so 83+ call sites
// continue to compile without changes. The function still authenticates
// the chef (requireChef) so auth is preserved.
//
// Monetization has moved to voluntary patronage. See docs/monetization-shift.md.

import { requireChef, type AuthUser } from '@/lib/auth/get-user'

/**
 * Authenticate the current chef session.
 * Previously enforced Pro tier gating; now all features are accessible to everyone.
 * @param _featureSlug - retained for call-site compatibility (unused)
 */
export async function requirePro(_featureSlug: string): Promise<AuthUser> {
  return await requireChef()
}
