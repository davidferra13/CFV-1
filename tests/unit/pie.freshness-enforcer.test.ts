/**
 * PIE Law 4 freshness enforcer tests.
 *
 * The production module delegates freshness classification to SQL, so these
 * tests run it through a fully mocked pgClient backed by in-memory price rows.
 */

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'

const require = createRequire(import.meta.url)

const DAY_MS = 24 * 60 * 60 * 1000
const NOW_MS = Date.UTC(2026, 4, 15, 12, 0, 0)

type FreshnessPolicy = {
  tier: string
  maxAgeDays: number
}

type PriceRow = {
  ingredientId: string
  name: string
  category: string
  pricingRegionId?: string
  priceCents?: number
  confidence?: number
  isSynthetic?: boolean
  computationMethod?: string
  ageDays: number
}

type UpdateCall =
  | {
      kind: 'confidence_decay'
      ingredientId: string
      pricingRegionId: string
      confidence: number
    }
  | {
      kind: 'category_reestimate'
      ingredientId: string
      pricingRegionId: string
      priceCents: number
      confidence: number
    }

type PgClientMock = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>) & {
  unsafe?: (...args: unknown[]) => Promise<any[]>
}

const defaultPolicies: Record<string, FreshnessPolicy> = {
  produce: { tier: 'perishable', maxAgeDays: 7 },
  dairy: { tier: 'perishable', maxAgeDays: 10 },
  protein: { tier: 'perishable', maxAgeDays: 14 },
  frozen: { tier: 'stable', maxAgeDays: 45 },
  spices: { tier: 'shelf_stable', maxAgeDays: 90 },
}

function updatedAt(row: PriceRow) {
  return new Date(NOW_MS - row.ageDays * DAY_MS)
}

function ageDays(row: PriceRow) {
  return Math.floor((NOW_MS - updatedAt(row).getTime()) / DAY_MS)
}

function price(row: PriceRow): Required<PriceRow> {
  return {
    pricingRegionId: 'region-1',
    priceCents: 500,
    confidence: 0.8,
    isSynthetic: false,
    computationMethod: 'direct_observation',
    ...row,
  }
}

function policyFor(
  category: string,
  policies: Record<string, FreshnessPolicy>,
  defaultPolicy: FreshnessPolicy
) {
  return policies[category] ?? defaultPolicy
}

function isStale(
  row: PriceRow,
  policies: Record<string, FreshnessPolicy>,
  defaultPolicy: FreshnessPolicy
) {
  return ageDays(row) > policyFor(row.category, policies, defaultPolicy).maxAgeDays
}

function sqlText(strings: TemplateStringsArray) {
  return strings.join(' ')
}

function average(rows: number[]) {
  return Math.round(rows.reduce((sum, cents) => sum + cents, 0) / rows.length)
}

function createFreshnessPgMock({
  prices,
  policies = defaultPolicies,
  defaultPolicy = { tier: 'default', maxAgeDays: 30 },
}: {
  prices: PriceRow[]
  policies?: Record<string, FreshnessPolicy>
  defaultPolicy?: FreshnessPolicy
}) {
  const normalized = prices.map(price)
  const updates: UpdateCall[] = []
  const seenSql: string[] = []

  const pgClient: PgClientMock = Object.assign(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = sqlText(strings)
      seenSql.push(sql)

      if (sql.includes('count(*) AS total') && !sql.includes('GROUP BY')) {
        const stale = normalized.filter((row) => isStale(row, policies, defaultPolicy)).length
        return [{ total: normalized.length, fresh: normalized.length - stale, stale }]
      }

      if (sql.includes('GROUP BY ic.census_category')) {
        const byCategory = new Map<string, Required<PriceRow>[]>()

        for (const row of normalized) {
          byCategory.set(row.category, [...(byCategory.get(row.category) ?? []), row])
        }

        return [...byCategory.entries()]
          .map(([category, rows]) => {
            const policy = policyFor(category, policies, defaultPolicy)
            return {
              category,
              tier: policy.tier,
              max_age_days: policy.maxAgeDays,
              total_prices: rows.length,
              stale_prices: rows.filter((row) => isStale(row, policies, defaultPolicy)).length,
            }
          })
          .sort(
            (a, b) =>
              Number(a.max_age_days) - Number(b.max_age_days) ||
              String(a.category).localeCompare(String(b.category))
          )
      }

      if (sql.includes('ci.name') && sql.includes('ORDER BY rp.updated_at ASC')) {
        const oldest = [...normalized].sort((a, b) => b.ageDays - a.ageDays)[0]
        return oldest
          ? [
              {
                ingredient_id: oldest.ingredientId,
                name: oldest.name,
                age_days: ageDays(oldest),
              },
            ]
          : []
      }

      if (sql.includes('pr.cost_index') && sql.includes('LIMIT 5000')) {
        return normalized
          .filter((row) => isStale(row, policies, defaultPolicy))
          .sort((a, b) => ageDays(b) - ageDays(a))
          .slice(0, 5000)
          .map((row) => ({
            canonical_ingredient_id: row.ingredientId,
            pricing_region_id: row.pricingRegionId,
            price_cents: row.priceCents,
            confidence: row.confidence,
            is_synthetic: row.isSynthetic,
            computation_method: row.computationMethod,
            census_category: row.category,
            cost_index: 1,
            max_age_days: policyFor(row.category, policies, defaultPolicy).maxAgeDays,
            age_days: ageDays(row),
          }))
      }

      if (sql.includes("computation_method = 'freshness_decayed'")) {
        updates.push({
          kind: 'confidence_decay',
          ingredientId: String(values[1]),
          pricingRegionId: String(values[2]),
          confidence: Number(values[0]),
        })
        return []
      }

      if (sql.includes('ROUND(AVG(rp2.price_cents)) AS avg_cents')) {
        const category = String(values[0])
        const pricingRegionId = String(values[1])
        const candidates = normalized.filter(
          (row) =>
            row.category === category &&
            row.pricingRegionId === pricingRegionId &&
            row.ageDays < 30 &&
            !row.isSynthetic
        )

        return candidates.length > 0
          ? [
              {
                avg_cents: average(candidates.map((row) => row.priceCents)),
                cnt: candidates.length,
              },
            ]
          : [{ avg_cents: null, cnt: 0 }]
      }

      if (sql.includes("computation_method = 'freshness_reestimate'")) {
        updates.push({
          kind: 'category_reestimate',
          ingredientId: String(values[2]),
          pricingRegionId: String(values[3]),
          priceCents: Number(values[0]),
          confidence: Number(values[1]),
        })
        return []
      }

      throw new Error(`Unexpected freshness-enforcer query: ${sql}`)
    },
    {
      unsafe: async () => {
        throw new Error('pgClient.unsafe should not be used by the freshness enforcer')
      },
    }
  )

  return { pgClient, seenSql, updates }
}

function restoreModule(path: string, original: NodeJS.Module | undefined) {
  if (original) require.cache[path] = original
  else delete require.cache[path]
}

function loadFreshnessEnforcer(pgClient: PgClientMock) {
  const dbPath = require.resolve('@/lib/db')
  const modulePath = require.resolve('../../lib/pricing/freshness-enforcer.ts')
  const originalDb = require.cache[dbPath]
  const originalModule = require.cache[modulePath]

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { pgClient },
  } as NodeJS.Module

  delete require.cache[modulePath]
  const mod = require(modulePath)

  const restore = () => {
    restoreModule(dbPath, originalDb)
    restoreModule(modulePath, originalModule)
  }

  return { mod, restore }
}

async function withMockedConsoleAndClock<T>(durationMs: number, run: () => Promise<T>) {
  const originalNow = Date.now
  const originalLog = console.log
  let calls = 0

  Date.now = () => {
    calls += 1
    return calls === 1 ? NOW_MS : NOW_MS + durationMs
  }
  console.log = () => {}

  try {
    return await run()
  } finally {
    Date.now = originalNow
    console.log = originalLog
  }
}

describe('PIE Freshness Enforcer - report generation', () => {
  it('reports fresh, stale, stale percentage, category breakdown, and oldest price', async () => {
    const mock = createFreshnessPgMock({
      prices: [
        { ingredientId: 'tomatoes', name: 'Tomatoes', category: 'produce', ageDays: 0 },
        { ingredientId: 'lettuce', name: 'Lettuce', category: 'produce', ageDays: 8 },
        { ingredientId: 'cumin', name: 'Cumin', category: 'spices', ageDays: 40 },
        { ingredientId: 'oregano', name: 'Oregano', category: 'spices', ageDays: 120 },
      ],
    })
    const { mod, restore } = loadFreshnessEnforcer(mock.pgClient)

    try {
      const report = await mod.getFreshnessReport()

      assert.equal(report.totalPrices, 4)
      assert.equal(report.fresh, 2)
      assert.equal(report.stale, 2)
      assert.equal(report.stalePct, 50)
      assert.deepEqual(report.oldestPrice, {
        ingredientId: 'oregano',
        name: 'Oregano',
        ageDays: 120,
      })

      assert.deepEqual(report.byCategory, [
        {
          category: 'produce',
          tier: 'perishable',
          maxAgeDays: 7,
          totalPrices: 2,
          stalePrices: 1,
          stalePct: 50,
        },
        {
          category: 'spices',
          tier: 'shelf_stable',
          maxAgeDays: 90,
          totalPrices: 2,
          stalePrices: 1,
          stalePct: 50,
        },
      ])
    } finally {
      restore()
    }
  })
})

describe('PIE Freshness Enforcer - category thresholds', () => {
  it('uses shorter produce thresholds, longer spice thresholds, tier-specific ages, and a default for missing policy rows', async () => {
    const mock = createFreshnessPgMock({
      prices: [
        { ingredientId: 'berries', name: 'Berries', category: 'produce', ageDays: 8 },
        { ingredientId: 'pepper', name: 'Pepper', category: 'spices', ageDays: 20 },
        { ingredientId: 'peas', name: 'Frozen Peas', category: 'frozen', ageDays: 46 },
        { ingredientId: 'misc', name: 'Unmapped Pantry Item', category: 'unmapped', ageDays: 31 },
      ],
    })
    const { mod, restore } = loadFreshnessEnforcer(mock.pgClient)

    try {
      const report = await mod.getFreshnessReport()
      const byCategory = new Map(report.byCategory.map((row: any) => [row.category, row]))

      assert.equal(byCategory.get('produce').maxAgeDays, 7)
      assert.equal(byCategory.get('produce').tier, 'perishable')
      assert.equal(byCategory.get('produce').stalePrices, 1)

      assert.equal(byCategory.get('spices').maxAgeDays, 90)
      assert.equal(byCategory.get('spices').tier, 'shelf_stable')
      assert.equal(byCategory.get('spices').stalePrices, 0)

      assert.equal(byCategory.get('frozen').maxAgeDays, 45)
      assert.equal(byCategory.get('frozen').tier, 'stable')
      assert.equal(byCategory.get('frozen').stalePrices, 1)

      assert.equal(byCategory.get('unmapped').maxAgeDays, 30)
      assert.equal(byCategory.get('unmapped').tier, 'default')
      assert.equal(byCategory.get('unmapped').stalePrices, 1)
      assert.equal(report.stale, 3)
    } finally {
      restore()
    }
  })
})

describe('PIE Freshness Enforcer - re-estimation trigger', () => {
  it('decays slightly stale real prices, leaves fresh prices untouched, flags stale prices, and reports duration', async () => {
    const mock = createFreshnessPgMock({
      prices: [
        {
          ingredientId: 'slightly-stale-produce',
          name: 'Arugula',
          category: 'produce',
          ageDays: 10,
          confidence: 0.9,
          isSynthetic: false,
        },
        {
          ingredientId: 'fresh-produce',
          name: 'Spinach',
          category: 'produce',
          ageDays: 1,
          confidence: 0.8,
          isSynthetic: false,
        },
      ],
    })
    const { mod, restore } = loadFreshnessEnforcer(mock.pgClient)

    try {
      const result = await withMockedConsoleAndClock(37, () => mod.enforcesFreshness())

      assert.deepEqual(result, {
        totalStale: 1,
        reEstimated: 1,
        flaggedForRescrape: 1,
        durationMs: 37,
      })
      assert.deepEqual(mock.updates, [
        {
          kind: 'confidence_decay',
          ingredientId: 'slightly-stale-produce',
          pricingRegionId: 'region-1',
          confidence: 0.707,
        },
      ])
      assert.equal(
        mock.updates.some((update) => update.ingredientId === 'fresh-produce'),
        false
      )
    } finally {
      restore()
    }
  })

  it('re-estimates very stale or synthetic prices from category averages', async () => {
    const mock = createFreshnessPgMock({
      prices: [
        {
          ingredientId: 'old-synthetic',
          name: 'Synthetic Milk',
          category: 'dairy',
          ageDays: 12,
          isSynthetic: true,
          priceCents: 999,
        },
        {
          ingredientId: 'fresh-benchmark-a',
          name: 'Benchmark Milk A',
          category: 'dairy',
          ageDays: 2,
          isSynthetic: false,
          priceCents: 400,
        },
        {
          ingredientId: 'fresh-benchmark-b',
          name: 'Benchmark Milk B',
          category: 'dairy',
          ageDays: 3,
          isSynthetic: false,
          priceCents: 500,
        },
      ],
    })
    const { mod, restore } = loadFreshnessEnforcer(mock.pgClient)

    try {
      const result = await withMockedConsoleAndClock(12, () => mod.enforcesFreshness())

      assert.equal(result.totalStale, 1)
      assert.equal(result.reEstimated, 1)
      assert.equal(result.flaggedForRescrape, 1)
      assert.deepEqual(mock.updates, [
        {
          kind: 'category_reestimate',
          ingredientId: 'old-synthetic',
          pricingRegionId: 'region-1',
          priceCents: 450,
          confidence: 0.06,
        },
      ])
    } finally {
      restore()
    }
  })
})

describe('PIE Freshness Enforcer - edge cases', () => {
  it('returns an all-zero report for an empty price table', async () => {
    const mock = createFreshnessPgMock({ prices: [] })
    const { mod, restore } = loadFreshnessEnforcer(mock.pgClient)

    try {
      const report = await mod.getFreshnessReport()

      assert.deepEqual(report, {
        totalPrices: 0,
        fresh: 0,
        stale: 0,
        stalePct: 0,
        byCategory: [],
        oldestPrice: null,
      })
    } finally {
      restore()
    }
  })

  it('does not update anything when all prices are fresh', async () => {
    const mock = createFreshnessPgMock({
      prices: [
        { ingredientId: 'fresh-produce', name: 'Fresh Produce', category: 'produce', ageDays: 2 },
        { ingredientId: 'fresh-spice', name: 'Fresh Spice', category: 'spices', ageDays: 20 },
      ],
    })
    const { mod, restore } = loadFreshnessEnforcer(mock.pgClient)

    try {
      const result = await withMockedConsoleAndClock(5, () => mod.enforcesFreshness())

      assert.deepEqual(result, {
        totalStale: 0,
        reEstimated: 0,
        flaggedForRescrape: 0,
        durationMs: 5,
      })
      assert.deepEqual(mock.updates, [])
    } finally {
      restore()
    }
  })

  it('flags every price when all prices are stale', async () => {
    const mock = createFreshnessPgMock({
      prices: [
        {
          ingredientId: 'stale-produce',
          name: 'Stale Produce',
          category: 'produce',
          ageDays: 8,
          isSynthetic: false,
        },
        {
          ingredientId: 'stale-spice',
          name: 'Stale Spice',
          category: 'spices',
          ageDays: 100,
          isSynthetic: false,
        },
      ],
    })
    const { mod, restore } = loadFreshnessEnforcer(mock.pgClient)

    try {
      const result = await withMockedConsoleAndClock(9, () => mod.enforcesFreshness())

      assert.equal(result.totalStale, 2)
      assert.equal(result.reEstimated, 2)
      assert.equal(result.flaggedForRescrape, 2)
      assert.equal(mock.updates.length, 2)
      assert.equal(
        mock.updates.every((update) => update.kind === 'confidence_decay'),
        true
      )
    } finally {
      restore()
    }
  })
})
