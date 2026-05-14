import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDiscoveryHref,
  buildRow2,
  dedupeDiscoveryItems,
  getDiscoveryItemLane,
  type DiscoveryRailItem,
  type HomepageLocationContext,
} from '../../lib/discovery/homepage-discovery-rail'
import {
  HOMEPAGE_TASTE_RAIL_ITEM_LIMIT,
  buildHomepageTasteRailItems,
  listHomepageTasteCandidates,
} from '../../lib/discovery/homepage-taste-rail'

const miami: HomepageLocationContext = {
  location: 'Miami, FL',
  lat: 25.7617,
  lng: -80.1918,
}

function params(href: string): URLSearchParams {
  return new URL(href, 'https://chef.test').searchParams
}

test('buildDiscoveryHref sends /chefs routes location, lat, and lng', () => {
  const href = buildDiscoveryHref('/chefs?cuisine=seafood', miami)
  const search = params(href)

  assert.equal(new URL(href, 'https://chef.test').pathname, '/chefs')
  assert.equal(search.get('cuisine'), 'seafood')
  assert.equal(search.get('location'), 'Miami, FL')
  assert.equal(search.get('lat'), '25.7617')
  assert.equal(search.get('lng'), '-80.1918')
  assert.equal(search.get('lon'), null)
})

test('buildDiscoveryHref sends /nearby routes location, lat, and lon', () => {
  const search = params(buildDiscoveryHref('/nearby?q=pizza', miami))

  assert.equal(search.get('q'), 'pizza')
  assert.equal(search.get('location'), 'Miami, FL')
  assert.equal(search.get('lat'), '25.7617')
  assert.equal(search.get('lon'), '-80.1918')
  assert.equal(search.get('lng'), null)
})

test('buildDiscoveryHref sends /eat routes location only', () => {
  const search = params(buildDiscoveryHref('/eat?craving=tacos', miami))

  assert.equal(search.get('craving'), 'tacos')
  assert.equal(search.get('location'), 'Miami, FL')
  assert.equal(search.get('lat'), null)
  assert.equal(search.get('lng'), null)
  assert.equal(search.get('lon'), null)
})

test('buildDiscoveryHref leaves unsupported and blank-location routes unchanged', () => {
  assert.equal(buildDiscoveryHref('/ingredients', miami), '/ingredients')
  assert.equal(buildDiscoveryHref('/hub/circles', miami), '/hub/circles')
  assert.equal(
    buildDiscoveryHref('/chefs?serviceType=private_dinner', { ...miami, location: '   ' }),
    '/chefs?serviceType=private_dinner'
  )
})

test('circle discovery items are first-class occasion lane entries', () => {
  const item: DiscoveryRailItem = {
    type: 'circle',
    label: 'Dinner Circles',
    href: '/hub',
    icon: 'family',
  }

  assert.equal(getDiscoveryItemLane(item), 'occasion')
})

test('buildDiscoveryHref trims location and only adds coordinates when both are known', () => {
  const href = buildDiscoveryHref('/chefs?serviceType=private_dinner', {
    location: '  Miami Beach, FL  ',
    lat: 25.7907,
    lng: null,
  })
  const search = params(href)

  assert.equal(search.get('serviceType'), 'private_dinner')
  assert.equal(search.get('location'), 'Miami Beach, FL')
  assert.equal(search.get('lat'), null)
  assert.equal(search.get('lng'), null)
  assert.equal(search.get('lon'), null)
})

test('dedupeDiscoveryItems removes exact contract duplicates and preserves ordered distinct items', () => {
  const first: DiscoveryRailItem = {
    type: 'service',
    label: 'Private dinner',
    href: '/chefs?serviceType=private_dinner',
  }
  const sameKeyDifferentObject: DiscoveryRailItem = {
    type: 'service',
    label: 'Private dinner',
    href: '/chefs?serviceType=private_dinner',
    icon: 'dining',
  }
  const sameLabelDifferentHref: DiscoveryRailItem = {
    type: 'service',
    label: 'Private dinner',
    href: '/nearby?serviceType=private_dinner',
  }
  const sameHrefDifferentType: DiscoveryRailItem = {
    type: 'occasion',
    label: 'Private dinner',
    href: '/chefs?serviceType=private_dinner',
  }

  const result = dedupeDiscoveryItems([
    first,
    sameKeyDifferentObject,
    sameLabelDifferentHref,
    sameHrefDifferentType,
    first,
  ])

  assert.deepEqual(result, [first, sameLabelDifferentHref, sameHrefDifferentType])
})

test('buildRow2 interleaves chef, location, and culinary signal inserts without dropping static items', () => {
  const staticItems: DiscoveryRailItem[] = Array.from({ length: 8 }, (_, i) => ({
    type: 'service',
    label: `Service ${i + 1}`,
    href: `/chefs?serviceType=service_${i + 1}`,
  }))
  const chefs: DiscoveryRailItem[] = [
    { type: 'featured_chef', label: 'Chef One', href: '/chef/one' },
    { type: 'featured_chef', label: 'Chef Two', href: '/chef/two' },
  ]
  const locations: DiscoveryRailItem[] = [
    { type: 'location', label: 'Chefs in Miami', href: '/chefs?location=Miami' },
  ]
  const signals: DiscoveryRailItem[] = [
    { type: 'culinary_signal', label: 'Mango', href: '/ingredients' },
  ]

  const result = buildRow2(staticItems, chefs, locations, signals)

  for (const item of [...staticItems, ...chefs, ...locations, ...signals]) {
    assert.ok(result.includes(item), `${item.label} should be present`)
  }

  assert.ok(result.indexOf(chefs[0]) < result.indexOf(chefs[1]))
  assert.ok(result.indexOf(locations[0]) > result.indexOf(chefs[0]))
})

test('buildRow2 preserves static order and appends surplus inserts after the static row', () => {
  const staticItems: DiscoveryRailItem[] = Array.from({ length: 5 }, (_, i) => ({
    type: 'service',
    label: `Static ${i + 1}`,
    href: `/chefs?serviceType=static_${i + 1}`,
  }))
  const chefs: DiscoveryRailItem[] = [
    { type: 'featured_chef', label: 'Chef One', href: '/chef/one' },
    { type: 'featured_chef', label: 'Chef Two', href: '/chef/two' },
    { type: 'featured_chef', label: 'Chef Three', href: '/chef/three' },
  ]
  const locations: DiscoveryRailItem[] = [
    { type: 'location', label: 'Chefs in Miami', href: '/chefs?location=Miami' },
    { type: 'location', label: 'Chefs in Tampa', href: '/chefs?location=Tampa' },
    { type: 'location', label: 'Chefs in Orlando', href: '/chefs?location=Orlando' },
  ]
  const signals: DiscoveryRailItem[] = [
    { type: 'culinary_signal', label: 'Stone crab', href: '/ingredients/stone-crab' },
  ]

  const result = buildRow2(staticItems, chefs, locations, signals)

  assert.deepEqual(
    result.filter((item) => item.type === 'service').map((item) => item.label),
    staticItems.map((item) => item.label)
  )
  assert.deepEqual(result.slice(result.indexOf(staticItems[4]) + 1), [
    locations[0],
    chefs[1],
    locations[1],
    chefs[2],
    locations[2],
    signals[0],
  ])
  assert.equal(result[0], staticItems[0])
  assert.equal(result.indexOf(chefs[0]) > result.indexOf(staticItems[0]), true)
})

test('homepage taste rail is backed by the broad cuisine catalog', () => {
  const candidates = listHomepageTasteCandidates()
  const hrefs = new Set(candidates.map((item) => item.href))

  assert.ok(candidates.length >= 100)
  assert.equal(hrefs.size, candidates.length)
  assert.ok(candidates.some((item) => item.label === 'Italian'))
})

test('homepage taste rail exposes a compact rotating window into the catalog', () => {
  const first = buildHomepageTasteRailItems({ seed: '2026-05-12:1' })
  const second = buildHomepageTasteRailItems({ seed: '2026-05-12:2' })

  assert.equal(first.length, HOMEPAGE_TASTE_RAIL_ITEM_LIMIT)
  assert.equal(new Set(first.map((item) => item.href)).size, first.length)
  assert.ok(first.slice(0, 8).some((item) => item.label === 'Italian'))
  assert.notDeepEqual(
    first.slice(0, 12).map((item) => item.label),
    second.slice(0, 12).map((item) => item.label)
  )
})

test('homepage taste rail boosts similar cuisines without dropping long-tail variety', () => {
  const items = buildHomepageTasteRailItems({
    seed: 'similarity',
    boostedCuisineSlugs: ['thai'],
  })
  const firstLabels = items.slice(0, 16).map((item) => item.label)

  assert.ok(firstLabels.some((label) => ['Thai', 'Lao', 'Cambodian', 'Vietnamese'].includes(label)))
  assert.ok(
    items.some((item) => item.sublabel && !['East Asia', 'Southern Europe'].includes(item.sublabel))
  )
})

test('homepage taste rail routes every generated item to an allowed public destination', () => {
  const allowedPaths = ['/chefs', '/cuisines']
  const items = buildHomepageTasteRailItems({ seed: 'destination-contract' })

  for (const item of items) {
    const url = new URL(item.href, 'https://chef.test')
    assert.ok(
      allowedPaths.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`)),
      `${item.label} routed to unsupported path ${item.href}`
    )
  }
})
