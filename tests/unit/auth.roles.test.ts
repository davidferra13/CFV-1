/**
 * Unit tests for Auth Role Resolution Logic
 *
 * Tests the role resolution patterns used by getCurrentUser(),
 * requireChef(), requireClient(), requireAuth(), requireAdmin().
 * This is P1 - broken auth means wrong users see wrong data.
 *
 * We test the pure decision logic extracted from lib/auth/get-user.ts
 * and lib/auth/admin.ts without requiring Supabase or Next.js runtime.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

type RoleData = { role: string; entity_id: string } | null

type AuthUser = {
  id: string
  email: string
  role: 'chef' | 'client'
  entityId: string
  tenantId: string | null
}

/**
 * Pure function mirroring getCurrentUser() role resolution logic.
 * Given raw Supabase auth data and role data, resolves the AuthUser.
 */
function resolveAuthUser(
  authUser: { id: string; email: string } | null,
  roleData: RoleData,
  clientTenantId?: string | null
): AuthUser | null {
  if (!authUser) return null
  if (!roleData) return null

  if (roleData.role !== 'chef' && roleData.role !== 'client') return null

  let tenantId: string | null = null
  if (roleData.role === 'chef') {
    tenantId = roleData.entity_id
  } else if (roleData.role === 'client') {
    tenantId = clientTenantId ?? null
  }

  return {
    id: authUser.id,
    email: authUser.email,
    role: roleData.role,
    entityId: roleData.entity_id,
    tenantId,
  }
}

function validateChefAccess(
  user: AuthUser | null,
  accountStatus?: string
): { allowed: true; user: AuthUser } | { allowed: false; reason: string } {
  if (!user || user.role !== 'chef') {
    return { allowed: false, reason: 'Unauthorized: Chef access required' }
  }
  if (accountStatus === 'suspended') {
    return { allowed: false, reason: 'Account suspended: Contact support.' }
  }
  return { allowed: true, user }
}

function validateClientAccess(
  user: AuthUser | null
): { allowed: true; user: AuthUser } | { allowed: false; reason: string } {
  if (!user || user.role !== 'client') {
    return { allowed: false, reason: 'Unauthorized: Client access required' }
  }
  return { allowed: true, user }
}

function validateAuthAccess(
  user: AuthUser | null
): { allowed: true; user: AuthUser } | { allowed: false; reason: string } {
  if (!user) {
    return { allowed: false, reason: 'Unauthorized: Authentication required' }
  }
  return { allowed: true, user }
}

type PlatformAdminRow = { access_level: 'admin' | 'owner'; is_active: boolean } | null

function resolveAdminAccess(
  adminRow: PlatformAdminRow
): { allowed: true; accessLevel: 'admin' | 'owner' } | { allowed: false } {
  if (!adminRow || !adminRow.is_active) {
    return { allowed: false }
  }

  return {
    allowed: true,
    accessLevel: adminRow.access_level,
  }
}

describe('Auth - resolveAuthUser', () => {
  const authUser = { id: 'auth-1', email: 'chef@test.com' }

  it('returns null when no auth user', () => {
    assert.equal(resolveAuthUser(null, { role: 'chef', entity_id: 'e1' }), null)
  })

  it('returns null when no role data', () => {
    assert.equal(resolveAuthUser(authUser, null), null)
  })

  it('returns null for non-portal roles (staff, partner, system)', () => {
    assert.equal(resolveAuthUser(authUser, { role: 'staff', entity_id: 'e1' }), null)
    assert.equal(resolveAuthUser(authUser, { role: 'partner', entity_id: 'e1' }), null)
    assert.equal(resolveAuthUser(authUser, { role: 'system', entity_id: 'e1' }), null)
    assert.equal(resolveAuthUser(authUser, { role: 'unknown', entity_id: 'e1' }), null)
  })

  it('resolves chef with tenantId = entityId', () => {
    const result = resolveAuthUser(authUser, { role: 'chef', entity_id: 'chef-123' })
    assert.deepEqual(result, {
      id: 'auth-1',
      email: 'chef@test.com',
      role: 'chef',
      entityId: 'chef-123',
      tenantId: 'chef-123',
    })
  })

  it('resolves client with tenantId from clients table', () => {
    const result = resolveAuthUser(
      { id: 'auth-2', email: 'client@test.com' },
      { role: 'client', entity_id: 'client-456' },
      'chef-789'
    )
    assert.deepEqual(result, {
      id: 'auth-2',
      email: 'client@test.com',
      role: 'client',
      entityId: 'client-456',
      tenantId: 'chef-789',
    })
  })

  it('client with no tenant data gets null tenantId', () => {
    const result = resolveAuthUser(
      { id: 'auth-2', email: 'client@test.com' },
      { role: 'client', entity_id: 'client-456' }
    )
    assert.equal(result?.tenantId, null)
  })
})

describe('Auth - validateChefAccess', () => {
  const chefUser: AuthUser = {
    id: 'auth-1',
    email: 'chef@test.com',
    role: 'chef',
    entityId: 'chef-1',
    tenantId: 'chef-1',
  }
  const clientUser: AuthUser = {
    id: 'auth-2',
    email: 'client@test.com',
    role: 'client',
    entityId: 'client-1',
    tenantId: 'chef-1',
  }

  it('allows chef user', () => {
    const result = validateChefAccess(chefUser)
    assert.equal(result.allowed, true)
  })

  it('rejects null user', () => {
    const result = validateChefAccess(null)
    assert.equal(result.allowed, false)
  })

  it('rejects client user', () => {
    const result = validateChefAccess(clientUser)
    assert.equal(result.allowed, false)
    if (!result.allowed) assert.ok(result.reason.includes('Chef'))
  })

  it('rejects suspended chef', () => {
    const result = validateChefAccess(chefUser, 'suspended')
    assert.equal(result.allowed, false)
    if (!result.allowed) assert.ok(result.reason.includes('suspended'))
  })

  it('allows chef with active account', () => {
    const result = validateChefAccess(chefUser, 'active')
    assert.equal(result.allowed, true)
  })
})

describe('Auth - validateClientAccess', () => {
  const clientUser: AuthUser = {
    id: 'auth-2',
    email: 'client@test.com',
    role: 'client',
    entityId: 'client-1',
    tenantId: 'chef-1',
  }
  const chefUser: AuthUser = {
    id: 'auth-1',
    email: 'chef@test.com',
    role: 'chef',
    entityId: 'chef-1',
    tenantId: 'chef-1',
  }

  it('allows client user', () => {
    assert.equal(validateClientAccess(clientUser).allowed, true)
  })

  it('rejects null user', () => {
    assert.equal(validateClientAccess(null).allowed, false)
  })

  it('rejects chef user', () => {
    const result = validateClientAccess(chefUser)
    assert.equal(result.allowed, false)
    if (!result.allowed) assert.ok(result.reason.includes('Client'))
  })
})

describe('Auth - validateAuthAccess', () => {
  it('allows any authenticated user', () => {
    const user: AuthUser = {
      id: 'auth-1',
      email: 'test@test.com',
      role: 'chef',
      entityId: 'e1',
      tenantId: 't1',
    }
    assert.equal(validateAuthAccess(user).allowed, true)
  })

  it('rejects null', () => {
    assert.equal(validateAuthAccess(null).allowed, false)
  })
})

describe('Auth - persisted admin access', () => {
  it('allows active admin rows', () => {
    assert.deepEqual(resolveAdminAccess({ access_level: 'admin', is_active: true }), {
      allowed: true,
      accessLevel: 'admin',
    })
  })

  it('allows active owner rows', () => {
    assert.deepEqual(resolveAdminAccess({ access_level: 'owner', is_active: true }), {
      allowed: true,
      accessLevel: 'owner',
    })
  })

  it('rejects inactive rows', () => {
    assert.deepEqual(resolveAdminAccess({ access_level: 'admin', is_active: false }), {
      allowed: false,
    })
  })

  it('rejects missing rows', () => {
    assert.deepEqual(resolveAdminAccess(null), { allowed: false })
  })
})

describe('Auth - tenant scoping principle', () => {
  it('chef tenantId equals their own entityId (never from input)', () => {
    const user = resolveAuthUser(
      { id: 'auth-1', email: 'chef@test.com' },
      { role: 'chef', entity_id: 'chef-abc' }
    )
    assert.equal(user?.tenantId, user?.entityId)
    assert.equal(user?.tenantId, 'chef-abc')
  })

  it('client tenantId comes from DB (clients.tenant_id), not from URL or input', () => {
    const user = resolveAuthUser(
      { id: 'auth-2', email: 'client@test.com' },
      { role: 'client', entity_id: 'client-def' },
      'chef-abc'
    )
    assert.notEqual(user?.tenantId, user?.entityId)
    assert.equal(user?.tenantId, 'chef-abc')
    assert.equal(user?.entityId, 'client-def')
  })
})
