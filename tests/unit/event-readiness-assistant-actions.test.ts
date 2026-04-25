import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryAction = 'select' | 'upsert' | 'delete'

type QueryFilter = {
  column: string
  value: unknown
}

type QueryContext = {
  table: string
  action: QueryAction
  selection: string | null
  payload: unknown
  options: unknown
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

class DbQueryBuilder implements PromiseLike<QueryResult> {
  private action: QueryAction = 'select'
  private selection: string | null = null
  private payload: unknown = null
  private options: unknown = null
  private filters: QueryFilter[] = []

  constructor(
    private readonly table: string,
    private readonly resolve: (ctx: QueryContext) => QueryResult,
    private readonly tracker: Tracker
  ) {}

  select(selection?: string) {
    this.action = 'select'
    this.selection = selection ?? null
    return this
  }

  upsert(payload: unknown, options?: unknown) {
    this.action = 'upsert'
    this.payload = payload
    this.options = options ?? null
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
      action: this.action,
      selection: this.selection,
      payload: this.payload,
      options: this.options,
      filters: [...this.filters],
    }
    this.tracker.queries.push(ctx)
    return this.resolve(ctx)
  }
}

function createMockDb(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  return {
    from(table: string) {
      return new DbQueryBuilder(table, resolve, tracker)
    },
  }
}

function getEq(ctx: QueryContext, column: string) {
  return ctx.filters.find((filter) => filter.column === column)?.value
}

function loadAssistantActionsWithMocks(
  resolve: (ctx: QueryContext) => QueryResult,
  tracker: Tracker
) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const cachePath = require.resolve('next/cache')
  const chefActionsPath = require.resolve('../../lib/chef/actions.ts')
  const pricingActionsPath =
    require.resolve('../../lib/finance/event-pricing-intelligence-actions.ts')
  const actionsPath = require.resolve('../../lib/events/event-readiness-assistant-actions.ts')

  require(authPath)
  require(dbPath)
  require(cachePath)
  require(chefActionsPath)
  require(pricingActionsPath)

  const originalAuth = require.cache[authPath]!.exports
  const originalDb = require.cache[dbPath]!.exports
  const originalCache = require.cache[cachePath]!.exports
  const originalChefActions = require.cache[chefActionsPath]!.exports
  const originalPricingActions = require.cache[pricingActionsPath]!.exports
  const db = createMockDb(resolve, tracker)

  require.cache[authPath]!.exports = {
    requireChef: async () => ({
      id: 'auth-user-1',
      tenantId: 'tenant-1',
      role: 'chef',
      entityId: 'tenant-1',
    }),
  }
  require.cache[dbPath]!.exports = {
    createServerClient: () => db,
  }
  require.cache[cachePath]!.exports = {
    revalidatePath: (path: string) => tracker.revalidatePaths.push(path),
  }
  require.cache[chefActionsPath]!.exports = {
    getChefPreferences: async () => ({
      event_readiness_assistant_enabled: true,
      event_readiness_assistant_default_mode: 'normal',
    }),
  }
  require.cache[pricingActionsPath]!.exports = {
    getEventPricingIntelligence: async () => null,
  }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuth
    require.cache[dbPath]!.exports = originalDb
    require.cache[cachePath]!.exports = originalCache
    require.cache[chefActionsPath]!.exports = originalChefActions
    require.cache[pricingActionsPath]!.exports = originalPricingActions
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('dismissEventReadinessSuggestion validates event ownership before upsert', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadAssistantActionsWithMocks((ctx) => {
    if (ctx.table === 'events' && ctx.action === 'select') {
      return { data: null, error: { message: 'No rows found' } }
    }
    throw new Error(`Unexpected query ${ctx.table}:${ctx.action}`)
  }, tracker)

  try {
    await assert.rejects(
      () => actions.dismissEventReadinessSuggestion('event-other', 'margin_below_target'),
      /Event not found or access denied/
    )

    assert.equal(tracker.queries.length, 1)
    assert.equal(tracker.queries[0].table, 'events')
    assert.equal(getEq(tracker.queries[0], 'tenant_id'), 'tenant-1')
    assert.equal(tracker.revalidatePaths.length, 0)
  } finally {
    restore()
  }
})

test('dismissEventReadinessSuggestion upserts per chef/event suggestion dismissal', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadAssistantActionsWithMocks((ctx) => {
    if (ctx.table === 'events' && ctx.action === 'select') {
      return { data: { id: 'event-1' }, error: null }
    }
    if (ctx.table === 'event_readiness_suggestion_dismissals' && ctx.action === 'upsert') {
      return { data: null, error: null }
    }
    throw new Error(`Unexpected query ${ctx.table}:${ctx.action}`)
  }, tracker)

  try {
    const result = await actions.dismissEventReadinessSuggestion('event-1', 'margin_below_target')

    const upsert = tracker.queries.find((query) => query.action === 'upsert')
    assert.deepEqual(result, { success: true })
    assert.equal(upsert?.table, 'event_readiness_suggestion_dismissals')
    assert.deepEqual(upsert?.options, { onConflict: 'tenant_id,event_id,suggestion_id' })
    assert.equal((upsert?.payload as any).tenant_id, 'tenant-1')
    assert.equal((upsert?.payload as any).event_id, 'event-1')
    assert.equal((upsert?.payload as any).suggestion_id, 'margin_below_target')
    assert.equal((upsert?.payload as any).dismissed_by, 'auth-user-1')
    assert.deepEqual(tracker.revalidatePaths, ['/events/event-1', '/events/event-1/financial'])
  } finally {
    restore()
  }
})

test('resetEventReadinessDismissals deletes only the current chef and event dismissals', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [] }
  const { actions, restore } = loadAssistantActionsWithMocks((ctx) => {
    if (ctx.table === 'events' && ctx.action === 'select') {
      return { data: { id: 'event-1' }, error: null }
    }
    if (ctx.table === 'event_readiness_suggestion_dismissals' && ctx.action === 'delete') {
      return { data: null, error: null }
    }
    throw new Error(`Unexpected query ${ctx.table}:${ctx.action}`)
  }, tracker)

  try {
    const result = await actions.resetEventReadinessDismissals('event-1')
    const deletion = tracker.queries.find((query) => query.action === 'delete')

    assert.deepEqual(result, { success: true })
    assert.equal(deletion?.table, 'event_readiness_suggestion_dismissals')
    assert.equal(getEq(deletion!, 'tenant_id'), 'tenant-1')
    assert.equal(getEq(deletion!, 'event_id'), 'event-1')
    assert.equal(getEq(deletion!, 'suggestion_id'), undefined)
    assert.deepEqual(tracker.revalidatePaths, ['/events/event-1', '/events/event-1/financial'])
  } finally {
    restore()
  }
})
