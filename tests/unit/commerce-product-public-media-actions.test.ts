import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryAction = 'select' | 'upsert' | 'delete'

type QueryContext = {
  client: 'server' | 'admin'
  table: string
  action: QueryAction
  payload: unknown
  filters: Array<{ column: string; value: unknown }>
}

type QueryResult = {
  data: any
  error: { message: string } | null
}

type Tracker = {
  queries: QueryContext[]
  revalidatePaths: string[]
  searchQueries: string[]
  searchOptions: Array<Record<string, unknown>>
}

class SupabaseQueryBuilder implements PromiseLike<QueryResult> {
  private readonly client: 'server' | 'admin'
  private readonly table: string
  private readonly resolve: (ctx: QueryContext) => QueryResult
  private readonly tracker: Tracker
  private action: QueryAction = 'select'
  private payload: unknown = null
  private filters: Array<{ column: string; value: unknown }> = []

  constructor(
    client: 'server' | 'admin',
    table: string,
    resolve: (ctx: QueryContext) => QueryResult,
    tracker: Tracker
  ) {
    this.client = client
    this.table = table
    this.resolve = resolve
    this.tracker = tracker
  }

  select() {
    this.action = 'select'
    return this
  }

  upsert(payload: unknown) {
    this.action = 'upsert'
    this.payload = payload
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  maybeSingle() {
    return Promise.resolve(this.execute())
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute(): QueryResult {
    const ctx: QueryContext = {
      client: this.client,
      table: this.table,
      action: this.action,
      payload: this.payload,
      filters: [...this.filters],
    }
    this.tracker.queries.push(ctx)
    return this.resolve(ctx)
  }
}

function createMockSupabase(
  client: 'server' | 'admin',
  resolve: (ctx: QueryContext) => QueryResult,
  tracker: Tracker
) {
  return {
    from(table: string) {
      return new SupabaseQueryBuilder(client, table, resolve, tracker)
    },
  }
}

function getEq(ctx: QueryContext, column: string) {
  return ctx.filters.find((filter) => filter.column === column)?.value
}

function loadActionsWithMocks(
  resolve: (ctx: QueryContext) => QueryResult,
  tracker: Tracker,
  options?: {
    searchResults?: any[]
  }
) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const proPath = require.resolve('../../lib/billing/require-pro.ts')
  const serverPath = require.resolve('../../lib/supabase/server.ts')
  const adminPath = require.resolve('../../lib/supabase/admin.ts')
  const catalogPath = require.resolve('../../lib/public-assets/catalog.ts')
  const cachePath = require.resolve('next/cache')
  const actionsPath = require.resolve('../../lib/commerce/product-public-media-actions.ts')

  require(authPath)
  require(proPath)
  require(serverPath)
  require(adminPath)
  require(catalogPath)
  require(cachePath)

  const originalAuth = require.cache[authPath]!.exports
  const originalPro = require.cache[proPath]!.exports
  const originalServer = require.cache[serverPath]!.exports
  const originalAdmin = require.cache[adminPath]!.exports
  const originalCatalog = require.cache[catalogPath]!.exports
  const originalCache = require.cache[cachePath]!.exports

  require.cache[authPath]!.exports = {
    requireChef: async () => ({ tenantId: 'tenant-1', id: 'auth-user-1' }),
  }
  require.cache[proPath]!.exports = {
    requirePro: async () => undefined,
  }
  require.cache[serverPath]!.exports = {
    createServerClient: () => createMockSupabase('server', resolve, tracker),
  }
  require.cache[adminPath]!.exports = {
    createAdminClient: () => createMockSupabase('admin', resolve, tracker),
  }
  require.cache[catalogPath]!.exports = {
    searchPublicMediaAssets: async (query: string, searchOptions: Record<string, unknown>) => {
      tracker.searchQueries.push(query)
      tracker.searchOptions.push(searchOptions)
      return options?.searchResults ?? []
    },
  }
  require.cache[cachePath]!.exports = {
    revalidatePath: (path: string) => tracker.revalidatePaths.push(path),
  }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuth
    require.cache[proPath]!.exports = originalPro
    require.cache[serverPath]!.exports = originalServer
    require.cache[adminPath]!.exports = originalAdmin
    require.cache[catalogPath]!.exports = originalCatalog
    require.cache[cachePath]!.exports = originalCache
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('searchProductPublicMediaAssets trims the query and delegates to catalog search', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], searchQueries: [], searchOptions: [] }
  const { actions, restore } = loadActionsWithMocks(
    () => ({ data: null, error: null }),
    tracker,
    {
      searchResults: [{ id: 'asset-1', title: 'Soup' }],
    }
  )

  try {
    const results = await actions.searchProductPublicMediaAssets('  tomato soup  ')
    assert.equal(results.length, 1)
    assert.deepEqual(tracker.searchQueries, ['tomato soup'])
    assert.deepEqual(tracker.searchOptions, [{ limit: 8, includePendingPreview: true }])
  } finally {
    restore()
  }
})

test('attachProductPublicMedia upserts approved asset link and revalidates product and public order paths', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], searchQueries: [], searchOptions: [] }
  const { actions, restore } = loadActionsWithMocks((ctx) => {
    if (ctx.client === 'server' && ctx.table === 'product_projections' && ctx.action === 'select') {
      return {
        data: { id: 'prod-1', tenant_id: 'tenant-1' },
        error: null,
      }
    }

    if (ctx.client === 'admin' && ctx.table === 'public_media_assets' && ctx.action === 'select') {
      return {
        data: {
          id: 'asset-1',
          approval_status: 'approved',
          asset_url: 'https://images.example.com/soup.jpg',
          thumbnail_url: 'https://images.example.com/soup-thumb.jpg',
          alt_text: 'Soup bowl',
          source_name: 'wikimedia',
          provider_name: 'Wikimedia Commons',
          provider_url: 'https://commons.wikimedia.org',
          creator_name: 'Creator',
          creator_url: 'https://commons.wikimedia.org/wiki/User:Creator',
          license_name: 'CC BY 4.0',
          license_url: 'https://creativecommons.org/licenses/by/4.0/',
          attribution_text: 'Creator / Wikimedia Commons',
          landing_url: 'https://commons.wikimedia.org/wiki/File:Soup.jpg',
          usage_restrictions: [],
        },
        error: null,
      }
    }

    if (ctx.client === 'admin' && ctx.table === 'product_public_media_links' && ctx.action === 'upsert') {
      return { data: null, error: null }
    }

    if (ctx.client === 'admin' && ctx.table === 'chefs' && ctx.action === 'select') {
      return {
        data: { booking_slug: 'chef-demo', slug: 'chef-demo', public_slug: null },
        error: null,
      }
    }

    throw new Error(`Unexpected query: ${ctx.client}:${ctx.table}:${ctx.action}`)
  }, tracker)

  try {
    const result = await actions.attachProductPublicMedia('prod-1', 'asset-1')
    assert.equal(result.ok, true)

    const upsertCall = tracker.queries.find(
      (query) =>
        query.client === 'admin' &&
        query.table === 'product_public_media_links' &&
        query.action === 'upsert'
    )

    assert.ok(upsertCall)
    const payload = upsertCall?.payload as Record<string, unknown>
    assert.equal(payload.product_id, 'prod-1')
    assert.equal(payload.public_media_asset_id, 'asset-1')
    assert.equal(payload.image_url, 'https://images.example.com/soup.jpg')

    assert.deepEqual(tracker.revalidatePaths, [
      '/commerce/products',
      '/commerce/products/prod-1',
      '/order/chef-demo',
    ])
  } finally {
    restore()
  }
})

test('attachProductPublicMedia rejects unapproved assets before linking', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], searchQueries: [], searchOptions: [] }
  const { actions, restore } = loadActionsWithMocks((ctx) => {
    if (ctx.client === 'server' && ctx.table === 'product_projections') {
      return {
        data: { id: 'prod-1', tenant_id: 'tenant-1' },
        error: null,
      }
    }

    if (ctx.client === 'admin' && ctx.table === 'public_media_assets') {
      return {
        data: {
          id: 'asset-2',
          approval_status: 'pending',
        },
        error: null,
      }
    }

    throw new Error(`Unexpected query: ${ctx.client}:${ctx.table}:${ctx.action}`)
  }, tracker)

  try {
    await assert.rejects(
      async () => actions.attachProductPublicMedia('prod-1', 'asset-2'),
      /must be approved/i
    )

    const upsertCall = tracker.queries.find((query) => query.action === 'upsert')
    assert.equal(upsertCall, undefined)
  } finally {
    restore()
  }
})

test('detachProductPublicMedia removes the link and revalidates product paths', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], searchQueries: [], searchOptions: [] }
  const { actions, restore } = loadActionsWithMocks((ctx) => {
    if (ctx.client === 'server' && ctx.table === 'product_projections' && ctx.action === 'select') {
      return {
        data: { id: 'prod-1', tenant_id: 'tenant-1' },
        error: null,
      }
    }

    if (
      ctx.client === 'admin' &&
      ctx.table === 'product_public_media_links' &&
      ctx.action === 'delete'
    ) {
      return { data: null, error: null }
    }

    if (ctx.client === 'admin' && ctx.table === 'chefs' && ctx.action === 'select') {
      return {
        data: { booking_slug: 'chef-demo', slug: 'chef-demo', public_slug: null },
        error: null,
      }
    }

    throw new Error(`Unexpected query: ${ctx.client}:${ctx.table}:${ctx.action}`)
  }, tracker)

  try {
    const result = await actions.detachProductPublicMedia('prod-1')
    assert.equal(result.ok, true)
    assert.deepEqual(tracker.revalidatePaths, [
      '/commerce/products',
      '/commerce/products/prod-1',
      '/order/chef-demo',
    ])
  } finally {
    restore()
  }
})
