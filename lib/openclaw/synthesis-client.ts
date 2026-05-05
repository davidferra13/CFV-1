/**
 * OpenClaw Synthesis Client
 * Pulls live synthesis data from Pi dashboard API (port 8090).
 * No ChefFlow tables needed; Pi is source of truth for synthesis data.
 *
 * Available datasets: anomalies, seasonal_scores, store_rankings,
 * price_velocity, recall_alerts, category_benchmarks, substitutions, local_markets
 */

'use server'

import { requireChef } from '@/lib/auth/get-user'

const PI_SYNTHESIS_BASE = 'http://10.0.0.177:8090/api/synthesis'
const TIMEOUT_MS = 10000

// --- Types ---

export interface AnomalyAlert {
  id: number
  ingredient_id: string
  ingredient_name: string
  category: string
  severity: number
  direction: 'spike' | 'drop'
  magnitude_pct: number
  affected_stores: string
  message: string
  is_food: number
  created_at: string
  expires_at: string | null
  synced_to_chefflow: number
}

export interface RecallAlert {
  id: number
  ingredient_name: string
  recall_number: string
  reason: string
  severity: number
  status: string
  recalling_firm: string
  distribution: string
  created_at: string
  synced_to_chefflow: number
}

export interface SeasonalScore {
  ingredient_name: string
  month: number
  availability_score: number
  price_percentile: number
  value_score: number
  status: string
  region: string
  updated_at: string
}

export interface StoreRanking {
  ingredient_name: string
  store_name: string
  chain_slug: string
  avg_price_cents: number
  vs_market_pct: number
  rank: number
  sample_size: number
  category: string
  updated_at: string
}

export interface PriceVelocity {
  ingredient_name: string
  change_count_7d: number
  change_count_30d: number
  volatility_30d: number
  trend_direction: string
  trend_acceleration: string
  stability_score: number
  status: string
  updated_at: string
}

export interface Substitution {
  ingredient_name: string
  substitute_name: string
  category: string
  price_delta_pct: number
  seasonal_match: number
  confidence: number
  reason: string
  updated_at: string
}

export interface CategoryBenchmark {
  category: string
  avg_price_cents: number
  median_price_cents: number
  min_price_cents: number
  max_price_cents: number
  sample_size: number
}

export interface LocalMarket {
  market_name: string
  lat: number
  lng: number
  open_season: string
  open_days: string
  product_count: number
  is_open_this_week: number
  updated_at: string
}

// --- Fetch helper ---

async function fetchSynthesis<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T[] | null> {
  try {
    const url = new URL(`${PI_SYNTHESIS_BASE}/${endpoint}`)
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    }

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })

    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? json ?? null
  } catch {
    return null
  }
}

// --- Chef-only API ---

/** Get active price anomalies (spikes and drops). Severity 1-5, default >= 3. */
export async function getAnomalyAlerts(opts?: {
  severity?: number
  limit?: number
  foodOnly?: boolean
}): Promise<AnomalyAlert[]> {
  await requireChef()
  const data = await fetchSynthesis<AnomalyAlert>('anomalies', {
    severity: String(opts?.severity ?? 3),
    limit: String(opts?.limit ?? 50),
    food_only: opts?.foodOnly === false ? '0' : '1',
  })
  return data ?? []
}

/** Get active FDA recall alerts. */
export async function getRecallAlerts(): Promise<RecallAlert[]> {
  await requireChef()
  const data = await fetchSynthesis<RecallAlert>('recalls')
  return data ?? []
}

/** Get seasonal availability scores for current month. */
export async function getSeasonalScores(opts?: { limit?: number }): Promise<SeasonalScore[]> {
  await requireChef()
  const data = await fetchSynthesis<SeasonalScore>('seasonal', {
    limit: String(opts?.limit ?? 100),
  })
  return data ?? []
}

/** Get cheapest stores per ingredient (top 5 per ingredient). */
export async function getStoreRankings(ingredientName?: string): Promise<StoreRanking[]> {
  await requireChef()
  const params: Record<string, string> = {}
  if (ingredientName) params.ingredient = ingredientName
  const data = await fetchSynthesis<StoreRanking>('store-rankings', params)
  return data ?? []
}

/** Get price volatility data. */
export async function getPriceVelocity(): Promise<PriceVelocity[]> {
  await requireChef()
  const data = await fetchSynthesis<PriceVelocity>('velocity')
  return data ?? []
}

/** Get ingredient substitution suggestions. */
export async function getSubstitutions(ingredientName?: string): Promise<Substitution[]> {
  await requireChef()
  const params: Record<string, string> = {}
  if (ingredientName) params.ingredient = ingredientName
  const data = await fetchSynthesis<Substitution>('substitutions', params)
  return data ?? []
}

/** Get category price benchmarks. */
export async function getCategoryBenchmarks(): Promise<CategoryBenchmark[]> {
  await requireChef()
  const data = await fetchSynthesis<CategoryBenchmark>('benchmarks')
  return data ?? []
}

/** Get farmers markets open this week. */
export async function getLocalMarkets(): Promise<LocalMarket[]> {
  await requireChef()
  const data = await fetchSynthesis<LocalMarket>('local-markets')
  return data ?? []
}

/** Quick health check: is synthesis API reachable? Chef-only. */
export async function isSynthesisAvailable(): Promise<boolean> {
  await requireChef()
  try {
    const res = await fetch(`${PI_SYNTHESIS_BASE}/anomalies?limit=1`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}
