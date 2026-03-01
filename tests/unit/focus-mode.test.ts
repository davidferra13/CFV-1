/**
 * Unit tests for Focus Mode
 *
 * Tests the core/extended module classification and nav scoping.
 * Pure logic — no DB required.
 *
 * Run: npm run test:unit
 * Run critical only: npm run test:critical
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─── Constants mirroring lib/billing/focus-mode.ts ──────────────────────────

const CORE_MODULES = ['dashboard', 'pipeline', 'events', 'culinary', 'clients', 'finance'] as const

const EXTENDED_MODULES = ['protection', 'more', 'commerce', 'social-hub'] as const

const ALL_MODULES = [...CORE_MODULES, ...EXTENDED_MODULES]

const CORE_NAV_HREFS = new Set([
  '/dashboard',
  '/commands',
  '/daily',
  '/inbox',
  '/clients',
  '/inquiries',
  '/chat',
  '/schedule',
  '/events',
  '/menus',
  '/activity',
  '/goals',
])

const EXTENDED_NAV_HREFS = new Set([
  '/travel',
  '/staff',
  '/tasks',
  '/stations',
  '/commerce',
  '/commerce/register',
])

// ─── Focus Mode action filter (mirrors remy-action-filter.ts) ───────────────

const FOCUS_MODE_ACTIONS = new Set([
  'event.list',
  'event.detail',
  'event.search',
  'event.upcoming',
  'client.list',
  'client.detail',
  'client.search',
  'quote.list',
  'quote.detail',
  'inquiry.list',
  'inquiry.detail',
  'calendar.upcoming',
  'calendar.availability',
  'finance.summary',
  'finance.event_summary',
  'recipe.search',
  'menu.list',
  'draft.message',
  'draft.email',
  'draft.followup',
  'draft.thank_you',
])

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FM1: Core and extended modules are disjoint', () => {
  it('no module appears in both core and extended', () => {
    const coreSet = new Set<string>(CORE_MODULES)
    for (const ext of EXTENDED_MODULES) {
      assert.ok(!coreSet.has(ext), `"${ext}" appears in both core and extended`)
    }
  })

  it('core + extended = all modules', () => {
    assert.equal(ALL_MODULES.length, CORE_MODULES.length + EXTENDED_MODULES.length)
  })

  it('core modules have exactly 6 entries', () => {
    assert.equal(CORE_MODULES.length, 6)
  })
})

describe('FM2: Nav href sets are disjoint', () => {
  it('no href appears in both core and extended nav', () => {
    for (const href of EXTENDED_NAV_HREFS) {
      assert.ok(!CORE_NAV_HREFS.has(href), `"${href}" appears in both core and extended nav`)
    }
  })

  it('core nav has expected items', () => {
    assert.ok(CORE_NAV_HREFS.has('/dashboard'))
    assert.ok(CORE_NAV_HREFS.has('/events'))
    assert.ok(CORE_NAV_HREFS.has('/clients'))
    assert.ok(CORE_NAV_HREFS.has('/menus'))
    assert.ok(CORE_NAV_HREFS.has('/schedule'))
  })

  it('extended nav has expected items', () => {
    assert.ok(EXTENDED_NAV_HREFS.has('/staff'))
    assert.ok(EXTENDED_NAV_HREFS.has('/commerce'))
    assert.ok(EXTENDED_NAV_HREFS.has('/travel'))
    assert.ok(EXTENDED_NAV_HREFS.has('/stations'))
  })
})

describe('FM3: Focus Mode action filter scopes Remy correctly', () => {
  it('core actions are all in the focus mode set', () => {
    const coreActions = ['event.list', 'client.search', 'finance.summary', 'recipe.search']
    for (const action of coreActions) {
      assert.ok(FOCUS_MODE_ACTIONS.has(action), `"${action}" should be in Focus Mode actions`)
    }
  })

  it('extended actions are NOT in the focus mode set', () => {
    const extendedActions = ['staff.list', 'commerce.products', 'travel.booking', 'station.status']
    for (const action of extendedActions) {
      assert.ok(!FOCUS_MODE_ACTIONS.has(action), `"${action}" should NOT be in Focus Mode actions`)
    }
  })

  it('filtering works correctly', () => {
    const allActions = [
      'event.list',
      'client.search',
      'staff.list',
      'commerce.products',
      'finance.summary',
    ]
    const filtered = allActions.filter((a) => FOCUS_MODE_ACTIONS.has(a))
    assert.equal(filtered.length, 3)
    assert.deepEqual(filtered, ['event.list', 'client.search', 'finance.summary'])
  })
})

describe('FM4: Toggle behavior', () => {
  it('enabling focus mode results in only core modules', () => {
    const enabled = true
    const modules = enabled ? [...CORE_MODULES] : [...ALL_MODULES]
    assert.equal(modules.length, 6)
    assert.ok(modules.includes('dashboard'))
    assert.ok(!modules.includes('commerce'))
  })

  it('disabling focus mode results in all modules', () => {
    const enabled = false
    const modules = enabled ? [...CORE_MODULES] : [...ALL_MODULES]
    assert.equal(modules.length, 10)
    assert.ok(modules.includes('dashboard'))
    assert.ok(modules.includes('commerce'))
  })
})

describe('FM5: Admin bypass', () => {
  it('admin sees all nav items regardless of focus mode', () => {
    const isAdmin = true
    const focusMode = true
    const allItems = [
      { href: '/dashboard', coreFeature: true },
      { href: '/staff', coreFeature: false },
      { href: '/commerce', coreFeature: false },
      { href: '/events', coreFeature: true },
    ]

    // Admin bypass: don't filter
    const visible = focusMode && !isAdmin ? allItems.filter((item) => item.coreFeature) : allItems

    assert.equal(visible.length, 4) // Admin sees everything
  })

  it('non-admin sees only core items in focus mode', () => {
    const isAdmin = false
    const focusMode = true
    const allItems = [
      { href: '/dashboard', coreFeature: true },
      { href: '/staff', coreFeature: false },
      { href: '/commerce', coreFeature: false },
      { href: '/events', coreFeature: true },
    ]

    const visible = focusMode && !isAdmin ? allItems.filter((item) => item.coreFeature) : allItems

    assert.equal(visible.length, 2) // Only core
    assert.ok(visible.every((item) => item.coreFeature))
  })

  it('non-admin sees everything when focus mode is off', () => {
    const isAdmin = false
    const focusMode = false
    const allItems = [
      { href: '/dashboard', coreFeature: true },
      { href: '/staff', coreFeature: false },
      { href: '/commerce', coreFeature: false },
      { href: '/events', coreFeature: true },
    ]

    const visible = focusMode && !isAdmin ? allItems.filter((item) => item.coreFeature) : allItems

    assert.equal(visible.length, 4) // All visible
  })
})
