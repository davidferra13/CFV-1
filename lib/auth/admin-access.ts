import { db } from '@/lib/db'
import { platformAdmins } from '@/lib/db/schema/schema'
import { eq, and } from 'drizzle-orm'

export type AdminAccessLevel = 'admin' | 'owner'

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
