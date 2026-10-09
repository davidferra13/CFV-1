import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import ts from 'typescript'
import * as units from '@/lib/grocery/unit-conversion'
import * as engine from '@/lib/units/conversion-engine'
import { PORTIONS_BY_SERVICE_STYLE } from '@/lib/finance/industry-benchmarks'

const loadRequire = createRequire(path.join(process.cwd(), 'package.json'))
function loadAction(
  file: string,
  records: Record<string, any>,
  overrides: Record<string, any> = {}
) {
  const db = {
    from(table: string) {
      const rows = records[table] ?? []
      const result = { data: rows, error: null }
      const chain: any = new Proxy(
        {},
        {
          get(_target, key) {
            if (key === 'then') return (yes: any, no: any) => Promise.resolve(result).then(yes, no)
            if (key === 'single' || key === 'maybeSingle')
              return async () => ({ data: rows[0] ?? null, error: null })
            return () => chain
          },
        }
      )
      return chain
    },
  }
  const unexpected = () => {
    throw Error('Unexpected write during shopping calculation')
  }
  const deps: Record<string, any> = {
    '@/lib/auth/get-user': { requireChef: async () => ({ tenantId: 'test-chef' }) },
    '@/lib/db/server': { createServerClient: () => db },
    './unit-conversion': units,
    '@/lib/grocery/unit-conversion': units,
    '@/lib/units/conversion-engine': engine,
    '@/lib/formulas/grocery-consolidation': { assignStoreSection: () => 'Other' },
    '@/lib/finance/industry-benchmarks': { PORTIONS_BY_SERVICE_STYLE },
    '@/lib/inventory/purchase-order-actions': {
      createPurchaseOrder: unexpected,
      addPOItem: unexpected,
    },
    '@/lib/menus/allergen-check': { ingredientMatchesAllergen: () => false },
    '@/lib/pricing/resolve-price': { resolvePricesBatch: async () => new Map() },
    'next/link': () => null,
    '@/components/events/print-button': { PrintButton: () => null },
    '@/components/culinary/ShoppingListGenerator': { ShoppingListGenerator: () => null },
    '@/components/exit-links/ExitLinkButton': { ExitLinkButton: () => null },
    '@/lib/culinary/shopping-list-utils': { groupByCategory: () => new Map() },
    ...overrides,
  }
  const filename = path.resolve(file)
  const loaded: any = new Module(filename)
  loaded.paths = (Module as any)._nodeModulePaths(path.dirname(filename))
  loaded.require = (id: string) => (Object.hasOwn(deps, id) ? deps[id] : loadRequire(id))
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText,
    filename
  )
  return loaded.exports
}

function fixtures(firstUnit = 'cup', secondUnit = 'oz') {
  const ingredient = {
    id: 'ingredient',
    name: 'unobtainium',
    category: 'pantry',
    default_yield_pct: 100,
  }
  const ingredients = [firstUnit, secondUnit].map((unit, i) => ({
    ingredient_id: ingredient.id,
    recipe_id: 'recipe',
    quantity: i === 0 ? 2 : 8,
    unit,
    yield_pct: 100,
    ingredients: ingredient,
  }))
  return {
    events: [
      {
        id: 'event',
        event_date: '2026-10-11',
        menu_id: 'menu',
        guest_count: 4,
        service_style: 'plated',
      },
    ],
    menus: [{ id: 'menu', event_id: 'event' }],
    dishes: [{ id: 'dish', menu_id: 'menu' }],
    components: [
      {
        dish_id: 'dish',
        recipe_id: 'recipe',
        scale_factor: 1,
        recipes: {
          id: 'recipe',
          name: 'Fixture recipe',
          servings: 4,
          recipe_ingredients: ingredients,
        },
      },
    ],
    recipes: [{ id: 'recipe', servings: 4, name: 'Fixture recipe' }],
    recipe_ingredients: ingredients,
    ingredients: [ingredient],
  }
}

test('event grocery generation refuses a fabricated incompatible total', async () => {
  const action = loadAction('lib/grocery/generate-grocery-list.ts', fixtures())
  await assert.rejects(action.generateGroceryList('event'), /unobtainium.*cup.*oz/)
})
test('shopping-window generation refuses a fabricated incompatible total', async () => {
  const action = loadAction('lib/culinary/shopping-list-actions.ts', fixtures())
  await assert.rejects(
    action.generateShoppingList({ startDate: '2026-10-01', endDate: '2026-10-31' }),
    /unobtainium.*cup.*oz/
  )
})
test('event grocery generation still combines compatible extended units', async () => {
  const action = loadAction('lib/grocery/generate-grocery-list.ts', fixtures('fluid ounces', 'cup'))
  const list = await action.generateGroceryList('event')
  const item = list.categories[0].items[0]
  assert.equal(list.totalItems, 1)
  assert.equal(item.unit, 'quart')
  assert.ok(Number.isFinite(item.totalQuantity))
  assert.ok(item.totalQuantity > 2 && item.totalQuantity < 3)
})

for (const file of [
  'app/(chef)/culinary/prep/shopping/page.tsx',
  'app/(chef)/culinary/prep/shopping/print/page.tsx',
]) {
  test(`failed shopping data is never presented as an empty zero-cost page: ${file}`, async () => {
    const action = loadAction(
      file,
      {},
      {
        '@/lib/culinary/shopping-list-actions': {
          generateShoppingList: async () => {
            throw Error('Cannot combine unobtainium quantities in cup and oz')
          },
          getUpcomingEventsForShopping: async () => [],
        },
      }
    )
    await assert.rejects(
      action.default({
        searchParams: Promise.resolve({ startDate: '2026-10-01', endDate: '2026-10-31' }),
      }),
      /unobtainium.*cup.*oz/
    )
  })
}
