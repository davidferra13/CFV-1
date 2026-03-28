/**
 * OpenClaw Price Sync Service (V2 - Enriched)
 * Pulls enriched price data from the Raspberry Pi's OpenClaw database
 * and writes to both ingredient_price_history and ingredients tables.
 *
 * V2 changes:
 *   - Uses POST /api/prices/enriched (normalized units, all stores, trends)
 *   - Writes to ingredient_price_history with granular source values
 *   - Updates ingredients with source, store, confidence, trend
 *   - Deduplicates via partial unique index (idx_iph_openclaw_dedup)
 *   - Feeds unmatched names back to Pi for catalog growth
 *
 * Runs on-demand from the admin price catalog page or via cron.
 */

'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { ingredients } from '@/lib/db/schema/schema'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Types ---

export interface OpenClawPrice {
  canonical_ingredient_id: string
  ingredient_name: string
  category: string
  source_name: string
  source_id: string
  price_cents: number
  price_unit: string
  pricing_tier: string
  confidence: string
  last_confirmed_at: string
}

export interface OpenClawStats {
  sources: number
  canonicalIngredients: number
  currentPrices: number
  priceChanges: number
  lastScrapeAt: string | null
  timestamp: string
}

export interface SyncResult {
  success: boolean
  error?: string
  matched: number
  updated: number
  skipped: number
  notFound: number
  notFoundNames?: string[]
}

interface EnrichedPrice {
  cents: number
  normalized_cents: number
  normalized_unit: string
  original_unit: string
  store: string
  tier: string
  confirmed_at: string
  in_stock?: boolean
}

interface EnrichedTrend {
  direction: 'up' | 'down' | 'flat' | null
  change_7d_pct: number | null
  change_30d_pct: number | null
}

interface EnrichedResult {
  canonical_id: string
  name: string
  category: string
  best_price: EnrichedPrice | null
  all_prices: EnrichedPrice[]
  trend: EnrichedTrend | null
  price_count: number
}

// --- Pi Communication ---

/**
 * Internal: fetch stats without auth check (for cron routes).
 */
export async function getOpenClawStatsInternal(): Promise<OpenClawStats | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/stats`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getOpenClawStats(): Promise<OpenClawStats | null> {
  await requireAdmin()
  return getOpenClawStatsInternal()
}

export async function getOpenClawPrices(params?: {
  tier?: string
  ingredient?: string
  limit?: number
}): Promise<OpenClawPrice[]> {
  await requireAdmin()
  try {
    const searchParams = new URLSearchParams()
    if (params?.tier) searchParams.set('tier', params.tier)
    if (params?.ingredient) searchParams.set('ingredient', params.ingredient)
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const res = await fetch(`${OPENCLAW_API}/api/prices?${searchParams}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const data = await res.json()
    return data.prices || []
  } catch {
    return []
  }
}

export async function getOpenClawSources(): Promise<any[]> {
  await requireAdmin()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/sources`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const data = await res.json()
    return data.sources || []
  } catch {
    return []
  }
}

export async function getOpenClawChanges(limit = 50): Promise<any[]> {
  await requireAdmin()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/changes?limit=${limit}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const data = await res.json()
    return data.changes || []
  } catch {
    return []
  }
}

/**
 * Fetch enriched prices from Pi (V2 endpoint).
 * Falls back to null if the enriched endpoint doesn't exist yet (Pi not updated).
 */
async function fetchEnriched(
  names: string[]
): Promise<{ results: Record<string, EnrichedResult | null> } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)
    const res = await fetch(`${OPENCLAW_API}/api/prices/enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: names }),
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) {
      console.warn(`[sync] Enriched endpoint returned ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn(
      `[sync] Enriched endpoint unreachable: ${err instanceof Error ? err.message : 'unknown'}`
    )
    return null
  }
}

/**
 * Feed unmatched ingredient names back to Pi for catalog growth.
 * Non-blocking: failures are logged but don't affect the sync.
 */
async function suggestCatalogItems(names: string[]): Promise<void> {
  if (names.length === 0) return
  try {
    await fetch(`${OPENCLAW_API}/api/catalog/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: names.slice(0, 500) }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    // Non-blocking. If Pi is down, we just skip catalog suggestions.
  }
}

// --- Source mapping helpers ---

/** Map OpenClaw tier -> granular source value for ingredient_price_history */
function tierToSource(tier: string): string {
  switch (tier) {
    case 'flyer_scrape':
      return 'openclaw_flyer'
    case 'direct_scrape':
      return 'openclaw_scrape'
    case 'instacart_adjusted':
      return 'openclaw_instacart'
    case 'instacart_catalog':
      return 'openclaw_instacart'
    case 'government_baseline':
      return 'openclaw_government'
    case 'exact_receipt':
      return 'openclaw_receipt'
    default:
      return 'openclaw_flyer'
  }
}

/** Map OpenClaw tier -> confidence score (0.0 - 1.0) */
function tierToConfidence(tier: string): number {
  switch (tier) {
    case 'exact_receipt':
      return 0.95
    case 'direct_scrape':
      return 0.85
    case 'flyer_scrape':
      return 0.7
    case 'instacart_adjusted':
      return 0.6
    case 'instacart_catalog':
      return 0.6
    case 'government_baseline':
      return 0.4
    default:
      return 0.5
  }
}

// --- Core Sync ---

/**
 * Core sync logic (V2 - enriched).
 *
 * Strategy:
 *   1. Load ALL ingredients with their tenant_id
 *   2. Deduplicate names for Pi lookup (one lookup per unique name)
 *   3. Send to Pi's enriched endpoint (batches of 200)
 *   4. For each enriched result, update ALL tenant-specific ingredients
 *   5. Write to ingredient_price_history (upsert via partial unique index)
 *   6. Update ingredients table with source, store, confidence, trend
 *   7. Feed unmatched names back to Pi for catalog growth
 */
async function syncCore(tier: string, dryRun: boolean): Promise<SyncResult> {
  try {
    // Step 1: Load all ChefFlow ingredients
    const cfIngredients = await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        lastPriceCents: ingredients.lastPriceCents,
        priceUnit: ingredients.priceUnit,
        tenantId: ingredients.tenantId,
      })
      .from(ingredients)

    // Step 2: Deduplicate names
    const uniqueNames = [
      ...new Set(cfIngredients.filter((i) => i.name?.trim()).map((i) => i.name!.trim())),
    ]

    if (uniqueNames.length === 0) {
      return { success: true, matched: 0, updated: 0, skipped: 0, notFound: 0 }
    }

    // Step 3: Send to Pi's enriched endpoint (batches of 200)
    const enrichedResults: Record<string, EnrichedResult | null> = {}
    for (let i = 0; i < uniqueNames.length; i += 200) {
      const batch = uniqueNames.slice(i, i + 200)
      const response = await fetchEnriched(batch)
      if (!response) {
        console.warn('[sync] Pi enriched endpoint not available. Aborting sync.')
        return {
          success: false,
          error: 'Pi enriched endpoint unreachable',
          matched: 0,
          updated: 0,
          skipped: 0,
          notFound: 0,
        }
      }
      Object.assign(enrichedResults, response.results)
    }

    // Step 4: Build name -> [ingredients] map (one name maps to MANY tenant-specific rows)
    const byName = new Map<string, typeof cfIngredients>()
    for (const ing of cfIngredients) {
      if (!ing.name?.trim()) continue
      const key = ing.name.trim()
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(ing)
    }

    // Step 5: For each enriched result, update ALL tenant-specific ingredients
    const today = new Date().toISOString().split('T')[0]
    let matched = 0
    let updated = 0
    let skipped = 0
    let notFound = 0
    const notFoundNames: string[] = []

    for (const [name, result] of Object.entries(enrichedResults)) {
      const tenantIngredients = byName.get(name)
      if (!tenantIngredients) continue

      if (!result || !result.best_price) {
        notFound += tenantIngredients.length
        notFoundNames.push(name)
        continue
      }

      matched += tenantIngredients.length
      const bestPrice = result.best_price

      // Skip wholesale bulk prices (check against best price)
      if (bestPrice.original_unit === 'each' && bestPrice.cents > 5000) {
        skipped += tenantIngredients.length
        continue
      }

      for (const ing of tenantIngredients) {
        if (!dryRun) {
          // 5a. Upsert ALL store prices to ingredient_price_history
          // Each store price gets its own row, deduped by the partial unique index
          for (const storePrice of result.all_prices) {
            const granularSource = tierToSource(storePrice.tier)
            try {
              await db.execute(sql`
                INSERT INTO ingredient_price_history
                  (id, ingredient_id, tenant_id, price_cents, price_per_unit_cents,
                   quantity, unit, purchase_date, store_name, source, notes)
                VALUES (
                  gen_random_uuid(), ${ing.id}, ${ing.tenantId},
                  ${storePrice.normalized_cents}, ${storePrice.normalized_cents},
                  1, ${storePrice.normalized_unit}, ${today},
                  ${storePrice.store}, ${granularSource},
                  ${`Synced from OpenClaw - ${storePrice.store}`}
                )
                ON CONFLICT (ingredient_id, tenant_id, source, store_name, purchase_date)
                  WHERE source LIKE 'openclaw_%'
                DO UPDATE SET
                  price_cents = EXCLUDED.price_cents,
                  price_per_unit_cents = EXCLUDED.price_per_unit_cents,
                  unit = EXCLUDED.unit,
                  notes = EXCLUDED.notes
              `)
            } catch (err) {
              console.warn(
                `[sync] Failed to upsert price history for ${ing.id} (${storePrice.store}): ${err instanceof Error ? err.message : 'unknown'}`
              )
            }
          }

          // 5b. Update the ingredient row with BEST price only
          // Dedup: skip if already synced today with same best price
          if (ing.lastPriceCents === bestPrice.normalized_cents) {
            skipped++
            continue
          }

          const granularSource = tierToSource(bestPrice.tier)
          const confidence = tierToConfidence(bestPrice.tier)

          try {
            await db.execute(sql`
              UPDATE ingredients SET
                last_price_cents = ${bestPrice.normalized_cents},
                last_price_date = ${today},
                price_unit = ${bestPrice.normalized_unit},
                last_price_source = ${granularSource},
                last_price_store = ${bestPrice.store},
                last_price_confidence = ${confidence},
                price_trend_direction = ${result.trend?.direction ?? null},
                price_trend_pct = ${result.trend?.change_7d_pct ?? null}
              WHERE id = ${ing.id}
            `)
          } catch (err) {
            // If new columns don't exist yet (migration not applied), fall back to basic update
            await db
              .update(ingredients)
              .set({
                lastPriceCents: bestPrice.normalized_cents,
                lastPriceDate: today,
                priceUnit: bestPrice.normalized_unit,
              })
              .where(eq(ingredients.id, ing.id))
          }

          updated++
        } else {
          updated++
        }
      }
    }

    // Step 6: Bulk cache invalidation (once, not per ingredient)
    if (updated > 0 && !dryRun) {
      revalidatePath('/recipes')
      revalidatePath('/events')
      revalidatePath('/ingredients')
      revalidateTag('recipe-costs')
      revalidateTag('ingredient-prices')
    }

    // Step 7: Feed unmatched names back to Pi for catalog growth (Phase 3.5)
    if (!dryRun) {
      await suggestCatalogItems(notFoundNames)
    }

    return {
      success: true,
      matched,
      updated,
      skipped,
      notFound,
      notFoundNames: dryRun ? notFoundNames : undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sync] Fatal error:', msg)
    return { success: false, error: msg, matched: 0, updated: 0, skipped: 0, notFound: 0 }
  }
}

// --- Public API ---

/**
 * Internal sync (no auth). Called by cron routes that already verified auth.
 */
export async function syncPricesToChefFlowInternal(options?: {
  tier?: string
  dryRun?: boolean
}): Promise<SyncResult> {
  return syncCore(options?.tier || 'retail', options?.dryRun ?? false)
}

export async function syncPricesToChefFlow(options?: {
  tier?: string
  dryRun?: boolean
}): Promise<SyncResult> {
  await requireAdmin()
  return syncCore(options?.tier || 'retail', options?.dryRun ?? false)
}
