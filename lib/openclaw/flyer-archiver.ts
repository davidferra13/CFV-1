'use server'

/**
 * Flyer Archiver (Phase K)
 * Archives current flyer prices before overwrite into openclaw.flyer_archive.
 * After a year, this becomes the most accurate historical price database
 * for the currently covered grocery footprint before it expands further.
 *
 * Storage: ~1,000 products/week * 52 weeks * ~200 bytes/row = ~10MB/year. Negligible.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

/**
 * Archive current flyer prices before they get overwritten.
 * Called before each flyer sync. One INSERT...SELECT, runs in under a second.
 */
export async function archiveFlyerPrices(options?: {
  dryRun?: boolean
}): Promise<{ archived: number; errors: string[] }> {
  const dryRun = options?.dryRun ?? false
  const errors: string[] = []
  let archived = 0

  try {
    if (!dryRun) {
      // Snapshot current flyer prices into the archive.
      // The openclaw.store_products table has the current prices,
      // linked to openclaw.products (product details) and openclaw.stores (store info).
      // We archive products that came from flyer sources (flipp, weekly ads).
      const result = await db.execute(sql`
        INSERT INTO openclaw.flyer_archive (
          chain_slug, store_name, flyer_date,
          product_name, regular_price_cents, sale_price_cents,
          discount_pct, category
        )
        SELECT
          s.chain_slug,
          s.name as store_name,
          CURRENT_DATE as flyer_date,
          p.name as product_name,
          p.regular_price_cents,
          sp.price_cents as sale_price_cents,
          CASE
            WHEN p.regular_price_cents IS NOT NULL AND p.regular_price_cents > 0
            THEN ROUND(
              (p.regular_price_cents - sp.price_cents)::numeric
              / p.regular_price_cents * 100, 2
            )
            ELSE NULL
          END as discount_pct,
          p.category
        FROM openclaw.store_products sp
        JOIN openclaw.products p ON p.id = sp.product_id
        JOIN openclaw.stores s ON s.id = sp.store_id
        WHERE sp.price_cents IS NOT NULL
          AND sp.price_cents > 0
          AND sp.source IN ('flipp', 'flyer', 'weekly_ad')
        ON CONFLICT (chain_slug, flyer_date, product_name) DO NOTHING
      `)
    }

    // Count what we archived
    const countResult = (await db.execute(sql`
      SELECT COUNT(*) as c FROM openclaw.flyer_archive
      WHERE captured_at > now() - INTERVAL '5 minutes'
    `)) as unknown as Array<{ c: string }>
    archived = parseInt(countResult[0]?.c || '0')
  } catch (err) {
    // If openclaw schema doesn't exist yet (no Pi data), this is non-fatal
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg.includes('does not exist') || msg.includes('relation')) {
      console.log('[flyer-archive] OpenCLAW schema not available, skipping archive')
    } else {
      errors.push(`[flyer-archive] ${msg}`)
    }
  }

  console.log(`[flyer-archive] Archived ${archived} flyer prices, ${errors.length} errors`)
  return { archived, errors }
}
