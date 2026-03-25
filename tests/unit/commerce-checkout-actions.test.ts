import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { buildCheckoutPaymentIdempotencyKey } from '@/lib/commerce/checkout-idempotency'

const require = createRequire(import.meta.url)

describe('buildCheckoutPaymentIdempotencyKey', () => {
  it('prefixes key with tenant id and preserves safe key characters', () => {
    const key = buildCheckoutPaymentIdempotencyKey('tenant_123', 'cash_checkout:abc-123')
    assert.equal(key, 'checkout_tenant_123_cash_checkout:abc-123')
  })

  it('strips unsupported characters from request key', () => {
    const key = buildCheckoutPaymentIdempotencyKey('tenant_123', 'ab c$%^&*()+=[]{}<>?/|\\')
    assert.equal(key, 'checkout_tenant_123_abc')
  })

  it('generates a fallback key when request key is empty', () => {
    const key = buildCheckoutPaymentIdempotencyKey('tenant_123', '')
    assert.match(key, /^checkout_tenant_123_[A-Za-z0-9:_-]+$/)
  })
})

type QueryAction = 'select' | 'insert' | 'update'

type QueryFilter = {
  op: 'eq' | 'in'
  column: string
  value: unknown
}

type QueryContext = {
  table: string
  action: QueryAction
  selectColumns: string | null
  payload: unknown
  filters: QueryFilter[]
}

type QueryResult = {
  data: any
  error: { message: string; code?: string } | null
  count?: number | null
}

type Tracker = {
  queries: QueryContext[]
  revalidatePaths: string[]
  auditCalls: any[]
}

class DbQueryBuilder implements PromiseLike<QueryResult> {
  private readonly table: string
  private readonly resolve: (ctx: QueryContext) => QueryResult
  private readonly tracker: Tracker
  private action: QueryAction = 'select'
  private selectColumns: string | null = null
  private payload: unknown = null
  private filters: QueryFilter[] = []

  constructor(table: string, resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
    this.table = table
    this.resolve = resolve
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

  order() {
    return this
  }

  limit() {
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
    }
    this.tracker.queries.push(context)
    return this.resolve(context)
  }
}

function createMockDb(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  return {
    from(table: string) {
      return new DbQueryBuilder(table, resolve, tracker)
    },
  }
}

function loadCheckoutActionsWithMocks(input: {
  resolve: (ctx: QueryContext) => QueryResult
  tracker: Tracker
  appendPosAuditLogImpl?: (payload: unknown) => Promise<void> | void
}) {
  const react = require('react')
  react.cache = react.cache || ((fn: unknown) => fn)

  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const proPath = require.resolve('../../lib/billing/require-pro.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const auditPath = require.resolve('../../lib/commerce/pos-audit-log.ts')
  const inventoryBridgePath = require.resolve('../../lib/commerce/inventory-bridge.ts')
  const cachePath = require.resolve('next/cache')
  const actionsPath = require.resolve('../../lib/commerce/checkout-actions.ts')

  require(authPath)
  require(proPath)
  require(dbPath)
  require(auditPath)
  require(inventoryBridgePath)
  require(cachePath)

  const originalAuth = require.cache[authPath]!.exports
  const originalPro = require.cache[proPath]!.exports
  const originalDb = require.cache[dbPath]!.exports
  const originalAudit = require.cache[auditPath]!.exports
  const originalInventoryBridge = require.cache[inventoryBridgePath]!.exports
  const originalCache = require.cache[cachePath]!.exports

  const db = createMockDb(input.resolve, input.tracker)

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
    appendPosAuditLog: async (payload: unknown) => {
      input.tracker.auditCalls.push(payload)
      if (input.appendPosAuditLogImpl) {
        await input.appendPosAuditLogImpl(payload)
      }
    },
  }
  require.cache[inventoryBridgePath]!.exports = {
    executeSaleDeduction: async () => undefined,
    deductProductStock: async () => undefined,
  }
  require.cache[cachePath]!.exports = {
    revalidatePath: (path: string) => {
      input.tracker.revalidatePaths.push(path)
    },
  }

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    require.cache[authPath]!.exports = originalAuth
    require.cache[proPath]!.exports = originalPro
    require.cache[dbPath]!.exports = originalDb
    require.cache[auditPath]!.exports = originalAudit
    require.cache[inventoryBridgePath]!.exports = originalInventoryBridge
    require.cache[cachePath]!.exports = originalCache
    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

function getFilter(ctx: QueryContext, op: QueryFilter['op'], column: string) {
  return ctx.filters.find((filter) => filter.op === op && filter.column === column)
}

test('counterCheckout voids sale when register closes during checkout', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  let registerChecks = 0
  const { actions, restore } = loadCheckoutActionsWithMocks({
    tracker,
    resolve: (ctx) => {
      if (
        ctx.table === 'commerce_payments' &&
        ctx.action === 'select' &&
        getFilter(ctx, 'eq', 'idempotency_key')
      ) {
        return { data: null, error: null }
      }
      if (ctx.table === 'register_sessions' && ctx.action === 'select') {
        registerChecks += 1
        return {
          data:
            registerChecks === 1
              ? { id: 'rs-1', status: 'open' }
              : { id: 'rs-1', status: 'closed' },
          error: null,
        }
      }
      if (ctx.table === 'sales' && ctx.action === 'insert') {
        return { data: { id: 'sale-1', sale_number: 'SALE-1' }, error: null }
      }
      if (ctx.table === 'sale_items' && ctx.action === 'insert') {
        return { data: [{ id: 'item-1' }], error: null }
      }
      if (ctx.table === 'sales' && ctx.action === 'update') {
        return { data: { id: 'sale-1' }, error: null }
      }
      if (ctx.table === 'commerce_payments' && ctx.action === 'insert') {
        throw new Error('payment should not be inserted when register is closed')
      }
      throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
    },
  })

  try {
    await assert.rejects(
      async () =>
        actions.counterCheckout({
          registerSessionId: 'rs-1',
          items: [
            {
              name: 'Coffee',
              unitPriceCents: 300,
              quantity: 1,
              taxClass: 'exempt',
            },
          ],
          paymentMethod: 'cash',
          amountTenderedCents: 300,
          idempotencyKey: 'checkout-1',
        }),
      /Register session is no longer open/i
    )

    const failedUpdate = tracker.queries.find(
      (query) =>
        query.table === 'sales' &&
        query.action === 'update' &&
        (query.payload as any)?.void_reason === 'checkout_failed'
    )
    assert.ok(failedUpdate)

    const paymentInserts = tracker.queries.filter(
      (query) => query.table === 'commerce_payments' && query.action === 'insert'
    )
    assert.equal(paymentInserts.length, 0)
  } finally {
    restore()
  }
})

test('counterCheckout enforces cashier role when POS role matrix is enabled', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const previousRoleMatrix = process.env.POS_ENFORCE_ROLE_MATRIX
  process.env.POS_ENFORCE_ROLE_MATRIX = 'true'

  const { actions, restore } = loadCheckoutActionsWithMocks({
    tracker,
    resolve: (ctx) => {
      if (ctx.table === 'chef_team_members' && ctx.action === 'select') {
        return { data: { role: 'guest' }, error: null }
      }
      throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
    },
  })

  try {
    await assert.rejects(
      async () =>
        actions.counterCheckout({
          items: [
            {
              name: 'Cookie',
              unitPriceCents: 200,
              quantity: 1,
              taxClass: 'exempt',
            },
          ],
          paymentMethod: 'cash',
          amountTenderedCents: 200,
          idempotencyKey: 'checkout-role-gate',
        }),
      /Cashier role required/i
    )

    const saleInserts = tracker.queries.filter(
      (query) => query.table === 'sales' && query.action === 'insert'
    )
    assert.equal(saleInserts.length, 0)
  } finally {
    if (previousRoleMatrix == null) {
      delete process.env.POS_ENFORCE_ROLE_MATRIX
    } else {
      process.env.POS_ENFORCE_ROLE_MATRIX = previousRoleMatrix
    }
    restore()
  }
})

test('counterCheckout voids sale when cash tendered is below total due', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadCheckoutActionsWithMocks({
    tracker,
    resolve: (ctx) => {
      if (
        ctx.table === 'commerce_payments' &&
        ctx.action === 'select' &&
        getFilter(ctx, 'eq', 'idempotency_key')
      ) {
        return { data: null, error: null }
      }
      if (ctx.table === 'sales' && ctx.action === 'insert') {
        return { data: { id: 'sale-2', sale_number: 'SALE-2' }, error: null }
      }
      if (ctx.table === 'sale_items' && ctx.action === 'insert') {
        return { data: [{ id: 'item-2' }], error: null }
      }
      if (ctx.table === 'sales' && ctx.action === 'update') {
        return { data: { id: 'sale-2' }, error: null }
      }
      if (ctx.table === 'commerce_payments' && ctx.action === 'insert') {
        throw new Error('payment should not be inserted when cash is insufficient')
      }
      throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
    },
  })

  try {
    await assert.rejects(
      async () =>
        actions.counterCheckout({
          items: [
            {
              name: 'Sandwich',
              unitPriceCents: 800,
              quantity: 1,
              taxClass: 'exempt',
            },
          ],
          paymentMethod: 'cash',
          amountTenderedCents: 200,
          idempotencyKey: 'checkout-2',
        }),
      /Amount tendered is less than total due/i
    )

    const failedUpdate = tracker.queries.find(
      (query) =>
        query.table === 'sales' &&
        query.action === 'update' &&
        (query.payload as any)?.void_reason === 'checkout_failed'
    )
    assert.ok(failedUpdate)

    const paymentInserts = tracker.queries.filter(
      (query) => query.table === 'commerce_payments' && query.action === 'insert'
    )
    assert.equal(paymentInserts.length, 0)
  } finally {
    restore()
  }
})

test('counterCheckout requires age verification for restricted items', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadCheckoutActionsWithMocks({
    tracker,
    resolve: (ctx) => {
      if (
        ctx.table === 'commerce_payments' &&
        ctx.action === 'select' &&
        getFilter(ctx, 'eq', 'idempotency_key')
      ) {
        return { data: null, error: null }
      }
      throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
    },
  })

  try {
    await assert.rejects(
      async () =>
        actions.counterCheckout({
          items: [
            {
              name: 'Beer',
              unitPriceCents: 700,
              quantity: 1,
              taxClass: 'alcohol',
            },
          ],
          paymentMethod: 'cash',
          amountTenderedCents: 700,
          idempotencyKey: 'checkout-age-1',
        }),
      /Age verification is required/i
    )

    const saleInserts = tracker.queries.filter(
      (query) => query.table === 'sales' && query.action === 'insert'
    )
    assert.equal(saleInserts.length, 0)
  } finally {
    restore()
  }
})

test('counterCheckout applies promotion code discount to line items and sale totals', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadCheckoutActionsWithMocks({
    tracker,
    resolve: (ctx) => {
      if (
        ctx.table === 'commerce_payments' &&
        ctx.action === 'select' &&
        getFilter(ctx, 'eq', 'idempotency_key')
      ) {
        return { data: null, error: null }
      }
      if (ctx.table === 'commerce_promotions' && ctx.action === 'select') {
        return {
          data: {
            id: 'promo-1',
            code: 'SAVE10',
            name: 'Save 10%',
            discount_type: 'percent_order',
            discount_percent: 10,
            discount_cents: null,
            min_subtotal_cents: 0,
            max_discount_cents: null,
            target_tax_classes: [],
            is_active: true,
            starts_at: null,
            ends_at: null,
          },
          error: null,
        }
      }
      if (ctx.table === 'sales' && ctx.action === 'insert') {
        return { data: { id: 'sale-promo-1', sale_number: 'SALE-PROMO-1' }, error: null }
      }
      if (ctx.table === 'sale_items' && ctx.action === 'insert') {
        return { data: [{ id: 'item-promo-1' }], error: null }
      }
      if (ctx.table === 'sale_applied_promotions' && ctx.action === 'insert') {
        return { data: [{ id: 'applied-promo-1' }], error: null }
      }
      if (ctx.table === 'sales' && ctx.action === 'update') {
        return { data: { id: 'sale-promo-1' }, error: null }
      }
      if (ctx.table === 'commerce_payments' && ctx.action === 'insert') {
        return { data: { id: 'pay-promo-1' }, error: null }
      }
      throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
    },
  })

  try {
    const result = await actions.counterCheckout({
      items: [
        {
          name: 'Sandwich',
          unitPriceCents: 1000,
          quantity: 1,
          taxClass: 'exempt',
        },
      ],
      paymentMethod: 'cash',
      amountTenderedCents: 900,
      promotionCode: 'SAVE10',
      idempotencyKey: 'checkout-promo-1',
    })

    assert.equal(result.paymentId, 'pay-promo-1')
    assert.equal(result.totalCents, 900)
    assert.equal(result.appliedPromotion?.code, 'SAVE10')
    assert.equal(result.appliedPromotion?.discountCents, 100)

    const saleItemsInsert = tracker.queries.find(
      (query) => query.table === 'sale_items' && query.action === 'insert'
    )
    assert.ok(saleItemsInsert)
    const insertedRows = saleItemsInsert?.payload as any[]
    assert.equal(insertedRows[0].discount_cents, 100)
    assert.equal(insertedRows[0].line_total_cents, 900)

    const totalsUpdate = tracker.queries.find(
      (query) =>
        query.table === 'sales' &&
        query.action === 'update' &&
        typeof (query.payload as any)?.subtotal_cents === 'number'
    )
    assert.ok(totalsUpdate)
    assert.equal((totalsUpdate!.payload as any).subtotal_cents, 1000)
    assert.equal((totalsUpdate!.payload as any).discount_cents, 100)
    assert.equal((totalsUpdate!.payload as any).total_cents, 900)
  } finally {
    restore()
  }
})

test('counterCheckout returns success even when register sync and audit logging fail', async () => {
  const tracker: Tracker = { queries: [], revalidatePaths: [], auditCalls: [] }
  const { actions, restore } = loadCheckoutActionsWithMocks({
    tracker,
    appendPosAuditLogImpl: () => {
      throw new Error('audit unavailable')
    },
    resolve: (ctx) => {
      if (
        ctx.table === 'commerce_payments' &&
        ctx.action === 'select' &&
        getFilter(ctx, 'eq', 'idempotency_key')
      ) {
        return { data: null, error: null }
      }
      if (ctx.table === 'register_sessions' && ctx.action === 'select') {
        return { data: { id: 'rs-2', status: 'open' }, error: null }
      }
      if (ctx.table === 'sales' && ctx.action === 'insert') {
        return { data: { id: 'sale-3', sale_number: 'SALE-3' }, error: null }
      }
      if (ctx.table === 'sale_items' && ctx.action === 'insert') {
        return { data: [{ id: 'item-3' }], error: null }
      }
      if (ctx.table === 'sales' && ctx.action === 'select') {
        return { data: [{ id: 'sale-3', status: 'captured' }], error: null }
      }
      if (ctx.table === 'commerce_payments' && ctx.action === 'insert') {
        return { data: { id: 'pay-3' }, error: null }
      }
      if (
        ctx.table === 'commerce_payments' &&
        ctx.action === 'select' &&
        getFilter(ctx, 'in', 'sale_id')
      ) {
        return {
          data: [{ sale_id: 'sale-3', amount_cents: 550, tip_cents: 0, status: 'captured' }],
          error: null,
        }
      }
      if (ctx.table === 'sales' && ctx.action === 'update') {
        return { data: { id: 'sale-3' }, error: null }
      }
      if (ctx.table === 'cash_drawer_movements' && ctx.action === 'insert') {
        return { data: { id: 'drawer-move-1' }, error: null }
      }
      if (ctx.table === 'register_sessions' && ctx.action === 'update') {
        throw new Error('sync unavailable')
      }
      throw new Error(`Unexpected query: ${ctx.table} ${ctx.action}`)
    },
  })

  try {
    const result = await actions.counterCheckout({
      registerSessionId: 'rs-2',
      items: [
        {
          name: 'Muffin',
          unitPriceCents: 550,
          quantity: 1,
          taxClass: 'exempt',
        },
      ],
      paymentMethod: 'cash',
      amountTenderedCents: 550,
      idempotencyKey: 'checkout-3',
    })

    assert.equal(result.saleId, 'sale-3')
    assert.equal(result.paymentId, 'pay-3')

    const drawerMovementInsert = tracker.queries.find(
      (query) => query.table === 'cash_drawer_movements' && query.action === 'insert'
    )
    assert.ok(drawerMovementInsert)
    assert.equal((drawerMovementInsert!.payload as any).movement_type, 'sale_payment')
    assert.equal((drawerMovementInsert!.payload as any).amount_cents, 550)
    assert.equal((drawerMovementInsert!.payload as any).register_session_id, 'rs-2')

    assert.deepEqual(tracker.revalidatePaths, ['/commerce'])
  } finally {
    restore()
  }
})
