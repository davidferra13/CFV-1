import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNearbyBrowseFallbackActions,
  buildNearbyBrowseHrefFromFilters,
  dedupeNearbyFallbackActions,
} from '../../lib/discover/nearby-fallbacks'

const BASE_STATS = {
  totalListings: 42,
  states: [
    { state: 'FL', count: 14 },
    { state: 'TX', count: 18 },
    { state: 'MA', count: 10 },
  ],
  topCities: [
    { city: 'Austin', state: 'TX', count: 9 },
    { city: 'Tampa', state: 'FL', count: 6 },
    { city: 'Boston', state: 'MA', count: 5 },
  ],
  topBusinessTypes: [
    { businessType: 'private_chef', count: 8 },
    { businessType: 'restaurant', count: 18 },
  ],
  topCityBusinessTypes: [
    { city: 'Austin', state: 'TX', businessType: 'private_chef', count: 5 },
    { city: 'Tampa', state: 'FL', businessType: 'private_chef', count: 4 },
    { city: 'Boston', state: 'MA', businessType: 'restaurant', count: 5 },
  ],
}

test('buildNearbyBrowseHrefFromFilters preserves nearby filter order and omits blanks', () => {
  assert.equal(
    buildNearbyBrowseHrefFromFilters({
      businessType: 'bakery',
      state: 'ma',
      city: 'Boston',
      radiusMiles: null,
    }),
    '/nearby?type=bakery&state=MA&city=Boston'
  )
})

test('buildNearbyBrowseFallbackActions broadens sparse city-plus-type states before falling back to root', () => {
  const actions = buildNearbyBrowseFallbackActions({
    filters: {
      businessType: 'private_chef',
      state: 'FL',
      city: 'Miami',
    },
    stats: BASE_STATS,
    maxActions: 4,
  })

  assert.equal(actions[0]?.href, '/nearby?state=FL&city=Miami')
  assert.equal(actions[0]?.label, 'All food in Miami')
  assert.equal(actions[1]?.href, '/nearby?type=private_chef&state=FL')
  assert.equal(actions[1]?.label, 'Private Chefs across Florida')
  assert.equal(actions[2]?.href, '/nearby?type=private_chef&state=FL&city=Tampa')
  assert.match(actions[2]?.description ?? '', /4 live listings/i)
})

test('buildNearbyBrowseFallbackActions prefers widening the radius before removing the location anchor', () => {
  const actions = buildNearbyBrowseFallbackActions({
    filters: {
      cuisine: 'thai',
      locationQuery: '02118',
      radiusMiles: 25,
    },
    stats: BASE_STATS,
    maxActions: 4,
  })

  assert.equal(actions[0]?.href, '/nearby?cuisine=thai&location=02118&radius=50')
  assert.equal(actions[0]?.label, 'Widen to 50 miles')
  assert.equal(actions[1]?.href, '/nearby?cuisine=thai&location=02118')
  assert.equal(actions[1]?.label, 'Any distance')
})

test('buildNearbyBrowseFallbackActions avoids injecting a default city when browse has no geography yet', () => {
  const actions = buildNearbyBrowseFallbackActions({
    filters: {
      businessType: 'private_chef',
    },
    stats: BASE_STATS,
    maxActions: 4,
  })

  assert.equal(actions[0]?.href, '/nearby/collections')
  assert.equal(actions[0]?.label, 'Browse collections')
  assert.equal(actions[1]?.href, '/nearby')
  assert.equal(actions[1]?.label, 'Browse all Nearby')
  assert.equal(actions.some((action) => /Austin|Tampa|Boston/i.test(action.label)), false)
})

test('dedupeNearbyFallbackActions removes duplicate hrefs and respects the requested limit', () => {
  const deduped = dedupeNearbyFallbackActions(
    [
      { href: '/nearby', label: 'Browse all Nearby', description: 'A' },
      { href: '/nearby', label: 'Reset', description: 'B' },
      { href: '/nearby?type=bakery', label: 'Bakeries', description: 'C' },
    ],
    2
  )

  assert.deepEqual(
    deduped.map((action) => action.href),
    ['/nearby', '/nearby?type=bakery']
  )
})
