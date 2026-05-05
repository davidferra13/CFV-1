/**
 * USDA/BLS Government Feed Puller
 *
 * Ingests official government food price data as Tier 7 pricing signals.
 * Two sources:
 *
 *   1. USDA ERS - Average food prices by category (monthly, national + regional)
 *      API: https://quickstats.nass.usda.gov/api (NASS QuickStats)
 *      Also: FoodData Central for nutrient/category data
 *
 *   2. BLS CPI - Consumer Price Index for food items
 *      API: https://api.bls.gov/publicAPI/v2/timeseries/data/
 *      Series: CUUR0000SAF (Food at home), CUUR0000SEFV (Fruits/veg), etc.
 *
 * These prices are always stale (1-2 month lag) but authoritative.
 * Used as Tier 7 in resolve-price: no expiry, low confidence, national baseline.
 * Critical for ingredients with zero other data sources.
 *
 * NOT a 'use server' file. Called by cron endpoint.
 */

import { pgClient as sql } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GovernmentPricePoint {
  ingredientCategory: string
  itemName: string
  priceCents: number
  unit: string
  period: string // YYYY-MM
  source: 'usda_ers' | 'bls_cpi'
  seriesId: string | null
  region: string // 'national' or region name
  adjustedForInflation: boolean
}

export interface GovernmentFeedResult {
  fetched: number
  ingested: number
  skipped: number
  errors: string[]
  durationMs: number
  source: string
}

// ---------------------------------------------------------------------------
// BLS CPI Series IDs (Food at Home subcategories)
// ---------------------------------------------------------------------------

const BLS_FOOD_SERIES: Record<string, { seriesId: string; category: string; unit: string }> = {
  // National average prices (AP series)
  flour_white: { seriesId: 'APU0000701111', category: 'grain', unit: 'lb' },
  rice_white: { seriesId: 'APU0000701312', category: 'grain', unit: 'lb' },
  bread_white: { seriesId: 'APU0000702111', category: 'bread', unit: 'lb' },
  bread_wheat: { seriesId: 'APU0000702212', category: 'bread', unit: 'lb' },
  ground_beef: { seriesId: 'APU0000703112', category: 'protein', unit: 'lb' },
  ground_beef_lean: { seriesId: 'APU0000703111', category: 'protein', unit: 'lb' },
  chuck_roast: { seriesId: 'APU0000703212', category: 'protein', unit: 'lb' },
  round_steak: { seriesId: 'APU0000703311', category: 'protein', unit: 'lb' },
  sirloin_steak: { seriesId: 'APU0000703511', category: 'protein', unit: 'lb' },
  pork_chops: { seriesId: 'APU0000704111', category: 'protein', unit: 'lb' },
  bacon: { seriesId: 'APU0000704211', category: 'protein', unit: 'lb' },
  ham: { seriesId: 'APU0000704311', category: 'protein', unit: 'lb' },
  chicken_whole: { seriesId: 'APU0000706111', category: 'protein', unit: 'lb' },
  chicken_breast: { seriesId: 'APU0000706212', category: 'protein', unit: 'lb' },
  chicken_legs: { seriesId: 'APU0000706311', category: 'protein', unit: 'lb' },
  turkey: { seriesId: 'APU0000706411', category: 'protein', unit: 'lb' },
  eggs: { seriesId: 'APU0000708111', category: 'dairy', unit: 'dozen' },
  milk_whole: { seriesId: 'APU0000709112', category: 'dairy', unit: 'gal' },
  milk_reduced_fat: { seriesId: 'APU0000709212', category: 'dairy', unit: 'gal' },
  butter: { seriesId: 'APU0000FS1101', category: 'dairy', unit: 'lb' },
  cheese_cheddar: { seriesId: 'APU0000710212', category: 'dairy', unit: 'lb' },
  cheese_american: { seriesId: 'APU0000710111', category: 'dairy', unit: 'lb' },
  ice_cream: { seriesId: 'APU0000710411', category: 'dairy', unit: 'half_gal' },
  apples_red_delicious: { seriesId: 'APU0000711111', category: 'produce', unit: 'lb' },
  bananas: { seriesId: 'APU0000711211', category: 'produce', unit: 'lb' },
  oranges_navel: { seriesId: 'APU0000711311', category: 'produce', unit: 'lb' },
  strawberries: { seriesId: 'APU0000711415', category: 'produce', unit: 'lb' },
  grapes_thompson: { seriesId: 'APU0000711414', category: 'produce', unit: 'lb' },
  lemons: { seriesId: 'APU0000711412', category: 'produce', unit: 'lb' },
  potatoes_white: { seriesId: 'APU0000712111', category: 'produce', unit: 'lb' },
  lettuce_iceberg: { seriesId: 'APU0000712211', category: 'produce', unit: 'head' },
  tomatoes: { seriesId: 'APU0000712311', category: 'produce', unit: 'lb' },
  broccoli: { seriesId: 'APU0000712411', category: 'produce', unit: 'lb' },
  celery: { seriesId: 'APU0000712412', category: 'produce', unit: 'lb' },
  corn_sweet: { seriesId: 'APU0000712413', category: 'produce', unit: 'lb' },
  onions: { seriesId: 'APU0000712414', category: 'produce', unit: 'lb' },
  peppers_sweet: { seriesId: 'APU0000712415', category: 'produce', unit: 'lb' },
  potatoes_frozen_fries: { seriesId: 'APU0000712501', category: 'frozen', unit: 'lb' },
  sugar_white: { seriesId: 'APU0000715111', category: 'baking', unit: 'lb' },
  coffee: { seriesId: 'APU0000717311', category: 'beverage', unit: 'lb' },
  peanut_butter: { seriesId: 'APU0000718311', category: 'condiment', unit: 'lb' },
  tuna_canned: { seriesId: 'APU0000707111', category: 'canned', unit: 'lb' },
  orange_juice_frozen: { seriesId: 'APU0000713111', category: 'frozen', unit: '12oz' },
  vegetable_oil: { seriesId: 'APU0000FS1201', category: 'oil', unit: '32oz' },
}

// Regional series prefixes (substitute for APU0000 above)
const BLS_REGIONS: Record<string, string> = {
  northeast: 'APU0100',
  midwest: 'APU0200',
  south: 'APU0300',
  west: 'APU0400',
}

// ---------------------------------------------------------------------------
// BLS API Client
// ---------------------------------------------------------------------------

const BLS_API_BASE = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'
const BLS_API_KEY = process.env.BLS_API_KEY || '' // Free tier: 25 queries/day

interface BlsResponse {
  status: string
  Results: {
    series: Array<{
      seriesID: string
      data: Array<{
        year: string
        period: string // M01-M12
        periodName: string
        value: string
        footnotes: Array<{ code: string; text: string }>
      }>
    }>
  }
}

/**
 * Fetch BLS price data for a set of series IDs.
 * BLS allows up to 50 series per request, 2 years of data.
 */
async function fetchBlsSeries(
  seriesIds: string[],
  startYear?: number,
  endYear?: number
): Promise<BlsResponse | null> {
  const currentYear = new Date().getFullYear()
  const body = {
    seriesid: seriesIds,
    startyear: String(startYear || currentYear - 1),
    endyear: String(endYear || currentYear),
    registrationkey: BLS_API_KEY || undefined,
  }

  try {
    const response = await fetch(BLS_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) return null
    return (await response.json()) as BlsResponse
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Price Parsing
// ---------------------------------------------------------------------------

/**
 * Convert BLS dollar value string to cents.
 */
function dollarsToCents(value: string): number {
  const dollars = parseFloat(value)
  if (isNaN(dollars)) return 0
  return Math.round(dollars * 100)
}

// ---------------------------------------------------------------------------
// Ingestion Pipeline
// ---------------------------------------------------------------------------

/**
 * Pull latest BLS average food prices and store as government tier data.
 * Fetches national + 4 regional series for comprehensive coverage.
 */
export async function pullBlsPrices(opts?: {
  region?: 'national' | 'northeast' | 'midwest' | 'south' | 'west'
  startYear?: number
}): Promise<GovernmentFeedResult> {
  const start = Date.now()
  const errors: string[] = []
  let fetched = 0
  let ingested = 0
  let skipped = 0

  // Build series ID list
  const seriesIds: string[] = []
  const seriesMap = new Map<
    string,
    { itemName: string; category: string; unit: string; region: string }
  >()

  const regions = opts?.region
    ? [opts.region]
    : ['national', 'northeast', 'midwest', 'south', 'west']

  for (const region of regions) {
    const prefix = region === 'national' ? 'APU0000' : BLS_REGIONS[region]
    if (!prefix) continue

    for (const [itemName, meta] of Object.entries(BLS_FOOD_SERIES)) {
      // Replace national prefix with regional prefix
      const regionalId = meta.seriesId.replace('APU0000', prefix)
      seriesIds.push(regionalId)
      seriesMap.set(regionalId, { itemName, category: meta.category, unit: meta.unit, region })
    }
  }

  // BLS allows 50 series per request; chunk
  const CHUNK_SIZE = 50
  const points: GovernmentPricePoint[] = []

  for (let i = 0; i < seriesIds.length; i += CHUNK_SIZE) {
    const chunk = seriesIds.slice(i, i + CHUNK_SIZE)
    const response = await fetchBlsSeries(chunk, opts?.startYear)

    if (!response || response.status !== 'REQUEST_SUCCEEDED') {
      errors.push(`BLS request failed for chunk ${i / CHUNK_SIZE}`)
      continue
    }

    for (const series of response.Results.series) {
      const meta = seriesMap.get(series.seriesID)
      if (!meta) continue

      for (const dataPoint of series.data) {
        // Skip annual averages (M13) and footnoted/unavailable data
        if (dataPoint.period === 'M13') continue
        if (dataPoint.footnotes.some((f) => f.code === 'N' || f.code === 'U')) continue

        const priceCents = dollarsToCents(dataPoint.value)
        if (priceCents <= 0) continue

        const month = dataPoint.period.replace('M', '').padStart(2, '0')
        const period = `${dataPoint.year}-${month}`

        points.push({
          ingredientCategory: meta.category,
          itemName: meta.itemName.replace(/_/g, ' '),
          priceCents,
          unit: meta.unit,
          period,
          source: 'bls_cpi',
          seriesId: series.seriesID,
          region: meta.region,
          adjustedForInflation: false,
        })
        fetched++
      }
    }
  }

  // Ingest into database
  for (const point of points) {
    try {
      await sql`
        INSERT INTO pie_government_prices
        (item_name, category, price_cents, unit, period, source, series_id, region, created_at)
        VALUES (${point.itemName}, ${point.ingredientCategory}, ${point.priceCents}, ${point.unit}, ${point.period}, ${point.source}, ${point.seriesId}, ${point.region}, NOW())
        ON CONFLICT (series_id, period) DO UPDATE
        SET price_cents = EXCLUDED.price_cents
      `
      ingested++
    } catch (e) {
      skipped++
      if (errors.length < 5) {
        errors.push(e instanceof Error ? e.message : 'insert failed')
      }
    }
  }

  return {
    fetched,
    ingested,
    skipped,
    errors,
    durationMs: Date.now() - start,
    source: 'bls_cpi',
  }
}

/**
 * Get the most recent government price for an ingredient category.
 * Used by resolve-price Tier 7 when no other data exists.
 */
export async function getGovernmentPrice(
  itemName: string,
  region?: string
): Promise<{ priceCents: number; unit: string; period: string; source: string } | null> {
  const normalizedName = itemName.replace(/ /g, '_').toLowerCase()

  const rows =
    region && region !== 'national'
      ? await sql`
        SELECT price_cents, unit, period, source, region
        FROM pie_government_prices
        WHERE item_name = ${normalizedName} AND region IN (${region}, 'national')
        ORDER BY period DESC, CASE WHEN region != 'national' THEN 0 ELSE 1 END
        LIMIT 1
      `
      : await sql`
        SELECT price_cents, unit, period, source, region
        FROM pie_government_prices
        WHERE item_name = ${normalizedName} AND region = 'national'
        ORDER BY period DESC
        LIMIT 1
      `

  if (rows.length === 0) return null
  const row = rows[0]
  return {
    priceCents: row.price_cents,
    unit: row.unit,
    period: row.period,
    source: row.source,
  }
}

/**
 * Get inflation trend for a food category over time.
 * Returns monthly price changes useful for Layer 2 trend intelligence.
 */
export async function getCategoryInflationTrend(
  category: string,
  months = 12
): Promise<Array<{ period: string; avgCents: number; changePct: number }>> {
  const dbRows = await sql`
    SELECT period, AVG(price_cents) as avg_cents
    FROM pie_government_prices
    WHERE category = ${category} AND region = 'national'
    GROUP BY period
    ORDER BY period DESC
    LIMIT ${months}
  `

  const rows = [...dbRows].reverse() as Array<{ period: string; avg_cents: string }>
  return rows.map((row, i) => {
    const avgCents = parseFloat(row.avg_cents)
    const prevCents = i > 0 ? parseFloat(rows[i - 1].avg_cents) : avgCents
    const changePct = prevCents > 0 ? ((avgCents - prevCents) / prevCents) * 100 : 0
    return {
      period: row.period,
      avgCents: Math.round(avgCents),
      changePct: Math.round(changePct * 10) / 10,
    }
  })
}
