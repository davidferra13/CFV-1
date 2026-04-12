import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { referralPartners, staffMembers, userRoles, clients } from '@/lib/db/schema/schema'

export type AccessSessionSubject = {
  authUserId: string
  email: string
  role: string | null
  entityId: string | null
  tenantId: string | null
}

export async function requireAccessSessionSubject(): Promise<AccessSessionSubject> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error('Unauthorized: Authentication required')
  }

  const authUserId = session.user.id
  const email = session.user.email ?? ''
  const sessionRole = typeof session.user.role === 'string' ? session.user.role : null
  const sessionEntityId = typeof session.user.entityId === 'string' ? session.user.entityId : null
  const sessionTenantId = typeof session.user.tenantId === 'string' ? session.user.tenantId : null

  if (sessionRole && sessionEntityId) {
    return {
      authUserId,
      email,
      role: sessionRole,
      entityId: sessionEntityId,
      tenantId: sessionTenantId,
    }
  }

  const [roleRow] = await db
    .select({ role: userRoles.role, entityId: userRoles.entityId })
    .from(userRoles)
    .where(eq(userRoles.authUserId, authUserId))
    .limit(1)

  if (!roleRow) {
    return {
      authUserId,
      email,
      role: null,
      entityId: null,
      tenantId: null,
    }
  }

  let tenantId: string | null = null

  if (roleRow.role === 'chef') {
    tenantId = roleRow.entityId
  } else if (roleRow.role === 'client') {
    const [clientRow] = await db
      .select({ tenantId: clients.tenantId })
      .from(clients)
      .where(eq(clients.id, roleRow.entityId))
      .limit(1)
    tenantId = clientRow?.tenantId ?? null
  } else if (roleRow.role === 'staff') {
    const [staffRow] = await db
      .select({ tenantId: staffMembers.chefId })
      .from(staffMembers)
      .where(eq(staffMembers.id, roleRow.entityId))
      .limit(1)
    tenantId = staffRow?.tenantId ?? null
  } else if (roleRow.role === 'partner') {
    const [partnerRow] = await db
      .select({ tenantId: referralPartners.tenantId })
      .from(referralPartners)
      .where(eq(referralPartners.id, roleRow.entityId))
      .limit(1)
    tenantId = partnerRow?.tenantId ?? null
  }

  return {
    authUserId,
    email,
    role: roleRow.role,
    entityId: roleRow.entityId,
    tenantId,
  }
}
