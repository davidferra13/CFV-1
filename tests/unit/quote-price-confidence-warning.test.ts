import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const ROOT = process.cwd()
const require = createRequire(import.meta.url)

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

test('quote price confidence action exposes component-level incomplete costing signals', () => {
  const source = read('lib/quotes/price-confidence-actions.ts')

  assert.match(source, /totalComponents: number/)
  assert.match(source, /menusWithNoCostableComponents: number/)
  assert.match(source, /menusWithMissingRecipeCosts: number/)
  assert.match(
    source,
    /menu_cost_summary:menu_cost_summary\(has_all_recipe_costs, total_component_count\)/
  )
  assert.match(source, /const partial = noComponents \+ missingRecipeCosts/)
})

test('quote price confidence warning renders actionable incomplete costing details', () => {
  const source = read('components/quotes/quote-price-confidence-warning.tsx')

  assert.match(source, /confidence\.menusWithMissingRecipeCosts/)
  assert.match(source, /confidence\.menusWithNoCostableComponents/)
  assert.match(source, /confidence\.totalComponents/)
  assert.match(source, /components without linked recipe costs/)
  assert.match(source, /no costable components yet/)
  assert.match(source, /before relying on or sending this quote/)
})

class QueryBuilder implements PromiseLike<{ data: any; error: null }> {
  private filters: Array<{ column: string; value: unknown }> = []

  constructor(private readonly data: any) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, value })
    return this
  }

  then<TResult1 = { data: any; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.data, error: null }).then(onfulfilled, onrejected)
  }
}

function loadPriceConfidenceAction(menus: any[]) {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const dbPath = require.resolve('../../lib/db/server.ts')
  const actionsPath = require.resolve('../../lib/quotes/price-confidence-actions.ts')

  const originalAuth = require.cache[authPath] ?? null
  const originalDb = require.cache[dbPath] ?? null

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      requireChef: async () => ({ tenantId: 'tenant-1', entityId: 'tenant-1' }),
    },
  } as any

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      createServerClient: () => ({
        from(table: string) {
          assert.equal(table, 'menus')
          return new QueryBuilder(menus)
        },
      }),
    },
  } as any

  delete require.cache[actionsPath]
  const actions = require(actionsPath)

  const restore = () => {
    if (originalAuth) require.cache[authPath] = originalAuth
    else delete require.cache[authPath]

    if (originalDb) require.cache[dbPath] = originalDb
    else delete require.cache[dbPath]

    delete require.cache[actionsPath]
  }

  return { actions, restore }
}

test('quote price confidence action counts menus with no costable components as incomplete', async () => {
  const { actions, restore } = loadPriceConfidenceAction([
    {
      id: 'menu-1',
      menu_cost_summary: { has_all_recipe_costs: true, total_component_count: 3 },
    },
    {
      id: 'menu-2',
      menu_cost_summary: { has_all_recipe_costs: false, total_component_count: 0 },
    },
    {
      id: 'menu-3',
      menu_cost_summary: { has_all_recipe_costs: false, total_component_count: 2 },
    },
  ])

  try {
    const result = await actions.getEventMenuPriceConfidence('11111111-1111-1111-1111-111111111111')

    assert.deepEqual(result, {
      hasLinkedMenu: true,
      totalMenus: 3,
      totalComponents: 5,
      menusWithFullCosts: 1,
      menusWithPartialCosts: 2,
      menusWithNoCostableComponents: 1,
      menusWithMissingRecipeCosts: 1,
      coveragePct: 33,
    })
  } finally {
    restore()
  }
})
