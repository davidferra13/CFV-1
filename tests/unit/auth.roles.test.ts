/**
 * Unit tests for Auth Role Resolution Logic
 *
 * Tests the role resolution patterns used by getCurrentUser(),
 * requireChef(), requireClient(), requireAuth(), requireAdmin().
 * This is P1 — broken auth = wrong users see wrong data.
 *
 * We test the pure decision logic extracted from lib/auth/get-user.ts
 * and lib/auth/admin.ts without requiring Supabase or Next.js runtime.
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─────────────────────────────────────────────────────────────────────────────
// ROLE RESOLUTION LOGIC (extracted from lib/auth/get-user.ts)
// ─────────────────────────────────────────────────────────────────────────────

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
  // No auth user → null
  if (!authUser) return null

  // No role assigned → null
  if (!roleData) return null

  // Only chef and client are valid portal roles
  if (roleData.role !== 'chef' && roleData.role !== 'client') return null

  // Determine tenant_id based on role
  let tenantId: string | null = null
  if (roleData.role === 'chef') {
    tenantId = roleData.entity_id // Chef's own ID
  } else if (roleData.role === 'client') {
    tenantId = clientTenantId ?? null // From clients table
  }

  return {
    id: authUser.id,
    email: authUser.email,
    role: roleData.role,
    entityId: roleData.entity_id,
    tenantId,
  }
}

/**
 * Pure function mirroring requireChef() logic.
 */
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

/**
 * Pure function mirroring requireClient() logic.
 */
function validateClientAccess(
  user: AuthUser | null
): { allowed: true; user: AuthUser } | { allowed: false; reason: string } {
  if (!user || user.role !== 'client') {
    return { allowed: false, reason: 'Unauthorized: Client access required' }
  }
  return { allowed: true, user }
}

/**
 * Pure function mirroring requireAuth() logic.
 */
function validateAuthAccess(
  user: AuthUser | null
): { allowed: true; user: AuthUser } | { allowed: false; reason: string } {
  if (!user) {
    return { allowed: false, reason: 'Unauthorized: Authentication required' }
  }
  return { allowed: true, user }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACCESS LOGIC (extracted from lib/auth/admin.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure function mirroring admin email check logic.
 */
function isAdminEmail(email: string | null, adminEmails: string[]): boolean {
  if (!email) return false
  if (adminEmails.length === 0) return false
  return adminEmails.includes(email)
}

/**
 * Parses the ADMIN_EMAILS env var string into an array.
 * Mirrors the logic at the top of lib/auth/admin.ts.
 */
function parseAdminEmails(envVar: string | undefined): string[] {
  return (envVar ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Auth — resolveAuthUser', () => {
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
      tenantId: 'chef-123', // Chef's own ID
    })
  })

  it('resolves client with tenantId from clients table', () => {
    const result = resolveAuthUser(
      { id: 'auth-2', email: 'client@test.com' },
      { role: 'client', entity_id: 'client-456' },
      'chef-789' // tenant from clients table
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

describe('Auth — validateChefAccess', () => {
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

describe('Auth — validateClientAccess', () => {
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

describe('Auth — validateAuthAccess', () => {
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

describe('Auth — admin email parsing', () => {
  it('parses comma-separated admin emails', () => {
    const result = parseAdminEmails('admin@test.com, boss@test.com')
    assert.deepEqual(result, ['admin@test.com', 'boss@test.com'])
  })

  it('handles single email', () => {
    assert.deepEqual(parseAdminEmails('admin@test.com'), ['admin@test.com'])
  })

  it('handles undefined env var', () => {
    assert.deepEqual(parseAdminEmails(undefined), [])
  })

  it('handles empty string', () => {
    assert.deepEqual(parseAdminEmails(''), [])
  })

  it('trims whitespace', () => {
    assert.deepEqual(parseAdminEmails('  admin@test.com ,  boss@test.com  '), [
      'admin@test.com',
      'boss@test.com',
    ])
  })

  it('filters out empty entries from trailing commas', () => {
    assert.deepEqual(parseAdminEmails('admin@test.com,,'), ['admin@test.com'])
  })
})

describe('Auth — isAdminEmail', () => {
  const admins = ['admin@chefflow.com', 'boss@chefflow.com']

  it('returns true for admin email', () => {
    assert.equal(isAdminEmail('admin@chefflow.com', admins), true)
  })

  it('returns false for non-admin email', () => {
    assert.equal(isAdminEmail('nobody@other.com', admins), false)
  })

  it('returns false for null email', () => {
    assert.equal(isAdminEmail(null, admins), false)
  })

  it('returns false when admin list is empty', () => {
    assert.equal(isAdminEmail('admin@chefflow.com', []), false)
  })

  it('is case-sensitive (matches production behavior)', () => {
    // admin.ts does NOT lowercase — the env var must match exactly
    assert.equal(isAdminEmail('Admin@chefflow.com', admins), false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TENANT SCOPING — the golden rule: tenant_id always comes from session
// ─────────────────────────────────────────────────────────────────────────────

describe('Auth — tenant scoping principle', () => {
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
      'chef-abc' // DB value
    )
    // Tenant is the chef who owns the client, not the client themselves
    assert.notEqual(user?.tenantId, user?.entityId)
    assert.equal(user?.tenantId, 'chef-abc')
    assert.equal(user?.entityId, 'client-def')
  })
})
