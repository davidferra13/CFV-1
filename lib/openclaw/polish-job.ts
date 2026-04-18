'use server'

/**
 * OpenCLAW Data Polish Job
 * Orchestrates the full data enrichment cycle after each price sync:
 *   1. Image fill (from Pi catalog + OpenFoodFacts)
 *   2. Category fill (from system_ingredients match)
 *   3. Unit normalization (compute price_per_unit_cents where missing)
 *   4. Nutrition linking (match to USDA system_ingredients)
 *   5. Volatility tracking (compute coefficient of variation)
 *   6. Source URL construction (for Instacart prices)
 *
 * Idempotent: safe to run multiple times. Non-blocking to sync.
 * Rate limited: batches of 50, 500ms delay between batches.
 */

import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { enrichNutritionLinks } from './nutrition-enricher'
import { runSaleCycleDetection } from './sale-cycle-detector'
import { computeSubstitutes } from './substitute-mapper'
import { computePackageOptimization } from './package-optimizer'
import { runTrendForecasting } from './trend-forecaster'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

export interface PolishJobResult {
  success: boolean
  imagesAdded: number
  categorized: number
  unitsNormalized: number
  nutritionLinked: number
  volatilityUpdated: number
  sourceUrlsAdded: number
  saleCyclesDetected: number
  substitutesComputed: number
  packagesOptimized: number
  forecastsGenerated: number
  errors: string[]
  durationMs: number
}

/**
 * Run the full polish job. Admin only.
 */
export async function runPolishJob(options?: { dryRun?: boolean }): Promise<PolishJobResult> {
  await requireAdmin()
  return runPolishJobInternal(options)
}

/**
 * Internal polish job (no auth). Called by cron routes.
 */
export async function runPolishJobInternal(options?: {
  dryRun?: boolean
}): Promise<PolishJobResult> {
  const start = Date.now()
  const dryRun = options?.dryRun ?? false
  const result: PolishJobResult = {
    success: true,
    imagesAdded: 0,
    categorized: 0,
    unitsNormalized: 0,
    nutritionLinked: 0,
    volatilityUpdated: 0,
    sourceUrlsAdded: 0,
    saleCyclesDetected: 0,
    substitutesComputed: 0,
    packagesOptimized: 0,
    forecastsGenerated: 0,
    errors: [],
    durationMs: 0,
  }

  // Step 1: Image fill
  try {
    const imageResult = await polishImages(dryRun)
    result.imagesAdded = imageResult.filled
    if (imageResult.errors.length > 0) {
      result.errors.push(...imageResult.errors.slice(0, 5))
    }
  } catch (err) {
    result.errors.push(`[images] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Step 2+3: Nutrition linking (also handles category fill)
  try {
    const nutritionResult = await enrichNutritionLinks({ dryRun })
    result.nutritionLinked = nutritionResult.linked
    result.categorized = nutritionResult.categorized
    if (nutritionResult.errors.length > 0) {
      result.errors.push(...nutritionResult.errors.slice(0, 5))
    }
  } catch (err) {
    result.errors.push(`[nutrition] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Step 4: Unit normalization
  try {
    const unitResult = await polishUnits(dryRun)
    result.unitsNormalized = unitResult.normalized
  } catch (err) {
    result.errors.push(`[units] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Step 5: Volatility tracking
  try {
    const volResult = await computeVolatility(dryRun)
    result.volatilityUpdated = volResult.updated
  } catch (err) {
    result.errors.push(`[volatility] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Step 6: Source URL construction
  try {
    const urlResult = await fillSourceUrls(dryRun)
    result.sourceUrlsAdded = urlResult.added
  } catch (err) {
    result.errors.push(`[sourceUrls] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Step 7: Sale cycle detection (Phase H)
  try {
    const cycleResult = await runSaleCycleDetection({ dryRun })
    result.saleCyclesDetected = cycleResult.detected
    if (cycleResult.errors.length > 0) {
      result.errors.push(...cycleResult.errors.slice(0, 3))
    }
  } catch (err) {
    result.errors.push(`[saleCycles] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Step 8: Substitute mapping (Phase I)
  try {
    const subResult = await computeSubstitutes({ dryRun })
    result.substitutesComputed = subResult.computed
    if (subResult.errors.length > 0) {
      result.errors.push(...subResult.errors.slice(0, 3))
    }
  } catch (err) {
    result.errors.push(`[substitutes] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Step 9: Package optimization (Phase I)
  try {
    const pkgResult = await computePackageOptimization({ dryRun })
    result.packagesOptimized = pkgResult.optimized
    if (pkgResult.errors.length > 0) {
      result.errors.push(...pkgResult.errors.slice(0, 3))
    }
  } catch (err) {
    result.errors.push(`[packages] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // Step 10: Trend forecasting (Phase J)
  try {
    const forecastResult = await runTrendForecasting({ dryRun })
    result.forecastsGenerated = forecastResult.forecasted
    if (forecastResult.errors.length > 0) {
      result.errors.push(...forecastResult.errors.slice(0, 3))
    }
  } catch (err) {
    result.errors.push(`[forecast] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  result.durationMs = Date.now() - start
  console.log(
    `[polish-job] Done in ${result.durationMs}ms: images=${result.imagesAdded}, nutrition=${result.nutritionLinked}, units=${result.unitsNormalized}, volatility=${result.volatilityUpdated}, urls=${result.sourceUrlsAdded}, cycles=${result.saleCyclesDetected}, subs=${result.substitutesComputed}, pkgs=${result.packagesOptimized}, forecasts=${result.forecastsGenerated}, errors=${result.errors.length}`
  )

  return result
}

// ---------------------------------------------------------------------------
// Step 1: Image fill
// ---------------------------------------------------------------------------

async function polishImages(dryRun: boolean): Promise<{ filled: number; errors: string[] }> {
  const errors: string[] = []
  let filled = 0

  // Get ingredients without images (excluding already-checked ones marked 'none')
  const noImage = (await db.execute(sql`
    SELECT id, name
    FROM ingredients
    WHERE (image_url IS NULL OR image_url = '')
      AND archived = false
    ORDER BY updated_at DESC
    LIMIT 200
  `)) as unknown as Array<{ id: string; name: string }>

  if (noImage.length === 0) return { filled, errors }

  const BATCH_SIZE = 10
  for (let i = 0; i < noImage.length; i += BATCH_SIZE) {
    const batch = noImage.slice(i, i + BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map(async (ing) => {
        const url = await lookupImage(ing.name)
        if (url && !dryRun) {
          await db.execute(sql`
            UPDATE ingredients
            SET image_url = ${url}, updated_at = now()
            WHERE id = ${ing.id} AND (image_url IS NULL OR image_url = '')
          `)
          filled++
        } else if (!url && !dryRun) {
          // Mark as checked so we don't re-query
          await db.execute(sql`
            UPDATE ingredients
            SET image_url = 'none', updated_at = now()
            WHERE id = ${ing.id} AND image_url IS NULL
          `)
        }
      })
    )

    for (const r of results) {
      if (r.status === 'rejected') {
        errors.push(`Image lookup failed: ${r.reason}`)
      }
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < noImage.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return { filled, errors }
}

async function lookupImage(name: string): Promise<string | null> {
  // Try Pi catalog first
  try {
    const params = new URLSearchParams({ search: name, limit: '1' })
    const res = await fetch(`${OPENCLAW_API}/api/ingredients?${params}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      const items = data.ingredients || data.items || []
      if (items.length > 0 && items[0].image_url) {
        const itemName = (items[0].name || '').toLowerCase()
        const searchName = name.toLowerCase()
        if (itemName.includes(searchName) || searchName.includes(itemName)) {
          return items[0].image_url
        }
      }
    }
  } catch {
    // Pi offline, try OpenFoodFacts
  }

  // Try OpenFoodFacts
  try {
    const params = new URLSearchParams({
      search_terms: name,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '1',
      fields: 'image_front_url,product_name',
    })
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      if (data.products?.[0]?.image_front_url) {
        return data.products[0].image_front_url
      }
    }
  } catch {
    // OpenFoodFacts unavailable
  }

  return null
}

// ---------------------------------------------------------------------------
// Step 4: Unit normalization
// ---------------------------------------------------------------------------

async function polishUnits(dryRun: boolean): Promise<{ normalized: number }> {
  if (dryRun) return { normalized: 0 }

  // Fill price_per_unit_cents where it's null but price_cents and unit exist
  // Divide by quantity when available to get correct per-unit price
  const updated = await db.execute(sql`
    UPDATE ingredient_price_history
    SET price_per_unit_cents = CASE
      WHEN quantity IS NOT NULL AND quantity > 0 THEN ROUND(price_cents::numeric / quantity)
      ELSE price_cents
    END
    WHERE price_per_unit_cents IS NULL
      AND price_cents IS NOT NULL
      AND price_cents > 0
  `)

  // The result from drizzle doesn't give rowCount directly, count separately
  const countResult = (await db.execute(sql`
    SELECT count(*) as c FROM ingredient_price_history
    WHERE price_per_unit_cents IS NOT NULL
      AND created_at > now() - INTERVAL '2 minutes'
  `)) as unknown as Array<{ c: string }>

  return { normalized: parseInt(countResult[0]?.c || '0') }
}

// ---------------------------------------------------------------------------
// Step 5: Volatility tracking
// ---------------------------------------------------------------------------

async function computeVolatility(dryRun: boolean): Promise<{ updated: number }> {
  if (dryRun) return { updated: 0 }

  // Compute coefficient of variation for ingredients with 3+ price records in 90 days
  const volData = (await db.execute(sql`
    WITH vol AS (
      SELECT
        ingredient_id,
        STDDEV(price_cents)::numeric / NULLIF(AVG(price_cents), 0) * 100 AS cv
      FROM ingredient_price_history
      WHERE purchase_date > CURRENT_DATE - 90
        AND price_cents IS NOT NULL
        AND price_cents > 0
      GROUP BY ingredient_id
      HAVING COUNT(*) >= 3
    )
    UPDATE ingredients i
    SET
      price_volatility_score = ROUND(vol.cv, 2),
      price_volatility_band = CASE
        WHEN vol.cv > 40 THEN 'high'
        WHEN vol.cv > 15 THEN 'medium'
        ELSE 'low'
      END,
      volatility_updated_at = now()
    FROM vol
    WHERE i.id = vol.ingredient_id
      AND i.archived = false
  `)) as unknown as any

  // Count how many we updated
  const countResult = (await db.execute(sql`
    SELECT count(*) as c FROM ingredients
    WHERE volatility_updated_at > now() - INTERVAL '1 minute'
      AND price_volatility_band IS NOT NULL
  `)) as unknown as Array<{ c: string }>

  return { updated: parseInt(countResult[0]?.c || '0') }
}

// ---------------------------------------------------------------------------
// Step 6: Source URL construction
// ---------------------------------------------------------------------------

async function fillSourceUrls(dryRun: boolean): Promise<{ added: number }> {
  if (dryRun) return { added: 0 }

  // Build Instacart URLs for openclaw_instacart prices that don't have source_url
  await db.execute(sql`
    UPDATE ingredient_price_history
    SET source_url = 'https://www.instacart.com/store/' ||
      LOWER(REPLACE(REPLACE(store_name, ' ', '-'), '''', '')) ||
      '/search/' || REPLACE(
        (SELECT name FROM ingredients WHERE ingredients.id = ingredient_price_history.ingredient_id LIMIT 1),
        ' ', '%20'
      )
    WHERE source = 'openclaw_instacart'
      AND source_url IS NULL
      AND store_name IS NOT NULL
  `)

  const countResult = (await db.execute(sql`
    SELECT count(*) as c FROM ingredient_price_history
    WHERE source = 'openclaw_instacart'
      AND source_url IS NOT NULL
      AND created_at > now() - INTERVAL '5 minutes'
  `)) as unknown as Array<{ c: string }>

  return { added: parseInt(countResult[0]?.c || '0') }
}
