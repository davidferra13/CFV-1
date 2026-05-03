/**
 * RBAC Permission Resolution Engine
 *
 * Resolves effective permissions for a user by merging:
 *   1. Role default permissions (from role_permissions table)
 *   2. Per-user overrides (from user_permission_overrides table)
 *
 * Enforcement functions:
 *   - requirePermission(domain, action) - throws if denied
 *   - hasPermission(domain, action) - non-throwing boolean check
 *
 * The permission set is cached per-request via React cache().
 */

import { cache } from 'react'
import { db } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { userRoles } from '@/lib/db/schema/schema'
import { requireChef, requireAuth, type AuthUser } from '@/lib/auth/get-user'
import { sql } from 'drizzle-orm'

// ─── Types ──────────────────────────────────────────────────────────────────────

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage'

export type PermissionDomain =
  | 'events'
  | 'clients'
  | 'quotes'
  | 'financial'
  | 'recipes'
  | 'inventory'
  | 'staff'
  | 'documents'
  | 'calendar'
  | 'comms'
  | 'analytics'
  | 'settings'
  | 'billing'
  | 'ai'
  | 'community'
  | 'users'
  | 'data'
  | 'integrations'
  | 'admin'

export type TenantRole = 'tenant_owner' | 'manager' | 'team_member' | 'client' | 'partner'

export type PermissionEntry = {
  domain: string
  actions: string[]
  scope: string
}

export class PermissionSet {
  private permissions: Map<string, { actions: Set<string>; scope: string }>

  constructor(entries: PermissionEntry[]) {
    this.permissions = new Map()
    for (const entry of entries) {
      const existing = this.permissions.get(entry.domain)
      if (existing) {
        // Merge actions from overrides
        for (const action of entry.actions) {
          existing.actions.add(action)
        }
        // Scope: 'tenant' is broadest, keep whichever is broader
        if (entry.scope === 'tenant') {
          existing.scope = 'tenant'
        }
      } else {
        this.permissions.set(entry.domain, {
          actions: new Set(entry.actions),
          scope: entry.scope,
        })
      }
    }
  }

  /** Check if the user has a specific permission */
  has(domain: string, action: PermissionAction): boolean {
    const entry = this.permissions.get(domain)
    if (!entry) return false
    // 'manage' implies all other actions
    if (entry.actions.has('manage')) return true
    return entry.actions.has(action)
  }

  /** Get the scope for a domain (tenant, own, assigned, self) */
  getScope(domain: string): string | null {
    return this.permissions.get(domain)?.scope ?? null
  }

  /** Get all domains this user has any access to */
  getDomains(): string[] {
    return Array.from(this.permissions.keys())
  }

  /** Get all actions for a domain */
  getActions(domain: string): string[] {
    const entry = this.permissions.get(domain)
    if (!entry) return []
    return Array.from(entry.actions)
  }

  /** Serialize for client-side context (JSON-safe) */
  toJSON(): Record<string, { actions: string[]; scope: string }> {
    const result: Record<string, { actions: string[]; scope: string }> = {}
    for (const [domain, entry] of this.permissions) {
      result[domain] = {
        actions: Array.from(entry.actions),
        scope: entry.scope,
      }
    }
    return result
  }

  /** Reconstruct from serialized JSON */
  static fromJSON(data: Record<string, { actions: string[]; scope: string }>): PermissionSet {
    const entries: PermissionEntry[] = Object.entries(data).map(([domain, { actions, scope }]) => ({
      domain,
      actions,
      scope,
    }))
    return new PermissionSet(entries)
  }
}

// ─── Resolution ─────────────────────────────────────────────────────────────────

/**
 * Resolve a user's tenant_role from user_roles table.
 * Falls back to mapping from the legacy 'role' column if tenant_role is null.
 */
async function resolveTenantRole(authUserId: string): Promise<TenantRole> {
  const [row] = await db
    .select({
      role: userRoles.role,
      tenantRole: sql<string | null>`tenant_role`,
    })
    .from(userRoles)
    .where(eq(userRoles.authUserId, authUserId))
    .limit(1)

  if (!row) return 'team_member'

  // Prefer tenant_role if populated
  if (row.tenantRole && row.tenantRole !== 'team_member') {
    return row.tenantRole as TenantRole
  }

  // Fallback: map from legacy role column
  switch (row.role) {
    case 'chef':
      return 'tenant_owner'
    case 'client':
      return 'client'
    case 'staff':
      return 'team_member'
    case 'partner':
      return 'partner'
    default:
      return 'team_member'
  }
}

/**
 * Load role default permissions from role_permissions table.
 */
async function loadRoleDefaults(tenantRole: TenantRole): Promise<PermissionEntry[]> {
  const rows = await db.execute(
    sql`SELECT domain, actions, scope FROM role_permissions WHERE role = ${tenantRole}`
  )

  return (rows as any[]).map((row: any) => ({
    domain: row.domain as string,
    actions: (row.actions || []) as string[],
    scope: (row.scope || 'tenant') as string,
  }))
}

/**
 * Load per-user permission overrides for a specific tenant + user.
 */
async function loadUserOverrides(tenantId: string, authUserId: string): Promise<PermissionEntry[]> {
  const rows = await db.execute(
    sql`SELECT domain, actions FROM user_permission_overrides
        WHERE tenant_id = ${tenantId} AND auth_user_id = ${authUserId}`
  )

  return (rows as any[]).map((row: any) => ({
    domain: row.domain as string,
    actions: (row.actions || []) as string[],
    scope: 'tenant', // overrides always grant tenant-wide scope
  }))
}

/**
 * Resolve full effective permissions for the current user.
 * Cached per-request via React cache().
 */
export const resolveCurrentUserPermissions = cache(
  async (authUserId: string, tenantId: string | null): Promise<PermissionSet> => {
    const tenantRole = await resolveTenantRole(authUserId)

    // Parallelize: role defaults and user overrides are independent
    const [roleDefaults, overrides] = await Promise.all([
      loadRoleDefaults(tenantRole),
      tenantId ? loadUserOverrides(tenantId, authUserId) : Promise.resolve([] as PermissionEntry[]),
    ])

    // Merge: role defaults + overrides
    return new PermissionSet([...roleDefaults, ...overrides])
  }
)

// ─── Enforcement Functions ──────────────────────────────────────────────────────

/**
 * Require a specific permission. Throws if denied.
 * Use in server actions that need granular access control.
 *
 * For backward compatibility, tenant_owner always passes (they have full access
 * in the seeded role_permissions). This means existing requireChef() + requirePermission()
 * will work correctly for the chef who owns the account.
 */
export async function requirePermission(
  domain: PermissionDomain,
  action: PermissionAction
): Promise<AuthUser> {
  const user = await requireChef()
  const permissions = await resolveCurrentUserPermissions(user.authUserId, user.tenantId)

  if (!permissions.has(domain, action)) {
    throw new Error(`Permission denied: ${domain}:${action}`)
  }

  return user
}

/**
 * Non-throwing permission check. Returns true/false.
 * Use for conditional UI rendering in server components.
 */
export async function hasPermission(
  domain: PermissionDomain,
  action: PermissionAction
): Promise<boolean> {
  try {
    const user = await requireAuth()
    const permissions = await resolveCurrentUserPermissions(user.authUserId, user.tenantId)
    return permissions.has(domain, action)
  } catch {
    return false
  }
}

/**
 * Get the full permission set for the current user.
 * Use when you need to check multiple permissions at once (e.g., layout rendering).
 */
export async function getCurrentPermissions(): Promise<PermissionSet | null> {
  try {
    const user = await requireAuth()
    return resolveCurrentUserPermissions(user.authUserId, user.tenantId)
  } catch {
    return null
  }
}
