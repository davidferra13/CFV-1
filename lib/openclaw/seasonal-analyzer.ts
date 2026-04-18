'use server'

/**
 * Seasonal Availability Analyzer
 * Computes ingredient seasonality from price history data.
 * Runs as part of the polish job after each full sync cycle.
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

export async function analyzeSeasonality(region: string = 'northeast'): Promise<{
  analyzed: number
  updated: number
  skipped: number
}> {
  await requireChef()
  const sql = pgClient

  // Get ingredients with 6+ months of price history
  // Bridge through ingredient_aliases since ingredient_price_history.ingredient_id
  // references ingredients(id), not system_ingredients(id)
  const candidates = await sql`
    SELECT
      ia.system_ingredient_id as ingredient_id,
      si.name as ingredient_name,
      count(DISTINCT extract(month from iph.purchase_date)) as months_with_data,
      count(*) as total_records
    FROM ingredient_price_history iph
    JOIN ingredient_aliases ia ON ia.ingredient_id = iph.ingredient_id
      AND ia.confirmed_at IS NOT NULL
    JOIN system_ingredients si ON si.id = ia.system_ingredient_id
    WHERE iph.purchase_date >= now() - interval '12 months'
    GROUP BY ia.system_ingredient_id, si.name
    HAVING count(DISTINCT extract(month from iph.purchase_date)) >= 6
  `

  let updated = 0
  let skipped = 0

  for (const candidate of candidates) {
    const ingredientId = candidate.ingredient_id as string
    const ingredientName = candidate.ingredient_name as string

    // Get monthly price averages via alias bridge (ingredientId is system_ingredient_id here)
    const monthlyPrices = await sql`
      SELECT
        extract(month from iph.purchase_date)::integer as month,
        avg(iph.price_cents) as avg_price,
        count(*) as data_points
      FROM ingredient_price_history iph
      JOIN ingredient_aliases ia ON ia.ingredient_id = iph.ingredient_id
        AND ia.confirmed_at IS NOT NULL
      WHERE ia.system_ingredient_id = ${ingredientId}
      AND iph.purchase_date >= now() - interval '12 months'
      GROUP BY extract(month from iph.purchase_date)
      ORDER BY month
    `

    if (monthlyPrices.length < 6) {
      skipped++
      continue
    }

    const prices = monthlyPrices.map((mp) => ({
      month: Number(mp.month),
      avgPrice: Number(mp.avg_price),
      dataPoints: Number(mp.data_points),
    }))

    const allPrices = prices.map((p) => p.avgPrice)
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length
    const priceRange = maxPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0

    // Year-round if price variation < 20%
    const isYearRound = priceRange < 20

    // Peak months: months where price is <= 15% above minimum (cheapest = most abundant)
    const peakThreshold = minPrice * 1.15
    const peakMonths = prices.filter((p) => p.avgPrice <= peakThreshold).map((p) => p.month)

    // Available months: all months with data
    const availableMonths = prices.map((p) => p.month)

    // Price low/high months
    const sortedByPrice = [...prices].sort((a, b) => a.avgPrice - b.avgPrice)
    const priceLowMonths = sortedByPrice.slice(0, 3).map((p) => p.month)
    const priceHighMonths = sortedByPrice.slice(-3).map((p) => p.month)

    // Confidence = months with data / 12
    const confidence = Math.round((prices.length / 12) * 100) / 100

    await sql`
      INSERT INTO ingredient_seasonality (
        system_ingredient_id, ingredient_name, region,
        peak_months, available_months, price_low_months, price_high_months,
        is_year_round, confidence, source, updated_at
      ) VALUES (
        ${ingredientId}, ${ingredientName}, ${region},
        ${peakMonths}, ${availableMonths}, ${priceLowMonths}, ${priceHighMonths},
        ${isYearRound}, ${confidence}, 'computed', now()
      )
      ON CONFLICT (system_ingredient_id, region)
      DO UPDATE SET
        ingredient_name = EXCLUDED.ingredient_name,
        peak_months = EXCLUDED.peak_months,
        available_months = EXCLUDED.available_months,
        price_low_months = EXCLUDED.price_low_months,
        price_high_months = EXCLUDED.price_high_months,
        is_year_round = EXCLUDED.is_year_round,
        confidence = EXCLUDED.confidence,
        updated_at = now()
    `

    updated++
  }

  return { analyzed: candidates.length, updated, skipped }
}
