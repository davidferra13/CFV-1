'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userRoles } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getHomePathForRole } from '@/lib/auth/route-policy'

export type AvailableRole = {
  roleId: string
  role: string
  entityId: string
  tenantId: string | null
  label: string
}

export async function getAvailableRoles(): Promise<AvailableRole[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const roles = await db.select().from(userRoles).where(eq(userRoles.authUserId, session.user.id))

  return roles.map((r) => ({
    roleId: r.id,
    role: r.role,
    entityId: r.entityId,
    tenantId: null,
    label: r.role.charAt(0).toUpperCase() + r.role.slice(1),
  }))
}

/**
 * Switch active role for multi-role users.
 * Sets a cookie that the JWT callback reads on next request to re-resolve
 * the role into the session token.
 */
export async function switchRole(roleId: string): Promise<{ success: true; homePath: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const [role] = await db.select().from(userRoles).where(eq(userRoles.id, roleId)).limit(1)

  if (!role || role.authUserId !== session.user.id) {
    throw new Error('Invalid role selection')
  }

  // Persist active role choice so JWT callback picks it up on next request
  const cookieStore = await cookies()
  cookieStore.set('chefflow-active-role-id', roleId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })

  // Clear stale role cache
  cookieStore.delete('chefflow-role-cache')

  revalidatePath('/', 'layout')

  const homePath = getHomePathForRole(role.role)
  return { success: true, homePath }
}
