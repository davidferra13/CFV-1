import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)

type QueryFilter = {
  column: string
  value: unknown
}

type QueryContext = {
  table: string
  operation: 'select' | 'upsert' | 'delete'
  selection: string | null
  filters: QueryFilter[]
  payload: unknown
  options: unknown
}

type QueryResult = {
  data?: unknown
  count?: number | null
  error: { message: string } | null
}

type Tracker = {
  queries: QueryContext[]
  revalidatePaths: string[]
}

class QueryBuilder implements PromiseLike<QueryResult> {
  private operation: QueryContext['operation'] = 'select'
  private selection: string | null = null
  private filters: QueryFilter[] = []
  private payload: unknown = null
  private options: unknown = null

  constructor(
    private readonly table: string,
    private readonly resolve: (ctx: QueryContext) => QueryResult,
    private readonly tracker: Tracker
  ) {}

  select(selection?: string) {
    this.selection = selection ?? null
    return this
  }

  upsert(payload: unknown, options?: unknown) {
    this.operation = 'upsert'
    this.payload = payload
    this.options = options ?? null
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute(): QueryResult {
    const ctx = {
      table: this.table,
      operation: this.operation,
      selection: this.selection,
      filters: [...this.filters],
      payload: this.payload,
      options: this.options,
    }
    this.tracker.queries.push(ctx)
    return this.resolve(ctx)
  }
}

function createMockDb(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  return {
    from(table: string) {
      return new QueryBuilder(table, resolve, tracker)
    },
  }
}

function getEq(ctx: QueryContext, column: string) {
  return ctx.filters.find((filter) => filter.column === column)?.value
}

function loadActions(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const cachePath = require.resolve('next/cache')
  const actionsPath = require.resolve('../../lib/packing/actions.ts')

  const originalAuth = require.cache[authPath] ?? null
  const originalDb = require.cache[dbPath] ?? null
  const originalCache = require.cache[cachePath] ?? null

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      requireChef: async () => ({ tenantId: 'tenant-1', entityId: 'chef-1' }),
    },
  } as any

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      createServerClient: () => createMockDb(resolve, tracker),
    },
  } as any

  require.cache[cachePath] = {
    id: cachePath,
    filename: cachePath,
    loaded: true,
    exports: {
      revalidatePath: (path: string) => {
        tracker.revalidatePaths.push(path)
      },
    },
  } as any

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    if (originalAuth) require.cache[authPath] = originalAuth
    else delete require.cache[authPath]

    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalCache) require.cache[cachePath] = originalCache
    else delete require.cache[cachePath]

    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('togglePackingConfirmation upserts a tenant-scoped confirmation and returns saved state', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions(() => ({ data: { id: 'pack-1' }, error: null }), tracker)

  try {
    const result = await actions.togglePackingConfirmation('event-1', 'cooler-1', true)

    assert.deepEqual(result, { success: true, confirmed: true })
    assert.equal(tracker.queries.length, 1)

    const upsert = tracker.queries[0]
    assert.equal(upsert.table, 'packing_confirmations')
    assert.equal(upsert.operation, 'upsert')
    assert.deepEqual(upsert.payload, {
      event_id: 'event-1',
      tenant_id: 'tenant-1',
      item_key: 'cooler-1',
    })
    assert.deepEqual(upsert.options, { onConflict: 'event_id,item_key' })
    assert.deepEqual(tracker.revalidatePaths, ['/events/event-1'])
  } finally {
    restore()
  }
})

test('togglePackingConfirmation rejects and skips revalidation when upsert fails', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions(
    () => ({ data: null, error: { message: 'upsert denied' } }),
    tracker
  )

  try {
    const result = await actions.togglePackingConfirmation('event-1', 'cooler-1', true)

    assert.deepEqual(result, { success: false, confirmed: false, error: 'upsert denied' })
    assert.deepEqual(tracker.revalidatePaths, [])
  } finally {
    restore()
  }
})

test('togglePackingConfirmation deletes a tenant-scoped confirmation and returns saved state', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions(() => ({ data: null, error: null }), tracker)

  try {
    const result = await actions.togglePackingConfirmation('event-1', 'cooler-1', false)

    assert.deepEqual(result, { success: true, confirmed: false })

    const deletion = tracker.queries[0]
    assert.equal(deletion.table, 'packing_confirmations')
    assert.equal(deletion.operation, 'delete')
    assert.equal(getEq(deletion, 'event_id'), 'event-1')
    assert.equal(getEq(deletion, 'tenant_id'), 'tenant-1')
    assert.equal(getEq(deletion, 'item_key'), 'cooler-1')
    assert.deepEqual(tracker.revalidatePaths, ['/events/event-1'])
  } finally {
    restore()
  }
})

test('togglePackingConfirmation rolls back when delete fails', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions(
    () => ({ data: null, error: { message: 'delete denied' } }),
    tracker
  )

  try {
    const result = await actions.togglePackingConfirmation('event-1', 'cooler-1', false)

    assert.deepEqual(result, { success: false, confirmed: true, error: 'delete denied' })
    assert.deepEqual(tracker.revalidatePaths, [])
  } finally {
    restore()
  }
})

test('getPackingConfirmationCount surfaces database errors instead of hiding them as zero', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions(
    () => ({ count: null, error: { message: 'count unavailable' } }),
    tracker
  )

  try {
    await assert.rejects(
      () => actions.getPackingConfirmationCount('event-1'),
      /Failed to load packing confirmation count: count unavailable/
    )
  } finally {
    restore()
  }
})
