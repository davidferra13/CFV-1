import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RAIL_CATEGORIES,
  CATEGORY_COLORS,
  RESOLVER_CATEGORY_MAP,
} from '@/lib/discovery/contextual-rail-types'
import { matchRailProfile, RAIL_PROFILES } from '@/lib/discovery/rail-profiles'

test('every RailCategory has a color entry', () => {
  for (const cat of RAIL_CATEGORIES) {
    assert.ok(CATEGORY_COLORS[cat], `missing color for ${cat}`)
    assert.ok(CATEGORY_COLORS[cat].bg, `missing bg for ${cat}`)
    assert.ok(CATEGORY_COLORS[cat].text, `missing text for ${cat}`)
  }
})

test('RESOLVER_CATEGORY_MAP values are all valid RailCategories', () => {
  const validCategories = new Set<string>(RAIL_CATEGORIES)
  for (const [key, category] of Object.entries(RESOLVER_CATEGORY_MAP)) {
    assert.ok(validCategories.has(category), `${key} maps to invalid category ${category}`)
  }
})

test('matches event detail and extracts entity ID', () => {
  const result = matchRailProfile('/events/abc-123')
  assert.equal(result.profile.id, 'event-detail')
  assert.deepEqual(result.entityContext, { type: 'event', id: 'abc-123' })
})

test('matches client detail', () => {
  const result = matchRailProfile('/clients/xyz-456')
  assert.equal(result.profile.id, 'client-detail')
  assert.deepEqual(result.entityContext, { type: 'client', id: 'xyz-456' })
})

test('matches menu detail', () => {
  const result = matchRailProfile('/menus/m-789')
  assert.equal(result.profile.id, 'menu-detail')
  assert.deepEqual(result.entityContext, { type: 'menu', id: 'm-789' })
})

test('matches calendar with no entity', () => {
  const result = matchRailProfile('/calendar')
  assert.equal(result.profile.id, 'calendar')
  assert.equal(result.entityContext, null)
})

test('matches inquiries prefix', () => {
  const result = matchRailProfile('/inquiries')
  assert.equal(result.profile.id, 'inquiries')
  const result2 = matchRailProfile('/inquiries/some-id')
  assert.equal(result2.profile.id, 'inquiries')
})

test('matches recipe detail', () => {
  const result = matchRailProfile('/recipes/r-001')
  assert.equal(result.profile.id, 'recipe-detail')
  assert.deepEqual(result.entityContext, { type: 'recipe', id: 'r-001' })
})

test('matches finance prefix', () => {
  const result = matchRailProfile('/finance/invoices')
  assert.equal(result.profile.id, 'finance')
})

test('matches prep and shopping prefixes', () => {
  assert.equal(matchRailProfile('/prep/upcoming').profile.id, 'prep-shopping')
  assert.equal(matchRailProfile('/shopping/lists').profile.id, 'prep-shopping')
})

test('matches analytics prefix', () => {
  const result = matchRailProfile('/analytics/revenue')
  assert.equal(result.profile.id, 'analytics')
})

test('falls back to fallback for unknown routes', () => {
  const result = matchRailProfile('/settings/billing')
  assert.equal(result.profile.id, 'fallback')
  assert.equal(result.entityContext, null)
})

test('does NOT match event sub-routes as event-detail', () => {
  const result = matchRailProfile('/events/abc-123/edit')
  assert.notEqual(result.profile.id, 'event-detail')
})

test('every profile has valid configuration', () => {
  for (const profile of RAIL_PROFILES) {
    assert.ok(profile.categories.length > 0, `${profile.id} has no categories`)
    assert.ok(profile.collapsedMetrics.length > 0, `${profile.id} has no collapsedMetrics`)
    if (profile.id !== 'fallback') {
      assert.ok(profile.resolverFilter.length > 0, `${profile.id} has no resolverFilter`)
    }
  }
})
