/**
 * Pi Price Bridge Client
 *
 * Queries the OpenClaw Price API running on the Raspberry Pi over direct ethernet.
 * Sub-5ms latency for real-time pricing against 1.1M+ live prices.
 *
 * The Pi API exposes prices.db (2.8GB SQLite) with 143K canonical ingredients,
 * 1.1M current prices, and 477K+ store locations (synced nightly from PostgreSQL).
 *
 * Falls back gracefully when Pi is unreachable (returns null, caller uses
 * existing PostgreSQL resolution chain).
 */

const PI_BRIDGE_URL = process.env.PI_BRIDGE_URL || 'http://10.0.0.177:7700'
const PI_BRIDGE_SECRET = process.env.PI_BRIDGE_SECRET || ''
const TIMEOUT_MS = 2000 // 2s max - if Pi doesn't respond, skip it

// --- Circuit Breaker ---
// States: CLOSED (normal) -> OPEN (failing, skip requests) -> HALF_OPEN (probe one request)
// Prevents wasting 2s per request when Pi is known-dead.

type CircuitState = 'closed' | 'open' | 'half_open'

const circuit = {
  state: 'closed' as CircuitState,
  failures: 0,
  lastFailure: 0,
  lastSuccess: 0,
  // After 3 consecutive failures, open the circuit
  failureThreshold: 3,
  // Wait 5 minutes before probing again
  resetTimeoutMs: 5 * 60 * 1000,
}

function shouldAllowRequest(): boolean {
  if (circuit.state === 'closed') return true
  if (circuit.state === 'open') {
    // Check if enough time has passed to try again
    if (Date.now() - circuit.lastFailure >= circuit.resetTimeoutMs) {
      circuit.state = 'half_open'
      return true
    }
    return false
  }
  // half_open: allow one probe request
  return true
}

function recordSuccess(): void {
  circuit.failures = 0
  circuit.state = 'closed'
  circuit.lastSuccess = Date.now()
}

function recordFailure(): void {
  circuit.failures++
  circuit.lastFailure = Date.now()
  if (circuit.failures >= circuit.failureThreshold) {
    circuit.state = 'open'
  }
}

/** Get current circuit breaker state (for diagnostics/alerts) */
export function getCircuitState(): {
  state: CircuitState
  failures: number
  lastFailure: number
  lastSuccess: number
} {
  return { ...circuit }
}

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
  median_cents: number | null
  min_cents: number | null
  max_cents: number | null
  observation_count: number
  freshest: string | null
  unit: string
  normalized: boolean
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
  // Circuit breaker: skip request entirely if Pi is known-dead
  if (!shouldAllowRequest()) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const headers = new Headers(options?.headers as HeadersInit | undefined)
    if (PI_BRIDGE_SECRET) {
      headers.set('Authorization', `Bearer ${PI_BRIDGE_SECRET}`)
    }

    const response = await fetch(`${PI_BRIDGE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      recordFailure()
      return null
    }

    recordSuccess()
    return (await response.json()) as T
  } catch {
    // Pi unreachable, timeout, or parse error - circuit breaker tracks it
    recordFailure()
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
 * Auto-chunks requests larger than 100 items.
 *
 * @param names - Array of ingredient names to look up
 * @param state - Optional state filter for regional pricing
 */
export async function lookupPricesBatch(
  names: string[],
  state?: string
): Promise<PiBridgeBatchResult | null> {
  if (names.length === 0) return null

  const CHUNK_SIZE = 100

  // Small batch: single request
  if (names.length <= CHUNK_SIZE) {
    return piFetch<PiBridgeBatchResult>('/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names, state }),
    })
  }

  // Large batch: chunk and merge results
  const merged: Record<string, PiBridgeBatchItem | null> = {}
  let totalMs = 0
  let totalCount = 0

  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE)
    const result = await piFetch<PiBridgeBatchResult>('/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: chunk, state }),
    })
    if (!result) continue
    Object.assign(merged, result.results)
    totalMs += result.query_ms
    totalCount += result.count
  }

  if (totalCount === 0) return null
  return { results: merged, query_ms: totalMs, count: totalCount }
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

// --- Coverage Stats ---

export interface PiBridgeCoverageByState {
  state: string
  coverage_pct: number
  sources: number
}

export interface PiBridgeStateCoverage {
  state: string
  total_ingredients: number
  ingredients_with_price: number
  coverage_pct: number
  store_count: number
  sources: Array<{
    source_id: string
    ingredients: number
    prices: number
    freshest: string | null
  }>
  query_ms: number
}

export interface PiBridgeNationalCoverage {
  total_ingredients: number
  total_prices: number
  total_stores: number
  states_covered: number
  by_state: PiBridgeCoverageByState[]
  query_ms: number
}

/**
 * Get coverage stats for a specific state or national summary.
 *
 * @param state - Optional two-letter state code. Omit for national summary.
 */
export async function getCoverage(
  state?: string
): Promise<PiBridgeStateCoverage | PiBridgeNationalCoverage | null> {
  const params = state ? `?state=${encodeURIComponent(state)}` : ''
  return piFetch<PiBridgeStateCoverage | PiBridgeNationalCoverage>(`/coverage${params}`)
}

/**
 * Get stores in a state.
 *
 * @param state - Two-letter state code (e.g., "MA")
 */
export async function getStoresByState(state: string): Promise<Array<{
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
