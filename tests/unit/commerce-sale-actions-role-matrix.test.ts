import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryAction = 'select' | 'insert' | 'update' | 'delete'
type QueryFilter = {
  op: 'eq' | 'in'
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
}

class SupabaseQueryBuilder implements PromiseLike<QueryResult> {
  private readonly table: string
  private readonly resolve: (ctx: QueryContext) => QueryResult
  private readonly tracker: Tracker
  private action: QueryAction = 'select'
  private payload: unknown = null
  private filters: QueryFilter[] = []

  constructor(table: string, resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
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

  delete() {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  in(column: string, value: unknown) {
    this.filters.push({ op: 'in', column, value })
    return this
  }

  limit() {
    return this
  }

  order() {
    return this
  }

  range() {
    return this
  }

  single(): Promise<QueryResult> {
    return Promise.resolve(this.execute())
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.execute())
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private execute(): QueryResult {
    const context: QueryContext = {
      table: this.table,
      action: this.action,
      payload: this.payload,
      filters: [...this.filters],
    }
    this.tracker.queries.push(context)
    return this.resolve(context)
  }
}

function createMockSupabase(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  return {
    from(table: string) {
      return new SupabaseQueryBuilder(table, resolve, tracker)
    },
  }
}

function loadSaleActionsWithMocks(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const proPath = require.resolve('../../lib/billing/require-pro.ts')
  const supabasePath = require.resolve('../../lib/supabase/server.ts')
  const cachePath = require.resolve('next/cache')
  const auditPath = require.resolve('../../lib/commerce/pos-audit-log.ts')
  const actionsPath = require.resolve('../../lib/commerce/sale-actions.ts')

  require(authPath)
  require(proPath)
  require(supabasePath)
  require(cachePath)
  require(auditPath)

  const originalAuth = require.cache[authPath]!.exports
  const originalPro = require.cache[proPath]!.exports
  const originalSupabase = require.cache[supabasePath]!.exports
  const originalCache = require.cache[cachePath]!.exports
  const originalAudit = require.cache[auditPath]!.exports

  const supabase = createMockSupabase(resolve, tracker)

  require.cache[authPath]!.exports = {
    requireChef: async () => ({
      tenantId: 'tenant-1',
      id: 'auth-user-1',
      email: 'chef@example.com',
    }),
  }
  require.cache[proPath]!.exports = { requirePro: async () => undefined }
  require.cache[supabasePath]!.exports = { createServerClient: () => supabase }
  require.cache[cachePath]!.exports = { revalidatePath: () => undefined }
  require.cache[auditPath]!.exports = { appendPosAuditLog: async () => undefined }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuth
    require.cache[proPath]!.exports = originalPro
    require.cache[supabasePath]!.exports = originalSupabase
    require.cache[cachePath]!.exports = originalCache
    require.cache[auditPath]!.exports = originalAudit
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('createSale blocks when POS role matrix is enabled and actor lacks cashier access', async () => {
  const tracker: Tracker = { queries: [] }
  const previousRoleMatrix = process.env.POS_ENFORCE_ROLE_MATRIX
  process.env.POS_ENFORCE_ROLE_MATRIX = 'true'

  const { actions, restore } = loadSaleActionsWithMocks((ctx) => {
    if (ctx.table === 'chef_team_members' && ctx.action === 'select') {
      return { data: { role: 'guest' }, error: null }
    }
    throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
  }, tracker)

  try {
    await assert.rejects(
      async () =>
        actions.createSale({
          channel: 'counter',
        }),
      /Cashier role required/i
    )

    const salesInsert = tracker.queries.find(
      (query) => query.table === 'sales' && query.action === 'insert'
    )
    assert.equal(salesInsert, undefined)
  } finally {
    if (previousRoleMatrix == null) {
      delete process.env.POS_ENFORCE_ROLE_MATRIX
    } else {
      process.env.POS_ENFORCE_ROLE_MATRIX = previousRoleMatrix
    }
    restore()
  }
})
