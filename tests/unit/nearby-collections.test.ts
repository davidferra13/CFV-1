import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNearbyLandingCollectionModel,
  buildNearbyCollectionBrowseHref,
  getNearbyCollectionBySlug,
  listFeaturedNearbyCollections,
  toNearbyCollectionDiscoverFilters,
} from '../../lib/discover/nearby-collections'
import {
  buildNearbyCollectionJsonLd,
  buildNearbyCollectionMetadata,
  buildNearbyCollectionsIndexMetadata,
} from '../../lib/discover/nearby-collection-seo'

const APP_URL = 'https://cheflowhq.com'

test('nearby collections compile into nearby browse hrefs', () => {
  const collection = getNearbyCollectionBySlug('best-bakeries-boston')
  assert.ok(collection)
  assert.equal(collection.browseHref, '/nearby?type=bakery&state=MA&city=Boston')
  assert.equal(
    buildNearbyCollectionBrowseHref(collection),
    '/nearby?type=bakery&state=MA&city=Boston'
  )
  assert.deepEqual(collection.filterChips, ['Bakery', 'Boston, Massachusetts'])
})

test('featured nearby collections preserve editorial landing order', () => {
  const featuredCollections = listFeaturedNearbyCollections()

  assert.ok(featuredCollections.length >= 4)
  assert.equal(featuredCollections[0]?.slug, 'best-bakeries-boston')
  assert.equal(featuredCollections[1]?.slug, 'caterers-in-austin')
  assert.equal(
    featuredCollections.every((collection) => collection.featuredOnLanding),
    true
  )
})

test('nearby collections resolve into existing discover filters', () => {
  const collection = getNearbyCollectionBySlug('private-chefs-in-miami')
  assert.ok(collection)

  assert.deepEqual(toNearbyCollectionDiscoverFilters(collection, 3), {
    query: undefined,
    businessType: 'private_chef',
    cuisine: undefined,
    state: 'FL',
    city: 'Miami',
    priceRange: undefined,
    page: 3,
    resultMode: 'curated_collection',
  })
})

test('landing collection model promotes a lead guide and themed modules on healthy coverage', () => {
  const model = buildNearbyLandingCollectionModel({ totalListings: 24 })

  assert.equal(model.tone, 'established')
  assert.equal(model.leadCollection?.slug, 'best-bakeries-boston')
  assert.equal(model.supportingCollections.length, 3)
  assert.deepEqual(
    model.modules.map((module) => module.id),
    ['business-types', 'cuisines']
  )
  assert.equal(model.modules[0]?.collections[0]?.slug, 'best-bakeries-boston')
  assert.equal(model.lowDensityNote, null)
})

test('landing collection model keeps low-density guidance when coverage is thin', () => {
  const model = buildNearbyLandingCollectionModel({ totalListings: 0 })

  assert.equal(model.tone, 'empty')
  assert.match(model.title, /guide paths/i)
  assert.ok(model.lowDensityNote)
  assert.match(model.lowDensityNote?.description ?? '', /blank directory/i)
})

test('collection metadata uses collection-specific canonical and og images', () => {
  const collection = getNearbyCollectionBySlug('best-bakeries-boston')
  assert.ok(collection)

  const metadata = buildNearbyCollectionMetadata({
    appUrl: APP_URL,
    collection,
    resultTotal: 4,
  })

  assert.equal(
    metadata.alternates?.canonical,
    `${APP_URL}/nearby/collections/best-bakeries-boston`
  )
  assert.deepEqual(metadata.robots, { index: true, follow: true })
  assert.equal(
    metadata.openGraph?.images?.[0]?.url,
    `${APP_URL}/api/og/nearby?collection=best-bakeries-boston`
  )
  assert.match(String(metadata.description), /4 live/i)
})

test('paginated collection metadata stays canonical to page one and noindex', () => {
  const collection = getNearbyCollectionBySlug('caterers-in-austin')
  assert.ok(collection)

  const metadata = buildNearbyCollectionMetadata({
    appUrl: APP_URL,
    collection,
    page: 2,
    resultTotal: 9,
  })

  assert.equal(metadata.title, 'Caterers in Austin | Nearby Collections | Page 2')
  assert.equal(metadata.alternates?.canonical, `${APP_URL}/nearby/collections/caterers-in-austin`)
  assert.deepEqual(metadata.robots, { index: false, follow: true })
})

test('collection json-ld uses canonical collection urls and total item counts', () => {
  const collection = getNearbyCollectionBySlug('private-chefs-in-miami')
  assert.ok(collection)

  const jsonLd = buildNearbyCollectionJsonLd({
    appUrl: APP_URL,
    collection,
    previewListings: [
      {
        id: '1',
        name: 'Tide Table',
        slug: 'tide-table',
        city: 'Miami',
        state: 'FL',
        cuisine_types: ['seafood'],
        business_type: 'private_chef',
        website_url: 'https://example.com',
        status: 'verified',
        price_range: '$$$',
        featured: true,
        description: 'Private dining and coastal menus.',
        photo_urls: [],
        phone: null,
        address: '1 Ocean Dr',
        lat: null,
        lon: null,
        lead_score: 12,
        distance_miles: null,
      },
    ],
    total: 5,
  })

  assert.equal(jsonLd.url, `${APP_URL}/nearby/collections/private-chefs-in-miami`)
  assert.equal((jsonLd.isPartOf as { url: string }).url, `${APP_URL}/nearby/collections`)
  assert.equal((jsonLd.mainEntity as { numberOfItems: number }).numberOfItems, 5)
})

test('collections index metadata uses the dedicated collections og view', () => {
  const metadata = buildNearbyCollectionsIndexMetadata({ appUrl: APP_URL })

  assert.equal(metadata.alternates?.canonical, `${APP_URL}/nearby/collections`)
  assert.equal(metadata.openGraph?.images?.[0]?.url, `${APP_URL}/api/og/nearby?view=collections`)
  assert.deepEqual(metadata.robots, { index: true, follow: true })
})
