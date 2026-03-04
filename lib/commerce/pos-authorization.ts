import type { AuthUser } from '@/lib/auth/get-user'
import {
  isPosManagerRole,
  parseRoleCsv,
  readPosManagerRoleSetFromEnv,
} from './kiosk-policy'

function isMissingRelation(error: any) {
  return error?.code === '42P01'
}

export function isPosManagerApprovalRequired(raw = process.env.POS_ENFORCE_MANAGER_APPROVAL) {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export function isPosRoleMatrixRequired(raw = process.env.POS_ENFORCE_ROLE_MATRIX) {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export type PosAccessLevel = 'cashier' | 'lead' | 'manager'

const POS_ACCESS_RANK: Record<PosAccessLevel, number> = {
  cashier: 1,
  lead: 2,
  manager: 3,
}

const DEFAULT_LEAD_ROLES = ['owner', 'admin', 'lead_chef', 'sous_chef', 'shift_lead']
const DEFAULT_CASHIER_ROLES = [
  'owner',
  'admin',
  'lead_chef',
  'sous_chef',
  'shift_lead',
  'cashier',
  'staff',
  'team_member',
]

function readPosLeadRoleSetFromEnv(raw?: string): Set<string> {
  const configured = parseRoleCsv(raw ?? process.env.POS_LEAD_ROLES)
  return new Set(configured.length > 0 ? configured : DEFAULT_LEAD_ROLES)
}

function readPosCashierRoleSetFromEnv(raw?: string): Set<string> {
  const configured = parseRoleCsv(raw ?? process.env.POS_CASHIER_ROLES)
  return new Set(configured.length > 0 ? configured : DEFAULT_CASHIER_ROLES)
}

export function resolvePosRoleAccessLevel(input: {
  role: string | null | undefined
  cashierRoles?: Set<string>
  leadRoles?: Set<string>
  managerRoles?: Set<string>
}): PosAccessLevel | null {
  const normalizedRole = String(input.role ?? '')
    .trim()
    .toLowerCase()
  if (!normalizedRole) return null

  const managerRoles = input.managerRoles ?? readPosManagerRoleSetFromEnv()
  if (managerRoles.has(normalizedRole)) return 'manager'

  const leadRoles = input.leadRoles ?? readPosLeadRoleSetFromEnv()
  if (leadRoles.has(normalizedRole)) return 'lead'

  const cashierRoles = input.cashierRoles ?? readPosCashierRoleSetFromEnv()
  if (cashierRoles.has(normalizedRole)) return 'cashier'

  return null
}

export function canPosAccessLevelSatisfy(input: {
  actorLevel: PosAccessLevel | null
  requiredLevel: PosAccessLevel
}) {
  if (!input.actorLevel) return false
  return POS_ACCESS_RANK[input.actorLevel] >= POS_ACCESS_RANK[input.requiredLevel]
}

function formatAccessLevel(level: PosAccessLevel): string {
  if (level === 'cashier') return 'Cashier'
  if (level === 'lead') return 'Lead'
  return 'Manager'
}

async function resolvePosActorRole(ctx: { supabase: any; user: AuthUser }): Promise<string> {
  if (!ctx.user.tenantId) return 'unknown'
  if (ctx.user.entityId === ctx.user.tenantId) {
    return 'owner'
  }

  const baseQuery = ctx.supabase
    .from('chef_team_members')
    .select('role')
    .eq('tenant_id', ctx.user.tenantId)
    .in('status', ['active', 'invited'])
    .limit(1)

  const { data: byChefId, error: byChefIdError } = await baseQuery
    .eq('member_chef_id', ctx.user.entityId)
    .maybeSingle()

  if (isMissingRelation(byChefIdError)) {
    return 'owner'
  }
  if (byChefIdError) {
    throw new Error(`Failed to resolve POS role: ${byChefIdError.message}`)
  }
  if (byChefId?.role) {
    return String(byChefId.role)
  }

  const normalizedEmail = String(ctx.user.email ?? '').trim().toLowerCase()
  if (!normalizedEmail) return 'unknown'

  const { data: byEmail, error: byEmailError } = await baseQuery
    .eq('member_email', normalizedEmail)
    .maybeSingle()

  if (byEmailError) {
    throw new Error(`Failed to resolve POS role: ${byEmailError.message}`)
  }

  return byEmail?.role ? String(byEmail.role) : 'unknown'
}

export async function assertPosManagerAccess(ctx: {
  supabase: any
  user: AuthUser
  action: string
}) {
  if (!isPosManagerApprovalRequired() && !isPosRoleMatrixRequired()) {
    return
  }

  const role = await resolvePosActorRole({
    supabase: ctx.supabase,
    user: ctx.user,
  })
  const managerRoles = readPosManagerRoleSetFromEnv()
  const isManager = isPosManagerRole({
    role,
    managerRoles,
  })

  if (!isManager) {
    throw new Error(`Manager role required to ${ctx.action}`)
  }
}

export async function assertPosRoleAccess(ctx: {
  supabase: any
  user: AuthUser
  action: string
  requiredLevel: PosAccessLevel
}) {
  if (!isPosRoleMatrixRequired()) {
    return
  }

  const role = await resolvePosActorRole({
    supabase: ctx.supabase,
    user: ctx.user,
  })

  const actorLevel = resolvePosRoleAccessLevel({ role })
  if (
    !canPosAccessLevelSatisfy({
      actorLevel,
      requiredLevel: ctx.requiredLevel,
    })
  ) {
    throw new Error(`${formatAccessLevel(ctx.requiredLevel)} role required to ${ctx.action}`)
  }
}
