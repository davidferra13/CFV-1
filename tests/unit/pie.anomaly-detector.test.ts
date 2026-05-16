import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const NOW = new Date('2026-05-15T18:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

type PriceObservation = {
  ingredientId: string
  ingredientName: string
  storeName: string
  cents: number
  purchaseDate: Date
  source?: string
}

type SourceObservation = {
  storeName: string
  source: string
  purchaseDate: Date
}

type RecordedAnomaly = {
  ingredientId: unknown
  storeName: unknown
  anomalyType: unknown
  severity: unknown
  previousCents: unknown
  currentCents: unknown
  changePct: unknown
}

type QuarantinedPrice = {
  ingredientId: unknown
  storeName: unknown
  priceCents: unknown
  severity: unknown
  rawData: Record<string, unknown>
}

type PgClientMock = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>) & {
  unsafe: (value: string) => string
}

type MockOptions = {
  prices?: PriceObservation[]
  sources?: SourceObservation[]
}

const originalDateNow = Date.now

afterEach(() => {
  Date.now = originalDateNow
})

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY_MS)
}

function hoursAgo(hours: number) {
  return new Date(NOW.getTime() - hours * HOUR_MS)
}

function sqlText(strings: TemplateStringsArray): string {
  return strings.join(' ')
}

function roundChangePct(currentCents: number, priorAvgCents: number) {
  return (
    Math.round(((currentCents - Math.max(priorAvgCents, 1)) / Math.max(priorAvgCents, 1)) * 1000) /
    10
  )
}

function createAnomalyPgMock(options: MockOptions = {}) {
  const recordedAnomalies: RecordedAnomaly[] = []
  const quarantinedPrices: QuarantinedPrice[] = []

  const pgClient: PgClientMock = Object.assign(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = sqlText(strings)

      if (sql.includes('WITH recent_prices AS')) {
        const thresholdPct = Number(values[0])
        return computePriceRows(options.prices ?? [], thresholdPct)
      }

      if (sql.includes('EXTRACT(EPOCH FROM (now() - MAX(purchase_date)))')) {
        return computeBlackoutRows(options.sources ?? [])
      }

      if (sql.includes('INSERT INTO openclaw.price_anomalies')) {
        recordedAnomalies.push({
          ingredientId: values[0],
          storeName: values[1],
          anomalyType: values[2],
          severity: values[3],
          previousCents: values[5],
          currentCents: values[6],
          changePct: values[7],
        })
        return []
      }

      if (sql.includes('INSERT INTO openclaw.quarantined_prices')) {
        quarantinedPrices.push({
          ingredientId: values[0],
          storeName: values[1],
          priceCents: values[2],
          severity: values[4],
          rawData: JSON.parse(String(values[5])),
        })
        return []
      }

      throw new Error(`Unexpected anomaly detector query: ${sql}`)
    },
    {
      unsafe: (value: string) => value,
    }
  )

  return { pgClient, recordedAnomalies, quarantinedPrices }
}

function computePriceRows(prices: PriceObservation[], thresholdPct: number) {
  const recentCutoff = NOW.getTime() - DAY_MS

  return prices
    .filter((current) => current.purchaseDate.getTime() > recentCutoff && current.cents > 0)
    .map((current) => {
      const priorPrices = prices.filter(
        (prior) =>
          prior.ingredientId === current.ingredientId &&
          prior.storeName === current.storeName &&
          prior.purchaseDate < current.purchaseDate &&
          prior.purchaseDate.getTime() > current.purchaseDate.getTime() - 30 * DAY_MS
      )

      if (priorPrices.length < 2) return null

      const avgPriorCents =
        priorPrices.reduce((sum, prior) => sum + prior.cents, 0) / priorPrices.length
      const changePct = roundChangePct(current.cents, avgPriorCents)

      if (Math.abs(changePct) <= thresholdPct) return null

      return {
        ingredient_id: current.ingredientId,
        ingredient_name: current.ingredientName,
        store_name: current.storeName,
        current_cents: current.cents,
        purchase_date: current.purchaseDate,
        source: current.source ?? 'openclaw_scrape',
        avg_prior_cents: avgPriorCents,
        prior_count: priorPrices.length,
        change_pct: changePct,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => Math.abs(Number(b.change_pct)) - Math.abs(Number(a.change_pct)))
    .slice(0, 100)
}

function computeBlackoutRows(sources: SourceObservation[]) {
  const supportedSources = new Set(['openclaw_scrape', 'openclaw_flyer', 'openclaw_instacart'])
  const sixtyDaysAgo = NOW.getTime() - 60 * DAY_MS
  const thirtyDaysAgo = NOW.getTime() - 30 * DAY_MS
  const grouped = new Map<string, SourceObservation[]>()

  for (const row of sources) {
    if (!supportedSources.has(row.source)) continue
    if (row.purchaseDate.getTime() <= sixtyDaysAgo) continue

    const key = `${row.storeName}\u0000${row.source}`
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }

  return [...grouped.entries()]
    .map(([key, rows]) => {
      const [storeName, source] = key.split('\u0000')
      const lastSeen = new Date(Math.max(...rows.map((row) => row.purchaseDate.getTime())))
      const recentCount = rows.filter((row) => row.purchaseDate.getTime() > thirtyDaysAgo).length
      const hoursSilent = (NOW.getTime() - lastSeen.getTime()) / HOUR_MS

      if (hoursSilent <= 48 || recentCount <= 10) return null

      return {
        store_name: storeName,
        source,
        last_seen: lastSeen,
        recent_count: recentCount,
        hours_silent: hoursSilent,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => Number(b.hours_silent) - Number(a.hours_silent))
    .slice(0, 50)
}

function loadAnomalyDetector(pgClient: PgClientMock) {
  const dbPath = require.resolve('../../lib/db/index.ts')
  const modulePath = require.resolve('../../lib/pricing/anomaly-detector.ts')

  require(dbPath)

  const originalDb = require.cache[dbPath]!.exports

  require.cache[dbPath]!.exports = {
    ...originalDb,
    pgClient,
  }

  delete require.cache[modulePath]
  const mod = require(modulePath)

  const restore = () => {
    require.cache[dbPath]!.exports = originalDb
    delete require.cache[modulePath]
  }

  return { mod, restore }
}

async function runWithMock(options: MockOptions = {}) {
  const mock = createAnomalyPgMock(options)
  const { mod, restore } = loadAnomalyDetector(mock.pgClient)
  let nowCalls = 0
  Date.now = () => (nowCalls++ === 0 ? NOW.getTime() : NOW.getTime() + 37)

  try {
    const result = await mod.runAnomalyDetection()
    return { ...mock, result }
  } finally {
    restore()
  }
}

function priorBaseline(overrides: Partial<PriceObservation> = {}): PriceObservation[] {
  return [
    {
      ingredientId: 'chicken',
      ingredientName: 'Chicken Breast',
      storeName: 'Restaurant Depot',
      cents: 500,
      purchaseDate: daysAgo(10),
      ...overrides,
    },
    {
      ingredientId: 'chicken',
      ingredientName: 'Chicken Breast',
      storeName: 'Restaurant Depot',
      cents: 500,
      purchaseDate: daysAgo(5),
      ...overrides,
    },
  ]
}

describe('PIE anomaly detector - spike detection', () => {
  it('flags a 3x price increase from the 30-day moving average', async () => {
    const { result, recordedAnomalies, quarantinedPrices } = await runWithMock({
      prices: [
        ...priorBaseline(),
        {
          ingredientId: 'chicken',
          ingredientName: 'Chicken Breast',
          storeName: 'Restaurant Depot',
          cents: 1500,
          purchaseDate: hoursAgo(1),
        },
      ],
    })

    assert.equal(result.anomaliesDetected, 1)
    assert.equal(result.quarantined, 1)
    assert.equal(result.details[0].type, 'price_spike')
    assert.equal(result.details[0].ingredientId, 'chicken')
    assert.equal(result.details[0].previousCents, 500)
    assert.equal(result.details[0].currentCents, 1500)
    assert.equal(result.details[0].changePct, 200)
    assert.equal(result.details[0].severity, 'critical')
    assert.equal(recordedAnomalies[0].anomalyType, 'price_spike')
    assert.equal(quarantinedPrices[0].rawData.type, 'price_spike')
  })

  it('does not flag normal variance or the exact conservative threshold boundary', async () => {
    const { result, quarantinedPrices } = await runWithMock({
      prices: [
        ...priorBaseline({ ingredientId: 'variance', ingredientName: 'Variance Item' }),
        {
          ingredientId: 'variance',
          ingredientName: 'Variance Item',
          storeName: 'Restaurant Depot',
          cents: 550,
          purchaseDate: hoursAgo(1),
        },
        ...priorBaseline({ ingredientId: 'boundary', ingredientName: 'Boundary Item' }),
        {
          ingredientId: 'boundary',
          ingredientName: 'Boundary Item',
          storeName: 'Restaurant Depot',
          cents: 700,
          purchaseDate: hoursAgo(1),
        },
      ],
    })

    assert.equal(result.anomaliesDetected, 0)
    assert.equal(result.quarantined, 0)
    assert.deepEqual(result.details, [])
    assert.deepEqual(quarantinedPrices, [])
  })
})

describe('PIE anomaly detector - drop detection', () => {
  it('flags an 80% price crash from prior observations', async () => {
    const { result, quarantinedPrices } = await runWithMock({
      prices: [
        ...priorBaseline({ ingredientId: 'salmon', ingredientName: 'Salmon' }),
        {
          ingredientId: 'salmon',
          ingredientName: 'Salmon',
          storeName: 'Restaurant Depot',
          cents: 100,
          purchaseDate: hoursAgo(1),
        },
      ],
    })

    assert.equal(result.anomaliesDetected, 1)
    assert.equal(result.details[0].type, 'price_crash')
    assert.equal(result.details[0].previousCents, 500)
    assert.equal(result.details[0].currentCents, 100)
    assert.equal(result.details[0].changePct, -80)
    assert.equal(result.details[0].severity, 'high')
    assert.equal(quarantinedPrices.length, 1)
  })

  it('does not flag a gradual 5% decline over the prior window', async () => {
    const { result } = await runWithMock({
      prices: [
        {
          ingredientId: 'tomato',
          ingredientName: 'Tomato',
          storeName: 'Market Basket',
          cents: 500,
          purchaseDate: daysAgo(21),
        },
        {
          ingredientId: 'tomato',
          ingredientName: 'Tomato',
          storeName: 'Market Basket',
          cents: 488,
          purchaseDate: daysAgo(14),
        },
        {
          ingredientId: 'tomato',
          ingredientName: 'Tomato',
          storeName: 'Market Basket',
          cents: 476,
          purchaseDate: daysAgo(7),
        },
        {
          ingredientId: 'tomato',
          ingredientName: 'Tomato',
          storeName: 'Market Basket',
          cents: 452,
          purchaseDate: hoursAgo(1),
        },
      ],
    })

    assert.equal(result.anomaliesDetected, 0)
  })
})

describe('PIE anomaly detector - source health protection', () => {
  it('flags active openclaw sources that go silent for more than 48 hours', async () => {
    const activeThenSilent = Array.from({ length: 11 }, (_, index) => ({
      storeName: 'US Foods',
      source: 'openclaw_scrape',
      purchaseDate: daysAgo(4 + index),
    }))

    const { result, recordedAnomalies } = await runWithMock({
      sources: activeThenSilent,
    })

    assert.equal(result.anomaliesDetected, 1)
    assert.equal(result.sourceBlackouts, 1)
    assert.equal(result.quarantined, 0)
    assert.equal(result.details[0].type, 'source_blackout')
    assert.equal(result.details[0].ingredientId, null)
    assert.equal(result.details[0].storeName, 'US Foods')
    assert.equal(result.details[0].severity, 'high')
    assert.match(result.details[0].description, /silent for 96h/)
    assert.equal(recordedAnomalies[0].anomalyType, 'source_blackout')
  })

  it('does not flag unsupported, sparse, or currently reporting sources', async () => {
    const { result } = await runWithMock({
      sources: [
        ...Array.from({ length: 11 }, (_, index) => ({
          storeName: 'Unsupported Source',
          source: 'manual_receipt',
          purchaseDate: daysAgo(5 + index),
        })),
        ...Array.from({ length: 4 }, (_, index) => ({
          storeName: 'Sparse Source',
          source: 'openclaw_flyer',
          purchaseDate: daysAgo(5 + index),
        })),
        ...Array.from({ length: 12 }, (_, index) => ({
          storeName: 'Current Source',
          source: 'openclaw_instacart',
          purchaseDate: index === 0 ? hoursAgo(2) : daysAgo(index),
        })),
      ],
    })

    assert.equal(result.anomaliesDetected, 0)
    assert.equal(result.sourceBlackouts, 0)
  })
})

describe('PIE anomaly detector - result structure', () => {
  it('returns run counters, duration, and structured anomaly details', async () => {
    const { result } = await runWithMock({
      prices: [
        ...priorBaseline(),
        {
          ingredientId: 'chicken',
          ingredientName: 'Chicken Breast',
          storeName: 'Restaurant Depot',
          cents: 1500,
          purchaseDate: hoursAgo(1),
        },
      ],
    })

    assert.equal(result.scanned, 1)
    assert.equal(result.anomaliesDetected, 1)
    assert.equal(result.durationMs, 37)
    assert.ok(Array.isArray(result.details))

    const anomaly = result.details[0]
    assert.deepEqual(Object.keys(anomaly).sort(), [
      'changePct',
      'currentCents',
      'description',
      'ingredientId',
      'ingredientName',
      'previousCents',
      'severity',
      'storeName',
      'type',
    ])
  })

  it('returns zero anomalies for an empty price table without crashing', async () => {
    const { result, recordedAnomalies, quarantinedPrices } = await runWithMock()

    assert.equal(result.scanned, 0)
    assert.equal(result.anomaliesDetected, 0)
    assert.equal(result.quarantined, 0)
    assert.equal(result.sourceBlackouts, 0)
    assert.equal(result.durationMs, 37)
    assert.deepEqual(result.details, [])
    assert.deepEqual(recordedAnomalies, [])
    assert.deepEqual(quarantinedPrices, [])
  })
})

describe('PIE anomaly detector - multi-ingredient batch behavior', () => {
  it('records and quarantines only anomalous ingredients in a mixed batch', async () => {
    const { result, recordedAnomalies, quarantinedPrices } = await runWithMock({
      prices: [
        ...priorBaseline({ ingredientId: 'chicken', ingredientName: 'Chicken Breast' }),
        {
          ingredientId: 'chicken',
          ingredientName: 'Chicken Breast',
          storeName: 'Restaurant Depot',
          cents: 1500,
          purchaseDate: hoursAgo(1),
        },
        ...priorBaseline({ ingredientId: 'rice', ingredientName: 'Rice' }),
        {
          ingredientId: 'rice',
          ingredientName: 'Rice',
          storeName: 'Restaurant Depot',
          cents: 525,
          purchaseDate: hoursAgo(1),
        },
        ...priorBaseline({ ingredientId: 'salmon', ingredientName: 'Salmon' }),
        {
          ingredientId: 'salmon',
          ingredientName: 'Salmon',
          storeName: 'Restaurant Depot',
          cents: 100,
          purchaseDate: hoursAgo(1),
        },
      ],
    })

    assert.equal(result.anomaliesDetected, 2)
    assert.deepEqual(result.details.map((detail: any) => detail.ingredientId).sort(), [
      'chicken',
      'salmon',
    ])
    assert.equal(recordedAnomalies.length, 2)
    assert.equal(quarantinedPrices.length, 2)
  })

  it('uses idempotent quarantine inserts so reruns are protected by database conflict handling', async () => {
    const { result, quarantinedPrices } = await runWithMock({
      prices: [
        ...priorBaseline(),
        {
          ingredientId: 'chicken',
          ingredientName: 'Chicken Breast',
          storeName: 'Restaurant Depot',
          cents: 1500,
          purchaseDate: hoursAgo(1),
        },
      ],
    })

    assert.equal(result.quarantined, 1)
    assert.equal(quarantinedPrices.length, 1)
    assert.equal(quarantinedPrices[0].ingredientId, 'chicken')
    assert.equal(quarantinedPrices[0].severity, 'critical')
  })
})
