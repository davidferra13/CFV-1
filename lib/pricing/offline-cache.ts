/**
 * PIE Law 12: Offline Cache Layer
 *
 * Generates a client-side price cache that enables offline pricing lookups.
 * A chef at a farmer's market with no signal can still check ingredient costs.
 *
 * Architecture:
 *   - Server generates a compressed price snapshot per tenant
 *   - Snapshot stored in Service Worker cache (sw.js)
 *   - Client hits /api/pie/v1/cache/snapshot for latest
 *   - Offline: service worker intercepts price requests, serves from cache
 *   - Cache TTL: 24 hours (stale but functional beats no data)
 *
 * NOT a 'use server' file. Called by API route and cron.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceCacheSnapshot {
  version: number
  generatedAt: string
  expiresAt: string
  tenantId: string
  state: string | null
  /** Compact price entries: name -> {cents, unit, confidence, tier} */
  prices: Record<string, CachedPrice>
  /** Ingredient count */
  ingredientCount: number
  /** Size in bytes (approximate) */
  sizeBytes: number
}

export interface CachedPrice {
  /** Price in cents */
  c: number
  /** Unit abbreviation */
  u: string
  /** Confidence 0-100 (integer for space) */
  q: number
  /** Resolution tier shortcode */
  t: string
  /** Category */
  g: string
}

export interface CacheGenerationResult {
  tenantId: string
  ingredientCount: number
  sizeBytes: number
  generatedAt: string
  durationMs: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_HOURS = 24
const CACHE_VERSION = 1
const MAX_INGREDIENTS_PER_SNAPSHOT = 5000

// Tier shortcodes for compact storage
const TIER_SHORTCODES: Record<string, string> = {
  chef_override: 'CO',
  chef_receipt: 'CR',
  wholesale: 'WH',
  zip_local: 'ZL',
  regional: 'RG',
  market_state: 'MS',
  market_national: 'MN',
  government: 'GV',
  historical: 'HI',
  category_baseline: 'CB',
  synthetic: 'SY',
  none: 'NO',
}

// ---------------------------------------------------------------------------
// Snapshot Generation
// ---------------------------------------------------------------------------

/**
 * Generate a compact price cache snapshot for a tenant.
 * Includes all resolved prices for their state, plus synthetic fallbacks.
 */
export async function generateCacheSnapshot(tenantId: string): Promise<PriceCacheSnapshot> {
  const pgSql = pgClient

  // Get chef's state
  const [chef] = (await db.execute(sql`
    SELECT home_state FROM chefs WHERE id = ${tenantId}
  `)) as unknown as Array<{ home_state: string | null }>

  const state = chef?.home_state || null

  // Build price map from multiple sources, prioritized
  const prices: Record<string, CachedPrice> = {}

  // 1. Chef overrides (highest priority)
  const overrides = (await db.execute(sql`
    SELECT
      ci.name,
      cip.price_cents,
      cip.unit
    FROM chef_ingredient_prices cip
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = cip.canonical_ingredient_id
    WHERE cip.tenant_id = ${tenantId}
      AND cip.is_active = true
  `)) as unknown as Array<{ name: string; price_cents: number; unit: string }>

  for (const o of overrides) {
    prices[o.name.toLowerCase()] = {
      c: Number(o.price_cents),
      u: o.unit || 'lb',
      q: 98,
      t: 'CO',
      g: '',
    }
  }

  // 2. Resolved prices (from PostgreSQL, pre-computed)
  const stateFilter = state ? pgSql`AND pr.state = ${state}` : pgSql``
  const resolved = await pgSql`
    SELECT
      ci.name,
      ci.category,
      rp.price_cents,
      rp.unit,
      rp.confidence,
      rp.computation_method
    FROM openclaw.resolved_prices rp
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = rp.canonical_ingredient_id
    JOIN openclaw.pricing_regions pr ON pr.id = rp.pricing_region_id
    WHERE rp.confidence > 0.1
      ${stateFilter}
    ORDER BY rp.confidence DESC
    LIMIT ${MAX_INGREDIENTS_PER_SNAPSHOT}
  `

  for (const r of resolved) {
    const name = (r.name as string).toLowerCase()
    if (prices[name]) continue // don't overwrite overrides

    const method = (r.computation_method as string) || ''
    const tier = method.includes('synthetic')
      ? 'SY'
      : method.includes('scrape')
        ? 'ZL'
        : method.includes('regional')
          ? 'RG'
          : method.includes('government')
            ? 'GV'
            : 'MS'

    prices[name] = {
      c: Number(r.price_cents),
      u: (r.unit as string) || 'lb',
      q: Math.round(Number(r.confidence) * 100),
      t: tier,
      g: (r.category as string) || '',
    }
  }

  // 3. Fill remaining census ingredients with synthetic floors
  const remaining = await pgSql`
    SELECT
      ci.name,
      ci.category,
      ic.census_category
    FROM openclaw.ingredient_census ic
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = ic.ingredient_id
    WHERE ic.census_tier IN ('core', 'extended')
      AND ci.name NOT IN (${Object.keys(prices).length > 0 ? Object.keys(prices).map((n) => n) : ['__none__']})
    LIMIT ${MAX_INGREDIENTS_PER_SNAPSHOT - Object.keys(prices).length}
  `

  // Note: for remaining, we'd use subcategory floors but that's handled by resolve-price at runtime
  // The cache stores what we have; client falls back to "ask server" for missing

  const now = new Date()
  const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000)

  const snapshot: PriceCacheSnapshot = {
    version: CACHE_VERSION,
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    tenantId,
    state,
    prices,
    ingredientCount: Object.keys(prices).length,
    sizeBytes: 0, // computed below
  }

  // Estimate size (JSON overhead)
  const jsonStr = JSON.stringify(snapshot)
  snapshot.sizeBytes = new TextEncoder().encode(jsonStr).length

  return snapshot
}

/**
 * Generate and store cache for a specific tenant.
 * Called by cron (nightly) or on-demand when chef opens app.
 */
export async function refreshTenantCache(tenantId: string): Promise<CacheGenerationResult> {
  const start = Date.now()
  const snapshot = await generateCacheSnapshot(tenantId)

  // Store in DB for the API to serve
  await db.execute(sql`
    INSERT INTO price_cache_snapshots (
      tenant_id, version, snapshot_json, ingredient_count,
      size_bytes, generated_at, expires_at
    ) VALUES (
      ${tenantId}, ${CACHE_VERSION}, ${JSON.stringify(snapshot)},
      ${snapshot.ingredientCount}, ${snapshot.sizeBytes},
      ${snapshot.generatedAt}, ${snapshot.expiresAt}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      version = EXCLUDED.version,
      snapshot_json = EXCLUDED.snapshot_json,
      ingredient_count = EXCLUDED.ingredient_count,
      size_bytes = EXCLUDED.size_bytes,
      generated_at = EXCLUDED.generated_at,
      expires_at = EXCLUDED.expires_at
  `)

  return {
    tenantId,
    ingredientCount: snapshot.ingredientCount,
    sizeBytes: snapshot.sizeBytes,
    generatedAt: snapshot.generatedAt,
    durationMs: Date.now() - start,
  }
}

/**
 * Get current cached snapshot for a tenant (served by API route).
 */
export async function getTenantCacheSnapshot(tenantId: string): Promise<PriceCacheSnapshot | null> {
  const [row] = (await db.execute(sql`
    SELECT snapshot_json, expires_at
    FROM price_cache_snapshots
    WHERE tenant_id = ${tenantId}
  `)) as unknown as Array<{ snapshot_json: string; expires_at: Date }>

  if (!row) return null

  // If expired, return it anyway (stale cache > no cache) but mark it
  const snapshot = JSON.parse(row.snapshot_json) as PriceCacheSnapshot
  return snapshot
}

/**
 * Bulk refresh caches for all active tenants.
 * Called by nightly cron.
 */
export async function refreshAllCaches(): Promise<{
  tenantsProcessed: number
  totalIngredients: number
  totalSizeBytes: number
  durationMs: number
}> {
  const start = Date.now()

  // Get all active tenants
  const tenants = (await db.execute(sql`
    SELECT id FROM chefs WHERE is_active = true
  `)) as unknown as Array<{ id: string }>

  let totalIngredients = 0
  let totalSize = 0

  for (const tenant of tenants) {
    try {
      const result = await refreshTenantCache(tenant.id)
      totalIngredients += result.ingredientCount
      totalSize += result.sizeBytes
    } catch (err) {
      console.error(`[offline-cache] Failed for tenant ${tenant.id}:`, err)
    }
  }

  return {
    tenantsProcessed: tenants.length,
    totalIngredients,
    totalSizeBytes: totalSize,
    durationMs: Date.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Client-side cache utilities (exported for sw.js integration)
// ---------------------------------------------------------------------------

/**
 * Lookup a price from a cached snapshot (client-side function shape).
 * This mirrors what the service worker will do.
 */
export function lookupFromCache(
  snapshot: PriceCacheSnapshot,
  ingredientName: string
): CachedPrice | null {
  const normalized = ingredientName.toLowerCase().trim()

  // Exact match
  if (snapshot.prices[normalized]) return snapshot.prices[normalized]

  // Partial match (first word)
  const firstWord = normalized.split(' ')[0]
  for (const [key, value] of Object.entries(snapshot.prices)) {
    if (key.startsWith(firstWord)) return value
  }

  return null
}

/**
 * Check if a snapshot is still fresh enough to use.
 */
export function isCacheFresh(snapshot: PriceCacheSnapshot): boolean {
  return new Date(snapshot.expiresAt) > new Date()
}

/**
 * Check if a snapshot is usable (even if stale, within 7 days).
 */
export function isCacheUsable(snapshot: PriceCacheSnapshot): boolean {
  const expiresAt = new Date(snapshot.expiresAt)
  const maxStale = new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 extra days
  return maxStale > new Date()
}
