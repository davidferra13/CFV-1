// Admin Client Impersonation Mode
// Lets admins view the client portal as a specific client would see it.
// Uses a separate cookie from chef impersonation.
// The admin's real auth identity is preserved for security.

import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/auth/admin'

const CLIENT_IMPERSONATE_COOKIE = 'chefflow-admin-impersonate-client'

/**
 * Get the currently impersonated client_id, or null if not impersonating.
 * Synchronous cookie read (no DB call).
 */
export function getImpersonatedClientId(): string | null {
  try {
    const store = cookies()
    return store.get(CLIENT_IMPERSONATE_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

/**
 * Check if admin client impersonation is active.
 */
export function isImpersonatingClient(): boolean {
  return getImpersonatedClientId() !== null
}

/**
 * Full impersonation check: is the current user an admin AND impersonating a client?
 * Returns the target client_id if so, null otherwise.
 */
export async function getActiveClientImpersonation(): Promise<string | null> {
  const targetClientId = getImpersonatedClientId()
  if (!targetClientId) return null

  const admin = await isAdmin().catch(() => false)
  if (!admin) return null

  return targetClientId
}
