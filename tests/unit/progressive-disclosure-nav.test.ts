import assert from 'node:assert/strict'
import test from 'node:test'

import {
  STARTER_NAV_GROUP_ORDER,
  isActionBarItemVisible,
  isBrandNewChef,
  isNavGroupVisible,
} from '@/lib/progressive-disclosure/nav-visibility'
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'

function presence(overrides: Partial<TenantDataPresence> = {}): TenantDataPresence {
  const base: TenantDataPresence = {
    hasEvents: false,
    hasClients: false,
    hasRecipes: false,
    hasMenus: false,
    hasInquiries: false,
    hasQuotes: false,
    hasInvoices: false,
    hasExpenses: false,
    hasStaff: false,
    hasDocuments: false,
    hasContracts: false,
    hasLeads: false,
    hasConversations: false,
    hasCircles: false,
    hasNetwork: false,
    hasInventory: false,
    hasTasks: false,
    populatedCount: 0,
  }

  return { ...base, ...overrides }
}

test('brand-new chef threshold is fewer than three populated areas', () => {
  assert.equal(isBrandNewChef(presence({ populatedCount: 0 })), true)
  assert.equal(isBrandNewChef(presence({ populatedCount: 2 })), true)
  assert.equal(isBrandNewChef(presence({ populatedCount: 3 })), false)
})

test('starter navigation order keeps core flows first', () => {
  assert.deepEqual([...STARTER_NAV_GROUP_ORDER], ['pipeline', 'events', 'clients', 'culinary'])
})

test('starter groups are visible while advanced groups wait for data or expansion', () => {
  const empty = presence()

  assert.equal(isNavGroupVisible('pipeline', empty, false), true)
  assert.equal(isNavGroupVisible('events', empty, false), true)
  assert.equal(isNavGroupVisible('clients', empty, false), true)
  assert.equal(isNavGroupVisible('culinary', empty, false), true)

  assert.equal(isNavGroupVisible('finance', empty, false), false)
  assert.equal(isNavGroupVisible('network', empty, false), false)
  assert.equal(isNavGroupVisible('finance', empty, true), true)
})

test('action bar hides noisy shortcuts for zero-data chefs but preserves bypasses', () => {
  const empty = presence()

  assert.equal(isActionBarItemVisible('/inquiries', empty, false, false), true)
  assert.equal(isActionBarItemVisible('/events', empty, false, false), true)
  assert.equal(isActionBarItemVisible('/clients', empty, false, false), true)
  assert.equal(isActionBarItemVisible('/culinary', empty, false, false), true)

  assert.equal(isActionBarItemVisible('/inbox', empty, false, false), false)
  assert.equal(isActionBarItemVisible('/finance', empty, false, false), false)
  assert.equal(isActionBarItemVisible('/finance', empty, true, false), true)
  assert.equal(isActionBarItemVisible('/finance', empty, false, true), true)
})
