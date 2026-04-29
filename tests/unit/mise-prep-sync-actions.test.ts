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
  operation: 'select' | 'upsert' | 'delete' | 'update'
  selection: string | null
  filters: QueryFilter[]
  payload: unknown
  options: unknown
}

type QueryResult = {
  data?: unknown
  error: { message: string } | null
}

type Tracker = {
  queries: QueryContext[]
  revalidatePaths: string[]
  revalidateTags: string[]
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

  update(payload: unknown) {
    this.operation = 'update'
    this.payload = payload
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

function installSharedMocks(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const cachePath = require.resolve('next/cache')

  const originals = {
    auth: require.cache[authPath] ?? null,
    db: require.cache[dbPath] ?? null,
    cache: require.cache[cachePath] ?? null,
  }

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
      revalidateTag: (tag: string) => {
        tracker.revalidateTags.push(tag)
      },
    },
  } as any

  return () => {
    if (originals.auth) require.cache[authPath] = originals.auth
    else delete require.cache[authPath]

    if (originals.db) require.cache[dbPath] = originals.db
    else delete require.cache[dbPath]

    if (originals.cache) require.cache[cachePath] = originals.cache
    else delete require.cache[cachePath]
  }
}

function loadPrepActions(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  const restoreShared = installSharedMocks(resolve, tracker)
  const actionsPath = require.resolve('../../lib/prep-timeline/actions.ts')
  const originalActions = require.cache[actionsPath] ?? null

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    if (originalActions) require.cache[actionsPath] = originalActions
    else delete require.cache[actionsPath]
    restoreShared()
  }

  return { actions, restore }
}

function loadMiseActions(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  const restoreShared = installSharedMocks(resolve, tracker)
  const actionsPath = require.resolve('../../lib/mise-en-place/actions.ts')
  const originalActions = require.cache[actionsPath] ?? null

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    if (originalActions) require.cache[actionsPath] = originalActions
    else delete require.cache[actionsPath]
    restoreShared()
  }

  return { actions, restore }
}

test('togglePrepCompletion persists a tenant-scoped completion and revalidates prep surfaces', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], revalidateTags: [] }
  const { actions, restore } = loadPrepActions(() => ({ data: null, error: null }), tracker)

  try {
    const result = await actions.togglePrepCompletion('event-1', 'component-1', true)

    assert.deepEqual(result, { success: true })

    const upsert = tracker.queries[0]
    assert.equal(upsert.table, 'prep_completions')
    assert.equal(upsert.operation, 'upsert')
    const payload = upsert.payload as {
      event_id: string
      chef_id: string
      item_key: string
      completed_at: unknown
    }
    assert.deepEqual(
      {
        event_id: payload.event_id,
        chef_id: payload.chef_id,
        item_key: payload.item_key,
      },
      {
        event_id: 'event-1',
        chef_id: 'tenant-1',
        item_key: 'component-1',
      }
    )
    assert.equal(typeof payload.completed_at, 'string')
    assert.deepEqual(upsert.options, { onConflict: 'event_id,item_key' })
    assert.deepEqual(tracker.revalidatePaths, ['/events/event-1', '/events/event-1/mise-en-place'])
    assert.deepEqual(tracker.revalidateTags, ['prep-timeline-tenant-1'])
  } finally {
    restore()
  }
})

test('togglePrepCompletion returns an error and skips revalidation on persistence failure', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], revalidateTags: [] }
  const { actions, restore } = loadPrepActions(
    () => ({ data: null, error: { message: 'upsert failed' } }),
    tracker
  )

  try {
    const result = await actions.togglePrepCompletion('event-1', 'component-1', true)

    assert.deepEqual(result, { success: false, error: 'upsert failed' })
    assert.deepEqual(tracker.revalidatePaths, [])
    assert.deepEqual(tracker.revalidateTags, [])
  } finally {
    restore()
  }
})

test('getPrepCompletions throws when the database load fails', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], revalidateTags: [] }
  const { actions, restore } = loadPrepActions(
    () => ({ data: null, error: { message: 'select failed' } }),
    tracker
  )

  try {
    await assert.rejects(
      () => actions.getPrepCompletions('event-1'),
      /Failed to load prep completions: select failed/
    )
  } finally {
    restore()
  }
})

test('toggleEquipmentPacked updates tenant-scoped equipment and revalidates mise surfaces', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], revalidateTags: [] }
  const { actions, restore } = loadMiseActions(() => ({ data: null, error: null }), tracker)

  try {
    const result = await actions.toggleEquipmentPacked('event-1', 'equipment-1', true)

    assert.deepEqual(result, { success: true })

    const update = tracker.queries[0]
    assert.equal(update.table, 'event_equipment_checklist')
    assert.equal(update.operation, 'update')
    assert.equal((update.payload as { packed: boolean }).packed, true)
    assert.equal(typeof (update.payload as { updated_at: unknown }).updated_at, 'string')
    assert.equal(getEq(update, 'id'), 'equipment-1')
    assert.equal(getEq(update, 'event_id'), 'event-1')
    assert.equal(getEq(update, 'chef_id'), 'tenant-1')
    assert.deepEqual(tracker.revalidatePaths, ['/events/event-1', '/events/event-1/mise-en-place'])
  } finally {
    restore()
  }
})

test('toggleEquipmentPacked returns an error and rolls back when the update fails', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], revalidateTags: [] }
  const { actions, restore } = loadMiseActions(
    () => ({ data: null, error: { message: 'update failed' } }),
    tracker
  )

  try {
    const result = await actions.toggleEquipmentPacked('event-1', 'equipment-1', true)

    assert.deepEqual(result, { success: false, error: 'update failed' })
    assert.deepEqual(tracker.revalidatePaths, [])
  } finally {
    restore()
  }
})
