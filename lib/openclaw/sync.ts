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
 * Runs on-demand from the culinary price catalog page or via cron.
 */

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { ingredients } from '@/lib/db/schema/schema'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  getOpenClawStatsInternal,
  OPENCLAW_API,
  piHeaders,
  type OpenClawStats,
} from '@/lib/openclaw/pi-stats'
import { buildOpenClawQuarantineRawData } from '@/lib/openclaw/quarantine-review'
import { normalizeIngredientName } from '@/lib/pricing/name-normalizer'
import { refreshPriceViews } from '@/lib/pricing/cross-store-average'
import { validatePrice, validatePriceChange } from '@/lib/openclaw/price-validator'

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

export interface SyncResult {
  success: boolean
  error?: string
  matched: number
  updated: number
  skipped: number
  notFound: number
  quarantined?: number
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

export async function getOpenClawStats(): Promise<OpenClawStats | null> {
  await requireChef()
  return getOpenClawStatsInternal()
}

export { getOpenClawStatsInternal, type OpenClawStats }

export async function getOpenClawPrices(params?: {
  tier?: string
  ingredient?: string
  limit?: number
}): Promise<OpenClawPrice[]> {
  await requireChef()
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
      headers: piHeaders(),
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
  await requireChef()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/sources`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: piHeaders(),
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
  await requireChef()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`${OPENCLAW_API}/api/changes?limit=${limit}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: piHeaders(),
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
      headers: piHeaders({ 'Content-Type': 'application/json' }),
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
      headers: piHeaders({ 'Content-Type': 'application/json' }),
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
 *   1. Load the tenant's ingredients (or all ingredients for internal sync)
 *   2. Deduplicate names for Pi lookup (one lookup per unique name)
 *   3. Send to Pi's enriched endpoint (batches of 200)
 *   4. For each enriched result, update the matching tenant-specific ingredients
 *   5. Write to ingredient_price_history (upsert via partial unique index)
 *   6. Update ingredients table with source, store, confidence, trend
 *   7. Feed unmatched names back to Pi for catalog growth
 */
async function syncCore(
  tier: string,
  dryRun: boolean,
  tenantId?: string | null
): Promise<SyncResult> {
  try {
    // Step 0: Resolve chef home_state for geographic tagging of synced prices
    let chefHomeState: string | null = null
    if (tenantId) {
      const stateRows = (await db.execute(
        sql`SELECT home_state FROM chefs WHERE id = ${tenantId} LIMIT 1`
      )) as unknown as { home_state: string | null }[]
      chefHomeState = stateRows[0]?.home_state || null
    }

    // Step 1: Load ChefFlow ingredients for the current tenant, unless this is an internal sync.
    const ingredientQuery = db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        lastPriceCents: ingredients.lastPriceCents,
        priceUnit: ingredients.priceUnit,
        tenantId: ingredients.tenantId,
      })
      .from(ingredients)
    const cfIngredients = tenantId
      ? await ingredientQuery.where(eq(ingredients.tenantId, tenantId))
      : await ingredientQuery

    // Step 2: Deduplicate names (send original, normalized, AND aliased canonical names)
    const uniqueNames = [
      ...new Set(cfIngredients.filter((i) => i.name?.trim()).map((i) => i.name!.trim())),
    ]

    // Build normalized -> original name map for fallback matching
    const normalizedToOriginal = new Map<string, string[]>()
    for (const name of uniqueNames) {
      const normalized = normalizeIngredientName(name)
      if (normalized !== name.toLowerCase().trim()) {
        if (!normalizedToOriginal.has(normalized)) normalizedToOriginal.set(normalized, [])
        normalizedToOriginal.get(normalized)!.push(name)
      }
    }

    // Build alias -> original name map (system_ingredient canonical names map to chef ingredients)
    // This bridges the gap: if a chef's "chicken breast" is aliased to system_ingredient
    // "Chicken Thigh (Boneless, Skinless)", Pi can find prices using the canonical name.
    const aliasIngredientIds = cfIngredients.map((i) => i.id)
    if (aliasIngredientIds.length > 0) {
      try {
        const aliasRows = await db.execute(sql`
          SELECT ia.ingredient_id, si.name AS canonical_name
          FROM ingredient_aliases ia
          JOIN system_ingredients si ON si.id = ia.system_ingredient_id
          WHERE ia.ingredient_id = ANY(${aliasIngredientIds})
            AND ia.system_ingredient_id IS NOT NULL
            AND ia.match_method != 'dismissed'
        `)
        for (const row of aliasRows as any[]) {
          const canonicalName = (row.canonical_name as string)?.trim()
          if (!canonicalName) continue
          // Map canonical name -> chef ingredient(s) that use this alias
          if (!normalizedToOriginal.has(canonicalName.toLowerCase())) {
            normalizedToOriginal.set(canonicalName.toLowerCase(), [])
          }
          // Find the chef ingredient name for this alias
          const chefIng = cfIngredients.find((i) => i.id === row.ingredient_id)
          if (chefIng?.name) {
            normalizedToOriginal.get(canonicalName.toLowerCase())!.push(chefIng.name.trim())
          }
        }
      } catch (err) {
        console.warn('[sync] Could not load ingredient aliases (non-blocking):', err)
      }
    }

    // Add normalized variants AND canonical alias names to the lookup set
    const allNamesToSend = [...new Set([...uniqueNames, ...normalizedToOriginal.keys()])]

    if (uniqueNames.length === 0) {
      return { success: true, matched: 0, updated: 0, skipped: 0, notFound: 0 }
    }

    // Step 3: Send to Pi's enriched endpoint (batches of 200)
    // Sends both original and normalized names for better match rates
    const enrichedResults: Record<string, EnrichedResult | null> = {}
    for (let i = 0; i < allNamesToSend.length; i += 200) {
      const batch = allNamesToSend.slice(i, i + 200)
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

    // Step 5: Pre-load per-store last prices for change validation
    // Compares each store's price against its OWN previous price for that ingredient,
    // not a single global baseline. This prevents cross-product false positives
    // (e.g., a garlic bulb vs a jar of minced garlic under the same ingredient name).
    const ingredientIds = cfIngredients.map((i) => i.id)
    const perStoreBaselines = new Map<string, number>()
    if (ingredientIds.length > 0) {
      try {
        const rows = await db.execute(sql`
          SELECT DISTINCT ON (ingredient_id, store_name)
            ingredient_id, store_name, price_cents
          FROM ingredient_price_history
          WHERE source LIKE 'openclaw_%'
            AND ingredient_id = ANY(${ingredientIds})
            AND purchase_date >= (CURRENT_DATE - INTERVAL '7 days')
          ORDER BY ingredient_id, store_name, purchase_date DESC
        `)
        for (const row of rows as any[]) {
          perStoreBaselines.set(`${row.ingredient_id}::${row.store_name}`, row.price_cents)
        }
      } catch (err) {
        console.warn('[sync] Could not pre-load per-store baselines, falling back to global:', err)
      }
    }

    const _td = new Date()
    const today = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`
    let matched = 0
    let updated = 0
    let skipped = 0
    let notFound = 0
    let quarantined = 0
    const notFoundNames: string[] = []
    const updatedIngredientIdsByTenant = new Map<string, Set<string>>()

    for (const [name, result] of Object.entries(enrichedResults)) {
      // Try exact name match first, then check if this was a normalized name
      let tenantIngredients = byName.get(name)
      if (!tenantIngredients) {
        // Check if this normalized name maps back to original names
        const originals = normalizedToOriginal.get(name)
        if (originals) {
          tenantIngredients = originals.flatMap((orig) => byName.get(orig) || [])
        }
      }
      if (!tenantIngredients || tenantIngredients.length === 0) continue

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
          // Validate each price before insert; quarantine rejects
          for (const storePrice of result.all_prices) {
            const granularSource = tierToSource(storePrice.tier)
            const priceCheck = validatePrice(storePrice.cents, name)
            if (!priceCheck.valid) {
              try {
                await db.execute(sql`
                  INSERT INTO openclaw.quarantined_prices
                    (source, ingredient_name, price_cents, rejection_reason, raw_data)
                  VALUES (
                    ${storePrice.store}, ${name}, ${storePrice.cents},
                    ${priceCheck.reason},
                    ${JSON.stringify(
                      buildOpenClawQuarantineRawData({
                        rawPrice: storePrice as unknown as Record<string, unknown>,
                        reviewContext: {
                          ingredientId: ing.id,
                          tenantId: ing.tenantId ?? null,
                          ingredientName: name,
                          priceCents: storePrice.cents,
                          normalizedPricePerUnitCents: storePrice.normalized_cents,
                          normalizedUnit: storePrice.normalized_unit,
                          originalUnit: storePrice.original_unit,
                          purchaseDate: today,
                          confirmedAt: storePrice.confirmed_at ?? null,
                          storeName: storePrice.store,
                          storeState: chefHomeState,
                          tier: storePrice.tier,
                          granularSource,
                        },
                      })
                    )}::jsonb
                  )
                `)
              } catch {
                /* quarantine is best-effort */
              }
              quarantined++
              continue
            }
            // Use per-store baseline (same store's last price for this ingredient).
            // If no store-specific history exists, treat as first observation (null).
            // This prevents cross-product false positives (bulb vs jar under same name).
            const storeKey = `${ing.id}::${storePrice.store}`
            const baselinePrice = perStoreBaselines.get(storeKey) ?? null
            const changeCheck = validatePriceChange(baselinePrice, storePrice.cents, name)
            if (!changeCheck.valid) {
              try {
                await db.execute(sql`
                  INSERT INTO openclaw.quarantined_prices
                    (source, ingredient_name, price_cents, old_price_cents, rejection_reason, raw_data)
                  VALUES (
                    ${storePrice.store}, ${name}, ${storePrice.cents},
                    ${baselinePrice}, ${changeCheck.reason},
                    ${JSON.stringify(
                      buildOpenClawQuarantineRawData({
                        rawPrice: storePrice as unknown as Record<string, unknown>,
                        reviewContext: {
                          ingredientId: ing.id,
                          tenantId: ing.tenantId ?? null,
                          ingredientName: name,
                          priceCents: storePrice.cents,
                          normalizedPricePerUnitCents: storePrice.normalized_cents,
                          normalizedUnit: storePrice.normalized_unit,
                          originalUnit: storePrice.original_unit,
                          purchaseDate: today,
                          confirmedAt: storePrice.confirmed_at ?? null,
                          storeName: storePrice.store,
                          storeState: chefHomeState,
                          tier: storePrice.tier,
                          granularSource,
                        },
                      })
                    )}::jsonb
                  )
                `)
              } catch {
                /* quarantine is best-effort */
              }
              quarantined++
              continue
            }

            try {
              await db.execute(sql`
                INSERT INTO ingredient_price_history
                  (id, ingredient_id, tenant_id, price_cents, price_per_unit_cents,
                   quantity, unit, purchase_date, store_name, source, notes, store_state)
                VALUES (
                  gen_random_uuid(), ${ing.id}, ${ing.tenantId},
                  ${storePrice.cents}, ${storePrice.normalized_cents},
                  1, ${storePrice.normalized_unit}, ${today},
                  ${storePrice.store}, ${granularSource},
                  ${`Automated price sync - ${storePrice.store}`},
                  ${chefHomeState}
                )
                ON CONFLICT (ingredient_id, tenant_id, source, store_name, purchase_date)
                  WHERE source LIKE 'openclaw_%'
                DO UPDATE SET
                  price_cents = EXCLUDED.price_cents,
                  price_per_unit_cents = EXCLUDED.price_per_unit_cents,
                  unit = EXCLUDED.unit,
                  notes = EXCLUDED.notes,
                  store_state = COALESCE(EXCLUDED.store_state, ingredient_price_history.store_state)
              `)
            } catch (err) {
              console.warn(
                `[sync] Failed to upsert price history for ${ing.id} (${storePrice.store}): ${err instanceof Error ? err.message : 'unknown'}`
              )
            }
          }

          // 5b. Update the ingredient row with BEST price only
          // Dedup: skip if already synced today with same best price
          if (ing.lastPriceCents === bestPrice.cents) {
            skipped++
            continue
          }

          const granularSource = tierToSource(bestPrice.tier)
          const confidence = tierToConfidence(bestPrice.tier)

          try {
            await db.execute(sql`
              UPDATE ingredients SET
                last_price_cents = ${bestPrice.cents},
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
                lastPriceCents: bestPrice.cents,
                lastPriceDate: today,
                priceUnit: bestPrice.normalized_unit,
              })
              .where(eq(ingredients.id, ing.id))
          }

          updated++
          if (ing.tenantId) {
            let tenantIngredientIds = updatedIngredientIdsByTenant.get(ing.tenantId)
            if (!tenantIngredientIds) {
              tenantIngredientIds = new Set<string>()
              updatedIngredientIdsByTenant.set(ing.tenantId, tenantIngredientIds)
            }
            tenantIngredientIds.add(ing.id)
          }
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
      revalidatePath('/culinary/price-catalog')
      revalidatePath('/culinary/ingredients')
      revalidatePath('/culinary/costing')
      revalidateTag('recipe-costs')
      revalidateTag('ingredient-prices')
      revalidateTag('sale-calendar')
    }

    // Step 6b: Trigger cost refresh for all synced ingredients (non-blocking)
    if (updated > 0 && !dryRun) {
      try {
        const { refreshIngredientCostsForTenant } = await import('@/lib/pricing/cost-refresh-actions')
        const tenantRefreshes = [...updatedIngredientIdsByTenant.entries()]
          .filter(([tenantId, ingredientIds]) => tenantId && ingredientIds.size > 0)
          .map(([tenantId, ingredientIds]) =>
            refreshIngredientCostsForTenant(tenantId, [...ingredientIds])
          )

        // Fire-and-forget: don't await, don't block the sync result
        Promise.allSettled(tenantRefreshes).then((results) => {
          const failures = results.filter((result) => result.status === 'rejected')
          if (failures.length > 0) {
            console.error(
              `[syncPrices] Post-sync cost refresh failed for ${failures.length} tenant refreshes`
            )
          }
        })
      } catch (err) {
        console.error('[syncPrices] Could not trigger cost refresh (non-blocking):', err)
      }
    }

    // Step 7: Refresh materialized views for cross-store averaging
    if (updated > 0 && !dryRun) {
      const viewResult = await refreshPriceViews()
      if (!viewResult.success) {
        console.error('[syncPrices] View refresh failed:', viewResult.error)
      }
    }

    // Step 8: Feed unmatched names back to Pi for catalog growth (Phase 3.5)
    if (!dryRun) {
      await suggestCatalogItems(notFoundNames)
    }

    // Step 9: Trigger data polish job (non-blocking)
    // Enriches images, nutrition links, volatility, source URLs
    if (updated > 0 && !dryRun) {
      try {
        const { runPolishJobInternal } = await import('@/lib/openclaw/polish-job')
        runPolishJobInternal().catch((err: unknown) => {
          console.error('[syncPrices] Post-sync polish job failed (non-blocking):', err)
        })
      } catch (err) {
        console.error('[syncPrices] Could not trigger polish job (non-blocking):', err)
      }
    }

    // Step 10: Write sync audit log (non-blocking)
    if (!dryRun) {
      try {
        await db.execute(sql`
          INSERT INTO openclaw.sync_audit_log
            (sync_type, started_at, completed_at, records_processed, records_accepted, records_quarantined, records_skipped, metadata)
          VALUES (
            'price_sync', ${new Date().toISOString()}, ${new Date().toISOString()},
            ${matched + notFound}, ${updated}, ${quarantined}, ${skipped},
            ${JSON.stringify({ notFoundCount: notFound, tier })}::jsonb
          )
        `)
      } catch (err) {
        console.error('[syncPrices] Audit log write failed (non-blocking):', err)
      }
    }

    return {
      success: true,
      matched,
      updated,
      skipped,
      notFound,
      quarantined,
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
  const user = await requireChef()
  return syncCore(options?.tier || 'retail', options?.dryRun ?? false, user.tenantId)
}
