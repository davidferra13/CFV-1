import { db } from '@/lib/db'
import { userRoles } from '@/lib/db/schema/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Verify that a user_roles record belongs to the expected tenant.
 * Use this before modifying permissions, roles, or other tenant-scoped data
 * to prevent cross-tenant access.
 *
 * Throws if the target user is not a member of the specified tenant.
 */
export async function requireTenantMembership(
  targetUserId: string,
  tenantId: string
): Promise<void> {
  const [membership] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.authUserId, targetUserId), eq(userRoles.entityId, tenantId)))
    .limit(1)

  if (!membership) {
    throw new Error('Target user is not a member of this tenant')
  }
}

/**
 * Non-throwing variant: returns boolean instead of throwing.
 */
export async function isTenantMember(targetUserId: string, tenantId: string): Promise<boolean> {
  try {
    await requireTenantMembership(targetUserId, tenantId)
    return true
  } catch {
    return false
  }
}
