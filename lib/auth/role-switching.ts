'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userRoles } from '@/lib/db/schema/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
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

export async function switchRole(roleId: string): Promise<{ success: true; homePath: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const [role] = await db.select().from(userRoles).where(eq(userRoles.id, roleId)).limit(1)

  if (!role || role.authUserId !== session.user.id) {
    throw new Error('Invalid role selection')
  }

  const homePath = getHomePathForRole(role.role)
  return { success: true, homePath }
}
