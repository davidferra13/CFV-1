import assert from 'node:assert/strict'
import test from 'node:test'

import {
  STARTER_NAV_GROUP_ORDER,
  isActionBarItemVisible,
  isBrandNewChef,
  isDashboardCreationActionVisible,
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

test('action bar keeps daily-driver destinations stable for zero-data chefs', () => {
  const empty = presence()

  for (const href of [
    '/dashboard',
    '/calendar',
    '/events',
    '/clients',
    '/menus',
    '/inbox',
    '/finance',
    '/inquiries',
    '/culinary',
  ]) {
    assert.equal(
      isActionBarItemVisible(href, empty, false, false),
      true,
      `${href} must not disappear just because its data set is empty`
    )
  }

  assert.equal(isActionBarItemVisible('/circles', empty, false, false), false)
  assert.equal(isActionBarItemVisible('/circles', empty, true, false), true)
  assert.equal(isActionBarItemVisible('/circles', empty, false, true), true)
})

test('dashboard keeps starter creation actions visible for zero-data chefs', () => {
  const empty = presence()

  assert.equal(isDashboardCreationActionVisible('/menus/new', empty, false), true)
  assert.equal(isDashboardCreationActionVisible('/events/new', empty, false), true)
  assert.equal(isDashboardCreationActionVisible('/clients/new', empty, false), true)
  assert.equal(isDashboardCreationActionVisible('/recipes/new', empty, false), true)
})

test('dashboard hides advanced creation actions for zero-data chefs unless bypassed', () => {
  const empty = presence()

  assert.equal(isDashboardCreationActionVisible('/commerce/storefront', empty, false), false)
  assert.equal(isDashboardCreationActionVisible('/commerce/storefront', empty, true), true)
  assert.equal(
    isDashboardCreationActionVisible(
      '/commerce/storefront',
      presence({ hasMenus: true, populatedCount: 1 }),
      false
    ),
    true
  )
})
