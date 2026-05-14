import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DISCOVERY_RAIL_CONTRACT_REGISTRY,
  discoveryHrefHasPrivateIdentifier,
  evaluateDiscoveryRailItem,
  getAllowedDiscoveryRailActions,
  getDiscoveryRailActionDecision,
  getUnsupportedDiscoveryRailFallback,
  listDiscoveryRailContracts,
} from '@/lib/discovery/rail-contract-registry'
import {
  buildActiveDiscoveryFilterSummary,
  parseDiscoveryFiltersFromSearchParams,
  serializeDiscoveryFiltersToSearchParams,
  toggleDiscoveryRailFilter,
} from '@/lib/discovery/filter-state-contract'
import {
  HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES,
  type DiscoveryRailItem,
} from '@/lib/discovery/homepage-discovery-rail'

test('discovery rail registry covers every lane item type with route, action, reason, and analytics contracts', () => {
  const laneTypes = Object.values(HOMEPAGE_DISCOVERY_LANE_ITEM_TYPES).flat()
  const registeredTypes = listDiscoveryRailContracts().map((contract) => contract.type)

  assert.deepEqual(new Set(registeredTypes), new Set(laneTypes))

  for (const type of laneTypes) {
    const contract = DISCOVERY_RAIL_CONTRACT_REGISTRY[type]
    assert.equal(contract.type, type)
    assert.ok(contract.destinationFamilies.length > 0, `${type} needs destination families`)
    assert.ok(contract.defaultActions.length > 0, `${type} needs at least one visible action`)
    assert.ok(contract.reasonCodes.length > 0, `${type} needs reason codes`)
    assert.ok(
      contract.analyticsEvents.includes('discovery_rail_impression'),
      `${type} needs impression analytics`
    )
  }
})

test('rail item route decisions reject private routes, private ids, and unsupported actions safely', () => {
  assert.equal(
    evaluateDiscoveryRailItem({ type: 'featured_chef', href: '/chef/nina' }, 'public').actionable,
    true
  )
  assert.equal(
    evaluateDiscoveryRailItem({ type: 'featured_chef', href: '/admin' }, 'public').actionable,
    false
  )
  assert.equal(
    evaluateDiscoveryRailItem(
      { type: 'cuisine', href: '/eat?chefId=4d3adac4-1cf2-45d5-95e1-709c0a48a2ff' },
      'public'
    ).route.privateIdLeak,
    true
  )
  assert.equal(discoveryHrefHasPrivateIdentifier('/eat?cuisine=romanian'), false)
  assert.equal(getUnsupportedDiscoveryRailFallback('legacy_widget').href, '/eat')
})

test('role implications keep public and chef contexts browse-only for durable client actions', () => {
  assert.deepEqual(getAllowedDiscoveryRailActions('cuisine', 'client').includes('save'), true)
  assert.deepEqual(getAllowedDiscoveryRailActions('cuisine', 'public').includes('save'), false)
  assert.deepEqual(
    getAllowedDiscoveryRailActions('featured_chef', 'chef').includes('compare'),
    false
  )
  assert.equal(getDiscoveryRailActionDecision('circle', 'lock', 'admin').allowed, true)
  assert.equal(getDiscoveryRailActionDecision('circle', 'lock', 'public').allowed, false)
})

test('universal filter state maps selected rail chips to one URL-backed filter model', () => {
  const romanian: DiscoveryRailItem = {
    type: 'cuisine',
    label: 'Romanian',
    href: '/chefs?cuisine=romanian',
  }
  const dinnerParty: DiscoveryRailItem = {
    type: 'occasion',
    label: 'Dinner party',
    href: '/eat?intent=dinner_party',
  }

  const withCuisine = toggleDiscoveryRailFilter({}, romanian)
  const withOccasion = toggleDiscoveryRailFilter(withCuisine, dinnerParty)
  const params = serializeDiscoveryFiltersToSearchParams(withOccasion)
  const roundTrip = parseDiscoveryFiltersFromSearchParams(params)
  const summary = buildActiveDiscoveryFilterSummary(roundTrip).map((token) => token.label)

  assert.deepEqual(roundTrip.cuisines, ['romanian'])
  assert.equal(roundTrip.occasion, 'dinner_party')
  assert.equal(params.get('cuisine'), 'romanian')
  assert.equal(params.get('intent'), 'dinner_party')
  assert.ok(summary.includes('romanian'))
  assert.ok(summary.includes('Dinner Party'))
})

test('toggling a selected rail chip removes its filter and selection', () => {
  const romanian: DiscoveryRailItem = {
    type: 'cuisine',
    label: 'Romanian',
    href: '/chefs?cuisine=romanian',
  }

  const selected = toggleDiscoveryRailFilter({}, romanian)
  const cleared = toggleDiscoveryRailFilter(selected, romanian)

  assert.deepEqual(cleared.cuisines, [])
  assert.deepEqual(cleared.selectedRailItems, [])
})
