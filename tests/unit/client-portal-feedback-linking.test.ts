import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryAction = 'select' | 'insert'
type FilterOp = 'eq' | 'is'

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
  selectArgs: unknown[]
}

type QueryResult = {
  count?: number | null
  data: any
  error: { message: string } | null
}

class SupabaseQueryBuilder implements PromiseLike<QueryResult> {
  private readonly table: string
  private readonly resolve: (ctx: QueryContext) => QueryResult
  private readonly tracker: QueryContext[]
  private action: QueryAction = 'select'
  private payload: unknown = null
  private filters: QueryFilter[] = []
  private selectArgs: unknown[] = []

  constructor(table: string, resolve: (ctx: QueryContext) => QueryResult, tracker: QueryContext[]) {
    this.table = table
    this.resolve = resolve
    this.tracker = tracker
  }

  select(...args: unknown[]) {
    this.selectArgs = args
    return this
  }

  insert(payload: unknown) {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ op: 'is', column, value })
    return this
  }

  order() {
    return this
  }

  limit() {
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
      selectArgs: [...this.selectArgs],
    }
    this.tracker.push(ctx)
    return this.resolve(ctx)
  }
}

function createMockSupabase(
  resolve: (ctx: QueryContext) => QueryResult,
  tracker: QueryContext[]
) {
  return {
    from(table: string) {
      return new SupabaseQueryBuilder(table, resolve, tracker)
    },
  }
}

function hasFilter(ctx: QueryContext, op: FilterOp, column: string, value?: unknown) {
  return ctx.filters.some(
    (filter) => filter.op === op && filter.column === column && (arguments.length < 4 || filter.value === value)
  )
}

function loadPortalActionsWithMocks(resolve: (ctx: QueryContext) => QueryResult) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const supabasePath = require.resolve('../../lib/supabase/server.ts')
  const actionsPath = require.resolve('../../lib/client-portal/portal-actions.ts')

  require(authPath)
  require(supabasePath)

  const originalAuth = require.cache[authPath]!.exports
  const originalSupabase = require.cache[supabasePath]!.exports
  const tracker: QueryContext[] = []
  const supabase = createMockSupabase(resolve, tracker)

  require.cache[authPath]!.exports = {
    requireClient: async () => ({ entityId: 'client-1' }),
  }
  require.cache[supabasePath]!.exports = {
    createServerClient: () => supabase,
  }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuth
    require.cache[supabasePath]!.exports = originalSupabase
    delete require.cache[actionsPath]
  }

  return { actions, restore, tracker }
}

function loadCustomerFeedbackActionsWithMocks(resolve: (ctx: QueryContext) => QueryResult) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const supabasePath = require.resolve('../../lib/supabase/server.ts')
  const cachePath = require.resolve('next/cache')
  const actionsPath = require.resolve('../../lib/feedback/customer-feedback-actions.ts')

  require(authPath)
  require(supabasePath)
  require(cachePath)

  const originalAuth = require.cache[authPath]!.exports
  const originalSupabase = require.cache[supabasePath]!.exports
  const originalCache = require.cache[cachePath]!.exports
  const tracker: QueryContext[] = []
  const revalidatedPaths: string[] = []
  const supabase = createMockSupabase(resolve, tracker)

  require.cache[authPath]!.exports = {
    requireChef: async () => ({ tenantId: 'tenant-1' }),
  }
  require.cache[supabasePath]!.exports = {
    createServerClient: () => supabase,
  }
  require.cache[cachePath]!.exports = {
    revalidatePath: (value: string) => revalidatedPaths.push(value),
  }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuth
    require.cache[supabasePath]!.exports = originalSupabase
    require.cache[cachePath]!.exports = originalCache
    delete require.cache[actionsPath]
  }

  return { actions, restore, tracker, revalidatedPaths }
}

test('getPortalOverview returns feedback from exact client_id matches without legacy fallback query', async () => {
  const { actions, restore, tracker } = loadPortalActionsWithMocks((ctx) => {
    if (ctx.table === 'events' || ctx.table === 'quotes' || ctx.table === 'meal_prep_subscriptions') {
      return { data: null, error: null, count: 0 }
    }

    if (ctx.table === 'clients') {
      const selectClause = String(ctx.selectArgs[0] ?? '')
      if (selectClause.includes('loyalty_points')) {
        return { data: { loyalty_points: 0, loyalty_tier: 'bronze' }, error: null }
      }

      return { data: { email: 'alice@example.com', full_name: 'Alice Example' }, error: null }
    }

    if (ctx.table === 'feedback_requests') {
      if (hasFilter(ctx, 'eq', 'client_id', 'client-1')) {
        return { data: null, error: null, count: 1 }
      }

      throw new Error('Legacy feedback lookup should not run when exact client_id match exists')
    }

    throw new Error(`Unexpected table: ${ctx.table}`)
  })

  try {
    const overview = await actions.getPortalOverview()

    assert.equal(overview.hasFeedback, true)
    assert.equal(
      tracker.some(
        (ctx) =>
          ctx.table === 'feedback_requests' &&
          (ctx.filters.some((filter) => filter.column === 'client_email') ||
            ctx.filters.some((filter) => filter.column === 'client_name'))
      ),
      false
    )
  } finally {
    restore()
  }
})

test('getClientFeedbackHistory merges exact client_id matches with legacy email fallback and dedupes request ids', async () => {
  const { actions, restore, tracker } = loadPortalActionsWithMocks((ctx) => {
    if (ctx.table === 'clients') {
      return { data: { email: 'alice@example.com', full_name: 'Alice Example' }, error: null }
    }

    if (ctx.table === 'feedback_requests' && hasFilter(ctx, 'eq', 'client_id', 'client-1')) {
      return {
        data: [
          {
            id: 'req-1',
            entity_type: 'event',
            status: 'completed',
            token: 'token-1',
            created_at: '2026-03-09T10:00:00.000Z',
            feedback_responses: [
              {
                id: 'resp-1',
                rating: 5,
                comment: 'Amazing',
                created_at: '2026-03-10T10:00:00.000Z',
              },
            ],
          },
          {
            id: 'req-3',
            entity_type: 'event',
            status: 'pending',
            token: 'token-3',
            created_at: '2026-03-08T10:00:00.000Z',
            feedback_responses: [],
          },
        ],
        error: null,
      }
    }

    if (
      ctx.table === 'feedback_requests' &&
      hasFilter(ctx, 'is', 'client_id', null) &&
      hasFilter(ctx, 'eq', 'client_email', 'alice@example.com')
    ) {
      return {
        data: [
          {
            id: 'req-1',
            entity_type: 'event',
            status: 'completed',
            token: 'token-1',
            created_at: '2026-03-07T10:00:00.000Z',
            feedback_responses: [
              {
                id: 'resp-1',
                rating: 5,
                comment: 'Amazing',
                created_at: '2026-03-10T10:00:00.000Z',
              },
            ],
          },
          {
            id: 'req-2',
            entity_type: 'event',
            status: 'sent',
            token: 'token-2',
            created_at: '2026-03-11T10:00:00.000Z',
            feedback_responses: [],
          },
        ],
        error: null,
      }
    }

    throw new Error(`Unexpected query: ${ctx.table}`)
  })

  try {
    const history = await actions.getClientFeedbackHistory()

    assert.deepEqual(
      history.submitted.map((item: { id: string }) => item.id),
      ['req-1']
    )
    assert.deepEqual(
      history.pending.map((item: { id: string }) => item.id),
      ['req-2', 'req-3']
    )
    assert.equal(history.submitted[0].rating, 5)
    assert.equal(history.submitted[0].comment, 'Amazing')
    assert.equal(
      tracker.some(
        (ctx) =>
          ctx.table === 'feedback_requests' &&
          hasFilter(ctx, 'is', 'client_id', null) &&
          hasFilter(ctx, 'eq', 'client_email', 'alice@example.com')
      ),
      true
    )
  } finally {
    restore()
  }
})

test('createFeedbackRequest resolves client_id from event when the caller omits it', async () => {
  const { actions, restore, tracker, revalidatedPaths } = loadCustomerFeedbackActionsWithMocks(
    (ctx) => {
      if (ctx.table === 'events') {
        return {
          data: { client_id: 'client-1' },
          error: null,
        }
      }

      if (ctx.table === 'feedback_requests' && ctx.action === 'insert') {
        return { data: null, error: null }
      }

      throw new Error(`Unexpected query: ${ctx.table}`)
    }
  )

  try {
    const result = await actions.createFeedbackRequest({
      entityType: 'event',
      entityId: 'event-1',
      clientName: 'Alice Example',
      clientEmail: 'alice@example.com',
    })

    assert.equal(result.success, true)
    assert.equal(typeof result.token, 'string')
    assert.equal(result.token.length > 0, true)

    const insertQuery = tracker.find(
      (ctx) => ctx.table === 'feedback_requests' && ctx.action === 'insert'
    )
    assert.ok(insertQuery)
    assert.equal((insertQuery.payload as Record<string, unknown>).tenant_id, 'tenant-1')
    assert.equal((insertQuery.payload as Record<string, unknown>).entity_id, 'event-1')
    assert.equal((insertQuery.payload as Record<string, unknown>).client_id, 'client-1')
    assert.deepEqual(revalidatedPaths, ['/feedback'])
  } finally {
    restore()
  }
})
