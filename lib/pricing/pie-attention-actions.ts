'use server'

/**
 * PIE Attention Items - Server action producing price intelligence alerts
 * relevant to a chef's upcoming events and menus.
 *
 * Queries the pricing waterfall for current prices, cross-references with
 * upcoming event menus, and surfaces actionable pricing intelligence.
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { pgClient } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { resolvePricesBatch } from './resolve-price'
import { unstable_cache } from 'next/cache'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PieAttentionKind =
  | 'price_spike'
  | 'seasonal_opportunity'
  | 'cost_overrun_risk'
  | 'better_alternative'
  | 'bulk_buy_window'

export interface PieAttentionItem {
  id: string
  kind: PieAttentionKind
  title: string
  description: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  ingredientName: string
  changePct: number | null
  currentCents: number | null
  previousCents: number | null
  affectedEvents: Array<{ id: string; occasion: string; eventDate: string }>
  suggestion: string
  href: string | null
}

// ---------------------------------------------------------------------------
// Internal: fetch chef's upcoming event ingredients
// ---------------------------------------------------------------------------

interface UpcomingIngredient {
  ingredient_name: string
  canonical_ingredient_id: string | null
  event_id: string
  event_occasion: string
  event_date: string
  quoted_cost_cents: number | null
}

async function getUpcomingEventIngredients(tenantId: string): Promise<UpcomingIngredient[]> {
  const rows = (await db.execute(sql`
    SELECT DISTINCT
      ri.name AS ingredient_name,
      ri.canonical_ingredient_id,
      e.id AS event_id,
      COALESCE(e.occasion, c.full_name, 'Event') AS event_occasion,
      e.event_date::text AS event_date,
      ri.cost_cents AS quoted_cost_cents
    FROM events e
    JOIN event_menus em ON em.event_id = e.id
    JOIN menu_recipes mr ON mr.menu_id = em.menu_id
    JOIN recipe_ingredients ri ON ri.recipe_id = mr.recipe_id
    LEFT JOIN clients c ON c.id = e.client_id
    WHERE e.tenant_id = ${tenantId}
      AND e.status NOT IN ('completed', 'cancelled', 'archived')
      AND e.event_date >= CURRENT_DATE
      AND e.event_date <= CURRENT_DATE + INTERVAL '30 days'
    ORDER BY e.event_date ASC
    LIMIT 500
  `)) as unknown as UpcomingIngredient[]

  return rows
}

// ---------------------------------------------------------------------------
// Internal: fetch trend/anomaly data from openclaw
// ---------------------------------------------------------------------------

interface TrendRow {
  ingredient_id: string
  direction: string
  change_pct: number
  current_cents: number
  confidence: number
}

async function getRelevantTrends(canonicalIds: string[]): Promise<TrendRow[]> {
  if (canonicalIds.length === 0) return []

  const pgSql = pgClient
  const rows = await pgSql`
    SELECT
      ingredient_id,
      direction,
      change_pct,
      current_cents,
      confidence
    FROM openclaw.ingredient_trends
    WHERE ingredient_id = ANY(${canonicalIds})
      AND confidence >= 0.4
      AND (
        (direction = 'rising' AND change_pct > 15)
        OR (direction = 'falling' AND change_pct < -10)
        OR (direction = 'volatile' AND ABS(change_pct) > 20)
      )
    ORDER BY ABS(change_pct) DESC
    LIMIT 30
  `

  return rows as unknown as TrendRow[]
}

// ---------------------------------------------------------------------------
// Internal: fetch seasonal scores from openclaw
// ---------------------------------------------------------------------------

interface SeasonalRow {
  ingredient_id: string
  month: number
  score: number
  price_index: number
}

async function getSeasonalOpportunities(canonicalIds: string[]): Promise<SeasonalRow[]> {
  if (canonicalIds.length === 0) return []

  const currentMonth = new Date().getMonth() + 1

  const pgSql = pgClient
  const rows = await pgSql`
    SELECT
      ingredient_id,
      month,
      score,
      price_index
    FROM openclaw.seasonal_scores
    WHERE ingredient_id = ANY(${canonicalIds})
      AND month = ${currentMonth}
      AND score >= 70
      AND price_index < 85
    ORDER BY score DESC
    LIMIT 20
  `

  return rows as unknown as SeasonalRow[]
}

// ---------------------------------------------------------------------------
// Main: assemble attention items
// ---------------------------------------------------------------------------

async function assembleAttentionItems(tenantId: string): Promise<PieAttentionItem[]> {
  const ingredients = await getUpcomingEventIngredients(tenantId)
  if (ingredients.length === 0) return []

  // Build lookup maps
  const canonicalIds = [
    ...new Set(
      ingredients.map((i) => i.canonical_ingredient_id).filter((id): id is string => id !== null)
    ),
  ]

  const ingredientNames = [...new Set(ingredients.map((i) => i.ingredient_name))]

  // Group events by ingredient name
  const ingredientEvents = new Map<
    string,
    Array<{ id: string; occasion: string; eventDate: string }>
  >()
  for (const ing of ingredients) {
    const key = ing.ingredient_name.toLowerCase()
    if (!ingredientEvents.has(key)) ingredientEvents.set(key, [])
    const events = ingredientEvents.get(key)!
    if (!events.find((e) => e.id === ing.event_id)) {
      events.push({
        id: ing.event_id,
        occasion: ing.event_occasion,
        eventDate: ing.event_date,
      })
    }
  }

  const items: PieAttentionItem[] = []

  // 1. Fetch trends (spikes, drops) and resolve current prices
  const [trends, seasonal] = await Promise.all([
    getRelevantTrends(canonicalIds),
    getSeasonalOpportunities(canonicalIds),
  ])

  // Resolve current market prices for cost overrun detection
  const resolvedPrices =
    canonicalIds.length > 0
      ? await resolvePricesBatch(canonicalIds.slice(0, 100), tenantId)
      : new Map<string, { cents: number }>()

  // Map canonical ID to ingredient name
  const idToName = new Map<string, string>()
  for (const ing of ingredients) {
    if (ing.canonical_ingredient_id) {
      idToName.set(ing.canonical_ingredient_id, ing.ingredient_name)
    }
  }

  // 2. Price spike alerts from trends
  for (const trend of trends) {
    const name = idToName.get(trend.ingredient_id)
    if (!name) continue

    const events = ingredientEvents.get(name.toLowerCase()) ?? []
    const changePct = Number(trend.change_pct)
    const absPct = Math.abs(changePct)

    if (trend.direction === 'rising' || (trend.direction === 'volatile' && changePct > 0)) {
      items.push({
        id: `spike.${trend.ingredient_id}`,
        kind: 'price_spike',
        title: `${name} up ${absPct.toFixed(0)}%`,
        description: `Price has risen ${absPct.toFixed(0)}% vs 30-day average`,
        urgency: absPct > 30 ? 'critical' : absPct > 20 ? 'high' : 'medium',
        ingredientName: name,
        changePct,
        currentCents: Number(trend.current_cents),
        previousCents: Math.round(Number(trend.current_cents) / (1 + changePct / 100)),
        affectedEvents: events,
        suggestion:
          absPct > 25
            ? 'Consider substitutes or adjust menu pricing'
            : 'Monitor; may need to reprice soon',
        href: `/pricing/ingredients`,
      })
    } else if (trend.direction === 'falling' && absPct > 15) {
      // Bulk buy window
      items.push({
        id: `bulk.${trend.ingredient_id}`,
        kind: 'bulk_buy_window',
        title: `${name} down ${absPct.toFixed(0)}%`,
        description: `Price has dropped ${absPct.toFixed(0)}%; good time to stock up`,
        urgency: 'low',
        ingredientName: name,
        changePct,
        currentCents: Number(trend.current_cents),
        previousCents: Math.round(Number(trend.current_cents) / (1 + changePct / 100)),
        affectedEvents: events,
        suggestion: 'Stock up or feature this ingredient while prices are low',
        href: `/pricing/ingredients`,
      })
    }
  }

  // 3. Seasonal opportunities
  for (const s of seasonal) {
    const name = idToName.get(s.ingredient_id)
    if (!name) continue
    // Skip if already covered by trend alert
    if (items.find((i) => i.ingredientName.toLowerCase() === name.toLowerCase())) continue

    const events = ingredientEvents.get(name.toLowerCase()) ?? []
    items.push({
      id: `seasonal.${s.ingredient_id}`,
      kind: 'seasonal_opportunity',
      title: `${name} in peak season`,
      description: `Quality score ${s.score}/100, price index ${s.price_index}% of average`,
      urgency: 'medium',
      ingredientName: name,
      changePct: s.price_index - 100,
      currentCents: null,
      previousCents: null,
      affectedEvents: events,
      suggestion: 'Peak quality at below-average price; great time to feature',
      href: `/pricing/seasonal`,
    })
  }

  // 4. Cost overrun detection (compare resolved prices vs quoted costs)
  if (resolvedPrices.size > 0) {
    for (const ing of ingredients) {
      if (!ing.quoted_cost_cents || ing.quoted_cost_cents <= 0) continue
      if (!ing.canonical_ingredient_id) continue
      const key = ing.ingredient_name.toLowerCase()
      const resolved = resolvedPrices.get(ing.canonical_ingredient_id)
      if (!resolved || !resolved.cents) continue

      const currentAvg = resolved.cents
      const quoted = ing.quoted_cost_cents
      const overrunPct = ((currentAvg - quoted) / quoted) * 100

      if (overrunPct > 20) {
        // Only add once per ingredient
        if (items.find((i) => i.id === `overrun.${key}`)) continue

        const events = ingredientEvents.get(key) ?? []
        items.push({
          id: `overrun.${key}`,
          kind: 'cost_overrun_risk',
          title: `${ing.ingredient_name} costs ${overrunPct.toFixed(0)}% over quote`,
          description: `Current market price exceeds your quoted cost for upcoming events`,
          urgency: overrunPct > 40 ? 'critical' : 'high',
          ingredientName: ing.ingredient_name,
          changePct: overrunPct,
          currentCents: currentAvg,
          previousCents: quoted,
          affectedEvents: events,
          suggestion: 'Update quote or find a cheaper source',
          href: events.length > 0 ? `/events/${events[0].id}` : `/pricing/ingredients`,
        })
      }
    }
  }

  // Sort by urgency
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return items.slice(0, 12)
}

// ---------------------------------------------------------------------------
// Public: cached server action
// ---------------------------------------------------------------------------

export async function getPieAttentionItems(): Promise<PieAttentionItem[]> {
  const user = await requireChef()
  if (!user.tenantId) return []

  const cached = unstable_cache(
    () => assembleAttentionItems(user.tenantId!),
    [`pie-attention-${user.tenantId}`],
    { revalidate: 14400, tags: [`pie-attention-${user.tenantId}`] }
  )

  try {
    return await cached()
  } catch (err) {
    console.error('[pie-attention] Failed to assemble attention items:', err)
    return []
  }
}
