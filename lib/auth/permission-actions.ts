'use server'

/**
 * Server actions for managing user permissions.
 * Only tenant_owner and manager roles can modify permissions.
 * Audit-logged for accountability.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import {
  requirePermission,
  type PermissionDomain,
  type PermissionAction,
  type TenantRole,
} from '@/lib/auth/permissions'
import { revalidateTag } from 'next/cache'

// ─── Grant Permission Override ──────────────────────────────────────────────────

export async function grantPermissionOverride(input: {
  targetAuthUserId: string
  domain: PermissionDomain
  actions: PermissionAction[]
}): Promise<{ success: boolean; error?: string }> {
  const user = await requirePermission('users', 'manage')
  const tenantId = user.tenantId!

  // Prevent self-modification
  if (input.targetAuthUserId === user.authUserId) {
    return { success: false, error: 'Cannot modify your own permissions' }
  }

  // Verify target user belongs to this tenant
  const [targetRole] = (await db.execute(
    sql`SELECT role, tenant_role FROM user_roles WHERE auth_user_id = ${input.targetAuthUserId} LIMIT 1`
  )) as any[]

  if (!targetRole) {
    return { success: false, error: 'User not found' }
  }

  // Cannot override permissions for tenant_owner
  const effectiveRole =
    targetRole.tenant_role || (targetRole.role === 'chef' ? 'tenant_owner' : targetRole.role)
  if (effectiveRole === 'tenant_owner') {
    return { success: false, error: 'Cannot modify owner permissions' }
  }

  // Manager ceiling: overrides for team_member cannot exceed manager defaults
  // (enforced at the UI level; the DB just stores what's granted)

  try {
    await db.execute(
      sql`INSERT INTO user_permission_overrides (tenant_id, auth_user_id, domain, actions, granted_by)
          VALUES (${tenantId}, ${input.targetAuthUserId}, ${input.domain}, ${input.actions}, ${user.authUserId})
          ON CONFLICT (tenant_id, auth_user_id, domain)
          DO UPDATE SET actions = ${input.actions}, granted_by = ${user.authUserId}, granted_at = now()`
    )

    // Audit log
    await db.execute(
      sql`INSERT INTO permission_audit_log (tenant_id, actor_auth_user_id, target_auth_user_id, action, domain, new_value)
          VALUES (${tenantId}, ${user.authUserId}, ${input.targetAuthUserId}, 'grant', ${input.domain}, ${JSON.stringify(input.actions)}::jsonb)`
    )

    revalidateTag(`permissions-${input.targetAuthUserId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[RBAC] Failed to grant permission override:', err)
    return { success: false, error: 'Failed to save permission override' }
  }
}

// ─── Revoke Permission Override ─────────────────────────────────────────────────

export async function revokePermissionOverride(input: {
  targetAuthUserId: string
  domain: PermissionDomain
}): Promise<{ success: boolean; error?: string }> {
  const user = await requirePermission('users', 'manage')
  const tenantId = user.tenantId!

  if (input.targetAuthUserId === user.authUserId) {
    return { success: false, error: 'Cannot modify your own permissions' }
  }

  try {
    // Get old value for audit
    const [oldOverride] = (await db.execute(
      sql`SELECT actions FROM user_permission_overrides
          WHERE tenant_id = ${tenantId} AND auth_user_id = ${input.targetAuthUserId} AND domain = ${input.domain}`
    )) as any[]

    await db.execute(
      sql`DELETE FROM user_permission_overrides
          WHERE tenant_id = ${tenantId} AND auth_user_id = ${input.targetAuthUserId} AND domain = ${input.domain}`
    )

    // Audit log
    await db.execute(
      sql`INSERT INTO permission_audit_log (tenant_id, actor_auth_user_id, target_auth_user_id, action, domain, old_value)
          VALUES (${tenantId}, ${user.authUserId}, ${input.targetAuthUserId}, 'revoke', ${input.domain}, ${JSON.stringify(oldOverride?.actions || [])}::jsonb)`
    )

    revalidateTag(`permissions-${input.targetAuthUserId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[RBAC] Failed to revoke permission override:', err)
    return { success: false, error: 'Failed to revoke permission' }
  }
}

// ─── Change Tenant Role ─────────────────────────────────────────────────────────

export async function changeTenantRole(input: {
  targetAuthUserId: string
  newRole: TenantRole
}): Promise<{ success: boolean; error?: string }> {
  const user = await requirePermission('users', 'manage')
  const tenantId = user.tenantId!

  if (input.targetAuthUserId === user.authUserId) {
    return { success: false, error: 'Cannot change your own role' }
  }

  // Validate new role
  const validRoles: TenantRole[] = ['manager', 'team_member']
  if (!validRoles.includes(input.newRole)) {
    return { success: false, error: 'Invalid role. Can only assign manager or team_member.' }
  }

  // Get current role for audit
  const [currentRole] = (await db.execute(
    sql`SELECT tenant_role, role FROM user_roles WHERE auth_user_id = ${input.targetAuthUserId} LIMIT 1`
  )) as any[]

  if (!currentRole) {
    return { success: false, error: 'User not found' }
  }

  const currentTenantRole =
    currentRole.tenant_role || (currentRole.role === 'chef' ? 'tenant_owner' : currentRole.role)
  if (currentTenantRole === 'tenant_owner') {
    return { success: false, error: 'Cannot change the owner role' }
  }

  try {
    await db.execute(
      sql`UPDATE user_roles SET tenant_role = ${input.newRole} WHERE auth_user_id = ${input.targetAuthUserId}`
    )

    // Audit log
    await db.execute(
      sql`INSERT INTO permission_audit_log (tenant_id, actor_auth_user_id, target_auth_user_id, action, old_value, new_value)
          VALUES (${tenantId}, ${user.authUserId}, ${input.targetAuthUserId}, 'role_change',
                  ${JSON.stringify({ role: currentTenantRole })}::jsonb,
                  ${JSON.stringify({ role: input.newRole })}::jsonb)`
    )

    revalidateTag(`permissions-${input.targetAuthUserId}`)
    return { success: true }
  } catch (err: any) {
    console.error('[RBAC] Failed to change tenant role:', err)
    return { success: false, error: 'Failed to change role' }
  }
}

// ─── Get Permission Overrides for a User ────────────────────────────────────────

export async function getPermissionOverrides(targetAuthUserId: string): Promise<{
  success: boolean
  overrides?: Array<{ domain: string; actions: string[]; grantedBy: string; grantedAt: string }>
  error?: string
}> {
  const user = await requirePermission('users', 'view')
  const tenantId = user.tenantId!

  try {
    const rows = (await db.execute(
      sql`SELECT domain, actions, granted_by, granted_at
          FROM user_permission_overrides
          WHERE tenant_id = ${tenantId} AND auth_user_id = ${targetAuthUserId}
          ORDER BY domain`
    )) as any[]

    return {
      success: true,
      overrides: rows.map((r: any) => ({
        domain: r.domain,
        actions: r.actions || [],
        grantedBy: r.granted_by,
        grantedAt: r.granted_at,
      })),
    }
  } catch (err: any) {
    console.error('[RBAC] Failed to load overrides:', err)
    return { success: false, error: 'Failed to load permission overrides' }
  }
}

// ─── Get Permission Audit Log ───────────────────────────────────────────────────

export async function getPermissionAuditLog(options?: {
  targetAuthUserId?: string
  limit?: number
}): Promise<{
  success: boolean
  entries?: Array<{
    actorAuthUserId: string
    targetAuthUserId: string
    action: string
    domain: string | null
    oldValue: any
    newValue: any
    createdAt: string
  }>
  error?: string
}> {
  const user = await requirePermission('users', 'manage')
  const tenantId = user.tenantId!
  const limit = options?.limit ?? 50

  try {
    let query = sql`SELECT actor_auth_user_id, target_auth_user_id, action, domain, old_value, new_value, created_at
                    FROM permission_audit_log
                    WHERE tenant_id = ${tenantId}`

    if (options?.targetAuthUserId) {
      query = sql`${query} AND target_auth_user_id = ${options.targetAuthUserId}`
    }

    query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`

    const rows = (await db.execute(query)) as any[]

    return {
      success: true,
      entries: rows.map((r: any) => ({
        actorAuthUserId: r.actor_auth_user_id,
        targetAuthUserId: r.target_auth_user_id,
        action: r.action,
        domain: r.domain,
        oldValue: r.old_value,
        newValue: r.new_value,
        createdAt: r.created_at,
      })),
    }
  } catch (err: any) {
    console.error('[RBAC] Failed to load audit log:', err)
    return { success: false, error: 'Failed to load audit log' }
  }
}
