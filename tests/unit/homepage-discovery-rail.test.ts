import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildDiscoveryHref,
  buildRow2,
  dedupeDiscoveryItems,
  getDiscoveryRailItemDisplayMeta,
  getDiscoveryItemLane,
  getHomepageDiscoveryRailReconciliation,
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

test('homepage discovery rail declares CuisineMarquee as the canonical public homepage renderer', () => {
  const reconciliation = getHomepageDiscoveryRailReconciliation()

  assert.equal(reconciliation.route, '/')
  assert.equal(reconciliation.ownerComponent, 'HomepageDiscovery')
  assert.equal(reconciliation.rendererComponent, 'CuisineMarquee')
  assert.equal(reconciliation.status, 'canonical_public_homepage_rail')
  assert.ok(
    reconciliation.staleRenderers.some(
      (renderer) =>
        renderer.component === 'components/discovery/discovery-row.tsx' &&
        renderer.status === 'library_primitive_only'
    )
  )
})

test('homepage page mounts the canonical rail without parallel rail renderers', () => {
  const pageSource = readFileSync(path.join(process.cwd(), 'app/(public)/page.tsx'), 'utf8')

  assert.match(pageSource, /<HomepageDiscovery[\s>]/)
  assert.doesNotMatch(pageSource, /<CuisineMarquee[\s>]/)
  assert.doesNotMatch(pageSource, /<DiscoveryRow[\s>]/)
  assert.doesNotMatch(pageSource, /<UniversalRail[\s>]/)
  assert.doesNotMatch(pageSource, /<UrlCapabilityRail[\s>]/)
})

test('homepage discovery help lives in quick-view links instead of a full below-fold section', () => {
  const discoverySource = readFileSync(
    path.join(process.cwd(), 'app/(public)/_components/homepage-discovery.tsx'),
    'utf8'
  )
  const belowFoldSource = readFileSync(
    path.join(process.cwd(), 'app/(public)/_components/landing-below-fold.tsx'),
    'utf8'
  )

  assert.match(discoverySource, /Discovery details/)
  assert.match(discoverySource, /\/how-it-works/)
  assert.match(discoverySource, /\/faq/)
  assert.match(discoverySource, /\/chefs/)
  assert.match(discoverySource, /\/book/)
  assert.doesNotMatch(belowFoldSource, /From search to table\./)
})

test('public FAQ includes discovery ground truth for clients', () => {
  const faqSource = readFileSync(path.join(process.cwd(), 'app/(public)/faq/page.tsx'), 'utf8')

  assert.match(faqSource, /question: 'How does ChefFlow discovery work\?'/)
  assert.match(faqSource, /compare public chef profiles, real menus/)
  assert.match(faqSource, /FAQPageJsonLd faqs=\{ALL_FAQ_ITEMS\}/)
})

test('rail item display metadata exposes reason, source, freshness, and action labels', () => {
  const marketItem: DiscoveryRailItem = {
    type: 'culinary_signal',
    label: 'Asparagus',
    href: '/ingredients?market_context=seasonal_market_pulse',
    reason: 'Clean, grassy spears that make the menu read spring.',
    source: 'Seasonal calendar plus public ingredient snapshots.',
    freshness: 'Freshness: public ingredient snapshots were last confirmed 2h ago.',
    actionLabel: 'See ingredient guide',
  }

  const meta = getDiscoveryRailItemDisplayMeta(marketItem)

  assert.equal(meta.lane, 'taste')
  assert.equal(meta.reason, marketItem.reason)
  assert.equal(meta.source, marketItem.source)
  assert.equal(meta.freshness, marketItem.freshness)
  assert.equal(meta.actionLabel, 'See ingredient guide')
})

test('location display metadata reflects saved homepage location context', () => {
  const item: DiscoveryRailItem = {
    type: 'location',
    label: 'Chefs in Miami',
    href: '/chefs?location=Miami%2C%20FL',
    icon: 'location',
  }

  const meta = getDiscoveryRailItemDisplayMeta(item, miami)

  assert.equal(meta.lane, 'occasion')
  assert.match(meta.reason, /Miami, FL/)
  assert.equal(meta.source, 'Homepage location context')
  assert.equal(meta.freshness, 'Current session')
})
