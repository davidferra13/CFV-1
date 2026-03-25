import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type QueryAction = 'select' | 'insert' | 'update'

type QueryFilter = {
  op: 'eq' | 'in' | 'neq'
  column: string
  value: unknown
}

type QueryContext = {
  table: string
  action: QueryAction
  selectColumns: string | null
  payload: unknown
  filters: QueryFilter[]
  limit: number | null
}

type QueryResult = {
  data: any
  error: { message: string; code?: string } | null
  count?: number | null
}

type MockConfig = {
  resolve: (ctx: QueryContext) => QueryResult
}

type Tracker = {
  queries: QueryContext[]
  revalidatePaths: string[]
  auditCalls: any[]
}

class DbQueryBuilder implements PromiseLike<QueryResult> {
  private readonly table: string
  private readonly config: MockConfig
  private readonly tracker: Tracker
  private action: QueryAction = 'select'
  private selectColumns: string | null = null
  private payload: unknown = null
  private filters: QueryFilter[] = []
  private limitValue: number | null = null

  constructor(table: string, config: MockConfig, tracker: Tracker) {
    this.table = table
    this.config = config
    this.tracker = tracker
  }

  select(columns?: string) {
    this.selectColumns = columns ?? null
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

  in(column: string, value: unknown) {
    this.filters.push({ op: 'in', column, value })
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push({ op: 'neq', column, value })
    return this
  }

  limit(value: number) {
    this.limitValue = value
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
      selectColumns: this.selectColumns,
      payload: this.payload,
      filters: [...this.filters],
      limit: this.limitValue,
    }
    this.tracker.queries.push(context)
    return this.config.resolve(context)
  }
}

function createMockDb(config: MockConfig, tracker: Tracker) {
  return {
    from(table: string) {
      return new DbQueryBuilder(table, config, tracker)
    },
  }
}

function loadRegisterActionsWithMocks(config: MockConfig, tracker: Tracker) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const proPath = require.resolve('../../lib/billing/require-pro.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const auditPath = require.resolve('../../lib/commerce/pos-audit-log.ts')
  const cachePath = require.resolve('next/cache')
  const actionsPath = require.resolve('../../lib/commerce/register-actions.ts')

  require(authPath)
  require(proPath)
  require(dbPath)
  require(auditPath)
  require(cachePath)

  const originalAuth = require.cache[authPath]!.exports
  const originalPro = require.cache[proPath]!.exports
  const originalDb = require.cache[dbPath]!.exports
  const originalAudit = require.cache[auditPath]!.exports
  const originalCache = require.cache[cachePath]!.exports

  const db = createMockDb(config, tracker)

  require.cache[authPath]!.exports = {
    requireChef: async () => ({ tenantId: 'tenant-1', id: 'auth-user-1' }),
  }
  require.cache[proPath]!.exports = {
    requirePro: async () => undefined,
  }
  require.cache[dbPath]!.exports = {
    createServerClient: () => db,
  }
  require.cache[auditPath]!.exports = {
    appendPosAuditLog: async (input: unknown) => {
      tracker.auditCalls.push(input)
    },
  }
  require.cache[cachePath]!.exports = {
    revalidatePath: (path: string) => {
      tracker.revalidatePaths.push(path)
    },
  }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuth
    require.cache[proPath]!.exports = originalPro
    require.cache[dbPath]!.exports = originalDb
    require.cache[auditPath]!.exports = originalAudit
    require.cache[cachePath]!.exports = originalCache
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

function getFilter(ctx: QueryContext, op: QueryFilter['op'], column: string) {
  return ctx.filters.find((filter) => filter.op === op && filter.column === column)
}

test('openRegister rejects when another active session exists', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'in', 'status')
        ) {
          return { data: [{ id: 'rs-active', status: 'suspended' }], error: null }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(
      async () => actions.openRegister({ openingCashCents: 500 }),
      /already active/i
    )
    assert.equal(tracker.auditCalls.length, 0)
  } finally {
    restore()
  }
})

test('openRegister enforces lead role when POS role matrix is enabled', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const previousRoleMatrix = process.env.POS_ENFORCE_ROLE_MATRIX
  process.env.POS_ENFORCE_ROLE_MATRIX = 'true'

  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (ctx.table === 'chef_team_members' && ctx.action === 'select') {
          return { data: { role: 'cashier' }, error: null }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(
      async () => actions.openRegister({ openingCashCents: 500 }),
      /Lead role required/i
    )
    const insertCalls = tracker.queries.filter(
      (query) => query.table === 'register_sessions' && query.action === 'insert'
    )
    assert.equal(insertCalls.length, 0)
  } finally {
    if (previousRoleMatrix == null) {
      delete process.env.POS_ENFORCE_ROLE_MATRIX
    } else {
      process.env.POS_ENFORCE_ROLE_MATRIX = previousRoleMatrix
    }
    restore()
  }
})

test('openRegister allows lead role when POS role matrix is enabled', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const previousRoleMatrix = process.env.POS_ENFORCE_ROLE_MATRIX
  process.env.POS_ENFORCE_ROLE_MATRIX = 'true'

  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (ctx.table === 'chef_team_members' && ctx.action === 'select') {
          return { data: { role: 'shift_lead' }, error: null }
        }
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'in', 'status')
        ) {
          return { data: [], error: null }
        }
        if (ctx.table === 'register_sessions' && ctx.action === 'insert') {
          return {
            data: {
              id: 'session-lead',
              session_name: null,
              opened_at: '2026-03-04T10:00:00.000Z',
            },
            error: null,
          }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    const result = await actions.openRegister({ openingCashCents: 500 })
    assert.equal(result.id, 'session-lead')
    assert.equal(tracker.auditCalls.length, 1)
  } finally {
    if (previousRoleMatrix == null) {
      delete process.env.POS_ENFORCE_ROLE_MATRIX
    } else {
      process.env.POS_ENFORCE_ROLE_MATRIX = previousRoleMatrix
    }
    restore()
  }
})

test('openRegister maps unique-index race to active-session message', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'in', 'status')
        ) {
          return { data: [], error: null }
        }
        if (ctx.table === 'register_sessions' && ctx.action === 'insert') {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint', code: '23505' },
          }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(
      async () => actions.openRegister({ openingCashCents: 500 }),
      /already active/i
    )
  } finally {
    restore()
  }
})

test('resumeRegister rejects when another open session exists', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'eq', 'status')?.value === 'open' &&
          getFilter(ctx, 'neq', 'id')
        ) {
          return { data: { id: 'other-open' }, error: null }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(async () => actions.resumeRegister('target-session'), /already open/i)
    const updateCalls = tracker.queries.filter(
      (query) => query.table === 'register_sessions' && query.action === 'update'
    )
    assert.equal(updateCalls.length, 0)
  } finally {
    restore()
  }
})

test('resumeRegister maps unique-index race to open-session message', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'eq', 'status')?.value === 'open' &&
          getFilter(ctx, 'neq', 'id')
        ) {
          return { data: null, error: null }
        }
        if (ctx.table === 'register_sessions' && ctx.action === 'update') {
          return {
            data: null,
            error: { message: 'duplicate key value violates unique constraint', code: '23505' },
          }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(async () => actions.resumeRegister('target-session'), /already open/i)
  } finally {
    restore()
  }
})

test('suspendRegister rejects when target session is not open', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (ctx.table === 'register_sessions' && ctx.action === 'update') {
          return { data: null, error: null }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(async () => actions.suspendRegister('session-1'), /not open/i)
    assert.equal(tracker.auditCalls.length, 0)
  } finally {
    restore()
  }
})

test('closeRegister requires a close note when variance exceeds threshold', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'eq', 'id')?.value === 'session-variance'
        ) {
          return {
            data: {
              opening_cash_cents: 0,
              total_revenue_cents: 0,
              total_tips_cents: 0,
              status: 'open',
            },
            error: null,
          }
        }
        if (ctx.table === 'sales' && ctx.action === 'select') {
          return { data: [], error: null }
        }
        if (ctx.table === 'cash_drawer_movements' && ctx.action === 'select') {
          return { data: [], error: null }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(
      async () => actions.closeRegister('session-variance', 1000),
      /Close note is required/i
    )

    const updateCalls = tracker.queries.filter(
      (query) => query.table === 'register_sessions' && query.action === 'update'
    )
    assert.equal(updateCalls.length, 0)
    assert.equal(tracker.auditCalls.length, 0)
  } finally {
    restore()
  }
})

test('closeRegister rejects when there are in-progress sales', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'eq', 'id')?.value === 'session-inflight'
        ) {
          return {
            data: {
              opening_cash_cents: 500,
              total_revenue_cents: 0,
              total_tips_cents: 0,
              status: 'open',
            },
            error: null,
          }
        }
        if (ctx.table === 'sales' && ctx.action === 'select') {
          return {
            data: [{ id: 'sale-pending-1', status: 'pending_payment' }],
            error: null,
          }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(
      async () => actions.closeRegister('session-inflight', 500, 'attempt close'),
      /still in progress/i
    )
    const updateCalls = tracker.queries.filter(
      (query) => query.table === 'register_sessions' && query.action === 'update'
    )
    assert.equal(updateCalls.length, 0)
    assert.equal(tracker.auditCalls.length, 0)
  } finally {
    restore()
  }
})

test('closeRegister rejects when session state changes before final update', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'eq', 'id')?.value === 'session-cas'
        ) {
          return {
            data: {
              opening_cash_cents: 1000,
              total_revenue_cents: 0,
              total_tips_cents: 0,
              status: 'open',
            },
            error: null,
          }
        }
        if (ctx.table === 'sales' && ctx.action === 'select') {
          return { data: [], error: null }
        }
        if (ctx.table === 'cash_drawer_movements' && ctx.action === 'select') {
          return { data: [], error: null }
        }
        if (ctx.table === 'register_sessions' && ctx.action === 'update') {
          return { data: null, error: null }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    await assert.rejects(
      async () => actions.closeRegister('session-cas', 1000, 'balanced close'),
      /state changed while closing/i
    )
    assert.equal(tracker.auditCalls.length, 0)
  } finally {
    restore()
  }
})

test('closeRegister succeeds even when reconciliation generation fails', async () => {
  const originalConsoleError = console.error
  console.error = () => {}
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadRegisterActionsWithMocks(
    {
      resolve: (ctx) => {
        if (
          ctx.table === 'register_sessions' &&
          ctx.action === 'select' &&
          getFilter(ctx, 'eq', 'id')?.value === 'session-success'
        ) {
          return {
            data: {
              opening_cash_cents: 1000,
              total_revenue_cents: 0,
              total_tips_cents: 0,
              status: 'open',
            },
            error: null,
          }
        }
        if (ctx.table === 'sales' && ctx.action === 'select') {
          return {
            data: [{ id: 'sale-1', status: 'captured' }],
            error: null,
          }
        }
        if (ctx.table === 'commerce_payments' && ctx.action === 'select') {
          return {
            data: [{ sale_id: 'sale-1', amount_cents: 1500, tip_cents: 200, status: 'captured' }],
            error: null,
          }
        }
        if (ctx.table === 'cash_drawer_movements' && ctx.action === 'select') {
          return {
            data: [{ amount_cents: 1000 }],
            error: null,
          }
        }
        if (ctx.table === 'register_sessions' && ctx.action === 'update') {
          return {
            data: { id: 'session-success' },
            error: null,
          }
        }
        throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
      },
    },
    tracker
  )

  try {
    const result = await actions.closeRegister('session-success', 2000, 'drawer count verified')
    assert.equal(result.expectedCash, 2000)
    assert.equal(result.variance, 0)
    assert.equal(result.totalSales, 1)
    assert.equal(result.totalRevenue, 1500)
    assert.equal(tracker.auditCalls.length, 1)
    assert.ok(tracker.revalidatePaths.includes('/commerce'))
  } finally {
    console.error = originalConsoleError
    restore()
  }
})
