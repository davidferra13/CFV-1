'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getMenuBreakdown } from '@/lib/menus/intelligence/cost-margin'
import { getClientSpendSummary } from './client-spend-actions'

// ============================================
// Types
// ============================================

export interface QuotePricingWarning {
  level: 'info' | 'warning' | 'critical'
  code: string
  message: string
}

export interface QuoteCostIntelligence {
  // Food cost from menu
  foodCostCents: number | null
  costPerGuestCents: number | null
  foodCostPercent: number | null
  hasAllPrices: boolean
  missingPriceCount: number

  // Projected costs (from chef_pricing_config)
  laborCostCents: number
  overheadCostCents: number
  travelCostCents: number
  totalProjectedCostCents: number

  // Margin analysis
  marginCents: number | null
  marginPercent: number | null
  targetMarginPercent: number

  // Benchmarks
  similarEvents: {
    sampleSize: number
    avgPricePerGuestCents: number | null
    avgMarginPercent: number | null
  } | null
  clientHistory: {
    eventCount: number
    avgSpendCents: number
    lastEventDate: string | null
  } | null

  // Guard rails
  warnings: QuotePricingWarning[]

  // Suggested price
  suggestedPriceCents: number | null
  suggestedPriceReason: string | null

  // Drift detection
  drift: {
    hasDrift: boolean
    snapshotCostCents: number | null
    currentCostCents: number | null
    driftPercent: number | null
    snapshotAt: string | null
  } | null

  // Menu info
  menuId: string | null
  menuName: string | null
}

// ============================================
// Helpers
// ============================================

function numberOrZero(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// ============================================
// Main function
// ============================================

export async function getQuoteCostIntelligence(
  quoteId: string
): Promise<QuoteCostIntelligence | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Fetch quote
  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .select(
      'id, tenant_id, event_id, client_id, total_quoted_cents, price_per_person_cents, guest_count_estimated, status'
    )
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (quoteError || !quote) return null

  const quotedTotalCents = numberOrZero(quote.total_quoted_cents)
  const guestCount = numberOrZero(quote.guest_count_estimated) || 1

  // 2. Fetch event if linked
  let event: any = null
  let menuId: string | null = null
  let snapshotCostCents: number | null = null
  let snapshotAt: string | null = null
  let mileageMiles = 0
  let serviceStyle: string | null = null

  if (quote.event_id) {
    const { data: eventData } = await db
      .from('events')
      .select(
        'id, guest_count, quoted_price_cents, menu_id, mileage_miles, service_style, menu_cost_snapshot_cents, menu_cost_snapshot_at, estimated_food_cost_cents'
      )
      .eq('id', quote.event_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (eventData) {
      event = eventData
      menuId = eventData.menu_id
      snapshotCostCents = eventData.menu_cost_snapshot_cents ?? null
      snapshotAt = eventData.menu_cost_snapshot_at ?? null
      mileageMiles = numberOrZero(eventData.mileage_miles)
      serviceStyle = eventData.service_style ?? null
    }
  }

  // 3. If no menu_id from event, try menus table
  if (!menuId && quote.event_id) {
    const { data: menuRow } = await db
      .from('menus')
      .select('id')
      .eq('event_id', quote.event_id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (menuRow) {
      menuId = menuRow.id
    }
  }

  // 4. Get menu breakdown if we have a menu
  let menuBreakdown: Awaited<ReturnType<typeof getMenuBreakdown>> = null
  if (menuId) {
    try {
      menuBreakdown = await getMenuBreakdown(menuId)
    } catch {
      // Non-critical; continue with null breakdown
    }
  }

  const foodCostCents = menuBreakdown?.totalCostCents ?? null
  const hasAllPrices = menuBreakdown?.hasAllPrices ?? true
  const missingPriceCount = menuBreakdown?.missingPriceCount ?? 0
  const costPerGuestCents =
    foodCostCents !== null && guestCount > 0 ? Math.round(foodCostCents / guestCount) : null
  const foodCostPercent =
    foodCostCents !== null && quotedTotalCents > 0
      ? Math.round((foodCostCents / quotedTotalCents) * 1000) / 10
      : null

  // 5. Fetch chef_pricing_config
  let configOverheadPercent = 15
  let configHourlyRateCents = 5000
  let configMileageRateCents = 70
  try {
    const { data: pricingConfig } = await db
      .from('chef_pricing_config')
      .select('overhead_percent, hourly_rate_cents, mileage_rate_cents')
      .eq('chef_id', tenantId)
      .maybeSingle()

    if (pricingConfig) {
      if (pricingConfig.overhead_percent != null)
        configOverheadPercent = pricingConfig.overhead_percent
      if (pricingConfig.hourly_rate_cents != null)
        configHourlyRateCents = pricingConfig.hourly_rate_cents
      if (pricingConfig.mileage_rate_cents != null)
        configMileageRateCents = pricingConfig.mileage_rate_cents
    }
  } catch {
    // Fall through to defaults
  }

  // 6. Get chef preferences for target margin
  let targetMarginPercent = 60
  try {
    const { getChefPreferences } = await import('@/lib/chef/actions')
    const prefs = await getChefPreferences()
    if (prefs?.target_margin_percent != null) {
      targetMarginPercent = prefs.target_margin_percent
    }
  } catch {
    // Fall through to default
  }

  // 7. Calculate labor from recipe prep/cook times
  let totalPrepMinutes = 0
  let totalCookMinutes = 0

  if (menuId) {
    try {
      const { data: dishes } = await db
        .from('dishes')
        .select('id')
        .eq('menu_id', menuId)
        .eq('tenant_id', tenantId)
        .limit(500)

      const dishIds = ((dishes ?? []) as any[]).map((d: any) => d.id).filter(Boolean)

      if (dishIds.length > 0) {
        const { data: components } = await db
          .from('components')
          .select('recipe_id')
          .in('dish_id', dishIds)
          .eq('tenant_id', tenantId)
          .not('recipe_id', 'is', null)
          .limit(500)

        const recipeIds = [
          ...new Set(((components ?? []) as any[]).map((c: any) => c.recipe_id).filter(Boolean)),
        ] as string[]

        if (recipeIds.length > 0) {
          const { data: recipes } = await db
            .from('recipes')
            .select('prep_time_minutes, cook_time_minutes')
            .in('id', recipeIds)
            .eq('tenant_id', tenantId)

          for (const r of (recipes ?? []) as any[]) {
            totalPrepMinutes += numberOrZero(r.prep_time_minutes)
            totalCookMinutes += numberOrZero(r.cook_time_minutes)
          }
        }
      }
    } catch {
      // Non-critical
    }
  }

  const laborHours = (totalPrepMinutes + totalCookMinutes) / 60
  const laborCostCents = Math.round(laborHours * configHourlyRateCents)

  // 8. Calculate overhead = foodCost * overhead_percent / 100
  const overheadCostCents =
    foodCostCents !== null ? Math.round((foodCostCents * configOverheadPercent) / 100) : 0

  // 9. Calculate travel
  const travelCostCents = Math.round(mileageMiles * configMileageRateCents)

  // 10. Total projected cost
  const totalProjectedCostCents =
    (foodCostCents ?? 0) + laborCostCents + overheadCostCents + travelCostCents

  // 11. Margin analysis
  const marginCents = quotedTotalCents > 0 ? quotedTotalCents - totalProjectedCostCents : null
  const marginPercent =
    quotedTotalCents > 0
      ? Math.round(((quotedTotalCents - totalProjectedCostCents) / quotedTotalCents) * 1000) / 10
      : null

  // 12. Similar events benchmark
  let similarEvents: QuoteCostIntelligence['similarEvents'] = null
  if (quote.event_id) {
    try {
      const { data: rows } = await db
        .from('events')
        .select('id, guest_count, quoted_price_cents, service_style')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .neq('id', quote.event_id)
        .limit(20)

      const similarRows = ((rows ?? []) as any[]).filter((row: any) => {
        if (!serviceStyle) return true
        return row.service_style == null || row.service_style === serviceStyle
      })

      const perGuestValues = similarRows
        .map((row: any) => {
          const quoted = numberOrZero(row.quoted_price_cents)
          const guests = numberOrZero(row.guest_count)
          return quoted > 0 && guests > 0 ? Math.round(quoted / guests) : 0
        })
        .filter((v: number) => v > 0)

      let avgMarginPercent: number | null = null
      const eventIds = similarRows.map((row: any) => row.id).filter(Boolean) as string[]
      if (eventIds.length > 0) {
        const { data: summaries } = await db
          .from('event_financial_summary')
          .select('profit_margin')
          .in('event_id', eventIds)
          .limit(20)

        avgMarginPercent = average(
          ((summaries ?? []) as any[])
            .map((s: any) => Number(s.profit_margin))
            .filter((v: number) => Number.isFinite(v))
        )
      }

      similarEvents = {
        sampleSize: perGuestValues.length,
        avgPricePerGuestCents:
          perGuestValues.length > 0 ? Math.round(average(perGuestValues) ?? 0) : null,
        avgMarginPercent,
      }
    } catch {
      // Non-critical
    }
  }

  // 13. Client history
  let clientHistory: QuoteCostIntelligence['clientHistory'] = null
  if (quote.client_id) {
    try {
      const clientSpend = await getClientSpendSummary(quote.client_id)
      if (clientSpend) {
        clientHistory = {
          eventCount: clientSpend.eventCount,
          avgSpendCents: clientSpend.avgSpendCents,
          lastEventDate: clientSpend.lastEventDate,
        }
      }
    } catch {
      // Non-critical
    }
  }

  // 14. Drift detection
  let drift: QuoteCostIntelligence['drift'] = null
  if (snapshotCostCents !== null && foodCostCents !== null) {
    const driftCents = foodCostCents - snapshotCostCents
    const driftPercent =
      snapshotCostCents > 0
        ? Math.round((Math.abs(driftCents) / snapshotCostCents) * 1000) / 10
        : null
    drift = {
      hasDrift: driftPercent !== null && driftPercent > 5,
      snapshotCostCents,
      currentCostCents: foodCostCents,
      driftPercent,
      snapshotAt,
    }
  }

  // 15. Guard rail warnings
  const warnings: QuotePricingWarning[] = []

  if (quotedTotalCents > 0 && totalProjectedCostCents > quotedTotalCents) {
    warnings.push({
      level: 'critical',
      code: 'below_cost',
      message:
        'Quoted price is below your projected total cost. You will lose money on this event.',
    })
  }

  if (marginPercent !== null && marginPercent < targetMarginPercent) {
    const level = marginPercent < 0 ? 'critical' : 'warning'
    warnings.push({
      level,
      code: 'low_margin',
      message: `Projected margin of ${marginPercent}% is below your ${targetMarginPercent}% target.`,
    })
  }

  if (foodCostPercent !== null) {
    if (foodCostPercent > 45) {
      warnings.push({
        level: 'critical',
        code: 'high_food_cost',
        message: `Food cost is ${foodCostPercent}% of the quoted price. This is critically high.`,
      })
    } else if (foodCostPercent > 35) {
      warnings.push({
        level: 'warning',
        code: 'high_food_cost',
        message: `Food cost is ${foodCostPercent}% of the quoted price. Target is below 35%.`,
      })
    }
  }

  if (missingPriceCount > 0) {
    warnings.push({
      level: 'warning',
      code: 'stale_prices',
      message: `${missingPriceCount} ingredient${missingPriceCount > 1 ? 's are' : ' is'} missing prices. Cost calculation is incomplete.`,
    })
  }

  if (drift?.hasDrift && drift.driftPercent !== null) {
    const level = drift.driftPercent > 15 ? 'critical' : 'warning'
    warnings.push({
      level,
      code: 'menu_drift',
      message: `Menu costs have changed ${drift.driftPercent}% since the cost snapshot was taken.`,
    })
  }

  // 16. Suggested price
  let suggestedPriceCents: number | null = null
  let suggestedPriceReason: string | null = null

  if (totalProjectedCostCents > 0 && targetMarginPercent < 100) {
    suggestedPriceCents = Math.round(totalProjectedCostCents / (1 - targetMarginPercent / 100))
    suggestedPriceReason = `Based on projected costs with a ${targetMarginPercent}% target margin`
  }

  return {
    foodCostCents,
    costPerGuestCents,
    foodCostPercent,
    hasAllPrices,
    missingPriceCount,
    laborCostCents,
    overheadCostCents,
    travelCostCents,
    totalProjectedCostCents,
    marginCents,
    marginPercent,
    targetMarginPercent,
    similarEvents,
    clientHistory,
    warnings,
    suggestedPriceCents,
    suggestedPriceReason,
    drift,
    menuId,
    menuName: menuBreakdown?.menuName ?? null,
  }
}
