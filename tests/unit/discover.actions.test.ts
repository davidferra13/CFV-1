import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const ACTIONS_PATH = require.resolve('../../lib/discover/actions.ts')
const DB_PATH = require.resolve('../../lib/db/index.ts')
const DB_SERVER_PATH = require.resolve('../../lib/db/server.ts')
const CACHE_PATH = require.resolve('next/cache')
const ADMIN_PATH = require.resolve('../../lib/auth/admin.ts')
const GET_USER_PATH = require.resolve('../../lib/auth/get-user.ts')
const GEO_PATH = require.resolve('../../lib/geo/public-location.ts')
const OUTREACH_PATH = require.resolve('../../lib/discover/outreach.ts')

type PgClientMock = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>) & {
  unsafe: (query: string, params?: unknown[]) => Promise<any[]>
}

type DirectoryDbScenario = {
  exactMatches?: any[]
  looseMatches?: any[]
  slugMatches?: any[]
  claimLookup?: any
  claimedListing?: any
  insertedRecord?: any
  insertedLookup?: any
  insertError?: any
  updateError?: any
}

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

class DirectoryListingsBuilder {
  private mode: 'read' | 'update' | 'insert' = 'read'
  private selectColumns: string | null = null
  private filters = {
    eq: [] as Array<[string, unknown]>,
    ilike: [] as Array<[string, unknown]>,
    neq: [] as Array<[string, unknown]>,
  }

  constructor(
    private readonly scenario: DirectoryDbScenario,
    private readonly calls: {
      inserts: any[]
      updates: any[]
    }
  ) {}

  select(columns: string) {
    this.selectColumns = columns
    return this
  }

  insert(payload: any) {
    this.mode = 'insert'
    this.calls.inserts.push(payload)
    return this
  }

  update(payload: any) {
    this.mode = 'update'
    this.calls.updates.push(payload)
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.eq.push([column, value])
    return this
  }

  ilike(column: string, value: unknown) {
    this.filters.ilike.push([column, value])
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.neq.push([column, value])
    return this
  }

  async like(column: string, value: unknown) {
    assert.equal(column, 'slug')
    assert.match(String(value), /%$/)
    return { data: this.scenario.slugMatches ?? [] }
  }

  async limit(count: number) {
    assert.ok(count > 0)

    if (this.selectColumns === 'id, name, slug, state, status, lead_score') {
      const hasNameFilter = this.filters.ilike.some(([column]) => column === 'name')
      return {
        data: hasNameFilter
          ? (this.scenario.exactMatches ?? [])
          : (this.scenario.looseMatches ?? []),
      }
    }

    throw new Error(`Unexpected limit() call for columns "${this.selectColumns}"`)
  }

  async single() {
    if (this.mode === 'insert' && this.selectColumns === 'id, slug') {
      return {
        data: this.scenario.insertedRecord ?? null,
        error: this.scenario.insertError ?? null,
      }
    }

    if (this.selectColumns === 'id, status, slug, name') {
      return { data: this.scenario.claimLookup ?? null, error: null }
    }

    if (this.selectColumns === 'id') {
      return { data: this.scenario.insertedLookup ?? null, error: null }
    }

    throw new Error(`Unexpected single() call for columns "${this.selectColumns}"`)
  }

  async maybeSingle() {
    if (this.mode === 'update' && this.selectColumns === 'slug, name') {
      return { data: this.scenario.claimedListing ?? null, error: null }
    }

    throw new Error(`Unexpected maybeSingle() call for columns "${this.selectColumns}"`)
  }

  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    let result: any

    if (this.mode === 'insert') {
      result = { data: null, error: this.scenario.insertError ?? null }
    } else if (this.mode === 'update') {
      result = { data: null, error: this.scenario.updateError ?? null }
    } else {
      result = this
    }

    return Promise.resolve(result).then(resolve, reject)
  }
}

class ChefLookupBuilder {
  select() {
    return this
  }

  eq() {
    return this
  }

  async maybeSingle() {
    return { data: null, error: null }
  }
}

function createDirectoryDbMock(scenario: DirectoryDbScenario) {
  const calls = {
    inserts: [] as any[],
    updates: [] as any[],
  }

  const db = {
    from(table: string) {
      if (table === 'directory_listings') {
        return new DirectoryListingsBuilder(scenario, calls)
      }

      if (table === 'chefs') {
        return new ChefLookupBuilder()
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }

  return { db, calls }
}

function loadDiscoverActions({
  pgClient,
  createServerClient,
}: {
  pgClient: PgClientMock
  createServerClient?: () => any
}) {
  const originals = {
    actions: require.cache[ACTIONS_PATH],
    db: require.cache[DB_PATH],
    dbServer: require.cache[DB_SERVER_PATH],
    cache: require.cache[CACHE_PATH],
    admin: require.cache[ADMIN_PATH],
    getUser: require.cache[GET_USER_PATH],
    geo: require.cache[GEO_PATH],
    outreach: require.cache[OUTREACH_PATH],
  }

  require.cache[DB_PATH] = {
    id: DB_PATH,
    filename: DB_PATH,
    loaded: true,
    exports: { pgClient },
  } as NodeJS.Module

  require.cache[DB_SERVER_PATH] = {
    id: DB_SERVER_PATH,
    filename: DB_SERVER_PATH,
    loaded: true,
    exports: {
      createServerClient:
        createServerClient ||
        (() => ({
          from() {
            throw new Error('createServerClient should not be used in this test')
          },
        })),
    },
  } as NodeJS.Module

  require.cache[CACHE_PATH] = {
    id: CACHE_PATH,
    filename: CACHE_PATH,
    loaded: true,
    exports: {
      revalidatePath() {},
    },
  } as NodeJS.Module

  require.cache[ADMIN_PATH] = {
    id: ADMIN_PATH,
    filename: ADMIN_PATH,
    loaded: true,
    exports: {
      requireAdmin: async () => {},
    },
  } as NodeJS.Module

  require.cache[GET_USER_PATH] = {
    id: GET_USER_PATH,
    filename: GET_USER_PATH,
    loaded: true,
    exports: {
      getCurrentUser: async () => null,
      requireClient: async () => {
        throw new Error('requireClient should not be used in this test')
      },
    },
  } as NodeJS.Module

  require.cache[GEO_PATH] = {
    id: GEO_PATH,
    filename: GEO_PATH,
    loaded: true,
    exports: {
      resolvePublicLocationQuery: async () => ({
        data: null,
        error: 'Geocoding service unavailable',
      }),
    },
  } as NodeJS.Module

  require.cache[OUTREACH_PATH] = {
    id: OUTREACH_PATH,
    filename: OUTREACH_PATH,
    loaded: true,
    exports: {
      sendDirectoryWelcomeEmail: async () => {},
      sendDirectoryClaimedEmail: async () => {},
      sendDirectoryVerifiedEmail: async () => {},
    },
  } as NodeJS.Module

  delete require.cache[ACTIONS_PATH]
  const mod = require(ACTIONS_PATH)

  const restore = () => {
    restoreModule(ACTIONS_PATH, originals.actions)
    restoreModule(DB_PATH, originals.db)
    restoreModule(DB_SERVER_PATH, originals.dbServer)
    restoreModule(CACHE_PATH, originals.cache)
    restoreModule(ADMIN_PATH, originals.admin)
    restoreModule(GET_USER_PATH, originals.getUser)
    restoreModule(GEO_PATH, originals.geo)
    restoreModule(OUTREACH_PATH, originals.outreach)
  }

  return { mod, restore }
}

test('getDirectoryListings prefers PostGIS distance sorting when PostGIS is available', async () => {
  const unsafeCalls: Array<{ query: string; params: unknown[] }> = []

  const pgClient: PgClientMock = Object.assign(
    async (strings: TemplateStringsArray) => {
      const sql = strings.join(' ')
      if (sql.includes('FROM pg_extension')) {
        return [{ enabled: true }]
      }

      throw new Error(`Unexpected tagged query: ${sql}`)
    },
    {
      unsafe: async (query: string, params: unknown[] = []) => {
        unsafeCalls.push({ query, params })

        if (query.includes('count(*)')) {
          return [{ count: '2' }]
        }

        return [
          {
            id: 'listing-1',
            name: 'North End Kitchen',
            slug: 'north-end-kitchen',
            city: 'Boston',
            state: 'MA',
            cuisine_types: ['italian'],
            business_type: 'restaurant',
            website_url: 'https://example.com',
            status: 'discovered',
            price_range: '$$',
            featured: false,
            description: 'Fresh pasta and seafood.',
            photo_urls: [],
            phone: null,
            address: '123 Hanover St',
            lat: '42.364',
            lon: '-71.054',
            lead_score: '7',
            distance_miles: '3.24',
            text_rank: 0,
          },
        ]
      },
    }
  )

  const { mod, restore } = loadDiscoverActions({ pgClient })

  try {
    const result = await mod.getDirectoryListings({
      page: 1,
      userLat: 42.3601,
      userLon: -71.0589,
    })

    assert.equal(result.total, 2)
    assert.equal(result.listings[0].distance_miles, 3.2)
    assert.match(unsafeCalls[1].query, /ST_DistanceSphere/)
    assert.match(unsafeCalls[1].query, /CASE WHEN distance_miles IS NULL THEN 1 ELSE 0 END/)
  } finally {
    restore()
  }
})

test('getDirectoryListings falls back to haversine miles and applies optional radius filtering', async () => {
  const unsafeCalls: Array<{ query: string; params: unknown[] }> = []

  const pgClient: PgClientMock = Object.assign(
    async (strings: TemplateStringsArray) => {
      const sql = strings.join(' ')
      if (sql.includes('FROM pg_extension')) {
        return [{ enabled: false }]
      }

      throw new Error(`Unexpected tagged query: ${sql}`)
    },
    {
      unsafe: async (query: string, params: unknown[] = []) => {
        unsafeCalls.push({ query, params })

        if (query.includes('count(*)')) {
          return [{ count: '1' }]
        }

        return [
          {
            id: 'listing-2',
            name: 'Beacon Bakery',
            slug: 'beacon-bakery',
            city: 'Boston',
            state: 'MA',
            cuisine_types: ['bakery'],
            business_type: 'bakery',
            website_url: null,
            status: 'verified',
            price_range: '$',
            featured: true,
            description: 'Croissants and coffee.',
            photo_urls: [],
            phone: null,
            address: null,
            lat: '42.357',
            lon: '-71.07',
            lead_score: '10',
            distance_miles: '4.8',
            text_rank: 0,
          },
        ]
      },
    }
  )

  const { mod, restore } = loadDiscoverActions({ pgClient })

  try {
    await mod.getDirectoryListings({
      page: 1,
      userLat: 42.3601,
      userLon: -71.0589,
      radiusMiles: 25,
    })

    assert.match(unsafeCalls[0].query, /acos/)
    assert.match(unsafeCalls[0].query, /distance_miles <=/)
    assert.match(unsafeCalls[0].query, /lat BETWEEN/)
    assert.ok(unsafeCalls[0].params.includes(25))
  } finally {
    restore()
  }
})

test('submitDirectoryListing claims an existing listing instead of inserting a duplicate submission', async () => {
  const { db, calls } = createDirectoryDbMock({
    exactMatches: [
      {
        id: 'existing-1',
        name: 'Golden Spatula',
        slug: 'golden-spatula',
        state: 'TX',
        status: 'discovered',
        lead_score: 12,
      },
    ],
    claimLookup: {
      id: 'existing-1',
      status: 'discovered',
      slug: 'golden-spatula',
      name: 'Golden Spatula',
    },
    claimedListing: {
      slug: 'golden-spatula',
      name: 'Golden Spatula',
    },
  })

  const pgClient: PgClientMock = Object.assign(async () => [{ enabled: false }], {
    unsafe: async () => {
      throw new Error('pgClient.unsafe should not be used by submitDirectoryListing')
    },
  })

  const { mod, restore } = loadDiscoverActions({
    pgClient,
    createServerClient: () => db,
  })
  const originalConsoleError = console.error

  try {
    console.error = () => {}
    const result = await mod.submitDirectoryListing({
      name: 'Golden Spatula',
      businessType: 'restaurant',
      city: 'Austin',
      state: 'TX',
      cuisineTypes: ['american'],
      websiteUrl: 'https://goldenspatula.example.com',
      email: 'owner@goldenspatula.example.com',
      phone: '512-555-0100',
      description: 'Neighborhood dinner spot.',
    })

    assert.equal(result.success, true)
    assert.equal(result.mode, 'claimed_existing')
    assert.equal(result.slug, 'golden-spatula')
    assert.equal(calls.inserts.length, 0)
    assert.equal(calls.updates[0].status, 'claimed')
    assert.equal(calls.updates[1].website_url, 'https://goldenspatula.example.com')
  } finally {
    console.error = originalConsoleError
    restore()
  }
})

test('submitDirectoryListing blocks duplicate submissions when the listing is already claimed', async () => {
  const { db, calls } = createDirectoryDbMock({
    exactMatches: [
      {
        id: 'existing-claimed',
        name: 'Golden Spatula',
        slug: 'golden-spatula',
        state: 'TX',
        status: 'claimed',
        lead_score: 20,
      },
    ],
  })

  const pgClient: PgClientMock = Object.assign(async () => [{ enabled: false }], {
    unsafe: async () => {
      throw new Error('pgClient.unsafe should not be used by submitDirectoryListing')
    },
  })

  const { mod, restore } = loadDiscoverActions({
    pgClient,
    createServerClient: () => db,
  })

  try {
    const result = await mod.submitDirectoryListing({
      name: 'Golden Spatula',
      businessType: 'restaurant',
      city: 'Austin',
      state: 'TX',
      cuisineTypes: ['american'],
      email: 'owner@goldenspatula.example.com',
    })

    assert.equal(result.success, false)
    assert.equal(result.mode, 'already_claimed')
    assert.equal(result.slug, 'golden-spatula')
    assert.equal(calls.inserts.length, 0)
  } finally {
    restore()
  }
})

test('claimListingByMatch creates a submission-backed listing when no existing match resolves', async () => {
  const { db, calls } = createDirectoryDbMock({
    exactMatches: [],
    looseMatches: [],
    insertedRecord: {
      id: 'new-listing-1',
      slug: 'rising-spoon-austin',
    },
  })

  const pgClient: PgClientMock = Object.assign(async () => [{ enabled: false }], {
    unsafe: async () => {
      throw new Error('pgClient.unsafe should not be used by claimListingByMatch')
    },
  })

  const { mod, restore } = loadDiscoverActions({
    pgClient,
    createServerClient: () => db,
  })

  try {
    const result = await mod.claimListingByMatch({
      businessName: 'Rising Spoon',
      city: 'Austin',
      state: 'TX',
      email: 'owner@risingspoon.example.com',
    })

    assert.equal(result.success, true)
    assert.equal(result.isNew, true)
    assert.equal(calls.inserts.length, 1)
    assert.equal(calls.inserts[0].source, 'submission')
    assert.equal(calls.inserts[0].status, 'pending_submission')
  } finally {
    restore()
  }
})
