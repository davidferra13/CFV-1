'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Price Freshness Summary
// ---------------------------------------------------------------------------

export interface QuotePriceFreshnessSummary {
  hasLinkedMenu: boolean
  totalIngredients: number
  currentCount: number // priced within 7 days
  recentCount: number // priced 8-30 days ago
  staleCount: number // priced >30 days ago
  noPriceCount: number // no price data at all
  oldestPriceDays: number | null // age of stalest price in days
}

/**
 * For an event's linked menu, summarises how fresh the ingredient price data is.
 * Uses the most recent price record per ingredient (any source).
 * Runs a single SQL query instead of the full resolvePrice chain.
 */
export async function getQuotePriceFreshnessSummary(
  eventId: string
): Promise<QuotePriceFreshnessSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all ingredients used in recipes linked to this event's menus
  const { data: rows, error } = await db.rpc('raw_sql', {
    query: `
      SELECT
        ri.ingredient_id,
        MAX(iph.purchase_date) AS last_price_date
      FROM menus m
      JOIN menu_recipes mr ON mr.menu_id = m.id
      JOIN recipe_ingredients ri ON ri.recipe_id = mr.recipe_id
      LEFT JOIN ingredient_price_history iph
        ON iph.ingredient_id = ri.ingredient_id
        AND iph.tenant_id = $1
      WHERE m.event_id = $2
        AND m.tenant_id = $1
        AND m.deleted_at IS NULL
        AND ri.ingredient_id IS NOT NULL
      GROUP BY ri.ingredient_id
    `,
    values: [user.tenantId!, eventId],
  })

  if (error || !rows || rows.length === 0) {
    return {
      hasLinkedMenu: !error,
      totalIngredients: 0,
      currentCount: 0,
      recentCount: 0,
      staleCount: 0,
      noPriceCount: 0,
      oldestPriceDays: null,
    }
  }

  const now = Date.now()
  let currentCount = 0
  let recentCount = 0
  let staleCount = 0
  let noPriceCount = 0
  let oldestPriceDays: number | null = null

  for (const row of rows as { ingredient_id: string; last_price_date: string | null }[]) {
    if (!row.last_price_date) {
      noPriceCount++
      continue
    }
    const days = Math.floor((now - new Date(row.last_price_date).getTime()) / 86_400_000)
    if (oldestPriceDays === null || days > oldestPriceDays) oldestPriceDays = days
    if (days <= 7) currentCount++
    else if (days <= 30) recentCount++
    else staleCount++
  }

  return {
    hasLinkedMenu: true,
    totalIngredients: rows.length,
    currentCount,
    recentCount,
    staleCount,
    noPriceCount,
    oldestPriceDays,
  }
}

export interface QuotePriceConfidence {
  hasLinkedMenu: boolean
  totalMenus: number
  menusWithFullCosts: number
  menusWithPartialCosts: number
  coveragePct: number | null
}

/**
 * Check whether the menus attached to an event have full recipe cost coverage.
 * Used on the quote detail page to surface a "price confidence" warning.
 */
export async function getEventMenuPriceConfidence(
  eventId: string
): Promise<QuotePriceConfidence | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get menus for this event with their cost summary
  const { data: menus, error } = await db
    .from('menus')
    .select('id, menu_cost_summary:menu_cost_summary(has_all_recipe_costs, total_component_count)')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if (error || !menus || menus.length === 0) {
    return {
      hasLinkedMenu: false,
      totalMenus: 0,
      menusWithFullCosts: 0,
      menusWithPartialCosts: 0,
      coveragePct: null,
    }
  }

  let full = 0
  let partial = 0
  let noData = 0

  for (const menu of menus) {
    const summary = Array.isArray(menu.menu_cost_summary)
      ? menu.menu_cost_summary[0]
      : menu.menu_cost_summary

    if (!summary || summary.total_component_count == null || summary.total_component_count === 0) {
      noData++
    } else if (summary.has_all_recipe_costs === true) {
      full++
    } else {
      partial++
    }
  }

  const total = menus.length
  const coveragePct = total > 0 ? Math.round((full / total) * 100) : null

  return {
    hasLinkedMenu: true,
    totalMenus: total,
    menusWithFullCosts: full,
    menusWithPartialCosts: partial,
    coveragePct,
  }
}
