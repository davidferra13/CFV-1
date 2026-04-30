import { db } from '@/lib/db'
import { platformAdmins } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'

// Authorization reads the persisted platform_admins table through the Drizzle schema symbol.
// Platform access levels (highest to lowest):
//   owner - founder only, full platform authority
//   admin - platform administration, admin panel access
//   vip   - all features unlocked, no admin panel (inner circle)
export type AdminAccessLevel = 'owner' | 'admin' | 'vip'

export type PersistedAdminAccess = {
  authUserId: string
  email: string | null
  accessLevel: AdminAccessLevel
}

export async function getPersistedAdminAccessForAuthUser(
  authUserId: string
): Promise<PersistedAdminAccess | null> {
  const [data] = await db
    .select({
      authUserId: platformAdmins.authUserId,
      email: platformAdmins.email,
      accessLevel: platformAdmins.accessLevel,
    })
    .from(platformAdmins)
    .where(and(eq(platformAdmins.authUserId, authUserId), eq(platformAdmins.isActive, true)))
    .limit(1)

  if (!data) {
    return null
  }

  return {
    authUserId: data.authUserId,
    email: data.email,
    accessLevel: data.accessLevel as AdminAccessLevel,
  }
}

export async function hasPersistedAdminAccessForAuthUser(authUserId: string): Promise<boolean> {
  const access = await getPersistedAdminAccessForAuthUser(authUserId)
  return access !== null
}

/**
 * Check if user has admin-panel-level access (admin or owner).
 * VIP does NOT qualify - they get feature access, not admin panel.
 */
export async function hasAdminAccess(authUserId: string): Promise<boolean> {
  const access = await getPersistedAdminAccessForAuthUser(authUserId)
  if (!access) return false
  return access.accessLevel === 'admin' || access.accessLevel === 'owner'
}

/**
 * Check if user has VIP-or-above access (vip, admin, or owner).
 * Use for: focus mode bypass, billing bypass, all-modules visibility.
 */
export async function hasPrivilegedAccess(authUserId: string): Promise<boolean> {
  const access = await getPersistedAdminAccessForAuthUser(authUserId)
  return access !== null
}

/**
 * Get the access level for a user, or null if no platform access.
 */
export async function getAccessLevelForAuthUser(
  authUserId: string
): Promise<AdminAccessLevel | null> {
  const access = await getPersistedAdminAccessForAuthUser(authUserId)
  return access ? (access.accessLevel as AdminAccessLevel) : null
}
