/**
 * Pi Price Bridge Client
 *
 * Queries the OpenClaw Price API running on the Raspberry Pi over direct ethernet.
 * Sub-5ms latency for real-time pricing against 1.1M+ live prices.
 *
 * The Pi API exposes prices.db (2.8GB SQLite) with 143K canonical ingredients,
 * 1.1M current prices, and 37K store locations.
 *
 * Falls back gracefully when Pi is unreachable (returns null, caller uses
 * existing PostgreSQL resolution chain).
 */

const PI_BRIDGE_URL = process.env.PI_BRIDGE_URL || 'http://10.0.0.177:7700'
const TIMEOUT_MS = 2000 // 2s max - if Pi doesn't respond, skip it

// --- Types ---

export interface PiBridgeIngredient {
  id: string
  name: string
  category: string | null
  standard_unit: string | null
}

export interface PiBridgePrice {
  price_cents: number | null
  price_unit: string | null
  price_per_standard_unit_cents: number | null
  standard_unit: string | null
  confidence: string | null
  last_confirmed_at: string | null
  price_type: string | null
  product_name: string | null
  in_stock: boolean
  store: string | null
  state: string | null
  city: string | null
}

export interface PiBridgeSingleResult {
  ingredient: PiBridgeIngredient
  prices: PiBridgePrice[]
  count: number
  query_ms: number
}

export interface PiBridgeBatchItem {
  ingredient_id: string
  canonical_name: string
  category: string | null
  avg_cents: number | null
  min_cents: number | null
  max_cents: number | null
  observation_count: number
  freshest: string | null
  unit: string
}

export interface PiBridgeBatchResult {
  results: Record<string, PiBridgeBatchItem | null>
  query_ms: number
  count: number
}

export interface PiBridgeHealth {
  status: string
  db_size_mb: number
  total_prices: number
  timestamp: string
}

// --- Internal fetch helper ---

async function piFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(`${PI_BRIDGE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    // Pi unreachable, timeout, or parse error - graceful degradation
    return null
  }
}

// --- Public API ---

/**
 * Check if the Pi bridge is reachable and healthy.
 */
export async function isPiBridgeAvailable(): Promise<boolean> {
  const health = await piFetch<PiBridgeHealth>('/health')
  return health?.status === 'ok'
}

/**
 * Get health/stats from Pi bridge.
 */
export async function getPiBridgeHealth(): Promise<PiBridgeHealth | null> {
  return piFetch<PiBridgeHealth>('/health')
}

/**
 * Look up a single ingredient price by name.
 * Returns the best available prices from 1.1M+ live price observations.
 *
 * @param name - Ingredient name (exact or partial match)
 * @param state - Optional state filter (e.g., "MA") for regional pricing
 */
export async function lookupPrice(
  name: string,
  state?: string
): Promise<PiBridgeSingleResult | null> {
  const params = new URLSearchParams({ name })
  if (state) params.set('state', state)
  return piFetch<PiBridgeSingleResult>(`/price?${params}`)
}

/**
 * Batch lookup prices for multiple ingredients.
 * Returns aggregated stats (avg, min, max, observation count) per ingredient.
 * Max 100 ingredients per call.
 *
 * @param names - Array of ingredient names to look up
 * @param state - Optional state filter for regional pricing
 */
export async function lookupPricesBatch(
  names: string[],
  state?: string
): Promise<PiBridgeBatchResult | null> {
  if (names.length === 0) return null
  return piFetch<PiBridgeBatchResult>('/prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names: names.slice(0, 100), state }),
  })
}

/**
 * Search for ingredients by partial name.
 * Useful for autocomplete and fuzzy matching.
 *
 * @param query - Partial ingredient name to search
 * @param limit - Max results (default 20, max 50)
 */
export async function searchIngredients(
  query: string,
  limit = 20
): Promise<PiBridgeIngredient[] | null> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  const result = await piFetch<{ ingredients: PiBridgeIngredient[]; count: number }>(
    `/search?${params}`
  )
  return result?.ingredients ?? null
}

/**
 * Get stores in a state.
 *
 * @param state - Two-letter state code (e.g., "MA")
 */
export async function getStoresByState(
  state: string
): Promise<Array<{
  name: string
  brand: string
  city: string
  state: string
  zip: string
  chain: string
}> | null> {
  const result = await piFetch<{
    stores: Array<{
      name: string
      brand: string
      city: string
      state: string
      zip: string
      chain: string
    }>
    count: number
  }>(`/stores?state=${encodeURIComponent(state)}`)
  return result?.stores ?? null
}
