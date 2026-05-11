// Quote Cost Guard
// Lightweight pre-send validation for quote cost confidence.
// Called by transitionQuote() when transitioning to 'sent' status.
// Returns warnings (non-blocking) so the chef sees them but can still send.
// This closes the Zero Hallucination gap: quotes with low-confidence pricing
// now surface explicit warnings instead of silently appearing trustworthy.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { CostConfidenceLevel } from './recipe-cost-provenance'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuoteCostGuardWarning = {
  level: 'info' | 'warning' | 'critical'
  code: string
  message: string
}

export type QuoteCostGuardResult = {
  confidenceLevel: CostConfidenceLevel
  coveragePct: number
  totalIngredients: number
  pricedIngredients: number
  staleCount: number
  noPriceCount: number
  warnings: QuoteCostGuardWarning[]
  sendable: boolean // false = should not send (critical gaps)
}

// ---------------------------------------------------------------------------
// Main guard function
// ---------------------------------------------------------------------------

/**
 * Evaluate cost confidence for a quote about to be sent.
 * Lightweight: single query, no full menu breakdown.
 * Returns null if quote has no linked event/menu.
 */
export async function evaluateQuoteCostGuard(
  quoteId: string,
  tenantIdOverride?: string
): Promise<QuoteCostGuardResult | null> {
  // Use override (from transitionQuote internal call) or auth
  let tenantId = tenantIdOverride
  if (!tenantId) {
    const user = await requireChef()
    tenantId = user.tenantId!
  }
  const db: any = createServerClient()

  // 1. Get quote -> event -> menu chain
  const { data: quote } = await db
    .from('quotes')
    .select('id, event_id, total_quoted_cents, guest_count_estimated')
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!quote?.event_id) return null

  // 2. Get menu_id from event
  const { data: event } = await db
    .from('events')
    .select('menu_id')
    .eq('id', quote.event_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const menuId = event?.menu_id
  if (!menuId) return null

  // 3. Single query: get all ingredients through menu -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
  const { data: rows } = await db
    .from('components')
    .select(
      `
      recipe_id,
      dish:dishes!inner(menu_id),
      recipe:recipes(
        id,
        recipe_ingredients(
          ingredient:ingredients(
            id,
            name,
            cost_per_unit_cents,
            last_price_cents,
            last_price_date,
            last_price_confidence,
            default_yield_pct
          )
        )
      )
    `
    )
    .eq('dish.menu_id', menuId)
    .eq('tenant_id', tenantId)
    .not('recipe_id', 'is', null)

  if (!rows || rows.length === 0) return null

  // 4. Flatten and deduplicate ingredients
  const ingredientMap = new Map<
    string,
    {
      name: string
      hasCost: boolean
      lastPriceDate: string | null
      confidence: number | null
    }
  >()

  for (const comp of rows as any[]) {
    const recipe = comp.recipe
    if (!recipe?.recipe_ingredients) continue

    for (const ri of recipe.recipe_ingredients) {
      const ing = ri.ingredient
      if (!ing?.id) continue
      if (ingredientMap.has(ing.id)) continue

      const costPerUnit = ing.cost_per_unit_cents ?? ing.last_price_cents ?? null

      ingredientMap.set(ing.id, {
        name: ing.name,
        hasCost: costPerUnit != null && costPerUnit > 0,
        lastPriceDate: ing.last_price_date,
        confidence: ing.last_price_confidence,
      })
    }
  }

  // 5. Compute metrics
  const totalIngredients = ingredientMap.size
  if (totalIngredients === 0) return null

  let pricedCount = 0
  let noPriceCount = 0
  let staleCount = 0
  let lowConfidenceCount = 0
  const now = Date.now()

  for (const ing of ingredientMap.values()) {
    if (!ing.hasCost) {
      noPriceCount++
      continue
    }
    pricedCount++

    if (ing.lastPriceDate) {
      const days = Math.floor((now - new Date(ing.lastPriceDate).getTime()) / 86_400_000)
      if (days > 90) staleCount++
    }

    if (ing.confidence != null && ing.confidence < 0.5) {
      lowConfidenceCount++
    }
  }

  const coveragePct = Math.round((pricedCount / totalIngredients) * 100)

  // 6. Determine confidence level
  let confidenceLevel: CostConfidenceLevel
  if (coveragePct === 0) {
    confidenceLevel = 'insufficient'
  } else if (coveragePct >= 80 && staleCount <= 1 && lowConfidenceCount <= 1) {
    confidenceLevel = 'high'
  } else if (coveragePct >= 50) {
    confidenceLevel = 'moderate'
  } else {
    confidenceLevel = 'low'
  }

  // 7. Build warnings
  const warnings: QuoteCostGuardWarning[] = []

  if (noPriceCount > 0) {
    const pct = Math.round((noPriceCount / totalIngredients) * 100)
    const level = pct > 50 ? 'critical' : pct > 20 ? 'warning' : 'info'
    warnings.push({
      level,
      code: 'missing_prices',
      message: `${noPriceCount} of ${totalIngredients} ingredients (${pct}%) have no price data. Cost total is ${pct > 50 ? 'unreliable' : 'incomplete'}.`,
    })
  }

  if (staleCount > 0) {
    warnings.push({
      level: staleCount > 3 ? 'warning' : 'info',
      code: 'stale_prices',
      message: `${staleCount} ingredient${staleCount > 1 ? 's have' : ' has'} pricing over 90 days old.`,
    })
  }

  if (lowConfidenceCount > 0) {
    warnings.push({
      level: lowConfidenceCount > 3 ? 'warning' : 'info',
      code: 'low_confidence',
      message: `${lowConfidenceCount} ingredient${lowConfidenceCount > 1 ? 's have' : ' has'} low price confidence (below 50%).`,
    })
  }

  if (confidenceLevel === 'insufficient') {
    warnings.push({
      level: 'critical',
      code: 'no_cost_data',
      message: 'No ingredient pricing data available. This quote has no cost basis.',
    })
  }

  // Sendable: allow sending with warnings, block only if truly no cost basis
  const sendable = confidenceLevel !== 'insufficient'

  return {
    confidenceLevel,
    coveragePct,
    totalIngredients,
    pricedIngredients: pricedCount,
    staleCount,
    noPriceCount,
    warnings,
    sendable,
  }
}
