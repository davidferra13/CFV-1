import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)

const eventId = '11111111-1111-1111-1111-111111111111'

type QueryFilter = {
  op: 'eq' | 'gte' | 'lte' | 'in' | 'not'
  column: string
  value: unknown
}

type QueryContext = {
  table: string
  selection: string | null
  filters: QueryFilter[]
}

type QueryResult = {
  data: any
  error: { message: string } | null
}

type Tracker = {
  queries: QueryContext[]
}

class QueryBuilder implements PromiseLike<QueryResult> {
  private selection: string | null = null
  private filters: QueryFilter[] = []

  constructor(
    private readonly table: string,
    private readonly resolve: (ctx: QueryContext) => QueryResult,
    private readonly tracker: Tracker
  ) {}

  select(selection?: string) {
    this.selection = selection ?? null
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push({ op: 'gte', column, value })
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push({ op: 'lte', column, value })
    return this
  }

  in(column: string, value: unknown) {
    this.filters.push({ op: 'in', column, value })
    return this
  }

  not(column: string, _operator: string, value: unknown) {
    this.filters.push({ op: 'not', column, value })
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
    const ctx = {
      table: this.table,
      selection: this.selection,
      filters: [...this.filters],
    }
    this.tracker.queries.push(ctx)
    return this.resolve(ctx)
  }
}

function getEq(ctx: QueryContext, column: string) {
  return ctx.filters.find((filter) => filter.op === 'eq' && filter.column === column)?.value
}

function createMockDb(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  return {
    from(table: string) {
      return new QueryBuilder(table, resolve, tracker)
    },
  }
}

function makeResolver(options: {
  foodCostBudgetCents: number | null
  quotedPriceCents: number | null
  targetMarginPercent?: number
}) {
  return (ctx: QueryContext): QueryResult => {
    switch (ctx.table) {
      case 'events':
        return {
          data: [
            {
              id: eventId,
              event_date: '2026-05-01',
              guest_count: 1,
              service_style: 'custom',
              client_id: null,
              quoted_price_cents: options.quotedPriceCents,
              food_cost_budget_cents: options.foodCostBudgetCents,
            },
          ],
          error: null,
        }
      case 'chef_preferences':
        return {
          data: { target_margin_percent: options.targetMarginPercent ?? 70 },
          error: null,
        }
      case 'menus':
        return { data: [{ id: 'menu-1', event_id: eventId }], error: null }
      case 'dishes':
        return { data: [{ id: 'dish-1', menu_id: 'menu-1' }], error: null }
      case 'components':
        return {
          data: [{ recipe_id: 'recipe-1', scale_factor: 1, dish_id: 'dish-1' }],
          error: null,
        }
      case 'recipes':
        return { data: [{ id: 'recipe-1', servings: 1 }], error: null }
      case 'recipe_sub_recipes':
        return { data: [], error: null }
      case 'recipe_ingredients':
        return {
          data: [
            {
              recipe_id: 'recipe-1',
              ingredient_id: 'ingredient-1',
              quantity: 2,
              unit: 'each',
              yield_pct: 100,
            },
          ],
          error: null,
        }
      case 'ingredients':
        return {
          data: [
            {
              id: 'ingredient-1',
              name: 'Truffles',
              category: 'Produce',
              last_price_cents: 1000,
              last_price_store: 'Market',
              last_price_source: 'manual',
              preferred_vendor: null,
              default_yield_pct: 100,
              allergen_flags: [],
            },
          ],
          error: null,
        }
      case 'inventory_transactions':
      case 'vendor_items':
      case 'vendors':
        return { data: [], error: null }
      default:
        throw new Error(`Unexpected query table: ${ctx.table}`)
    }
  }
}

function loadShoppingListActions(resolve: (ctx: QueryContext) => QueryResult, tracker: Tracker) {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const purchaseOrderPath = require.resolve('../../lib/inventory/purchase-order-actions.ts')
  const actionsPath = require.resolve('../../lib/culinary/shopping-list-actions.ts')

  const originalAuth = require.cache[authPath] ?? null
  const originalDb = require.cache[dbPath] ?? null
  const originalPurchaseOrder = require.cache[purchaseOrderPath] ?? null

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      requireChef: async () => ({ id: 'user-1', tenantId: 'tenant-1', entityId: 'tenant-1' }),
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

  require.cache[purchaseOrderPath] = {
    id: purchaseOrderPath,
    filename: purchaseOrderPath,
    loaded: true,
    exports: {
      createPurchaseOrder: async () => ({ id: 'po-1' }),
      addPOItem: async () => ({ id: 'po-item-1' }),
    },
  } as any

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    if (originalAuth) require.cache[authPath] = originalAuth
    else delete require.cache[authPath]

    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    if (originalPurchaseOrder) require.cache[purchaseOrderPath] = originalPurchaseOrder
    else delete require.cache[purchaseOrderPath]

    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('generateShoppingList flags estimated spend over a manual food-cost budget', async () => {
  const tracker: Tracker = { queries: [] }
  const { actions, restore } = loadShoppingListActions(
    makeResolver({ foodCostBudgetCents: 1000, quotedPriceCents: 10000 }),
    tracker
  )

  try {
    const result = await actions.generateShoppingList({
      startDate: '2026-05-01',
      endDate: '2026-05-02',
    })

    assert.equal(result.totalEstimatedCostCents, 2060)
    assert.deepEqual(result.budgetGuardrail, {
      budgetCents: 1000,
      estimatedSpendCents: 2060,
      varianceCents: 1060,
      isOverBudget: true,
      source: 'manual',
      eventsCompared: 1,
      totalQuotedPriceCents: 10000,
      targetMarginPercent: null,
    })

    const eventsQuery = tracker.queries.find((query) => query.table === 'events')
    assert.ok(eventsQuery?.selection?.includes('food_cost_budget_cents'))
    assert.ok(eventsQuery?.selection?.includes('quoted_price_cents'))
    assert.equal(
      tracker.queries.some((query) => query.table === 'chef_preferences'),
      false
    )
  } finally {
    restore()
  }
})

test('generateShoppingList derives the budget from quoted price and target margin', async () => {
  const tracker: Tracker = { queries: [] }
  const { actions, restore } = loadShoppingListActions(
    makeResolver({
      foodCostBudgetCents: null,
      quotedPriceCents: 10000,
      targetMarginPercent: 70,
    }),
    tracker
  )

  try {
    const result = await actions.generateShoppingList({
      startDate: '2026-05-01',
      endDate: '2026-05-02',
    })

    assert.equal(result.totalEstimatedCostCents, 2060)
    assert.deepEqual(result.budgetGuardrail, {
      budgetCents: 3000,
      estimatedSpendCents: 2060,
      varianceCents: -940,
      isOverBudget: false,
      source: 'formula',
      eventsCompared: 1,
      totalQuotedPriceCents: 10000,
      targetMarginPercent: 70,
    })

    const prefsQuery = tracker.queries.find((query) => query.table === 'chef_preferences')
    assert.equal(getEq(prefsQuery!, 'tenant_id'), 'tenant-1')
  } finally {
    restore()
  }
})
