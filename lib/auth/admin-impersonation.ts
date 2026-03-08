// Admin Impersonation Mode
// Lets admins view the app as a specific chef would see it.
// Uses a cookie to store the target chef_id.
// Unlike admin-preview (which just hides admin UI), this actually changes
// the tenant context so all data queries return the target chef's data.

import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/auth/admin'

const IMPERSONATE_COOKIE = 'chefflow-admin-impersonate'

/**
 * Get the currently impersonated chef_id, or null if not impersonating.
 * Synchronous cookie read (no DB call).
 */
export function getImpersonatedChefId(): string | null {
  try {
    const store = cookies()
    return store.get(IMPERSONATE_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

/**
 * Check if admin impersonation is active.
 */
export function isImpersonating(): boolean {
  return getImpersonatedChefId() !== null
}

/**
 * Full impersonation check: is the current user an admin AND impersonating?
 * Returns the target chef_id if so, null otherwise.
 * Async because it checks admin status.
 */
export async function getActiveImpersonation(): Promise<string | null> {
  const targetChefId = getImpersonatedChefId()
  if (!targetChefId) return null

  const admin = await isAdmin().catch(() => false)
  if (!admin) return null

  return targetChefId
}
