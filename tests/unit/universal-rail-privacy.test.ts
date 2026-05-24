import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  stripForbiddenFields,
  canViewRailItem,
  STAFF_FORBIDDEN_FIELDS,
  PARTNER_FORBIDDEN_FIELDS,
} from '@/lib/discovery/universal-rail-privacy'
import type { UniversalRailPrivacyDescriptor } from '@/lib/discovery/universal-rail-privacy'

// ---------------------------------------------------------------------------
// stripForbiddenFields
// ---------------------------------------------------------------------------

describe('stripForbiddenFields', () => {
  it('strips listed fields from metadata, keeps unlisted fields', () => {
    const metadata = { name: 'Dinner', quoted_price: 500, revenue: 1200 }
    const result = stripForbiddenFields(metadata, ['quoted_price', 'revenue'])
    assert.deepEqual(result, { name: 'Dinner' })
  })

  it('returns empty object when all fields are forbidden', () => {
    const metadata = { a: 1, b: 2 }
    const result = stripForbiddenFields(metadata, ['a', 'b'])
    assert.deepEqual(result, {})
  })

  it('returns original data when no fields match forbidden list', () => {
    const metadata = { name: 'Dinner', guests: 8 }
    const result = stripForbiddenFields(metadata, ['quoted_price', 'revenue'])
    assert.deepEqual(result, { name: 'Dinner', guests: 8 })
  })

  it('handles empty metadata', () => {
    const result = stripForbiddenFields({}, ['quoted_price'])
    assert.deepEqual(result, {})
  })
})

// ---------------------------------------------------------------------------
// canViewRailItem
// ---------------------------------------------------------------------------

describe('canViewRailItem', () => {
  const publicDescriptor: UniversalRailPrivacyDescriptor = {
    level: 'public',
    visibleTo: ['anyone'],
    requiresAuth: false,
    requiresTenantMatch: false,
  }

  const accountPrivateDescriptor: UniversalRailPrivacyDescriptor = {
    level: 'account_private',
    visibleTo: ['self'],
    requiresAuth: true,
    requiresTenantMatch: false,
  }

  const tenantScopedDescriptor: UniversalRailPrivacyDescriptor = {
    level: 'tenant_scoped',
    visibleTo: ['chef', 'staff'],
    requiresAuth: true,
    requiresTenantMatch: true,
  }

  const systemDescriptor: UniversalRailPrivacyDescriptor = {
    level: 'system',
    visibleTo: ['admin'],
    requiresAuth: true,
    requiresTenantMatch: false,
  }

  const roleScopedDescriptor: UniversalRailPrivacyDescriptor = {
    level: 'role_scoped',
    visibleTo: ['self', 'chef', 'staff'],
    requiresAuth: true,
    requiresTenantMatch: true,
  }

  it('public items visible to everyone (no auth required)', () => {
    const viewer = { role: 'guest', isAuthenticated: false }
    assert.equal(canViewRailItem(publicDescriptor, viewer), true)
  })

  it('public items visible to authenticated users too', () => {
    const viewer = { role: 'chef', userId: 'u1', isAuthenticated: true }
    assert.equal(canViewRailItem(publicDescriptor, viewer), true)
  })

  it('account-private items only visible to owner', () => {
    const owner = { role: 'client', userId: 'u1', isAuthenticated: true }
    const other = { role: 'client', userId: 'u2', isAuthenticated: true }
    assert.equal(canViewRailItem(accountPrivateDescriptor, owner, 'u1'), true)
    assert.equal(canViewRailItem(accountPrivateDescriptor, other, 'u1'), false)
  })

  it('tenant-scoped items require matching tenantId', () => {
    const sameT = { role: 'staff', userId: 'u1', tenantId: 't1', isAuthenticated: true }
    const diffT = { role: 'staff', userId: 'u2', tenantId: 't2', isAuthenticated: true }
    assert.equal(canViewRailItem(tenantScopedDescriptor, sameT, undefined, 't1'), true)
    assert.equal(canViewRailItem(tenantScopedDescriptor, diffT, undefined, 't1'), false)
  })

  it('system items only visible to admin role', () => {
    const admin = { role: 'admin', userId: 'u1', isAuthenticated: true }
    const chef = { role: 'chef', userId: 'u2', isAuthenticated: true }
    assert.equal(canViewRailItem(systemDescriptor, admin), true)
    assert.equal(canViewRailItem(systemDescriptor, chef), false)
  })

  it('role-scoped items check visibleTo audiences', () => {
    const chef = { role: 'chef', userId: 'u1', tenantId: 't1', isAuthenticated: true }
    const staff = { role: 'staff', userId: 'u2', tenantId: 't1', isAuthenticated: true }
    const partner = { role: 'partner', userId: 'u3', tenantId: 't1', isAuthenticated: true }
    // chef and staff are in visibleTo
    assert.equal(canViewRailItem(roleScopedDescriptor, chef, undefined, 't1'), true)
    assert.equal(canViewRailItem(roleScopedDescriptor, staff, undefined, 't1'), true)
    // partner is not in visibleTo
    assert.equal(canViewRailItem(roleScopedDescriptor, partner, undefined, 't1'), false)
  })

  it('role-scoped self audience matches item owner', () => {
    const owner = { role: 'client', userId: 'u1', tenantId: 't1', isAuthenticated: true }
    assert.equal(canViewRailItem(roleScopedDescriptor, owner, 'u1', 't1'), true)
  })

  it('unauthenticated viewer blocked when requiresAuth is true', () => {
    const unauth = { role: 'guest', isAuthenticated: false }
    assert.equal(canViewRailItem(accountPrivateDescriptor, unauth, 'u1'), false)
    assert.equal(canViewRailItem(tenantScopedDescriptor, unauth, undefined, 't1'), false)
    assert.equal(canViewRailItem(systemDescriptor, unauth), false)
  })
})

// ---------------------------------------------------------------------------
// Forbidden field constants
// ---------------------------------------------------------------------------

describe('STAFF_FORBIDDEN_FIELDS', () => {
  it('contains financial fields', () => {
    const financialFields = ['quoted_price', 'revenue', 'margin', 'food_cost', 'labor_cost', 'tips']
    for (const field of financialFields) {
      assert.ok(
        (STAFF_FORBIDDEN_FIELDS as readonly string[]).includes(field),
        `should contain ${field}`
      )
    }
  })
})

describe('PARTNER_FORBIDDEN_FIELDS', () => {
  it('contains PII fields', () => {
    const piiFields = ['client_pii', 'chef_financials', 'staff_payroll']
    for (const field of piiFields) {
      assert.ok(
        (PARTNER_FORBIDDEN_FIELDS as readonly string[]).includes(field),
        `should contain ${field}`
      )
    }
  })
})

describe('stripForbiddenFields with real constants', () => {
  it('applying staff forbidden fields strips financials from sample metadata', () => {
    const metadata = {
      event_name: 'Birthday Dinner',
      guests: 8,
      quoted_price: 2400,
      revenue: 2400,
      margin: 800,
      food_cost: 600,
      labor_cost: 400,
      tips: 200,
      menu_name: 'Spring Tasting',
    }
    const result = stripForbiddenFields(metadata, STAFF_FORBIDDEN_FIELDS)
    assert.equal(result.event_name, 'Birthday Dinner')
    assert.equal(result.guests, 8)
    assert.equal(result.menu_name, 'Spring Tasting')
    assert.equal(result.quoted_price, undefined)
    assert.equal(result.revenue, undefined)
    assert.equal(result.margin, undefined)
    assert.equal(result.food_cost, undefined)
    assert.equal(result.labor_cost, undefined)
    assert.equal(result.tips, undefined)
  })
})
