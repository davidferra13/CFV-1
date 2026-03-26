'use server'

// Pricing Recommendation Server Action
// Fetches event cost data and historical pricing, then runs the
// deterministic recommendation formula. Formula > AI.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  calculatePricingRecommendation,
  type CostInputs,
  type PricingRecommendation,
} from '@/lib/formulas/pricing-recommendation'
import type { CurrentEvent, HistoricalEvent } from '@/lib/formulas/pricing-intelligence'

// ── Types ──────────────────────────────────────────────────────────────

export type RecommendationInput = {
  eventId?: string // If set, auto-fetches costs from event expenses + menu
  guestCount: number
  // Manual cost overrides (used when no event, or to supplement)
  foodCostCentsOverride?: number
  laborCostCentsOverride?: number
  travelCostCentsOverride?: number
  overheadCostCentsOverride?: number
  targetMargin?: number // 0.35 = 35%, defaults to 0.35
}

// ── Main Action ────────────────────────────────────────────────────────

/**
 * Get a pricing recommendation for an event or hypothetical scenario.
 *
 * If eventId is provided, fetches actual costs from:
 *   - Menu food cost (recipe costing engine)
 *   - Expenses by category (labor, travel, overhead)
 *
 * Manual overrides supplement or replace auto-fetched values.
 * Historical events are always fetched for percentile comparison.
 */
export async function getPricingRecommendation(
  input: RecommendationInput
): Promise<PricingRecommendation> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // ── 1. Fetch costs from event (if provided) ─────────────────────────

  let costs: CostInputs = {
    foodCostCents: input.foodCostCentsOverride ?? 0,
    laborCostCents: input.laborCostCentsOverride ?? 0,
    travelCostCents: input.travelCostCentsOverride ?? 0,
    overheadCostCents: input.overheadCostCentsOverride ?? 0,
    otherCostCents: 0,
  }

  let currentEvent: CurrentEvent | null = null

  if (input.eventId) {
    // Fetch event details
    const { data: event } = await db
      .from('events')
      .select(
        'id, occasion, guest_count, event_date, service_style, dietary_restrictions, quoted_price_cents, menu_id'
      )
      .eq('id', input.eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (event) {
      currentEvent = {
        occasion: event.occasion,
        guest_count: event.guest_count ?? input.guestCount,
        event_date: event.event_date,
        service_style: event.service_style,
        dietary_restrictions: event.dietary_restrictions,
        quoted_price_cents: event.quoted_price_cents,
      }

      // Fetch menu food cost (from recipe costing engine)
      if (event.menu_id && input.foodCostCentsOverride === undefined) {
        const { data: menuCost } = await db
          .from('menu_cost_summary')
          .select('total_recipe_cost_cents')
          .eq('menu_id', event.menu_id)
          .single()

        if (menuCost?.total_recipe_cost_cents) {
          costs.foodCostCents = menuCost.total_recipe_cost_cents
        }
      }

      // Fetch expenses by category (if not overridden)
      const { data: expenses } = await db
        .from('expenses')
        .select('category, amount_cents')
        .eq('event_id', input.eventId)
        .eq('tenant_id', tenantId)
        .eq('is_business', true)

      if (expenses && expenses.length > 0) {
        const expenseByGroup = { labor: 0, travel: 0, overhead: 0, other: 0 }

        for (const exp of expenses as any[]) {
          const cat = exp.category as string
          const amt = exp.amount_cents as number

          if (cat === 'labor') {
            expenseByGroup.labor += amt
          } else if (cat === 'gas_mileage' || cat === 'vehicle') {
            expenseByGroup.travel += amt
          } else if (
            [
              'equipment',
              'supplies',
              'venue_rental',
              'uniforms',
              'marketing',
              'insurance_licenses',
              'subscriptions',
              'rent',
              'utilities',
              'professional_services',
              'education',
            ].includes(cat)
          ) {
            expenseByGroup.overhead += amt
          } else if (!['groceries', 'alcohol', 'food', 'specialty_items'].includes(cat)) {
            // Skip food categories (already in menu cost), capture everything else
            expenseByGroup.other += amt
          }
        }

        // Only apply auto-fetched values if not manually overridden
        if (input.laborCostCentsOverride === undefined) costs.laborCostCents = expenseByGroup.labor
        if (input.travelCostCentsOverride === undefined)
          costs.travelCostCents = expenseByGroup.travel
        if (input.overheadCostCentsOverride === undefined)
          costs.overheadCostCents = expenseByGroup.overhead
        costs.otherCostCents = expenseByGroup.other
      }
    }
  }

  // ── 2. Fetch historical events for comparison ───────────────────────

  const { data: pastEvents } = await db
    .from('events')
    .select('occasion, guest_count, quoted_price_cents, service_style, event_date')
    .eq('tenant_id', tenantId)
    .not('quoted_price_cents', 'is', null)
    .in('status', ['completed', 'confirmed', 'in_progress', 'paid'])
    .order('event_date', { ascending: false })
    .limit(50)

  const historicalEvents: HistoricalEvent[] = (pastEvents ?? []).map((e: any) => ({
    occasion: e.occasion,
    guest_count: e.guest_count,
    quoted_price_cents: e.quoted_price_cents,
    amount_paid_cents: e.quoted_price_cents, // Use quoted as proxy
    service_style: e.service_style,
    event_date: e.event_date,
  }))

  // ── 3. Run recommendation formula ──────────────────────────────────

  return calculatePricingRecommendation(
    costs,
    input.guestCount,
    currentEvent,
    historicalEvents.length >= 3 ? historicalEvents : null,
    input.targetMargin ?? 0.35
  )
}
