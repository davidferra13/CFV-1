/**
 * Pricing Confidence Score
 *
 * Per-quote: "Your price is 12% below market for this event type in this region.
 * 3 similar events averaged $X."
 *
 * Compares a quote against the chef's own history and PIE market data
 * to produce a 0-100 confidence score with actionable insights.
 *
 * NOT a 'use server' file. Pure logic called by server actions.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'

// ---- Types ----------------------------------------------------------------

export type MarketPosition = 'well_below' | 'below' | 'at_market' | 'above' | 'well_above'

export interface SimilarEvent {
  eventId: string
  eventDate: string
  occasion: string | null
  guestCount: number
  totalCents: number
  perGuestCents: number
}

export interface PricingConfidenceReport {
  /** Overall confidence score 0-100 */
  score: number
  /** Qualitative level */
  level: 'very_high' | 'high' | 'moderate' | 'low'
  /** Where this quote falls relative to market */
  marketPosition: MarketPosition
  /** Per-guest price of this quote */
  perGuestCents: number
  /** Market average per-guest price from similar events */
  marketAvgPerGuestCents: number | null
  /** Percentage difference from market average */
  marketDeltaPct: number | null
  /** Similar past events for comparison */
  similarEvents: SimilarEvent[]
  /** Estimated food cost percentage */
  foodCostPct: number | null
  /** Estimated margin in cents */
  estimatedMarginCents: number | null
  /** Text recommendation */
  recommendation: string
  /** Factors that influenced the score */
  factors: string[]
  /** Count of data points used */
  dataPointCount: number
}

// ---- Core ------------------------------------------------------------------

export async function calculatePricingConfidence(
  quoteId: string,
  tenantId: string
): Promise<PricingConfidenceReport | null> {
  // 1. Get the quote
  const quoteRows = (await db.execute(sql`
    SELECT
      q.id,
      q.total_quoted_cents,
      q.guest_count_estimated,
      q.pricing_model,
      q.price_per_person_cents,
      q.event_id,
      q.inquiry_id,
      e.occasion,
      e.event_date::text AS event_date,
      e.guest_count AS event_guest_count,
      e.service_style,
      e.menu_id
    FROM quotes q
    LEFT JOIN events e ON e.id = q.event_id
    WHERE q.id = ${quoteId}
      AND q.tenant_id = ${tenantId}
    LIMIT 1
  `)) as unknown as Array<{
    id: string
    total_quoted_cents: number
    guest_count_estimated: number | null
    pricing_model: string
    price_per_person_cents: number | null
    event_id: string | null
    inquiry_id: string | null
    occasion: string | null
    event_date: string | null
    event_guest_count: number | null
    service_style: string | null
    menu_id: string | null
  }>

  if (quoteRows.length === 0) return null
  const quote = quoteRows[0]

  if (!quote.total_quoted_cents || quote.total_quoted_cents <= 0) return null

  const guestCount = quote.guest_count_estimated || quote.event_guest_count || 1
  const perGuestCents = Math.round(quote.total_quoted_cents / guestCount)

  // 2. Get similar past events (same occasion/similar size)
  const similarEvents = await findSimilarEvents(tenantId, {
    occasion: quote.occasion,
    guestCount,
    excludeEventId: quote.event_id,
  })

  // 3. Get food cost estimate if menu exists
  let foodCostCents: number | null = null
  if (quote.menu_id) {
    foodCostCents = await estimateMenuFoodCost(quote.menu_id, tenantId)
  }

  // 4. Get all accepted quotes for overall comparison
  const allAcceptedRows = (await db.execute(sql`
    SELECT
      q.total_quoted_cents,
      q.guest_count_estimated,
      e.guest_count AS event_guest_count
    FROM quotes q
    LEFT JOIN events e ON e.id = q.event_id
    WHERE q.tenant_id = ${tenantId}
      AND q.status = 'accepted'
      AND q.total_quoted_cents > 0
      AND q.id != ${quoteId}
  `)) as unknown as Array<{
    total_quoted_cents: number
    guest_count_estimated: number | null
    event_guest_count: number | null
  }>

  // 5. Calculate market comparison
  const similarPerGuest = similarEvents
    .map(e => e.perGuestCents)
    .filter(v => v > 0)
  const allPerGuest = allAcceptedRows
    .map(r => {
      const gc = r.guest_count_estimated || r.event_guest_count || 1
      return Math.round(r.total_quoted_cents / gc)
    })
    .filter(v => v > 0)

  // Use similar events if we have enough, otherwise fall back to all
  const comparisonPool = similarPerGuest.length >= 3 ? similarPerGuest : allPerGuest
  const marketAvgPerGuestCents = comparisonPool.length > 0
    ? Math.round(comparisonPool.reduce((s, v) => s + v, 0) / comparisonPool.length)
    : null

  // 6. Calculate market position and delta
  let marketPosition: MarketPosition = 'at_market'
  let marketDeltaPct: number | null = null

  if (marketAvgPerGuestCents && marketAvgPerGuestCents > 0) {
    marketDeltaPct = Math.round(
      ((perGuestCents - marketAvgPerGuestCents) / marketAvgPerGuestCents) * 100
    )
    if (marketDeltaPct < -20) marketPosition = 'well_below'
    else if (marketDeltaPct < -5) marketPosition = 'below'
    else if (marketDeltaPct <= 10) marketPosition = 'at_market'
    else if (marketDeltaPct <= 25) marketPosition = 'above'
    else marketPosition = 'well_above'
  }

  // 7. Calculate food cost percentage and margin
  let foodCostPct: number | null = null
  let estimatedMarginCents: number | null = null

  if (foodCostCents !== null && foodCostCents > 0) {
    foodCostPct = Math.round((foodCostCents / quote.total_quoted_cents) * 100)
    estimatedMarginCents = quote.total_quoted_cents - foodCostCents
  }

  // 8. Build confidence score
  const factors: string[] = []
  let score = 50 // Start at neutral

  // Factor 1: Market position (biggest weight)
  if (marketAvgPerGuestCents) {
    if (marketPosition === 'at_market') {
      score += 15
      factors.push(`Priced at market average ($${(marketAvgPerGuestCents / 100).toFixed(0)}/guest)`)
    } else if (marketPosition === 'below') {
      score += 10
      factors.push(`${Math.abs(marketDeltaPct!)}% below your market average, competitive price`)
    } else if (marketPosition === 'well_below') {
      score -= 5
      factors.push(`${Math.abs(marketDeltaPct!)}% below market; you may be undercharging`)
    } else if (marketPosition === 'above') {
      score += 5
      factors.push(`${marketDeltaPct}% above average; premium positioning`)
    } else {
      score -= 10
      factors.push(`${marketDeltaPct}% above market; higher rejection risk`)
    }
  } else {
    factors.push('Not enough historical data for market comparison')
  }

  // Factor 2: Data confidence (how much data we have)
  const dataPoints = similarPerGuest.length
  if (dataPoints >= 10) {
    score += 10
    factors.push(`Strong data: ${dataPoints} similar events for comparison`)
  } else if (dataPoints >= 5) {
    score += 5
    factors.push(`Good data: ${dataPoints} similar events for comparison`)
  } else if (dataPoints >= 2) {
    // neutral
    factors.push(`Limited data: ${dataPoints} similar events`)
  } else {
    score -= 10
    factors.push('Very few comparable events; confidence is lower')
  }

  // Factor 3: Food cost ratio (healthy margins)
  if (foodCostPct !== null) {
    if (foodCostPct <= 25) {
      score += 10
      factors.push(`Healthy food cost: ${foodCostPct}% of total`)
    } else if (foodCostPct <= 35) {
      score += 5
      factors.push(`Reasonable food cost: ${foodCostPct}% of total`)
    } else if (foodCostPct <= 50) {
      // neutral
      factors.push(`Food cost at ${foodCostPct}%; margin is thin`)
    } else {
      score -= 10
      factors.push(`High food cost: ${foodCostPct}%. Consider adjusting the menu or price.`)
    }
  }

  // Factor 4: Guest count appropriateness
  if (guestCount < 4 && perGuestCents < 5000) {
    score -= 5
    factors.push('Small party with low per-guest price; consider a minimum')
  } else if (guestCount >= 20 && marketPosition !== 'well_above') {
    score += 5
    factors.push('Large party size is favorable for volume pricing')
  }

  // Clamp score
  score = Math.max(5, Math.min(95, score))

  const level: PricingConfidenceReport['level'] =
    score >= 75 ? 'very_high' :
    score >= 55 ? 'high' :
    score >= 35 ? 'moderate' : 'low'

  // 9. Build recommendation text
  const recommendation = buildRecommendation({
    score,
    marketPosition,
    marketDeltaPct,
    foodCostPct,
    perGuestCents,
    marketAvgPerGuestCents,
    guestCount,
    dataPoints,
  })

  return {
    score,
    level,
    marketPosition,
    perGuestCents,
    marketAvgPerGuestCents,
    marketDeltaPct,
    similarEvents: similarEvents.slice(0, 5),
    foodCostPct,
    estimatedMarginCents,
    recommendation,
    factors,
    dataPointCount: dataPoints + allPerGuest.length,
  }
}

// ---- Find Similar Events ---------------------------------------------------

async function findSimilarEvents(
  tenantId: string,
  criteria: {
    occasion: string | null
    guestCount: number
    excludeEventId: string | null
  }
): Promise<SimilarEvent[]> {
  const { occasion, guestCount, excludeEventId } = criteria

  // Similar = same occasion (if available) + within 50% guest count range
  const minGuests = Math.max(1, Math.floor(guestCount * 0.5))
  const maxGuests = Math.ceil(guestCount * 1.5)

  const rows = (await db.execute(sql`
    SELECT
      e.id AS event_id,
      e.event_date::text AS event_date,
      e.occasion,
      e.guest_count,
      q.total_quoted_cents
    FROM events e
    JOIN quotes q ON q.event_id = e.id AND q.tenant_id = ${tenantId}
    WHERE e.tenant_id = ${tenantId}
      AND e.status IN ('completed', 'confirmed', 'paid')
      AND q.status = 'accepted'
      AND q.total_quoted_cents > 0
      AND e.guest_count >= ${minGuests}
      AND e.guest_count <= ${maxGuests}
      ${excludeEventId ? sql`AND e.id != ${excludeEventId}` : sql``}
    ORDER BY
      CASE WHEN ${occasion || ''} != '' AND e.occasion = ${occasion || ''} THEN 0 ELSE 1 END,
      e.event_date DESC
    LIMIT 20
  `)) as unknown as Array<{
    event_id: string
    event_date: string
    occasion: string | null
    guest_count: number
    total_quoted_cents: number
  }>

  return rows.map(r => ({
    eventId: r.event_id,
    eventDate: r.event_date,
    occasion: r.occasion,
    guestCount: r.guest_count,
    totalCents: r.total_quoted_cents,
    perGuestCents: Math.round(r.total_quoted_cents / (r.guest_count || 1)),
  }))
}

// ---- Estimate Menu Food Cost -----------------------------------------------

async function estimateMenuFoodCost(
  menuId: string,
  tenantId: string
): Promise<number | null> {
  // Try the pre-computed cost summary first
  const summaryRows = (await db.execute(sql`
    SELECT total_recipe_cost_cents
    FROM menu_cost_summary
    WHERE menu_id = ${menuId}
    LIMIT 1
  `)) as unknown as Array<{ total_recipe_cost_cents: number | null }>

  if (summaryRows.length > 0 && summaryRows[0].total_recipe_cost_cents) {
    return summaryRows[0].total_recipe_cost_cents
  }

  // Fall back to computing from recipe ingredients
  const ingredientRows = (await db.execute(sql`
    SELECT i.id
    FROM dishes d
    JOIN ingredients i ON i.recipe_id = d.recipe_id
    WHERE d.menu_id = ${menuId}
      AND d.recipe_id IS NOT NULL
  `)) as unknown as Array<{ id: string }>

  if (ingredientRows.length === 0) return null

  const ids = ingredientRows.map(r => r.id)
  const prices = await resolvePricesBatch(ids, tenantId)

  let totalCents = 0
  for (const [, price] of prices) {
    totalCents += price.cents
  }

  return totalCents > 0 ? totalCents : null
}

// ---- Recommendation Builder ------------------------------------------------

function buildRecommendation(ctx: {
  score: number
  marketPosition: MarketPosition
  marketDeltaPct: number | null
  foodCostPct: number | null
  perGuestCents: number
  marketAvgPerGuestCents: number | null
  guestCount: number
  dataPoints: number
}): string {
  const parts: string[] = []

  if (ctx.dataPoints < 3) {
    parts.push(
      'Limited comparable data. As you complete more events, pricing confidence will improve.'
    )
  }

  if (ctx.marketPosition === 'well_below' && ctx.marketAvgPerGuestCents) {
    const diff = Math.abs(ctx.marketDeltaPct || 0)
    parts.push(
      `Your price is ${diff}% below your typical accepted range. ` +
      `Consider raising to $${(ctx.marketAvgPerGuestCents / 100).toFixed(0)}/guest unless there is a strategic reason.`
    )
  } else if (ctx.marketPosition === 'below') {
    parts.push(
      'Priced competitively below your average. Good for winning new clients or smaller events.'
    )
  } else if (ctx.marketPosition === 'at_market') {
    parts.push('Price is in line with your historical range. Solid positioning.')
  } else if (ctx.marketPosition === 'above') {
    parts.push(
      'Premium pricing. Ensure the menu and experience justify the higher price point.'
    )
  } else if (ctx.marketPosition === 'well_above') {
    parts.push(
      'Significantly above your typical range. Verify this aligns with client expectations.'
    )
  }

  if (ctx.foodCostPct !== null && ctx.foodCostPct > 40) {
    parts.push(
      `Food cost is ${ctx.foodCostPct}% of the quote. Consider simpler dishes or negotiating ingredient prices.`
    )
  }

  if (parts.length === 0) {
    parts.push('Pricing looks reasonable based on available data.')
  }

  return parts.join(' ')
}
