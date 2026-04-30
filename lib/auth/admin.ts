// Admin Access Control
// Platform-level gating separate from the chef/client/staff role system.
// Access is persisted in platform_admins and queried per-session.

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getPersistedAdminAccessForAuthUser,
  hasPrivilegedAccess,
  type AdminAccessLevel,
  type PersistedAdminAccess,
} from '@/lib/auth/admin-access'
import { getFounderAuthorityForSessionUser } from '@/lib/platform/owner-account'

export type AdminUser = {
  id: string
  email: string
  accessLevel: AdminAccessLevel
}

/**
 * Resolve the current authenticated admin from the persisted platform_admins table.
 * Returns null for unauthenticated users, non-admins, and VIP users.
 * VIP users have feature access but NOT admin panel access.
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    return null
  }

  const founderAuthority = getFounderAuthorityForSessionUser(session.user)
  let access: PersistedAdminAccess | null = null

  try {
    access = await getPersistedAdminAccessForAuthUser(session.user.id)
  } catch (error) {
    if (founderAuthority) {
      return {
        id: founderAuthority.authUserId,
        email: founderAuthority.email,
        accessLevel: founderAuthority.accessLevel,
      }
    }
    throw error
  }

  if (founderAuthority && access?.accessLevel !== 'owner') {
    return {
      id: founderAuthority.authUserId,
      email: founderAuthority.email,
      accessLevel: founderAuthority.accessLevel,
    }
  }

  if (!access) {
    return null
  }

  // VIP is not admin - they don't get admin panel access
  if (access.accessLevel === 'vip') {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email.toLowerCase(),
    accessLevel: access.accessLevel,
  }
}

/**
 * Require admin access. Throws/redirects if not authenticated or not present in platform_admins.
 * Use in app/(admin)/layout.tsx and admin server actions.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdminUser()
  if (!admin) {
    redirect('/auth/signin?redirect=/admin')
  }

  return admin
}

/**
 * Non-throwing check for admin-panel-level access (admin + owner only).
 * VIP returns false. Use to conditionally render admin links in shared layouts.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const admin = await getCurrentAdminUser()
    return admin !== null
  } catch {
    return false
  }
}

/**
 * Non-throwing check for VIP-or-above access (vip, admin, owner).
 * Use for: focus mode bypass, billing bypass, all-modules visibility.
 */
export async function isVIPOrAbove(): Promise<boolean> {
  try {
    const session = await auth()
    if (!session?.user?.id) return false
    if (getFounderAuthorityForSessionUser(session.user)) return true
    return hasPrivilegedAccess(session.user.id)
  } catch {
    return false
  }
}
