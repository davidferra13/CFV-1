'use server'

/**
 * Package Size Optimization (Phase I)
 * For every product with multiple package sizes, compute which size is the best deal per unit.
 * "5lb bag at $0.12/oz beats the 2lb bag at $0.18/oz."
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

/**
 * Compute best-value package sizes across all store products.
 * Called as part of the polish job. No auth needed (internal).
 */
export async function computePackageOptimization(options?: {
  dryRun?: boolean
}): Promise<{ optimized: number; errors: string[] }> {
  const dryRun = options?.dryRun ?? false
  const errors: string[] = []
  let optimized = 0

  try {
    // First, compute price_per_standard_unit_cents for products that have size data
    if (!dryRun) {
      // Update price per unit where we have product size info
      // openclaw.products has size_value + size_unit, openclaw.store_products has price_cents
      await db.execute(sql`
        UPDATE openclaw.store_products sp
        SET price_per_standard_unit_cents = CASE
          WHEN p.size_value > 0 THEN ROUND(sp.price_cents::numeric / p.size_value)
          ELSE sp.price_cents
        END
        FROM openclaw.products p
        WHERE sp.product_id = p.id
          AND sp.price_cents IS NOT NULL
          AND sp.price_cents > 0
          AND p.size_value IS NOT NULL
          AND p.size_value > 0
          AND sp.price_per_standard_unit_cents IS NULL
      `)

      // Reset all is_best_value flags
      await db.execute(sql`
        UPDATE openclaw.store_products
        SET is_best_value = false
        WHERE is_best_value = true
      `)

      // Mark the best value per product (lowest price_per_standard_unit_cents)
      await db.execute(sql`
        UPDATE openclaw.store_products sp
        SET is_best_value = true
        FROM (
          SELECT DISTINCT ON (product_id)
            id
          FROM openclaw.store_products
          WHERE price_per_standard_unit_cents IS NOT NULL
            AND price_per_standard_unit_cents > 0
          ORDER BY product_id, price_per_standard_unit_cents ASC
        ) best
        WHERE sp.id = best.id
      `)

      // Count optimized
      const countResult = (await db.execute(sql`
        SELECT COUNT(*) as c FROM openclaw.store_products WHERE is_best_value = true
      `)) as unknown as Array<{ c: string }>
      optimized = parseInt(countResult[0]?.c || '0')
    }
  } catch (err) {
    errors.push(`[package-opt] ${err instanceof Error ? err.message : 'unknown'}`)
  }

  console.log(`[package-opt] Marked ${optimized} best-value products, ${errors.length} errors`)
  return { optimized, errors }
}

/**
 * Get package size comparison for a product.
 */
export async function getPackageSizeComparison(options: { productName: string }): Promise<{
  sizes: Array<{
    storeName: string
    size: string
    priceCents: number
    perUnitCents: number
    isBestValue: boolean
  }>
}> {
  // No auth needed - this is openclaw data, not tenant-scoped
  const rows = (await db.execute(sql`
    SELECT
      sp.store_id,
      s.name as store_name,
      p.size_value || ' ' || p.size_unit as size,
      sp.price_cents,
      sp.price_per_standard_unit_cents,
      sp.is_best_value
    FROM openclaw.store_products sp
    JOIN openclaw.products p ON p.id = sp.product_id
    JOIN openclaw.stores s ON s.id = sp.store_id
    WHERE LOWER(p.name) LIKE ${'%' + options.productName.toLowerCase() + '%'}
      AND sp.price_cents IS NOT NULL
      AND sp.price_per_standard_unit_cents IS NOT NULL
    ORDER BY sp.price_per_standard_unit_cents ASC
    LIMIT 20
  `)) as unknown as Array<{
    store_name: string
    size: string
    price_cents: string
    price_per_standard_unit_cents: string
    is_best_value: boolean
  }>

  return {
    sizes: rows.map((r) => ({
      storeName: r.store_name,
      size: r.size || 'standard',
      priceCents: parseInt(r.price_cents),
      perUnitCents: parseInt(r.price_per_standard_unit_cents),
      isBestValue: r.is_best_value,
    })),
  }
}
