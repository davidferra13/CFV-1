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

function loadRefundActionsWithMocks(
  resolve: (ctx: QueryContext) => QueryResult,
  tracker: Tracker
) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const proPath = require.resolve('../../lib/billing/require-pro.ts')
  const supabasePath = require.resolve('../../lib/supabase/server.ts')
  const cachePath = require.resolve('next/cache')
  const auditPath = require.resolve('../../lib/commerce/pos-audit-log.ts')
  const actionsPath = require.resolve('../../lib/commerce/refund-actions.ts')

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

test('createRefund blocks when manager approval is required and actor is not manager', async () => {
  const tracker: Tracker = { queries: [] }
  const previousManagerApproval = process.env.POS_ENFORCE_MANAGER_APPROVAL
  process.env.POS_ENFORCE_MANAGER_APPROVAL = 'true'

  const { actions, restore } = loadRefundActionsWithMocks((ctx) => {
    if (ctx.table === 'chef_team_members' && ctx.action === 'select') {
      return { data: { role: 'cashier' }, error: null }
    }
    throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
  }, tracker)

  try {
    await assert.rejects(
      async () =>
        actions.createRefund({
          paymentId: 'pay-1',
          saleId: 'sale-1',
          amountCents: 500,
          reason: 'Customer requested cancellation',
          idempotencyKey: 'refund-manager-gate-1',
        }),
      /Manager role required/i
    )

    const refundInsert = tracker.queries.find(
      (query) => query.table === 'commerce_refunds' && query.action === 'insert'
    )
    assert.equal(refundInsert, undefined)
  } finally {
    if (previousManagerApproval == null) {
      delete process.env.POS_ENFORCE_MANAGER_APPROVAL
    } else {
      process.env.POS_ENFORCE_MANAGER_APPROVAL = previousManagerApproval
    }
    restore()
  }
})

test('createRefund enforces reason validation before querying payment state', async () => {
  const tracker: Tracker = { queries: [] }
  const previousManagerApproval = process.env.POS_ENFORCE_MANAGER_APPROVAL
  const previousRoleMatrix = process.env.POS_ENFORCE_ROLE_MATRIX
  process.env.POS_ENFORCE_MANAGER_APPROVAL = 'false'
  process.env.POS_ENFORCE_ROLE_MATRIX = 'false'

  const { actions, restore } = loadRefundActionsWithMocks(() => {
    throw new Error('No query should run when reason validation fails')
  }, tracker)

  try {
    await assert.rejects(
      async () =>
        actions.createRefund({
          paymentId: 'pay-1',
          saleId: 'sale-1',
          amountCents: 500,
          reason: '  ',
          idempotencyKey: 'refund-reason-required-1',
        }),
      /Refund reason is required/i
    )

    await assert.rejects(
      async () =>
        actions.createRefund({
          paymentId: 'pay-1',
          saleId: 'sale-1',
          amountCents: 500,
          reason: 'ok',
          idempotencyKey: 'refund-reason-too-short-1',
        }),
      /Refund reason must be at least/i
    )

    assert.equal(tracker.queries.length, 0)
  } finally {
    if (previousManagerApproval == null) {
      delete process.env.POS_ENFORCE_MANAGER_APPROVAL
    } else {
      process.env.POS_ENFORCE_MANAGER_APPROVAL = previousManagerApproval
    }
    if (previousRoleMatrix == null) {
      delete process.env.POS_ENFORCE_ROLE_MATRIX
    } else {
      process.env.POS_ENFORCE_ROLE_MATRIX = previousRoleMatrix
    }
    restore()
  }
})
