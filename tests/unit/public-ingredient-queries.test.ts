import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)

type PgClientMock = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>) & {
  unsafe?: (...args: unknown[]) => Promise<any[]>
}

function loadPublicIngredientQueries(pgClient: PgClientMock) {
  const dbPath = require.resolve('../../lib/db/index.ts')
  const modulePath = require.resolve('../../lib/openclaw/public-ingredient-queries.ts')
  const contractModulePath = require.resolve('../../lib/openclaw/catalog-detail-contract.ts')

  require(dbPath)

  const originalDb = require.cache[dbPath]!.exports

  require.cache[dbPath]!.exports = {
    ...originalDb,
    pgClient,
  }

  delete require.cache[contractModulePath]
  delete require.cache[modulePath]
  const mod = require(modulePath)

  const restore = () => {
    require.cache[dbPath]!.exports = originalDb
    delete require.cache[contractModulePath]
    delete require.cache[modulePath]
  }

  return { mod, restore }
}

test('getPublicIngredientDetail hides duck-tape from the public ingredient lookup', async () => {
  let queryCount = 0

  const pgClient: PgClientMock = Object.assign(
    async (strings: TemplateStringsArray) => {
      queryCount += 1
      const sql = strings.join(' ')

      if (sql.includes('FROM openclaw.canonical_ingredients ci')) {
        return [
          {
            ingredient_id: 'duck-tape',
            name: 'Duck Tape',
            category: 'Other',
            standard_unit: 'each',
            has_food_product_match: false,
          },
        ]
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
    {
      unsafe: async () => {
        throw new Error('unsafe queries are not expected in public ingredient queries')
      },
    }
  )

  const { mod, restore } = loadPublicIngredientQueries(pgClient)

  try {
    const result = await mod.getPublicIngredientDetail('duck-tape')

    assert.equal(result, null)
    assert.equal(queryCount, 1)
  } finally {
    restore()
  }
})

test('getPublicIngredientDetail still returns legitimate culinary ingredients', async () => {
  const pgClient: PgClientMock = Object.assign(
    async (strings: TemplateStringsArray) => {
      const sql = strings.join(' ')

      if (sql.includes('FROM openclaw.canonical_ingredients ci')) {
        return [
          {
            ingredient_id: 'shallots',
            name: 'Shallots',
            category: 'Produce',
            standard_unit: 'lb',
            has_food_product_match: false,
          },
        ]
      }

      if (sql.includes('FROM openclaw.normalization_map')) {
        return []
      }

      if (sql.includes('FROM openclaw.price_intelligence_contract_v1')) {
        return []
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
    {
      unsafe: async () => {
        throw new Error('unsafe queries are not expected in public ingredient queries')
      },
    }
  )

  const { mod, restore } = loadPublicIngredientQueries(pgClient)

  try {
    const result = await mod.getPublicIngredientDetail('shallots')

    assert.ok(result)
    assert.equal(result.ingredient.id, 'shallots')
    assert.equal(result.ingredient.name, 'Shallots')
    assert.equal(result.summary.storeCount, 0)
  } finally {
    restore()
  }
})

test('getPublicIngredientDetail reads only surfaceable contract facts and preserves metadata', async () => {
  const seenSql: string[] = []

  const pgClient: PgClientMock = Object.assign(
    async (strings: TemplateStringsArray) => {
      const sql = strings.join(' ')
      seenSql.push(sql)

      if (sql.includes('FROM openclaw.canonical_ingredients ci')) {
        return [
          {
            ingredient_id: 'shallots',
            name: 'Shallots',
            category: 'Produce',
            standard_unit: 'lb',
            has_food_product_match: true,
          },
        ]
      }

      if (sql.includes('FROM openclaw.price_intelligence_contract_v1')) {
        assert.match(sql, /pic\.surface_eligible = true/)

        return [
          {
            store_name: 'Market Basket',
            store_city: 'Somerville',
            store_state: 'MA',
            store_website: 'https://marketbasket.com',
            price_cents: 249,
            price_unit: 'lb',
            price_type: 'retail',
            observation_method: 'direct_scrape',
            entity_source_name: 'Market Basket',
            entity_source_type: 'chain',
            provenance_label: 'Market Basket / direct_scrape / shelf',
            confidence_score: 0.91,
            publication_eligibility: 'surfaceable',
            surface_eligible: true,
            lifecycle_state: 'observed',
            in_stock: true,
            source_url: null,
            image_url: 'https://cdn.example.com/shallots.jpg',
            brand: 'ChefFlow Farms',
            aisle_cat: 'Produce',
            last_confirmed_at: '2026-04-22T10:00:00.000Z',
            last_changed_at: '2026-04-22T10:00:00.000Z',
            package_size: '1 lb bag',
          },
        ]
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
    {
      unsafe: async () => {
        throw new Error('unsafe queries are not expected in public ingredient queries')
      },
    }
  )

  const { mod, restore } = loadPublicIngredientQueries(pgClient)

  try {
    const result = await mod.getPublicIngredientDetail('shallots')

    assert.ok(result)
    assert.equal(result.summary.storeCount, 1)
    assert.equal(result.summary.cheapestStore, 'Market Basket')
    assert.equal(result.prices[0].priceCents, 249)
    assert.equal(result.prices[0].priceUnit, 'lb')
    assert.equal(result.prices[0].provenanceLabel, 'Market Basket / direct_scrape / shelf')
    assert.equal(result.prices[0].confidence, 'direct_scrape')
    assert.equal(result.prices[0].confidenceScore, 0.91)
    assert.equal(result.prices[0].publicationEligibility, 'surfaceable')
    assert.equal(result.prices[0].surfaceEligible, true)
    assert.equal(result.prices[0].lifecycleState, 'observed')
    assert.equal(result.prices[0].storeWebsite, 'https://marketbasket.com')
    assert.ok(
      seenSql.some((sql) => sql.includes('FROM openclaw.price_intelligence_contract_v1')),
      'expected detail lookup to read from the price intelligence contract'
    )
  } finally {
    restore()
  }
})

test('chef catalog detail is routed through the shared contract-backed helper', () => {
  const source = readFileSync(join(process.cwd(), 'lib/openclaw/catalog-actions.ts'), 'utf8')

  assert.match(source, /getCatalogDetailFromContract\(\{ ingredientId, visibility: 'internal' \}\)/)
})
