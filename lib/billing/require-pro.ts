'use server'

// Server action wrapper that enforces Pro access.
// Throws ProFeatureRequiredError (from lib/billing/errors.ts) that UI catches
// and displays as an upgrade prompt instead of a generic error.
//
// Usage in any Pro-only server action:
//   import { requirePro } from '@/lib/billing/require-pro'
//   export async function someAction() {
//     await requirePro('marketing')
//     // ... rest of action
//   }

import { hasProAccess } from '@/lib/billing/tier'
import { requireChef, type AuthUser } from '@/lib/auth/get-user'
import { ProFeatureRequiredError } from '@/lib/billing/errors'
import { isAdmin } from '@/lib/auth/admin'

/**
 * Enforce Pro tier for the current chef session.
 * Throws ProFeatureRequiredError if the chef is on the Free tier.
 * Admins always bypass — they have full Pro access regardless of subscription.
 * @param featureSlug — identifies which Pro feature was attempted (for analytics/UI)
 */
export async function requirePro(featureSlug: string): Promise<AuthUser> {
  const user = await requireChef()

  // Admins always have full Pro access
  const adminCheck = await isAdmin().catch(() => false)
  if (adminCheck) return user

  const hasPro = await hasProAccess(user.entityId)
  if (!hasPro) {
    throw new ProFeatureRequiredError(featureSlug)
  }

  return user
}
