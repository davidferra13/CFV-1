import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryContext = {
  table: string
  action: 'select'
  filters: Array<{ column: string; value: unknown }>
}

type Tracker = {
  queries: QueryContext[]
  revalidatePaths: string[]
  refreshCalls: string[]
  lookupCalls: string[]
}

class SupabaseQueryBuilder implements PromiseLike<{ data: any; error: { message: string } | null }> {
  private readonly table: string
  private readonly resolve: (ctx: QueryContext) => { data: any; error: { message: string } | null }
  private readonly tracker: Tracker
  private filters: Array<{ column: string; value: unknown }> = []

  constructor(
    table: string,
    resolve: (ctx: QueryContext) => { data: any; error: { message: string } | null },
    tracker: Tracker
  ) {
    this.table = table
    this.resolve = resolve
    this.tracker = tracker
  }

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  single() {
    return Promise.resolve(this.execute())
  }

  then<TResult1 = { data: any; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: any; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute() {
    const ctx: QueryContext = {
      table: this.table,
      action: 'select',
      filters: [...this.filters],
    }
    this.tracker.queries.push(ctx)
    return this.resolve(ctx)
  }
}

function createMockSupabase(
  resolve: (ctx: QueryContext) => { data: any; error: { message: string } | null },
  tracker: Tracker
) {
  return {
    from(table: string) {
      return new SupabaseQueryBuilder(table, resolve, tracker)
    },
  }
}

function getEq(ctx: QueryContext, column: string) {
  return ctx.filters.find((filter) => filter.column === column)?.value
}

function loadActionsWithMocks(
  resolve: (ctx: QueryContext) => { data: any; error: { message: string } | null },
  tracker: Tracker,
  options?: {
    productSummary?: any
  }
) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const proPath = require.resolve('../../lib/billing/require-pro.ts')
  const supabasePath = require.resolve('../../lib/supabase/server.ts')
  const syncPath = require.resolve('../../lib/public-data/sync.ts')
  const productSummaryPath = require.resolve('../../lib/commerce/product-public-data.ts')
  const cachePath = require.resolve('next/cache')
  const actionsPath = require.resolve('../../lib/commerce/product-public-data-actions.ts')

  require(authPath)
  require(proPath)
  require(supabasePath)
  require(syncPath)
  require(productSummaryPath)
  require(cachePath)

  const originalAuth = require.cache[authPath]!.exports
  const originalPro = require.cache[proPath]!.exports
  const originalSupabase = require.cache[supabasePath]!.exports
  const originalSync = require.cache[syncPath]!.exports
  const originalProductSummary = require.cache[productSummaryPath]!.exports
  const originalCache = require.cache[cachePath]!.exports

  require.cache[authPath]!.exports = {
    requireChef: async () => ({ tenantId: 'tenant-1', id: 'auth-user-1' }),
  }
  require.cache[proPath]!.exports = { requirePro: async () => undefined }
  require.cache[supabasePath]!.exports = {
    createServerClient: () => createMockSupabase(resolve, tracker),
  }
  require.cache[syncPath]!.exports = {
    getStoredOrFreshProductEnrichment: async ({ barcode }: { barcode: string }) => {
      tracker.refreshCalls.push(barcode)
      return { barcode }
    },
  }
  require.cache[productSummaryPath]!.exports = {
    getProductPublicDataSummary: async ({ barcode }: { barcode: string }) => {
      tracker.lookupCalls.push(barcode)
      return options?.productSummary ?? null
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
    require.cache[supabasePath]!.exports = originalSupabase
    require.cache[syncPath]!.exports = originalSync
    require.cache[productSummaryPath]!.exports = originalProductSummary
    require.cache[cachePath]!.exports = originalCache
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('refreshProductPublicData forces a barcode refresh and revalidates product paths', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], refreshCalls: [], lookupCalls: [] }
  const { actions, restore } = loadActionsWithMocks((ctx) => {
    if (ctx.table !== 'product_projections') throw new Error(`Unexpected table ${ctx.table}`)
    if (getEq(ctx, 'id') === 'prod-1') {
      return { data: { id: 'prod-1', barcode: ' 0123-4567 8901 ' }, error: null }
    }
    return { data: null, error: { message: 'not found' } }
  }, tracker)

  try {
    const result = await actions.refreshProductPublicData('prod-1')
    assert.equal(result.ok, true)
    assert.deepEqual(tracker.refreshCalls, ['012345678901'])
    assert.deepEqual(tracker.revalidatePaths, ['/commerce/products', '/commerce/products/prod-1'])
  } finally {
    restore()
  }
})

test('refreshProductPublicData rejects products without barcode', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], refreshCalls: [], lookupCalls: [] }
  const { actions, restore } = loadActionsWithMocks(() => {
    return { data: { id: 'prod-2', barcode: null }, error: null }
  }, tracker)

  try {
    await assert.rejects(async () => actions.refreshProductPublicData('prod-2'), /must have a barcode/i)
    assert.deepEqual(tracker.refreshCalls, [])
    assert.deepEqual(tracker.revalidatePaths, [])
  } finally {
    restore()
  }
})

test('lookupBarcodePublicData normalizes barcodes and returns public summary', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], refreshCalls: [], lookupCalls: [] }
  const { actions, restore } = loadActionsWithMocks(
    () => ({ data: null, error: null }),
    tracker,
    {
      productSummary: {
        barcode: '012345678901',
        enrichment: { name: 'Preview Product' },
        possibleRecalls: [],
      },
    }
  )

  try {
    const result = await actions.lookupBarcodePublicData(' 0123-4567 8901 ')
    assert.equal(result?.barcode, '012345678901')
    assert.deepEqual(tracker.lookupCalls, ['012345678901'])
  } finally {
    restore()
  }
})

test('lookupBarcodePublicData rejects invalid barcode input', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], refreshCalls: [], lookupCalls: [] }
  const { actions, restore } = loadActionsWithMocks(() => ({ data: null, error: null }), tracker)

  try {
    await assert.rejects(async () => actions.lookupBarcodePublicData('12AB'), /8 to 14 digits/)
    assert.deepEqual(tracker.lookupCalls, [])
  } finally {
    restore()
  }
})
