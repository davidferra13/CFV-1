/**
 * Farmers Market Seasonal Availability
 *
 * Integrates openclaw.farmers_markets seasonal data into price resolution.
 * When a price comes from a farmers market store:
 *   - In-season: confidence boost (+0.10), freshness signal for local produce
 *   - Out-of-season: heavy penalty (x0.3 confidence), market is physically closed
 *   - Year-round (NULL season): no adjustment
 *
 * Uses a cached lookup of market seasons by state to avoid per-price DB hits.
 * Cache refreshes every 30 minutes (market seasons change rarely).
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// --- Types ---

interface MarketSeason {
  name: string
  state: string
  seasonStart: number | null // month 1-12, null = year-round
  seasonEnd: number | null
}

// --- In-memory cache of market seasons by state ---
// Key: uppercase state code, Value: array of market seasons

interface SeasonCache {
  data: Map<string, MarketSeason[]>
  expiry: number
}

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
let seasonCache: SeasonCache | null = null

/**
 * Load all active farmers market seasons, grouped by state.
 * Only loads name, state, season_start, season_end (lightweight).
 */
async function loadMarketSeasons(): Promise<Map<string, MarketSeason[]>> {
  const map = new Map<string, MarketSeason[]>()
  try {
    const rows = (await db.execute(sql`
      SELECT name, state, season_start, season_end
      FROM openclaw.farmers_markets
      WHERE is_active = true
    `)) as unknown as Array<{
      name: string
      state: string
      season_start: number | null
      season_end: number | null
    }>

    for (const row of rows) {
      const state = row.state?.toUpperCase()
      if (!state) continue
      if (!map.has(state)) map.set(state, [])
      map.get(state)!.push({
        name: row.name,
        state,
        seasonStart: row.season_start,
        seasonEnd: row.season_end,
      })
    }
  } catch {
    // Table may not exist yet; return empty map
  }
  return map
}

async function getMarketSeasons(): Promise<Map<string, MarketSeason[]>> {
  if (seasonCache && Date.now() < seasonCache.expiry) {
    return seasonCache.data
  }
  const data = await loadMarketSeasons()
  seasonCache = { data, expiry: Date.now() + CACHE_TTL_MS }
  return data
}

/** Clear the season cache (call after ingestion runs) */
export function invalidateMarketSeasonCache(): void {
  seasonCache = null
}

// --- Season check logic ---

/**
 * Check if a given month falls within a season window.
 * Handles wrapping (e.g., season_start=10, season_end=3 means Oct-Mar).
 */
function isMonthInSeason(month: number, start: number, end: number): boolean {
  if (start <= end) {
    // Normal range: May(5) to October(10)
    return month >= start && month <= end
  }
  // Wrapping range: October(10) to March(3)
  return month >= start || month <= end
}

/**
 * Determine seasonal availability for a store in a given state.
 * Returns:
 *   'in_season'    - market is open, prices are fresh/local
 *   'out_of_season' - market is closed, prices are stale
 *   'year_round'   - no seasonal restriction
 *   'not_market'   - store is not a recognized farmers market
 */
export type MarketSeasonStatus = 'in_season' | 'out_of_season' | 'year_round' | 'not_market'

/**
 * Check if a store name matches a farmers market in the given state,
 * and whether that market is currently in-season.
 *
 * Uses fuzzy matching: the store name must contain a significant portion
 * of the market name (or vice versa) to match.
 */
export async function getMarketSeasonStatus(
  storeName: string | null,
  state: string | null
): Promise<MarketSeasonStatus> {
  if (!storeName) return 'not_market'

  // Quick heuristic: if the store name contains "market", "farm", or "farmers"
  // it is worth checking against the database. Otherwise skip entirely.
  const lowerStore = storeName.toLowerCase()
  const isLikelyMarket =
    lowerStore.includes('market') ||
    lowerStore.includes('farm') ||
    lowerStore.includes('stand') ||
    lowerStore.includes('co-op') ||
    lowerStore.includes('coop')

  if (!isLikelyMarket) return 'not_market'

  const seasons = await getMarketSeasons()

  // Check the specific state first, then try without state constraint
  const statesToCheck = state ? [state.toUpperCase()] : Array.from(seasons.keys())
  const currentMonth = new Date().getMonth() + 1 // 1-12

  for (const st of statesToCheck) {
    const markets = seasons.get(st)
    if (!markets) continue

    for (const market of markets) {
      // Fuzzy match: check if store name is a substring of market name or vice versa
      const lowerMarket = market.name.toLowerCase()
      if (lowerStore.includes(lowerMarket) || lowerMarket.includes(lowerStore)) {
        // Match found
        if (market.seasonStart === null || market.seasonEnd === null) {
          return 'year_round'
        }
        return isMonthInSeason(currentMonth, market.seasonStart, market.seasonEnd)
          ? 'in_season'
          : 'out_of_season'
      }
    }
  }

  // No match found in DB, but the name suggests it could be a market.
  // For stores with "farmers market" in name, apply a generic NE season (May-Nov)
  if (lowerStore.includes('farmers market') || lowerStore.includes("farmer's market")) {
    const genericStart = 5 // May
    const genericEnd = 11 // November
    return isMonthInSeason(currentMonth, genericStart, genericEnd) ? 'in_season' : 'out_of_season'
  }

  return 'not_market'
}

// --- Confidence adjustment ---

/**
 * Seasonal confidence multiplier for farmers market prices.
 * Returns a multiplier to apply to the base confidence:
 *   in_season:     1.15 (15% boost, fresh local produce)
 *   year_round:    1.05 (slight boost, always available)
 *   out_of_season: 0.25 (75% penalty, market is closed)
 *   not_market:    1.0  (no adjustment)
 */
export function seasonalConfidenceMultiplier(status: MarketSeasonStatus): number {
  switch (status) {
    case 'in_season':
      return 1.15
    case 'year_round':
      return 1.05
    case 'out_of_season':
      return 0.25
    case 'not_market':
      return 1.0
  }
}

/**
 * Whether to completely exclude a price from resolution based on season.
 * Out-of-season farmers market prices should be skipped entirely
 * (the market is physically closed, the price is meaningless).
 */
export function shouldExcludeForSeason(status: MarketSeasonStatus): boolean {
  return status === 'out_of_season'
}
