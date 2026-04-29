import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCurrentAdminUser } from '@/lib/auth/admin'
import { pgClient } from '@/lib/db'
import type { TelemetryActorRole } from './types'

const SESSION_EXPIRED_URL = '/auth/signin?message=Your+session+expired.+Please+sign+in+again.'

type UserRoleRow = {
  role: string
  entity_id: string
}

export type AuthenticatedTelemetryActor = {
  actor_id: string
  actor_role: TelemetryActorRole
  tenant_id: string | null
}

export async function requireOperationalTelemetryActor(): Promise<AuthenticatedTelemetryActor> {
  const admin = await getCurrentAdminUser()
  if (admin) {
    return {
      actor_id: admin.id,
      actor_role: 'admin',
      tenant_id: null,
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
      actor_id: role.entity_id,
      actor_role: 'chef_owner',
      tenant_id: role.entity_id,
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
      actor_id: role.entity_id,
      actor_role: 'client_owner',
      tenant_id: tenantId,
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
      actor_id: role.entity_id,
      actor_role: 'chef_staff',
      tenant_id: staff.chef_id,
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
      actor_id: role.entity_id,
      actor_role: 'vendor',
      tenant_id: partner.tenant_id,
    }
  }

  throw new Error(`Unsupported operational telemetry role: ${role.role}`)
}
