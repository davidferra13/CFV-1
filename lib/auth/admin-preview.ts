// Admin Preview Mode
// Lets admins temporarily experience the app as a non-admin chef would.
// Uses a cookie so it persists across navigations but resets on browser close.
// Only affects UI-level admin checks (Focus Mode, nav filtering).
// Does NOT affect security gates (requireAdmin, admin pages).

import { cookies } from 'next/headers'
import { isAdmin, isVIPOrAbove } from '@/lib/auth/admin'

const PREVIEW_COOKIE = 'chefflow-admin-preview'

/**
 * Check if admin preview mode is active.
 * Returns true when an admin has toggled "Preview as Chef" mode.
 */
export function isAdminPreviewActive(): boolean {
  try {
    const store = cookies()
    return store.get(PREVIEW_COOKIE)?.value === 'chef'
  } catch {
    return false
  }
}

/**
 * Effective admin check for UI purposes (Focus Mode, nav filtering, Remy scoping).
 * Returns false when admin has preview mode active - so they see what a chef sees.
 * NEVER use this for security gates - use isAdmin() or requireAdmin() for those.
 */
export async function isEffectiveAdmin(): Promise<boolean> {
  const admin = await isAdmin().catch(() => false)
  if (!admin) return false
  return !isAdminPreviewActive()
}

/**
 * Effective privileged check for UI bypass (Focus Mode, all modules, billing bypass).
 * Returns true for VIP, Admin, or Owner - unless admin preview mode is active.
 * VIP users don't get admin panel access, but DO bypass focus mode and billing.
 */
export async function isEffectivePrivileged(): Promise<boolean> {
  const privileged = await isVIPOrAbove().catch(() => false)
  if (!privileged) return false
  return !isAdminPreviewActive()
}
