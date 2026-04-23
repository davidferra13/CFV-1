import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNearbyBrowseBreadcrumbItems,
  buildNearbyBrowseCollectionJsonLd,
  buildNearbyBrowseMetadata,
  buildNearbyBrowseSeoBase,
  evaluateNearbyBrowseSeo,
} from '../../lib/discover/nearby-browse-seo'

const APP_URL = 'https://cheflowhq.com'

test('landing metadata stays indexable with the root canonical', () => {
  const base = buildNearbyBrowseSeoBase({})
  const metadata = buildNearbyBrowseMetadata({ appUrl: APP_URL, base })

  assert.equal(base.isLanding, true)
  assert.equal(base.canonicalPath, '/nearby')
  assert.equal(metadata.alternates?.canonical, `${APP_URL}/nearby`)
  assert.deepEqual(metadata.robots, { index: true, follow: true })
  assert.match(String(metadata.description), /curated collection guides/i)
})

test('clean city-state-type-cuisine states get query-aware metadata and index when deep enough', () => {
  const base = buildNearbyBrowseSeoBase({
    cuisine: 'italian',
    city: 'boston',
    state: 'ma',
    type: 'restaurant',
  })
  const evaluation = evaluateNearbyBrowseSeo(base, 5)
  const metadata = buildNearbyBrowseMetadata({ appUrl: APP_URL, base, evaluation })
  const breadcrumbs = buildNearbyBrowseBreadcrumbItems({ appUrl: APP_URL, base })

  assert.equal(base.canonicalPath, '/nearby?state=MA&city=Boston&type=restaurant&cuisine=italian')
  assert.equal(base.heading, 'Italian Restaurants in Boston, Massachusetts')
  assert.equal(evaluation.minResultsForIndexing, 3)
  assert.equal(evaluation.shouldIndex, true)
  assert.equal(
    metadata.title,
    'Italian Restaurants in Boston, Massachusetts | Nearby Food Directory'
  )
  assert.equal(
    metadata.alternates?.canonical,
    `${APP_URL}/nearby?state=MA&city=Boston&type=restaurant&cuisine=italian`
  )
  assert.deepEqual(metadata.robots, { index: true, follow: true })
  assert.equal(
    metadata.openGraph?.images?.[0]?.url,
    `${APP_URL}/api/og/nearby?state=MA&city=Boston&type=restaurant&cuisine=italian`
  )
  assert.deepEqual(
    breadcrumbs.map((item) => item.name),
    [
      'Home',
      'Nearby',
      'Massachusetts',
      'Boston, Massachusetts',
      'Restaurants in Boston, Massachusetts',
      'Italian Restaurants in Boston, Massachusetts',
    ]
  )
})

test('state-only pages stay noindex when coverage is too thin', () => {
  const base = buildNearbyBrowseSeoBase({ state: 'MA' })
  const evaluation = evaluateNearbyBrowseSeo(base, 4)
  const metadata = buildNearbyBrowseMetadata({ appUrl: APP_URL, base, evaluation })

  assert.equal(evaluation.minResultsForIndexing, 8)
  assert.equal(evaluation.isLowData, true)
  assert.equal(evaluation.shouldIndex, false)
  assert.deepEqual(metadata.robots, { index: false, follow: true })
  assert.equal(metadata.alternates?.canonical, `${APP_URL}/nearby?state=MA`)
  assert.match(String(metadata.description), /current coverage/i)
})

test('noisy browse states strip volatile params from canonical output and stay noindex', () => {
  const base = buildNearbyBrowseSeoBase({
    page: '2',
    price: '$$',
    q: 'late night',
    state: 'MA',
    type: 'restaurant',
  })
  const metadata = buildNearbyBrowseMetadata({ appUrl: APP_URL, base })

  assert.equal(base.hasUnsupportedFilters, true)
  assert.equal(base.canonicalPath, '/nearby?state=MA&type=restaurant')
  assert.deepEqual(metadata.robots, { index: false, follow: true })
  assert.equal(metadata.alternates?.canonical, `${APP_URL}/nearby?state=MA&type=restaurant`)
  assert.equal(metadata.openGraph?.url, `${APP_URL}/nearby?state=MA&type=restaurant`)
})

test('filtered collection json-ld uses the canonical browse state and item list count', () => {
  const base = buildNearbyBrowseSeoBase({
    cuisine: 'italian',
    city: 'boston',
    state: 'ma',
    type: 'restaurant',
  })
  const jsonLd = buildNearbyBrowseCollectionJsonLd({
    appUrl: APP_URL,
    base,
    previewListings: [
      {
        id: '1',
        name: 'North End Table',
        slug: 'north-end-table',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['italian'],
        business_type: 'restaurant',
        website_url: 'https://example.com',
        status: 'verified',
        price_range: '$$$',
        featured: true,
        description: 'Handmade pasta and seafood.',
        photo_urls: [],
        phone: null,
        address: '1 Hanover St',
        lat: null,
        lon: null,
        lead_score: 12,
        distance_miles: null,
      },
    ],
    total: 5,
  })

  assert.equal(jsonLd.name, 'Italian Restaurants in Boston, Massachusetts')
  assert.equal(jsonLd.url, `${APP_URL}/nearby?state=MA&city=Boston&type=restaurant&cuisine=italian`)
  assert.equal((jsonLd.mainEntity as { numberOfItems: number }).numberOfItems, 5)
})
