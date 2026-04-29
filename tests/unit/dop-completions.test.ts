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
  operation: 'select' | 'insert' | 'delete'
  selection: string | null
  filters: QueryFilter[]
  payload: unknown
}

type QueryResult = {
  data: any
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

  constructor(
    private readonly table: string,
    private readonly resolve: (ctx: QueryContext) => QueryResult,
    private readonly tracker: Tracker
  ) {}

  select(selection?: string) {
    this.selection = selection ?? null
    return this
  }

  insert(payload: unknown) {
    this.operation = 'insert'
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

  maybeSingle() {
    return Promise.resolve(this.execute())
  }

  single() {
    return Promise.resolve(this.execute())
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
  const actionsPath = require.resolve('../../lib/scheduling/dop-completions.ts')

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

test('toggleDOPTaskCompletion inserts a tenant-scoped completion and returns saved state', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions((ctx) => {
    if (ctx.operation === 'select') {
      return { data: null, error: null }
    }

    if (ctx.operation === 'insert') {
      return { data: { id: 'completion-1' }, error: null }
    }

    throw new Error(`Unexpected operation: ${ctx.operation}`)
  }, tracker)

  try {
    const result = await actions.toggleDOPTaskCompletion('event-1', 'task-1', 'done')

    assert.deepEqual(result, { success: true, completed: true })

    const lookup = tracker.queries[0]
    assert.equal(lookup.table, 'dop_task_completions')
    assert.equal(getEq(lookup, 'event_id'), 'event-1')
    assert.equal(getEq(lookup, 'tenant_id'), 'tenant-1')
    assert.equal(getEq(lookup, 'task_key'), 'task-1')

    const insert = tracker.queries[1]
    assert.equal(insert.operation, 'insert')
    assert.deepEqual(insert.payload, {
      event_id: 'event-1',
      tenant_id: 'tenant-1',
      task_key: 'task-1',
      notes: 'done',
    })
    assert.equal(insert.selection, 'id')

    assert.deepEqual(tracker.revalidatePaths, [
      '/events/event-1',
      '/events/event-1/schedule',
      '/dashboard',
    ])
  } finally {
    restore()
  }
})

test('toggleDOPTaskCompletion rejects and skips revalidation when insert fails', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions((ctx) => {
    if (ctx.operation === 'select') {
      return { data: null, error: null }
    }

    if (ctx.operation === 'insert') {
      return { data: null, error: { message: 'insert denied' } }
    }

    throw new Error(`Unexpected operation: ${ctx.operation}`)
  }, tracker)

  try {
    await assert.rejects(
      () => actions.toggleDOPTaskCompletion('event-1', 'task-1'),
      /Failed to insert DOP task completion: insert denied/
    )
    assert.deepEqual(tracker.revalidatePaths, [])
  } finally {
    restore()
  }
})

test('toggleDOPTaskCompletion deletes a tenant-scoped completion and returns saved state', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions((ctx) => {
    if (ctx.operation === 'select') {
      return { data: { id: 'completion-1' }, error: null }
    }

    if (ctx.operation === 'delete') {
      return { data: { id: 'completion-1' }, error: null }
    }

    throw new Error(`Unexpected operation: ${ctx.operation}`)
  }, tracker)

  try {
    const result = await actions.toggleDOPTaskCompletion('event-1', 'task-1')

    assert.deepEqual(result, { success: true, completed: false })

    const deleteQuery = tracker.queries[1]
    assert.equal(deleteQuery.operation, 'delete')
    assert.equal(getEq(deleteQuery, 'id'), 'completion-1')
    assert.equal(getEq(deleteQuery, 'tenant_id'), 'tenant-1')
    assert.equal(deleteQuery.selection, 'id')

    assert.deepEqual(tracker.revalidatePaths, [
      '/events/event-1',
      '/events/event-1/schedule',
      '/dashboard',
    ])
  } finally {
    restore()
  }
})

test('toggleDOPTaskCompletion rejects and skips revalidation when delete fails', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadActions((ctx) => {
    if (ctx.operation === 'select') {
      return { data: { id: 'completion-1' }, error: null }
    }

    if (ctx.operation === 'delete') {
      return { data: null, error: { message: 'delete denied' } }
    }

    throw new Error(`Unexpected operation: ${ctx.operation}`)
  }, tracker)

  try {
    await assert.rejects(
      () => actions.toggleDOPTaskCompletion('event-1', 'task-1'),
      /Failed to delete DOP task completion: delete denied/
    )
    assert.deepEqual(tracker.revalidatePaths, [])

    const deleteQuery = tracker.queries[1]
    assert.equal(deleteQuery.operation, 'delete')
    assert.equal(getEq(deleteQuery, 'id'), 'completion-1')
    assert.equal(getEq(deleteQuery, 'tenant_id'), 'tenant-1')
    assert.equal(deleteQuery.selection, 'id')
  } finally {
    restore()
  }
})
