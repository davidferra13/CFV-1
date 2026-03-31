'use server'

/**
 * Store Accuracy Scorer
 * Compares receipt prices to scraped prices to score how
 * accurately each store's online prices match shelf prices.
 * Runs weekly as part of the polish job.
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

export async function scoreAllStores(): Promise<{
  scored: number
  skipped: number
}> {
  await requireChef()
  const sql = pgClient

  // Find all stores that have both receipt data and scraped price data
  const stores = await sql`
    SELECT DISTINCT store_name, chain_slug
    FROM ingredient_price_history
    WHERE source LIKE 'openclaw_%'
    AND store_name IS NOT NULL
  `

  let scored = 0
  let skipped = 0

  for (const store of stores) {
    const storeName = store.store_name as string
    const chainSlug = store.chain_slug as string | null

    // Find receipt-vs-scrape pairs within 7 days of each other
    const pairs = await sql`
      SELECT
        r.price_cents as receipt_cents,
        s.price_cents as scraped_cents,
        r.ingredient_id
      FROM ingredient_price_history r
      JOIN ingredient_price_history s
        ON r.ingredient_id = s.ingredient_id
        AND s.store_name = ${storeName}
        AND s.source LIKE 'openclaw_%'
        AND ABS(EXTRACT(EPOCH FROM (r.purchase_date - s.purchase_date))) < 604800
      WHERE r.source = 'receipt'
      AND r.store_name = ${storeName}
      AND r.price_cents > 0
      AND s.price_cents > 0
    `

    if (pairs.length < 10) {
      skipped++
      continue
    }

    // Calculate accuracy
    let matches = 0
    let totalDeviation = 0

    for (const pair of pairs) {
      const receiptCents = Number(pair.receipt_cents)
      const scrapedCents = Number(pair.scraped_cents)
      const deviation = (Math.abs(receiptCents - scrapedCents) / receiptCents) * 100

      totalDeviation += deviation
      if (deviation < 5) matches++
    }

    const accuracyPct = Math.round((matches / pairs.length) * 10000) / 100
    const avgDeviationPct = Math.round((totalDeviation / pairs.length) * 100) / 100

    // Compute trend: compare last 30 days accuracy to previous 30 days
    const recentPairs = await sql`
      SELECT count(*) FILTER (WHERE
        ABS(r.price_cents - s.price_cents)::numeric / NULLIF(r.price_cents, 0) * 100 < 5
      ) as recent_matches,
      count(*) as recent_total
      FROM ingredient_price_history r
      JOIN ingredient_price_history s
        ON r.ingredient_id = s.ingredient_id
        AND s.store_name = ${storeName}
        AND s.source LIKE 'openclaw_%'
        AND ABS(EXTRACT(EPOCH FROM (r.purchase_date - s.purchase_date))) < 604800
      WHERE r.source = 'receipt'
      AND r.store_name = ${storeName}
      AND r.purchase_date >= now() - interval '30 days'
      AND r.price_cents > 0
      AND s.price_cents > 0
    `

    const prevPairs = await sql`
      SELECT count(*) FILTER (WHERE
        ABS(r.price_cents - s.price_cents)::numeric / NULLIF(r.price_cents, 0) * 100 < 5
      ) as prev_matches,
      count(*) as prev_total
      FROM ingredient_price_history r
      JOIN ingredient_price_history s
        ON r.ingredient_id = s.ingredient_id
        AND s.store_name = ${storeName}
        AND s.source LIKE 'openclaw_%'
        AND ABS(EXTRACT(EPOCH FROM (r.purchase_date - s.purchase_date))) < 604800
      WHERE r.source = 'receipt'
      AND r.store_name = ${storeName}
      AND r.purchase_date >= now() - interval '60 days'
      AND r.purchase_date < now() - interval '30 days'
      AND r.price_cents > 0
      AND s.price_cents > 0
    `

    let trend = 'stable'
    const recentTotal = Number(recentPairs[0]?.recent_total || 0)
    const prevTotal = Number(prevPairs[0]?.prev_total || 0)
    if (recentTotal >= 5 && prevTotal >= 5) {
      const recentAcc = Number(recentPairs[0]?.recent_matches || 0) / recentTotal
      const prevAcc = Number(prevPairs[0]?.prev_matches || 0) / prevTotal
      if (recentAcc - prevAcc > 0.05) trend = 'improving'
      else if (prevAcc - recentAcc > 0.05) trend = 'declining'
    }

    await sql`
      INSERT INTO store_accuracy_scores (
        store_name, chain_slug, region,
        accuracy_pct, avg_deviation_pct, comparison_count,
        trend, last_compared_at, updated_at
      ) VALUES (
        ${storeName}, ${chainSlug}, 'northeast',
        ${accuracyPct}, ${avgDeviationPct}, ${pairs.length},
        ${trend}, now(), now()
      )
      ON CONFLICT (store_name, region)
      DO UPDATE SET
        accuracy_pct = EXCLUDED.accuracy_pct,
        avg_deviation_pct = EXCLUDED.avg_deviation_pct,
        comparison_count = EXCLUDED.comparison_count,
        trend = EXCLUDED.trend,
        last_compared_at = EXCLUDED.last_compared_at,
        updated_at = now()
    `

    scored++
  }

  return { scored, skipped }
}
