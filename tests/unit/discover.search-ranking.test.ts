import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

import { buildNearbyTsQuery } from '../../lib/discover/nearby-search'

const require = createRequire(import.meta.url)

type PgUnsafeCall = {
  sql: string
  params: unknown[]
}

type PgClientMock = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>) & {
  unsafe: (sql: string, params?: unknown[]) => Promise<any[]>
}

function loadDiscoverActionsWithMocks(calls: PgUnsafeCall[], responses: any[][]) {
  const dbIndexPath = require.resolve('../../lib/db/index.ts')
  const dbServerPath = require.resolve('../../lib/db/server.ts')
  const cachePath = require.resolve('next/cache')
  const adminPath = require.resolve('../../lib/auth/admin.ts')
  const publicLocationPath = require.resolve('../../lib/geo/public-location.ts')
  const actionsPath = require.resolve('../../lib/discover/actions.ts')

  require(dbIndexPath)
  require(dbServerPath)
  require(cachePath)
  require(adminPath)

  const originalDb = require.cache[dbIndexPath]!.exports
  const originalDbServer = require.cache[dbServerPath]!.exports
  const originalCache = require.cache[cachePath]!.exports
  const originalAdmin = require.cache[adminPath]!.exports
  const originalPublicLocation = require.cache[publicLocationPath]

  const pgClient: PgClientMock = Object.assign(
    async () => {
      throw new Error('Tagged template queries are not expected in this test')
    },
    {
      unsafe: async (sql: string, params: unknown[] = []) => {
        calls.push({ sql, params })
        return responses.shift() ?? []
      },
    }
  )

  require.cache[dbIndexPath]!.exports = {
    ...originalDb,
    pgClient,
  }
  require.cache[dbServerPath]!.exports = {
    ...originalDbServer,
    createServerClient: () => {
      throw new Error('createServerClient is not expected in this test')
    },
  }
  require.cache[cachePath]!.exports = {
    ...originalCache,
    revalidatePath: () => undefined,
  }
  require.cache[adminPath]!.exports = {
    ...originalAdmin,
    requireAdmin: async () => ({ id: 'admin-1', email: 'admin@example.com', accessLevel: 'owner' }),
  }
  require.cache[publicLocationPath] = {
    exports: {
      resolvePublicLocationQuery: async () => ({ data: null, error: null }),
    },
  } as NodeJS.Module

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[dbIndexPath]!.exports = originalDb
    require.cache[dbServerPath]!.exports = originalDbServer
    require.cache[cachePath]!.exports = originalCache
    require.cache[adminPath]!.exports = originalAdmin
    if (originalPublicLocation) {
      require.cache[publicLocationPath] = originalPublicLocation
    } else {
      delete require.cache[publicLocationPath]
    }
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('buildNearbyTsQuery sanitizes and prefixes multi-word text queries', () => {
  assert.equal(buildNearbyTsQuery('  Thai & Food!!!  '), 'thai:* & food:*')
  assert.equal(buildNearbyTsQuery(''), null)
  assert.equal(buildNearbyTsQuery('***'), null)
})

test('getDirectoryListings ranks text matches before distance when text and location are active', async () => {
  const calls: PgUnsafeCall[] = []
  const responses = [
    [{ count: 2 }],
    [
      {
        id: 'listing-1',
        name: 'Thai Garden',
        slug: 'thai-garden',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['thai'],
        business_type: 'restaurant',
        website_url: null,
        status: 'verified',
        price_range: '$$',
        featured: false,
        description: 'Thai food',
        photo_urls: [],
        phone: null,
        address: null,
        lat: 42.36,
        lon: -71.05,
        lead_score: 10,
        distance_miles: 3.2,
      },
    ],
  ]

  const { actions, restore } = loadDiscoverActionsWithMocks(calls, responses)

  try {
    const result = await actions.getDirectoryListings({
      query: 'thai food',
      userLat: 42.36,
      userLon: -71.05,
      radiusMiles: 25,
    })

    assert.equal(result.total, 2)
    assert.equal(result.totalPages, 1)
    assert.equal(result.listings[0]?.name, 'Thai Garden')
    assert.equal(calls.length, 2)

    const [countCall, dataCall] = calls
    assert.match(
      countCall.sql,
      /ts_rank_cd\(search_vector, to_tsquery\('english', \$1\)\) as text_rank/i
    )
    assert.match(dataCall.sql, /ORDER BY text_rank DESC,[\s\S]*distance_miles ASC NULLS LAST/i)
    assert.equal(countCall.params[0], 'thai:* & food:*')
    assert.equal(countCall.params[1], 42.36)
    assert.equal(countCall.params[2], -71.05)
    assert.equal(countCall.params[countCall.params.length - 1], 25)
    assert.equal(dataCall.params[0], 'thai:* & food:*')
    assert.equal(dataCall.params[1], 42.36)
    assert.equal(dataCall.params[2], -71.05)
    assert.deepEqual(dataCall.params.slice(-3), [25, 24, 0])
  } finally {
    restore()
  }
})

test('getDirectoryListings preserves default browse ordering when no text query is present', async () => {
  const calls: PgUnsafeCall[] = []
  const responses = [
    [{ count: 1 }],
    [
      {
        id: 'listing-2',
        name: 'Bake House',
        slug: 'bake-house',
        city: 'Portland',
        state: 'OR',
        cuisine_types: ['desserts'],
        business_type: 'bakery',
        website_url: null,
        status: 'claimed',
        price_range: '$',
        featured: true,
        description: 'Bakery',
        photo_urls: ['photo.jpg'],
        phone: null,
        address: null,
        lat: null,
        lon: null,
        lead_score: 5,
        distance_miles: null,
      },
    ],
  ]

  const { actions, restore } = loadDiscoverActionsWithMocks(calls, responses)

  try {
    await actions.getDirectoryListings({})

    assert.equal(calls.length, 2)
    const dataCall = calls[1]
    assert.match(
      dataCall.sql,
      /ORDER BY featured DESC, \(CASE WHEN photo_urls IS NOT NULL AND array_length\(photo_urls, 1\) > 0 THEN 0 ELSE 1 END\), lead_score DESC NULLS LAST, name ASC/i
    )
    assert.deepEqual(dataCall.params, [24, 0])
  } finally {
    restore()
  }
})

test('getDirectoryListings applies collection readiness gating only in curated collection mode', async () => {
  const calls: PgUnsafeCall[] = []
  const responses = [
    [
      {
        id: 'ready-1',
        name: 'Ready One',
        slug: 'ready-one',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['desserts'],
        business_type: 'bakery',
        website_url: 'https://ready-one.example.com',
        status: 'verified',
        price_range: '$$',
        featured: true,
        description:
          'Fresh pastry, breakfast sandwiches, lunch specials, catering trays, and seasonal desserts baked in-house daily.',
        photo_urls: ['photo-1.jpg'],
        phone: '617-555-0101',
        address: '1 Main St',
        hours: { mon: '8am-4pm' },
        menu_url: 'https://ready-one.example.com/menu',
        updated_at: '2026-04-10T12:00:00.000Z',
        lat: 42.36,
        lon: -71.05,
        lead_score: 50,
        distance_miles: null,
      },
      {
        id: 'ready-2',
        name: 'Ready Two',
        slug: 'ready-two',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['desserts'],
        business_type: 'bakery',
        website_url: 'https://ready-two.example.com',
        status: 'verified',
        price_range: '$$',
        featured: false,
        description:
          'Specialty cakes, pastry boxes, wholesale bread supply, and a full coffee menu with rotating weekend items.',
        photo_urls: ['photo-2.jpg'],
        phone: '617-555-0102',
        address: '2 Main St',
        hours: { mon: '8am-4pm' },
        menu_url: 'https://ready-two.example.com/menu',
        updated_at: '2026-04-10T12:00:00.000Z',
        lat: 42.36,
        lon: -71.05,
        lead_score: 49,
        distance_miles: null,
      },
      {
        id: 'weak-1',
        name: 'Weak One',
        slug: 'weak-one',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['desserts'],
        business_type: 'bakery',
        website_url: null,
        status: 'claimed',
        price_range: '$',
        featured: false,
        description: 'Bakery.',
        photo_urls: [],
        phone: null,
        address: '3 Main St',
        hours: null,
        menu_url: null,
        updated_at: '2025-01-10T12:00:00.000Z',
        lat: 42.36,
        lon: -71.05,
        lead_score: 5,
        distance_miles: null,
      },
      {
        id: 'weak-2',
        name: 'Weak Two',
        slug: 'weak-two',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['desserts'],
        business_type: 'bakery',
        website_url: 'https://weak-two.example.com',
        status: 'discovered',
        price_range: '$',
        featured: false,
        description: 'Public listing.',
        photo_urls: ['photo-weak.jpg'],
        phone: null,
        address: '4 Main St',
        hours: null,
        menu_url: null,
        updated_at: '2026-04-05T12:00:00.000Z',
        lat: 42.36,
        lon: -71.05,
        lead_score: 30,
        distance_miles: null,
      },
      {
        id: 'weak-3',
        name: 'Weak Three',
        slug: 'weak-three',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['desserts'],
        business_type: 'bakery',
        website_url: 'https://weak-three.example.com',
        status: 'discovered',
        price_range: '$',
        featured: false,
        description: 'Public listing.',
        photo_urls: ['photo-weak-2.jpg'],
        phone: null,
        address: '5 Main St',
        hours: null,
        menu_url: null,
        updated_at: '2026-04-04T12:00:00.000Z',
        lat: 42.36,
        lon: -71.05,
        lead_score: 29,
        distance_miles: null,
      },
      {
        id: 'weak-4',
        name: 'Weak Four',
        slug: 'weak-four',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['desserts'],
        business_type: 'bakery',
        website_url: 'https://weak-four.example.com',
        status: 'discovered',
        price_range: '$',
        featured: false,
        description: 'Public listing.',
        photo_urls: ['photo-weak-3.jpg'],
        phone: null,
        address: '6 Main St',
        hours: null,
        menu_url: null,
        updated_at: '2026-04-03T12:00:00.000Z',
        lat: 42.36,
        lon: -71.05,
        lead_score: 28,
        distance_miles: null,
      },
      {
        id: 'weak-5',
        name: 'Weak Five',
        slug: 'weak-five',
        city: 'Boston',
        state: 'MA',
        cuisine_types: ['desserts'],
        business_type: 'bakery',
        website_url: null,
        status: 'discovered',
        price_range: '$',
        featured: false,
        description: 'Thin card.',
        photo_urls: [],
        phone: null,
        address: '7 Main St',
        hours: null,
        menu_url: null,
        updated_at: '2024-01-10T12:00:00.000Z',
        lat: 42.36,
        lon: -71.05,
        lead_score: 1,
        distance_miles: null,
      },
    ],
  ]

  const { actions, restore } = loadDiscoverActionsWithMocks(calls, responses)

  try {
    const result = await actions.getDirectoryListings({
      city: 'Boston',
      state: 'MA',
      businessType: 'bakery',
      resultMode: 'curated_collection',
    })

    assert.equal(calls.length, 1)
    assert.equal(result.total, 6)
    assert.equal(result.totalPages, 1)
    assert.equal(result.collectionReadiness?.mode, 'fallback')
    assert.equal(result.collectionReadiness?.readyCount, 2)
    assert.equal(result.collectionReadiness?.fallbackCount, 4)
    assert.equal(result.collectionReadiness?.suppressedCount, 1)
    assert.deepEqual(
      result.listings.map((listing: { id: string }) => listing.id),
      ['ready-1', 'ready-2', 'weak-2', 'weak-3', 'weak-4', 'weak-1']
    )
    assert.doesNotMatch(calls[0].sql, /LIMIT/i)
  } finally {
    restore()
  }
})
