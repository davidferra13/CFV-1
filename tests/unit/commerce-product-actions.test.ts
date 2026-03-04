import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryAction = 'select' | 'insert' | 'update'
type FilterOp = 'eq'

type QueryFilter = {
  op: FilterOp
  column: string
  value: unknown
}

type QueryContext = {
  table: string
  action: QueryAction
  payload: unknown
  filters: QueryFilter[]
}

type QueryResult = {
  data: any
  error: { message: string } | null
}

type Tracker = {
  queries: QueryContext[]
  revalidatePaths: string[]
}

class SupabaseQueryBuilder implements PromiseLike<QueryResult> {
  private readonly table: string
  private readonly resolve: (ctx: QueryContext) => QueryResult
  private readonly tracker: Tracker
  private action: QueryAction = 'select'
  private payload: unknown = null
  private filters: QueryFilter[] = []

  constructor(
    table: string,
    resolve: (ctx: QueryContext) => QueryResult,
    tracker: Tracker
  ) {
    this.table = table
    this.resolve = resolve
    this.tracker = tracker
  }

  select() {
    return this
  }

  insert(payload: unknown) {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  update(payload: unknown) {
    this.action = 'update'
    this.payload = payload
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  single() {
    return Promise.resolve(this.execute())
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
      table: this.table,
      action: this.action,
      payload: this.payload,
      filters: [...this.filters],
    }
    this.tracker.queries.push(ctx)
    return this.resolve(ctx)
  }
}

function createMockSupabase(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  return {
    from(table: string) {
      return new SupabaseQueryBuilder(table, resolve, tracker)
    },
  }
}

function getEq(ctx: QueryContext, column: string) {
  return ctx.filters.find((f) => f.op === 'eq' && f.column === column)?.value
}

function loadProductActionsWithMocks(
  resolve: (ctx: QueryContext) => QueryResult,
  tracker: Tracker
) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const proPath = require.resolve('../../lib/billing/require-pro.ts')
  const supabasePath = require.resolve('../../lib/supabase/server.ts')
  const cachePath = require.resolve('next/cache')
  const actionsPath = require.resolve('../../lib/commerce/product-actions.ts')

  require(authPath)
  require(proPath)
  require(supabasePath)
  require(cachePath)

  const originalAuth = require.cache[authPath]!.exports
  const originalPro = require.cache[proPath]!.exports
  const originalSupabase = require.cache[supabasePath]!.exports
  const originalCache = require.cache[cachePath]!.exports

  const supabase = createMockSupabase(resolve, tracker)

  require.cache[authPath]!.exports = {
    requireChef: async () => ({ tenantId: 'tenant-1', id: 'auth-user-1' }),
  }
  require.cache[proPath]!.exports = { requirePro: async () => undefined }
  require.cache[supabasePath]!.exports = {
    createServerClient: () => supabase,
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
    require.cache[cachePath]!.exports = originalCache
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('createQuickBarcodeProduct rejects invalid barcode', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadProductActionsWithMocks(
    () => ({ data: null, error: null }),
    tracker
  )

  try {
    await assert.rejects(
      async () =>
        actions.createQuickBarcodeProduct({
          barcode: 'ABC',
          name: 'Invalid',
          priceCents: 100,
        }),
      /8 to 14 digits/
    )
    assert.equal(tracker.queries.length, 0)
  } finally {
    restore()
  }
})

test('createQuickBarcodeProduct returns existing barcode match without insert', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const existingRow = {
    id: 'prod-existing',
    name: 'Soda',
    barcode: '12345678',
    price_cents: 299,
    category: 'beverage',
    image_url: null,
    is_active: true,
    modifiers: [],
    tax_class: 'standard',
    cost_cents: null,
    track_inventory: false,
    available_qty: null,
    low_stock_threshold: null,
  }

  const { actions, restore } = loadProductActionsWithMocks((ctx) => {
    if (ctx.table !== 'product_projections') throw new Error(`Unexpected table ${ctx.table}`)
    if (ctx.action === 'select' && getEq(ctx, 'barcode') === '12345678') {
      return { data: existingRow, error: null }
    }
    throw new Error(`Unexpected query action: ${ctx.action}`)
  }, tracker)

  try {
    const result = await actions.createQuickBarcodeProduct({
      barcode: '12345678',
      name: 'Ignore',
      priceCents: 399,
    })

    assert.equal(result.created, false)
    assert.equal(result.product.id, 'prod-existing')
    const insertCalls = tracker.queries.filter((q) => q.action === 'insert')
    assert.equal(insertCalls.length, 0)
    assert.equal(tracker.revalidatePaths.length, 0)
  } finally {
    restore()
  }
})

test('createQuickBarcodeProduct inserts and revalidates when barcode is new', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const insertedRow = {
    id: 'prod-new',
    name: 'Energy Drink',
    barcode: '87654321',
    price_cents: 425,
    category: null,
    image_url: null,
    is_active: true,
    modifiers: [],
    tax_class: 'standard',
    cost_cents: null,
    track_inventory: false,
    available_qty: null,
    low_stock_threshold: null,
  }

  const { actions, restore } = loadProductActionsWithMocks((ctx) => {
    if (ctx.table !== 'product_projections') throw new Error(`Unexpected table ${ctx.table}`)
    if (ctx.action === 'select') {
      return { data: null, error: null }
    }
    if (ctx.action === 'insert') {
      return { data: insertedRow, error: null }
    }
    throw new Error(`Unexpected query action: ${ctx.action}`)
  }, tracker)

  try {
    const result = await actions.createQuickBarcodeProduct({
      barcode: '87654321',
      name: 'Energy Drink',
      priceCents: 425,
    })

    assert.equal(result.created, true)
    assert.equal(result.product.id, 'prod-new')
    const insertCall = tracker.queries.find((q) => q.action === 'insert')
    assert.ok(insertCall)
    const payload = insertCall?.payload as Record<string, unknown>
    assert.equal(payload.barcode, '87654321')
    assert.equal(payload.price_cents, 425)
    assert.deepEqual(tracker.revalidatePaths, ['/commerce/products'])
  } finally {
    restore()
  }
})
