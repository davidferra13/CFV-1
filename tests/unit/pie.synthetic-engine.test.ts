/**
 * PIE Law 9 synthetic engine tests.
 *
 * The engine is cron-oriented and only exports runSyntheticEngine(), so these
 * tests exercise the private derivation logic through a fully mocked pgClient.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type GapRow = {
  ingredient_id: string
  name?: string | null
  census_category?: string | null
  standard_unit?: string | null
  region_id: string
  region_slug: string
  cost_index?: number | null
}

type InsertedSynthetic = {
  ingredientId: unknown
  regionId: unknown
  cents: number
  priceUnit: string
  confidence: number
  method: string
  inputs: Record<string, unknown>
}

type PgClientMock = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>) & {
  unsafe?: (...args: unknown[]) => Promise<any[]>
}

type MockOptions = {
  gaps: GapRow[]
  nearby?: Record<string, Array<{ price_cents: number; confidence: number; source_region: string }>>
  regionalAvg?: Record<string, { avg_cents: number; sample_size: number }>
  usda?: Record<string, { item_name: string; price_cents: number; unit: string; region: string }>
  categoryBaseline?: Record<string, { avg_cents: number; sample_size: number }>
}

function sqlText(strings: TemplateStringsArray): string {
  return strings.join(' ')
}

function createSyntheticPgMock(options: MockOptions) {
  const insertedSynthetic: InsertedSynthetic[] = []
  const insertedResolved: InsertedSynthetic[] = []

  const pgClient: PgClientMock = Object.assign(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = sqlText(strings)

      if (sql.includes('CROSS JOIN openclaw.pricing_regions pr')) {
        return options.gaps
      }

      if (sql.includes('AS source_region')) {
        const ingredientId = String(values[0])
        return options.nearby?.[ingredientId] ?? []
      }

      if (sql.includes('FROM openclaw.usda_price_baselines')) {
        const ingredientName = String(values[0])
        const row = options.usda?.[ingredientName]
        return row ? [row] : []
      }

      if (sql.includes('ROUND(AVG(rp.price_cents)) AS avg_cents')) {
        const category = String(values[0])
        const hasRegionFilter = sql.includes('AND rp.pricing_region_id =')
        const row = hasRegionFilter
          ? options.regionalAvg?.[category]
          : options.categoryBaseline?.[category]
        return row ? [row] : []
      }

      if (sql.includes('INSERT INTO openclaw.synthetic_prices')) {
        insertedSynthetic.push({
          ingredientId: values[0],
          regionId: values[1],
          cents: Number(values[2]),
          priceUnit: String(values[3]),
          confidence: Number(values[4]),
          method: String(values[5]),
          inputs: JSON.parse(String(values[6])),
        })
        return []
      }

      if (sql.includes('INSERT INTO openclaw.resolved_prices')) {
        insertedResolved.push({
          ingredientId: values[0],
          regionId: values[1],
          cents: Number(values[2]),
          priceUnit: String(values[3]),
          confidence: Number(values[4]),
          method: String(values[5]),
          inputs: {},
        })
        return []
      }

      throw new Error(`Unexpected synthetic-engine query: ${sql}`)
    },
    {
      unsafe: async () => {
        throw new Error('pgClient.unsafe should not be used by the synthetic engine')
      },
    }
  )

  return { pgClient, insertedSynthetic, insertedResolved }
}

function loadSyntheticEngine(pgClient: PgClientMock) {
  const dbPath = require.resolve('../../lib/db/index.ts')
  const compoundPath = require.resolve('../../lib/pricing/compound-learning.ts')
  const modulePath = require.resolve('../../lib/pricing/synthetic-engine.ts')

  require(dbPath)

  const originalDb = require.cache[dbPath]!.exports
  const originalCompound = require.cache[compoundPath]
  const predictionBatches: unknown[][] = []

  require.cache[dbPath]!.exports = {
    ...originalDb,
    pgClient,
  }

  require.cache[compoundPath] = {
    exports: {
      recordPredictionsBatch: async (records: unknown[]) => {
        predictionBatches.push(records)
        return records.length
      },
    },
  } as NodeJS.Module

  delete require.cache[modulePath]
  const mod = require(modulePath)

  const restore = () => {
    require.cache[dbPath]!.exports = originalDb
    if (originalCompound) {
      require.cache[compoundPath] = originalCompound
    } else {
      delete require.cache[compoundPath]
    }
    delete require.cache[modulePath]
  }

  return { mod, restore, predictionBatches }
}

async function runWithMock(options: MockOptions) {
  const mock = createSyntheticPgMock(options)
  const { mod, restore, predictionBatches } = loadSyntheticEngine(mock.pgClient)

  try {
    const result = await mod.runSyntheticEngine()
    return { ...mock, result, predictionBatches }
  } finally {
    restore()
  }
}

describe('PIE Synthetic Engine - category floor generation', () => {
  it('uses positive category floors and a positive fallback for empty categories', async () => {
    const { insertedSynthetic, result } = await runWithMock({
      gaps: [
        {
          ingredient_id: 'chicken-breast',
          name: 'Chicken Breast',
          census_category: 'protein',
          standard_unit: 'lb',
          region_id: 'national',
          region_slug: 'us',
          cost_index: 1,
        },
        {
          ingredient_id: 'mystery-item',
          name: 'Mystery Item',
          census_category: '',
          standard_unit: 'each',
          region_id: 'national',
          region_slug: 'us',
          cost_index: 1,
        },
      ],
    })

    assert.equal(result.errors.length, 0)
    assert.equal(result.byMethod.category_floor, 2)

    const protein = insertedSynthetic.find((row) => row.ingredientId === 'chicken-breast')
    const emptyCategory = insertedSynthetic.find((row) => row.ingredientId === 'mystery-item')

    assert.ok(protein)
    assert.ok(emptyCategory)
    assert.equal(protein.method, 'category_floor')
    assert.equal(emptyCategory.method, 'category_floor')
    assert.ok(protein.cents >= 499, `protein floor should be at least 499, got ${protein.cents}`)
    assert.ok(emptyCategory.cents > 0, `empty category fallback must be positive`)
    assert.ok(Number(emptyCategory.inputs.floor_cents) > 0)

    for (const row of insertedSynthetic) {
      assert.ok(row.cents > 0, `${row.ingredientId} produced non-positive cents`)
      assert.ok(Number.isFinite(row.cents), `${row.ingredientId} produced non-finite cents`)
    }
  })
})

describe('PIE Synthetic Engine - regional adjustment', () => {
  it('multiplies floor prices by the region cost index', async () => {
    const { insertedSynthetic } = await runWithMock({
      gaps: [
        {
          ingredient_id: 'national-produce',
          name: 'Zucchini',
          census_category: 'produce',
          standard_unit: 'lb',
          region_id: 'national',
          region_slug: 'us',
          cost_index: 1,
        },
        {
          ingredient_id: 'high-rpp-produce',
          name: 'Zucchini',
          census_category: 'produce',
          standard_unit: 'lb',
          region_id: 'expensive',
          region_slug: 'expensive',
          cost_index: 1.2,
        },
        {
          ingredient_id: 'low-rpp-produce',
          name: 'Zucchini',
          census_category: 'produce',
          standard_unit: 'lb',
          region_id: 'cheap',
          region_slug: 'cheap',
          cost_index: 0.8,
        },
      ],
    })

    const national = insertedSynthetic.find((row) => row.ingredientId === 'national-produce')!
    const expensive = insertedSynthetic.find((row) => row.ingredientId === 'high-rpp-produce')!
    const cheap = insertedSynthetic.find((row) => row.ingredientId === 'low-rpp-produce')!

    assert.ok(expensive.cents > national.cents)
    assert.ok(cheap.cents < national.cents)
    assert.equal(expensive.cents, Math.round(national.cents * 1.2))
    assert.equal(cheap.cents, Math.round(national.cents * 0.8))
  })
})

describe('PIE Synthetic Engine - unit normalization', () => {
  it('writes per-unit labels for lb, oz, kg, and mismatched units without throwing', async () => {
    const { insertedSynthetic, result } = await runWithMock({
      gaps: [
        {
          ingredient_id: 'per-lb',
          name: 'Rice',
          census_category: 'grain',
          standard_unit: 'lb',
          region_id: 'r1',
          region_slug: 'us',
          cost_index: 1,
        },
        {
          ingredient_id: 'per-oz',
          name: 'Saffron',
          census_category: 'spice',
          standard_unit: 'oz',
          region_id: 'r1',
          region_slug: 'us',
          cost_index: 1,
        },
        {
          ingredient_id: 'per-kg',
          name: 'Flour',
          census_category: 'grain',
          standard_unit: 'kg',
          region_id: 'r1',
          region_slug: 'us',
          cost_index: 1,
        },
        {
          ingredient_id: 'mismatched-unit',
          name: 'Milk',
          census_category: 'dairy',
          standard_unit: 'crate',
          region_id: 'r1',
          region_slug: 'us',
          cost_index: 1,
        },
      ],
    })

    assert.equal(result.errors.length, 0)
    assert.equal(
      insertedSynthetic.find((row) => row.ingredientId === 'per-lb')?.priceUnit,
      'per_lb'
    )
    assert.equal(
      insertedSynthetic.find((row) => row.ingredientId === 'per-oz')?.priceUnit,
      'per_oz'
    )
    assert.equal(
      insertedSynthetic.find((row) => row.ingredientId === 'per-kg')?.priceUnit,
      'per_kg'
    )
    assert.equal(
      insertedSynthetic.find((row) => row.ingredientId === 'mismatched-unit')?.priceUnit,
      'per_crate'
    )
  })
})

describe('PIE Synthetic Engine - confidence scoring', () => {
  it('keeps synthetic confidence below 0.5 and decreases as derivation chains get weaker', async () => {
    const { insertedSynthetic } = await runWithMock({
      gaps: [
        {
          ingredient_id: 'nearby',
          name: 'Nearby Item',
          census_category: 'protein',
          standard_unit: 'lb',
          region_id: 'target',
          region_slug: 'target',
          cost_index: 1,
        },
        {
          ingredient_id: 'regional',
          name: 'Regional Item',
          census_category: 'dairy',
          standard_unit: 'each',
          region_id: 'target',
          region_slug: 'target',
          cost_index: 1,
        },
        {
          ingredient_id: 'usda',
          name: 'USDA Item',
          census_category: 'grain',
          standard_unit: 'lb',
          region_id: 'target',
          region_slug: 'target',
          cost_index: 1,
        },
        {
          ingredient_id: 'category',
          name: 'Category Item',
          census_category: 'produce',
          standard_unit: 'lb',
          region_id: 'target',
          region_slug: 'target',
          cost_index: 1,
        },
        {
          ingredient_id: 'floor',
          name: 'Floor Item',
          census_category: 'spice',
          standard_unit: 'each',
          region_id: 'target',
          region_slug: 'target',
          cost_index: 1,
        },
      ],
      nearby: {
        nearby: [{ price_cents: 700, confidence: 0.6, source_region: 'source' }],
      },
      regionalAvg: {
        dairy: { avg_cents: 450, sample_size: 20 },
      },
      usda: {
        'USDA Item': { item_name: 'USDA Item', price_cents: 325, unit: 'lb', region: 'us_average' },
      },
      categoryBaseline: {
        produce: { avg_cents: 250, sample_size: 1000 },
      },
    })

    const byIngredient = new Map(insertedSynthetic.map((row) => [row.ingredientId, row]))

    assert.equal(byIngredient.get('nearby')?.method, 'nearby_state')
    assert.equal(byIngredient.get('regional')?.method, 'regional_avg')
    assert.equal(byIngredient.get('usda')?.method, 'usda_adjusted')
    assert.equal(byIngredient.get('category')?.method, 'category_baseline')
    assert.equal(byIngredient.get('floor')?.method, 'category_floor')

    for (const row of insertedSynthetic) {
      assert.ok(row.confidence < 0.5, `${row.method} confidence should stay below 0.5`)
    }

    assert.ok(byIngredient.get('nearby')!.confidence > byIngredient.get('regional')!.confidence)
    assert.ok(byIngredient.get('regional')!.confidence > byIngredient.get('usda')!.confidence)
    assert.ok(byIngredient.get('usda')!.confidence > byIngredient.get('category')!.confidence)
    assert.ok(byIngredient.get('category')!.confidence > byIngredient.get('floor')!.confidence)
  })
})

describe('PIE Synthetic Engine - edge cases', () => {
  it('still generates valid prices for missing category, name, and unit fields', async () => {
    const { insertedSynthetic, insertedResolved, predictionBatches, result } = await runWithMock({
      gaps: [
        {
          ingredient_id: 'nullish-input',
          name: null,
          census_category: null,
          standard_unit: null,
          region_id: 'target',
          region_slug: 'target',
          cost_index: 1,
        },
      ],
    })

    assert.equal(result.errors.length, 0)
    assert.equal(result.syntheticsGenerated, 1)
    assert.equal(insertedSynthetic.length, 1)
    assert.equal(insertedResolved.length, 1)
    assert.equal(predictionBatches.length, 1)

    const row = insertedSynthetic[0]
    assert.equal(row.method, 'category_floor')
    assert.equal(row.priceUnit, 'per_each')
    assert.ok(row.cents > 0)
    assert.ok(Number.isFinite(row.cents))
    assert.ok(row.confidence > 0)
    assert.ok(row.confidence < 0.5)
  })
})
