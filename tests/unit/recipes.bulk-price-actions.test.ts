import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { afterEach, test } from 'node:test'

const require = createRequire(import.meta.url)

const ACTION_PATH = require.resolve('../../lib/recipes/bulk-price-actions.ts')
const GET_USER_PATH = require.resolve('../../lib/auth/get-user.ts')
const DB_SERVER_PATH = require.resolve('../../lib/db/server.ts')
const COST_REFRESH_PATH = require.resolve('../../lib/pricing/cost-refresh-actions.ts')
const CACHE_PATH = require.resolve('next/cache')

type UpdateCall = {
  table: string
  payload: Record<string, unknown>
  selected: string | null
  filters: Array<[string, unknown]>
}

type HarnessOptions = {
  propagateImpl?: (ingredientIds: string[], options?: { tenantId?: string }) => Promise<void>
  updatedIngredientIds?: Set<string>
}

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

function createIngredientUpdateBuilder(
  calls: UpdateCall[],
  table: string,
  options: HarnessOptions
) {
  const call: UpdateCall = {
    table,
    payload: {},
    selected: null,
    filters: [],
  }

  const builder = {
    update(payload: Record<string, unknown>) {
      call.payload = payload
      calls.push(call)
      return builder
    },
    eq(column: string, value: unknown) {
      call.filters.push([column, value])
      return builder
    },
    select(columns: string) {
      call.selected = columns
      return builder
    },
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      const ingredientId = call.filters.find(([column]) => column === 'id')?.[1] as
        | string
        | undefined
      const updatedIds = options.updatedIngredientIds ?? new Set([ingredientId].filter(Boolean))
      const data = ingredientId && updatedIds.has(ingredientId) ? [{ id: ingredientId }] : []
      return Promise.resolve({ data, error: null }).then(resolve, reject)
    },
  }

  return builder
}

function loadBulkPriceActions(options: HarnessOptions = {}) {
  const calls = {
    updates: [] as UpdateCall[],
    propagated: [] as Array<{ ingredientIds: string[]; options?: { tenantId?: string } }>,
    revalidated: [] as string[],
    errors: [] as unknown[][],
  }

  const originals = {
    action: require.cache[ACTION_PATH],
    getUser: require.cache[GET_USER_PATH],
    dbServer: require.cache[DB_SERVER_PATH],
    costRefresh: require.cache[COST_REFRESH_PATH],
    cache: require.cache[CACHE_PATH],
  }
  const originalConsoleError = console.error

  require.cache[GET_USER_PATH] = {
    id: GET_USER_PATH,
    filename: GET_USER_PATH,
    loaded: true,
    exports: {
      requireChef: async () => ({ tenantId: 'tenant-1' }),
    },
  } as NodeJS.Module

  require.cache[DB_SERVER_PATH] = {
    id: DB_SERVER_PATH,
    filename: DB_SERVER_PATH,
    loaded: true,
    exports: {
      createServerClient: () => ({
        from(table: string) {
          assert.equal(table, 'ingredients')
          return createIngredientUpdateBuilder(calls.updates, table, options)
        },
      }),
    },
  } as NodeJS.Module

  require.cache[COST_REFRESH_PATH] = {
    id: COST_REFRESH_PATH,
    filename: COST_REFRESH_PATH,
    loaded: true,
    exports: {
      propagatePriceChange:
        options.propagateImpl ??
        (async (ingredientIds: string[], propagateOptions?: { tenantId?: string }) => {
          calls.propagated.push({ ingredientIds, options: propagateOptions })
        }),
    },
  } as NodeJS.Module

  require.cache[CACHE_PATH] = {
    id: CACHE_PATH,
    filename: CACHE_PATH,
    loaded: true,
    exports: {
      revalidatePath: (path: string) => {
        calls.revalidated.push(path)
      },
    },
  } as NodeJS.Module

  console.error = (...args: unknown[]) => {
    calls.errors.push(args)
  }

  delete require.cache[ACTION_PATH]
  const mod = require(ACTION_PATH) as typeof import('../../lib/recipes/bulk-price-actions')

  return {
    bulkUpdateIngredientPrices: mod.bulkUpdateIngredientPrices,
    calls,
    restore() {
      console.error = originalConsoleError
      restoreModule(ACTION_PATH, originals.action)
      restoreModule(GET_USER_PATH, originals.getUser)
      restoreModule(DB_SERVER_PATH, originals.dbServer)
      restoreModule(COST_REFRESH_PATH, originals.costRefresh)
      restoreModule(CACHE_PATH, originals.cache)
    },
  }
}

afterEach(() => {
  delete require.cache[ACTION_PATH]
})

test('bulk price updates remain tenant scoped and trigger a deduped PIE cascade', async () => {
  const harness = loadBulkPriceActions()
  try {
    await harness.bulkUpdateIngredientPrices([
      { ingredientId: 'ingredient-1', pricePerUnitCents: 250 },
      { ingredientId: 'ingredient-2', pricePerUnitCents: 375 },
      { ingredientId: 'ingredient-1', pricePerUnitCents: 275 },
    ])

    assert.equal(harness.calls.updates.length, 3)
    assert.deepEqual(harness.calls.updates[0].filters, [
      ['id', 'ingredient-1'],
      ['tenant_id', 'tenant-1'],
    ])
    assert.equal(harness.calls.updates[0].payload.last_price_cents, 250)
    assert.match(String(harness.calls.updates[0].payload.last_price_date), /^\d{4}-\d{2}-\d{2}$/)

    assert.deepEqual(harness.calls.propagated, [
      { ingredientIds: ['ingredient-1', 'ingredient-2'], options: { tenantId: 'tenant-1' } },
    ])
    assert.deepEqual(harness.calls.revalidated, ['/recipes', '/events'])
  } finally {
    harness.restore()
  }
})

test('bulk price updates skip DB work, cascade, and revalidation when there are no updates', async () => {
  const harness = loadBulkPriceActions()
  try {
    await harness.bulkUpdateIngredientPrices([])

    assert.deepEqual(harness.calls.updates, [])
    assert.deepEqual(harness.calls.propagated, [])
    assert.deepEqual(harness.calls.revalidated, [])
  } finally {
    harness.restore()
  }
})

test('bulk price cascade failures are logged and do not fail the save', async () => {
  const cascadeError = new Error('cascade unavailable')
  const harness = loadBulkPriceActions({
    propagateImpl: async () => {
      throw cascadeError
    },
  })

  try {
    await harness.bulkUpdateIngredientPrices([
      { ingredientId: 'ingredient-1', pricePerUnitCents: 250 },
    ])

    assert.equal(harness.calls.updates.length, 1)
    assert.deepEqual(harness.calls.revalidated, ['/recipes', '/events'])
    assert.equal(harness.calls.errors.length, 1)
    assert.match(String(harness.calls.errors[0][0]), /Price cascade failed/)
    assert.equal(harness.calls.errors[0][1], cascadeError)
  } finally {
    harness.restore()
  }
})

test('bulk price cascade only receives ingredient IDs actually updated for the tenant', async () => {
  const harness = loadBulkPriceActions({
    updatedIngredientIds: new Set(['ingredient-1']),
  })

  try {
    await harness.bulkUpdateIngredientPrices([
      { ingredientId: 'ingredient-1', pricePerUnitCents: 250 },
      { ingredientId: 'outside-tenant-ingredient', pricePerUnitCents: 999 },
    ])

    assert.equal(harness.calls.updates.length, 2)
    assert.deepEqual(harness.calls.propagated, [
      { ingredientIds: ['ingredient-1'], options: { tenantId: 'tenant-1' } },
    ])
    assert.deepEqual(harness.calls.revalidated, ['/recipes', '/events'])
  } finally {
    harness.restore()
  }
})
