import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { pgClient } from '@/lib/db'
import type { OperationalTelemetryActor } from './types'

const SESSION_EXPIRED_URL = '/auth/signin?message=Your+session+expired.+Please+sign+in+again.'

type UserRoleRow = {
  role: string
  entity_id: string
}

export async function requireOperationalTelemetryActor(): Promise<OperationalTelemetryActor> {
  const admin = await getCurrentAdminUser()
  if (admin) {
    return {
      actorRole: 'admin',
      actorEntityId: admin.id,
      actorAuthUserId: admin.id,
      tenantId: null,
    }
  }

  const session = await auth()
  if (!session?.user?.id) {
    redirect(SESSION_EXPIRED_URL)
  }

  const roleRows = await pgClient<UserRoleRow[]>`
    SELECT role, entity_id
    FROM user_roles
    WHERE auth_user_id = ${session.user.id}
    LIMIT 1
  `
  const role = roleRows[0]

  if (!role) {
    redirect(SESSION_EXPIRED_URL)
  }

  if (role.role === 'chef') {
    const chefRows = await pgClient<Array<{ account_status: string | null }>>`
      SELECT account_status
      FROM chefs
      WHERE id = ${role.entity_id}
      LIMIT 1
    `

    if (!chefRows[0]) {
      throw new Error('Chef account not found')
    }

    if (chefRows[0].account_status === 'suspended') {
      throw new Error('Account suspended: Contact support.')
    }

    return {
      actorRole: 'chef_owner',
      actorEntityId: role.entity_id,
      actorAuthUserId: session.user.id,
      tenantId: role.entity_id,
    }
  }

  if (role.role === 'client') {
    const clientRows = await pgClient<Array<{ tenant_id: string | null }>>`
      SELECT tenant_id
      FROM clients
      WHERE id = ${role.entity_id}
      LIMIT 1
    `
    const tenantId = clientRows[0]?.tenant_id
    if (!tenantId) {
      throw new Error('Client account is missing tenant context. Please contact support.')
    }

    return {
      actorRole: 'client_owner',
      actorEntityId: role.entity_id,
      actorAuthUserId: session.user.id,
      tenantId,
    }
  }

  if (role.role === 'staff') {
    const staffRows = await pgClient<Array<{ chef_id: string; status: string }>>`
      SELECT chef_id, status
      FROM staff_members
      WHERE id = ${role.entity_id}
      LIMIT 1
    `
    const staff = staffRows[0]
    if (!staff) {
      throw new Error('Staff member record not found')
    }
    if (staff.status !== 'active') {
      redirect(SESSION_EXPIRED_URL)
    }

    return {
      actorRole: 'chef_staff',
      actorEntityId: role.entity_id,
      actorAuthUserId: session.user.id,
      tenantId: staff.chef_id,
    }
  }

  if (role.role === 'partner') {
    const partnerRows = await pgClient<Array<{ tenant_id: string; status: string }>>`
      SELECT tenant_id, status
      FROM referral_partners
      WHERE id = ${role.entity_id}
      LIMIT 1
    `
    const partner = partnerRows[0]
    if (!partner) {
      throw new Error('Partner record not found')
    }
    if (partner.status !== 'active') {
      redirect(SESSION_EXPIRED_URL)
    }

    return {
      actorRole: 'vendor',
      actorEntityId: role.entity_id,
      actorAuthUserId: session.user.id,
      tenantId: partner.tenant_id,
    }
  }

  throw new Error(`Unsupported operational telemetry role: ${role.role}`)
}

export function createSystemOperationalTelemetryActor(
  tenantId: string | null
): OperationalTelemetryActor {
  return {
    actorRole: 'system',
    actorEntityId: null,
    actorAuthUserId: null,
    tenantId,
  }
}
