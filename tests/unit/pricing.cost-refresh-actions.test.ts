import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { afterEach, test } from 'node:test'

const require = createRequire(import.meta.url)

const COST_REFRESH_PATH = require.resolve('../../lib/pricing/cost-refresh-actions.ts')
const GET_USER_PATH = require.resolve('../../lib/auth/get-user.ts')
const DB_SERVER_PATH = require.resolve('../../lib/db/server.ts')
const RECIPES_ACTIONS_PATH = require.resolve('../../lib/recipes/actions.ts')
const CACHE_PATH = require.resolve('next/cache')

type QueryCall = {
  table: string
  action: 'select' | 'update' | null
  payload?: Record<string, unknown>
  filters: Array<[string, unknown]>
  inFilters: Array<[string, unknown[]]>
}

type HarnessCalls = {
  createServerClientArgs: unknown[]
  queries: QueryCall[]
  rpc: Array<{ name: string; args: unknown }>
  computeRecipeIngredientCost: unknown[][]
  refreshRecipeTotalCost: unknown[][]
  revalidatedPaths: string[]
  revalidatedTags: string[]
}

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

function createDb(calls: HarnessCalls) {
  const recipeIngredientRows = [
    {
      id: 'ri-1',
      recipe_id: 'recipe-a',
      ingredient_id: 'ingredient-1',
      quantity: 2,
      unit: 'lb',
      yield_pct: null,
    },
    {
      id: 'ri-2',
      recipe_id: 'recipe-b',
      ingredient_id: 'ingredient-2',
      quantity: 4,
      unit: 'oz',
      yield_pct: 80,
    },
    {
      id: 'ri-3',
      recipe_id: 'recipe-a',
      ingredient_id: 'ingredient-1',
      quantity: 1,
      unit: null,
      yield_pct: null,
    },
  ]

  function resolve(call: QueryCall) {
    calls.queries.push(call)

    if (call.action === 'update') {
      return { data: null, error: null }
    }

    if (call.table === 'ingredients') {
      const ids = (call.inFilters.find(([column]) => column === 'id')?.[1] ?? []) as string[]
      return { data: ids.map((id) => ({ id })), error: null }
    }

    if (call.table === 'recipe_ingredients') {
      return { data: recipeIngredientRows, error: null }
    }

    if (call.table === 'recipes') {
      const ids = (call.inFilters.find(([column]) => column === 'id')?.[1] ?? []) as string[]
      return { data: ids.map((id) => ({ id })), error: null }
    }

    if (call.table === 'recipe_sub_recipes') {
      return { data: [{ parent_recipe_id: 'parent-recipe' }], error: null }
    }

    return { data: [], error: null }
  }

  function builder(table: string) {
    const call: QueryCall = {
      table,
      action: null,
      filters: [],
      inFilters: [],
    }

    const query = {
      select() {
        call.action = 'select'
        return query
      },
      update(payload: Record<string, unknown>) {
        call.action = 'update'
        call.payload = payload
        return query
      },
      eq(column: string, value: unknown) {
        call.filters.push([column, value])
        return query
      },
      in(column: string, values: unknown[]) {
        call.inFilters.push([column, values])
        return query
      },
      single() {
        return Promise.resolve(resolve(call))
      },
      then(resolveFn: (value: unknown) => unknown, rejectFn?: (reason: unknown) => unknown) {
        return Promise.resolve(resolve(call)).then(resolveFn, rejectFn)
      },
    }

    return query
  }

  return {
    from(table: string) {
      return builder(table)
    },
    rpc(name: string, args: unknown) {
      calls.rpc.push({ name, args })
      return Promise.resolve({ data: [{ id: 'event-1' }, { id: 'event-2' }], error: null })
    },
  }
}

function loadCostRefreshActions() {
  const calls: HarnessCalls = {
    createServerClientArgs: [],
    queries: [],
    rpc: [],
    computeRecipeIngredientCost: [],
    refreshRecipeTotalCost: [],
    revalidatedPaths: [],
    revalidatedTags: [],
  }

  const originals = {
    costRefresh: require.cache[COST_REFRESH_PATH],
    getUser: require.cache[GET_USER_PATH],
    dbServer: require.cache[DB_SERVER_PATH],
    recipesActions: require.cache[RECIPES_ACTIONS_PATH],
    cache: require.cache[CACHE_PATH],
  }

  const db = createDb(calls)

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
      createServerClient: (options?: unknown) => {
        calls.createServerClientArgs.push(options)
        return db
      },
    },
  } as NodeJS.Module

  require.cache[RECIPES_ACTIONS_PATH] = {
    id: RECIPES_ACTIONS_PATH,
    filename: RECIPES_ACTIONS_PATH,
    loaded: true,
    exports: {
      computeRecipeIngredientCost: async (...args: unknown[]) => {
        calls.computeRecipeIngredientCost.push(args)
        return { costCents: 1234 }
      },
      refreshRecipeTotalCost: async (...args: unknown[]) => {
        calls.refreshRecipeTotalCost.push(args)
      },
    },
  } as NodeJS.Module

  require.cache[CACHE_PATH] = {
    id: CACHE_PATH,
    filename: CACHE_PATH,
    loaded: true,
    exports: {
      revalidatePath: (path: string) => calls.revalidatedPaths.push(path),
      revalidateTag: (tag: string) => calls.revalidatedTags.push(tag),
    },
  } as NodeJS.Module

  delete require.cache[COST_REFRESH_PATH]
  const mod = require(COST_REFRESH_PATH) as typeof import('../../lib/pricing/cost-refresh-actions')

  return {
    propagatePriceChange: mod.propagatePriceChange,
    calls,
    restore() {
      restoreModule(COST_REFRESH_PATH, originals.costRefresh)
      restoreModule(GET_USER_PATH, originals.getUser)
      restoreModule(DB_SERVER_PATH, originals.dbServer)
      restoreModule(RECIPES_ACTIONS_PATH, originals.recipesActions)
      restoreModule(CACHE_PATH, originals.cache)
    },
  }
}

afterEach(() => {
  delete require.cache[COST_REFRESH_PATH]
})

test('propagatePriceChange refreshes affected recipe costs, parent recipes, events, and caches', async () => {
  const harness = loadCostRefreshActions()

  try {
    await harness.propagatePriceChange(['ingredient-1', 'ingredient-2'])

    assert.deepEqual(harness.calls.createServerClientArgs, [undefined])

    assert.deepEqual(
      harness.calls.computeRecipeIngredientCost.map((args) => args.slice(1)),
      [
        ['tenant-1', 'ingredient-1', 2, 'lb', undefined],
        ['tenant-1', 'ingredient-2', 4, 'oz', 80],
        ['tenant-1', 'ingredient-1', 1, 'each', undefined],
      ]
    )

    assert.deepEqual(
      harness.calls.refreshRecipeTotalCost.map((args) => args.slice(1)),
      [
        ['tenant-1', 'recipe-a'],
        ['tenant-1', 'recipe-b'],
        ['tenant-1', 'parent-recipe'],
      ]
    )

    const recipeIngredientUpdates = harness.calls.queries.filter(
      (query) => query.table === 'recipe_ingredients' && query.action === 'update'
    )
    assert.deepEqual(
      recipeIngredientUpdates.map((query) => ({
        payload: query.payload,
        filters: query.filters,
      })),
      [
        {
          payload: { computed_cost_cents: 1234 },
          filters: [
            ['id', 'ri-1'],
            ['recipe_id', 'recipe-a'],
          ],
        },
        {
          payload: { computed_cost_cents: 1234 },
          filters: [
            ['id', 'ri-2'],
            ['recipe_id', 'recipe-b'],
          ],
        },
        {
          payload: { computed_cost_cents: 1234 },
          filters: [
            ['id', 'ri-3'],
            ['recipe_id', 'recipe-a'],
          ],
        },
      ]
    )

    const ingredientLookup = harness.calls.queries.find((query) => query.table === 'ingredients')
    assert.deepEqual(ingredientLookup?.filters, [['tenant_id', 'tenant-1']])
    assert.deepEqual(ingredientLookup?.inFilters, [['id', ['ingredient-1', 'ingredient-2']]])

    const recipeLookups = harness.calls.queries.filter(
      (query) => query.table === 'recipes' && query.action === 'select'
    )
    assert.deepEqual(
      recipeLookups.map((query) => query.filters),
      [[['tenant_id', 'tenant-1']], [['tenant_id', 'tenant-1']]]
    )

    assert.equal(harness.calls.rpc.length, 1)
    assert.equal(harness.calls.rpc[0].name, 'raw_sql')
    assert.match(
      String((harness.calls.rpc[0].args as { query: string }).query),
      /cost_needs_refresh/
    )
    assert.deepEqual((harness.calls.rpc[0].args as { params: unknown[] }).params, [
      ['recipe-a', 'recipe-b'],
      'tenant-1',
    ])

    const eventUpdates = harness.calls.queries.filter(
      (query) => query.table === 'events' && query.action === 'update'
    )
    assert.deepEqual(
      eventUpdates.map((query) => ({ payload: query.payload, filters: query.filters })),
      [
        {
          payload: { cost_needs_refresh: true },
          filters: [
            ['id', 'event-1'],
            ['tenant_id', 'tenant-1'],
          ],
        },
        {
          payload: { cost_needs_refresh: true },
          filters: [
            ['id', 'event-2'],
            ['tenant_id', 'tenant-1'],
          ],
        },
      ]
    )

    assert.deepEqual(harness.calls.revalidatedPaths, ['/culinary/costing', '/culinary/recipes'])
    assert.deepEqual(harness.calls.revalidatedTags, ['recipe-costs'])
  } finally {
    harness.restore()
  }
})

test('propagatePriceChange requires an explicit tenant for admin cascades', async () => {
  const harness = loadCostRefreshActions()

  try {
    await assert.rejects(
      () => harness.propagatePriceChange(['ingredient-1'], { admin: true }),
      /tenantId is required/
    )
    assert.deepEqual(harness.calls.createServerClientArgs, [])
  } finally {
    harness.restore()
  }
})
