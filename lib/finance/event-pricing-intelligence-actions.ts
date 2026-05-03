'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getChefPreferences } from '@/lib/chef/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { getTargetsForArchetype } from '@/lib/costing/knowledge'
import { getEventCostVariance } from '@/lib/finance/expense-line-item-actions'
import {
  calculateEstimatedActualVariance,
  calculateFoodCostPercent,
  calculateIngredientSpikePercent,
  calculateMarginPercent,
  calculateProfitCents,
  generateEventPricingWarnings,
  isIngredientPriceSpike,
  resolveSuggestedEventPrice,
  type EventPricingWarning,
  type IngredientPriceSpikeSignal,
  type PricingConfidence,
  type SuggestedPriceSource,
} from '@/lib/finance/event-pricing-intelligence'

type ExpenseBuckets = {
  foodCostCents: number
  laborCostCents: number
  travelCostCents: number
  overheadCostCents: number
  rentalsCostCents: number
  miscellaneousCostCents: number
  totalCostCents: number
}

export type EventPricingIntelligencePayload = {
  eventId: string
  eventName: string
  guestCount: number | null
  menu: {
    menuIds: string[]
    menuNames: string[]
    totalComponentCount: number
    hasAllRecipeCosts: boolean | null
  } | null
  projected: {
    foodCostCents: number
    laborCostCents: number
    travelCostCents: number
    overheadCostCents: number
    rentalsCostCents: number
    miscellaneousCostCents: number
    totalCostCents: number
    quoteTotalCents: number
    suggestedPriceCents: number
    suggestedPriceSource: SuggestedPriceSource
    suggestedPriceReason: string
    targetFoodCostPercent: number
    targetMarginPercent: number
    projectedFoodCostPercent: number | null
    expectedProfitCents: number
    expectedMarginPercent: number
  }
  actual: {
    foodCostCents: number
    laborCostCents: number
    travelCostCents: number
    overheadCostCents: number
    rentalsCostCents: number
    miscellaneousCostCents: number
    totalCostCents: number
    revenueCents: number
    actualProfitCents: number
    actualMarginPercent: number | null
    actualFoodCostPercent: number | null
  }
  variance: {
    estimatedVsActualCostCents: number
    estimatedVsActualPercent: number | null
    foodCostVarianceCents: number
    marginDeltaPercent: number | null
  }
  warnings: EventPricingWarning[]
  confidence: {
    pricingConfidence: PricingConfidence
    fallbackUsed: boolean
    stalePriceCount: number
    lowConfidenceIngredientCount: number
    missingPriceCount: number
    totalIngredientCount: number
  }
  priceSignals: {
    ingredientSpikes: IngredientPriceSpikeSignal[]
    ingredientSpikeCount: number
    insufficientHistoryCount: number
  }
  similarEvents: {
    sampleSize: number
    averagePricePerGuestCents: number | null
    averageMarginPercent: number | null
  }
  guidance: {
    suggestedRangeLowCents: number | null
    suggestedRangeHighCents: number | null
    priceRisk: 'too_cheap' | 'too_expensive' | 'balanced' | 'insufficient_data'
  }
}

function numberOrZero(value: unknown): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function bucketExpenses(expenses: any[]): ExpenseBuckets {
  const buckets: ExpenseBuckets = {
    foodCostCents: 0,
    laborCostCents: 0,
    travelCostCents: 0,
    overheadCostCents: 0,
    rentalsCostCents: 0,
    miscellaneousCostCents: 0,
    totalCostCents: 0,
  }

  for (const expense of expenses) {
    if (expense.is_business === false) continue
    const amount = numberOrZero(expense.amount_cents)
    buckets.totalCostCents += amount

    switch (expense.category) {
      case 'groceries':
      case 'alcohol':
      case 'specialty_items':
        buckets.foodCostCents += amount
        break
      case 'labor':
        buckets.laborCostCents += amount
        break
      case 'gas_mileage':
      case 'vehicle':
        buckets.travelCostCents += amount
        break
      case 'venue_rental':
        buckets.rentalsCostCents += amount
        break
      case 'equipment':
      case 'supplies':
      case 'uniforms':
      case 'subscriptions':
      case 'marketing':
      case 'insurance_licenses':
      case 'professional_services':
      case 'education':
      case 'utilities':
      case 'platform_commission':
        buckets.overheadCostCents += amount
        break
      default:
        buckets.miscellaneousCostCents += amount
        break
    }
  }

  return buckets
}

async function getEventMenuCosts(db: any, eventId: string, tenantId: string) {
  const { data } = await db
    .from('menu_cost_summary')
    .select(
      'menu_id, menu_name, total_component_count, total_recipe_cost_cents, has_all_recipe_costs'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(20)

  const rows = (data ?? []) as any[]
  if (rows.length === 0) {
    return {
      menuIds: [] as string[],
      menuNames: [] as string[],
      projectedFoodCostCents: 0,
      totalComponentCount: 0,
      hasAllRecipeCosts: null as boolean | null,
    }
  }

  const menuIds = rows.map((row) => String(row.menu_id)).filter(Boolean)
  const menuNames = rows
    .map((row) => (typeof row.menu_name === 'string' ? row.menu_name : null))
    .filter(Boolean) as string[]
  const projectedFoodCostCents = rows.reduce(
    (sum, row) => sum + numberOrZero(row.total_recipe_cost_cents),
    0
  )
  const totalComponentCount = rows.reduce(
    (sum, row) => sum + numberOrZero(row.total_component_count),
    0
  )
  const hasAllRecipeCosts =
    rows.length > 0 ? rows.every((row) => row.has_all_recipe_costs === true) : null

  return {
    menuIds,
    menuNames,
    projectedFoodCostCents,
    totalComponentCount,
    hasAllRecipeCosts,
  }
}

async function getMenuIngredientSignals(db: any, menuIds: string[], tenantId: string) {
  if (menuIds.length === 0) {
    return {
      stalePriceCount: 0,
      lowConfidenceIngredientCount: 0,
      missingPriceCount: 0,
      totalIngredientCount: 0,
      ingredientSpikes: [] as IngredientPriceSpikeSignal[],
      ingredientSpikeCount: 0,
      insufficientHistoryCount: 0,
    }
  }

  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('menu_id', menuIds)
    .limit(10_000)

  const dishIds = ((dishes ?? []) as any[]).map((dish) => dish.id).filter(Boolean)
  if (dishIds.length === 0) {
    return {
      stalePriceCount: 0,
      lowConfidenceIngredientCount: 0,
      missingPriceCount: 0,
      totalIngredientCount: 0,
      ingredientSpikes: [] as IngredientPriceSpikeSignal[],
      ingredientSpikeCount: 0,
      insufficientHistoryCount: 0,
    }
  }

  const { data: components } = await db
    .from('components')
    .select('recipe_id')
    .eq('tenant_id', tenantId)
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)
    .limit(10_000)

  const recipeIds = [
    ...new Set(
      ((components ?? []) as any[]).map((component) => component.recipe_id).filter(Boolean)
    ),
  ] as string[]

  if (recipeIds.length === 0) {
    return {
      stalePriceCount: 0,
      lowConfidenceIngredientCount: 0,
      missingPriceCount: 0,
      totalIngredientCount: 0,
      ingredientSpikes: [] as IngredientPriceSpikeSignal[],
      ingredientSpikeCount: 0,
      insufficientHistoryCount: 0,
    }
  }

  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select(
      'ingredient_id, ingredients(id, name, cost_per_unit_cents, last_price_cents, average_price_cents, price_unit, default_unit, last_price_date, last_price_confidence)'
    )
    .in('recipe_id', recipeIds)
    .limit(50_000)

  const ingredientMap = new Map<string, any>()
  for (const row of (recipeIngredients ?? []) as any[]) {
    const ingredient = row.ingredients
    const ingredientId = row.ingredient_id ?? ingredient?.id
    if (!ingredientId || ingredientMap.has(ingredientId)) continue
    ingredientMap.set(ingredientId, { ...(ingredient ?? {}), id: ingredientId })
  }

  let stalePriceCount = 0
  let lowConfidenceIngredientCount = 0
  let missingPriceCount = 0
  let insufficientHistoryCount = 0
  const ingredientSpikes: IngredientPriceSpikeSignal[] = []
  const now = Date.now()
  const staleMs = 90 * 24 * 60 * 60 * 1000

  for (const ingredient of ingredientMap.values()) {
    const priceCents =
      numberOrZero(ingredient.cost_per_unit_cents) || numberOrZero(ingredient.last_price_cents)
    const averagePriceCents = numberOrZero(ingredient.average_price_cents)
    if (priceCents <= 0) {
      missingPriceCount += 1
    }

    if (averagePriceCents <= 0) {
      insufficientHistoryCount += 1
    } else if (isIngredientPriceSpike(priceCents, averagePriceCents)) {
      const spikePercent = calculateIngredientSpikePercent(priceCents, averagePriceCents)
      if (spikePercent != null) {
        ingredientSpikes.push({
          ingredientId: String(ingredient.id),
          ingredientName:
            typeof ingredient.name === 'string' && ingredient.name.trim()
              ? ingredient.name
              : 'Unknown ingredient',
          currentPriceCents: priceCents,
          averagePriceCents,
          spikePercent,
          unit:
            typeof ingredient.price_unit === 'string' && ingredient.price_unit.trim()
              ? ingredient.price_unit
              : typeof ingredient.default_unit === 'string' && ingredient.default_unit.trim()
                ? ingredient.default_unit
                : null,
        })
      }
    }

    const date = parseDate(ingredient.last_price_date)
    if (date && now - date.getTime() > staleMs) {
      stalePriceCount += 1
    }

    const confidence = numberOrNull(ingredient.last_price_confidence)
    if (confidence != null && confidence < 0.5) {
      lowConfidenceIngredientCount += 1
    }
  }

  return {
    stalePriceCount,
    lowConfidenceIngredientCount,
    missingPriceCount,
    totalIngredientCount: ingredientMap.size,
    ingredientSpikes: ingredientSpikes.sort((a, b) => b.spikePercent - a.spikePercent).slice(0, 5),
    ingredientSpikeCount: ingredientSpikes.length,
    insufficientHistoryCount,
  }
}

async function getSimilarPastEventSignals(
  db: any,
  input: {
    tenantId: string
    eventId: string
    serviceStyle: string | null
  }
) {
  const { data: rows } = await db
    .from('events')
    .select('id, guest_count, quoted_price_cents, service_style')
    .eq('tenant_id', input.tenantId)
    .eq('status', 'completed')
    .neq('id', input.eventId)
    .limit(20)

  const similarRows = ((rows ?? []) as any[]).filter((row) => {
    if (!input.serviceStyle) return true
    return row.service_style == null || row.service_style === input.serviceStyle
  })
  const perGuestValues = similarRows
    .map((row) => {
      const quoted = numberOrZero(row.quoted_price_cents)
      const guests = numberOrZero(row.guest_count)
      return quoted > 0 && guests > 0 ? Math.round(quoted / guests) : 0
    })
    .filter((value) => value > 0)

  let averageMarginPercent: number | null = null
  const eventIds = similarRows.map((row) => row.id).filter(Boolean)
  if (eventIds.length > 0) {
    const { data: summaries } = await db
      .from('event_financial_summary')
      .select('profit_margin')
      .in('event_id', eventIds)
      .limit(20)
    averageMarginPercent = average(
      ((summaries ?? []) as any[])
        .map((summary) => Number(summary.profit_margin))
        .filter((value) => Number.isFinite(value))
    )
  }

  return {
    sampleSize: perGuestValues.length,
    averagePricePerGuestCents:
      perGuestValues.length > 0 ? Math.round(average(perGuestValues) ?? 0) : null,
    averageMarginPercent,
  }
}

async function computeProjectedNonFoodCosts(
  db: any,
  eventId: string,
  tenantId: string,
  menuIds: string[],
  prefs: any | null
): Promise<{
  laborCostCents: number
  travelCostCents: number
  overheadCostCents: number
  projectedFoodCostCents: number
}> {
  // 1. Get event travel data
  const { data: eventData } = await db
    .from('events')
    .select('mileage_miles, guest_count')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  const mileageMiles = eventData?.mileage_miles || 0
  const guestCount = eventData?.guest_count || 1

  // 2. Get recipe prep/cook times from menu dishes (same pattern as plate-cost-actions.ts)
  let totalPrepMinutes = 0
  let totalCookMinutes = 0
  let totalIngredientCostCents = 0

  if (menuIds.length > 0) {
    // Fetch dishes linked to these menus
    const { data: dishes } = await db
      .from('dishes')
      .select('linked_recipe_id')
      .in('menu_id', menuIds)
      .eq('tenant_id', tenantId)
      .limit(500)

    const recipeIds = ((dishes ?? []) as any[])
      .map((d: any) => d.linked_recipe_id)
      .filter(Boolean) as string[]

    if (recipeIds.length > 0) {
      const { data: recipes } = await db
        .from('recipes')
        .select('id, total_cost_cents, prep_time_minutes, cook_time_minutes')
        .in('id', recipeIds)
        .eq('tenant_id', tenantId)

      for (const r of (recipes ?? []) as any[]) {
        totalIngredientCostCents += r.total_cost_cents || 0
        totalPrepMinutes += r.prep_time_minutes || 0
        totalCookMinutes += r.cook_time_minutes || 0
      }
    }
  }

  // 3. Fetch chef pricing config (source of truth for overhead/labor rate)
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
    /* fall through to defaults */
  }

  // 3b. Compute labor cost from recipe times + chef hourly rate
  const laborHours = (totalPrepMinutes + totalCookMinutes) / 60
  const laborCostCents = Math.round(laborHours * configHourlyRateCents)

  // 4. Compute travel cost from event mileage
  const travelCostCents = Math.round(mileageMiles * configMileageRateCents)

  // 5. Compute overhead from configurable percentage
  const overheadCostCents = Math.round((totalIngredientCostCents * configOverheadPercent) / 100)

  return {
    laborCostCents,
    travelCostCents,
    overheadCostCents,
    projectedFoodCostCents: totalIngredientCostCents,
  }
}

export async function getEventPricingIntelligence(
  eventId: string
): Promise<EventPricingIntelligencePayload | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const [eventRes, financialRes, quoteRes, expenseRes, prefs, archetype, costVariance] =
    await Promise.all([
      db
        .from('events')
        .select(
          'id, occasion, event_date, guest_count, service_style, quoted_price_cents, estimated_food_cost_cents'
        )
        .eq('id', eventId)
        .eq('tenant_id', tenantId)
        .single(),
      db
        .from('event_financial_summary')
        .select(
          'quoted_price_cents, total_paid_cents, net_revenue_cents, total_expenses_cents, profit_margin, food_cost_percentage'
        )
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      db
        .from('quotes')
        .select('total_quoted_cents, status, updated_at, created_at')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('expenses')
        .select('category, amount_cents, is_business')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .limit(10_000),
      getChefPreferences().catch(() => null),
      getChefArchetype().catch(() => null),
      getEventCostVariance(eventId).catch(() => null),
    ])

  const event = eventRes.data
  if (!event) return null

  const targets = getTargetsForArchetype(archetype)
  const targetFoodCostPercent = targets.foodCostPctHigh
  const targetMarginPercent = prefs?.target_margin_percent ?? 60

  const menuCosts = await getEventMenuCosts(db, eventId, tenantId)
  const [ingredientSignals, similarEvents] = await Promise.all([
    getMenuIngredientSignals(db, menuCosts.menuIds, tenantId),
    getSimilarPastEventSignals(db, {
      tenantId,
      eventId,
      serviceStyle: event.service_style ?? null,
    }).catch(() => ({
      sampleSize: 0,
      averagePricePerGuestCents: null,
      averageMarginPercent: null,
    })),
  ])
  const projectedNonFood = await computeProjectedNonFoodCosts(
    db,
    eventId,
    tenantId,
    menuCosts.menuIds,
    prefs
  )

  const expenses = (expenseRes.data ?? []) as any[]
  const actualBuckets = bucketExpenses(expenses)

  const lineItemFoodActualCents = numberOrZero(costVariance?.totalActualCents)
  const actualFoodCostCents =
    lineItemFoodActualCents > 0 ? lineItemFoodActualCents : actualBuckets.foodCostCents
  const actualTotalCostCents =
    actualFoodCostCents +
    actualBuckets.laborCostCents +
    actualBuckets.travelCostCents +
    actualBuckets.overheadCostCents +
    actualBuckets.rentalsCostCents +
    actualBuckets.miscellaneousCostCents

  const financial = financialRes.data
  const quoteTotalCents =
    numberOrZero(financial?.quoted_price_cents) ||
    numberOrZero(event.quoted_price_cents) ||
    numberOrZero(quoteRes.data?.total_quoted_cents)
  const actualRevenueCents = numberOrZero(financial?.net_revenue_cents)
  const currentPriceCents = actualRevenueCents > 0 ? actualRevenueCents : quoteTotalCents

  const eventEstimatedFoodCostCents = numberOrZero(event.estimated_food_cost_cents)
  const projectedFoodCostCents =
    menuCosts.projectedFoodCostCents > 0
      ? menuCosts.projectedFoodCostCents
      : eventEstimatedFoodCostCents
  const projectedLaborCostCents = projectedNonFood.laborCostCents
  const projectedTravelCostCents = projectedNonFood.travelCostCents
  const projectedOverheadCostCents = projectedNonFood.overheadCostCents
  const projectedTotalCostCents =
    projectedFoodCostCents +
    projectedLaborCostCents +
    projectedTravelCostCents +
    projectedOverheadCostCents

  const suggested = resolveSuggestedEventPrice({
    projectedFoodCostCents,
    actualFoodCostCents,
    actualTotalCostCents,
    currentPriceCents,
    targetFoodCostPercent,
    targetMarginPercent,
    hasCompleteProjectedCost: menuCosts.hasAllRecipeCosts,
    stalePriceCount: ingredientSignals.stalePriceCount,
    lowConfidenceIngredientCount: ingredientSignals.lowConfidenceIngredientCount,
  })

  const projectedRevenueForMargin =
    quoteTotalCents > 0 ? quoteTotalCents : suggested.suggestedPriceCents
  const expectedProfitCents = calculateProfitCents(
    projectedRevenueForMargin,
    projectedTotalCostCents
  )
  const expectedMarginPercent = calculateMarginPercent(
    projectedRevenueForMargin,
    projectedTotalCostCents
  )
  const projectedFoodCostPercent = calculateFoodCostPercent(
    projectedFoodCostCents,
    projectedRevenueForMargin
  )

  const actualProfitCents = calculateProfitCents(actualRevenueCents, actualTotalCostCents)
  const actualMarginPercent =
    actualRevenueCents > 0 ? calculateMarginPercent(actualRevenueCents, actualTotalCostCents) : null
  const actualFoodCostPercent = calculateFoodCostPercent(actualFoodCostCents, actualRevenueCents)

  const variance =
    costVariance && numberOrZero(costVariance.totalEstimatedCents) > 0
      ? {
          varianceCents: costVariance.varianceCents,
          variancePercent: costVariance.variancePercent,
        }
      : calculateEstimatedActualVariance(projectedFoodCostCents, actualFoodCostCents)
  const marginDeltaPercent =
    actualMarginPercent != null
      ? Math.round((actualMarginPercent - expectedMarginPercent) * 10) / 10
      : null

  const warnings = generateEventPricingWarnings({
    projectedFoodCostCents,
    actualFoodCostCents,
    actualTotalCostCents,
    quoteOrRevenueCents: currentPriceCents,
    suggestedPriceCents: suggested.suggestedPriceCents,
    targetFoodCostPercent,
    targetMarginPercent,
    projectedFoodCostPercent,
    actualFoodCostPercent,
    actualMarginPercent,
    estimatedVsActualPercent: variance.variancePercent,
    fallbackUsed: suggested.fallbackUsed,
    stalePriceCount: ingredientSignals.stalePriceCount,
    lowConfidenceIngredientCount: ingredientSignals.lowConfidenceIngredientCount,
    ingredientSpikeCount: ingredientSignals.ingredientSpikeCount,
    topIngredientSpikeName: ingredientSignals.ingredientSpikes[0]?.ingredientName ?? null,
    topIngredientSpikePercent: ingredientSignals.ingredientSpikes[0]?.spikePercent ?? null,
  })
  const similarSuggestedCents =
    numberOrZero(similarEvents.averagePricePerGuestCents) > 0 && numberOrZero(event.guest_count) > 0
      ? numberOrZero(similarEvents.averagePricePerGuestCents) * numberOrZero(event.guest_count)
      : 0
  const guidanceAnchors = [suggested.suggestedPriceCents, similarSuggestedCents].filter(
    (value) => value > 0
  )
  const suggestedRangeLowCents =
    guidanceAnchors.length > 0 ? Math.round(Math.min(...guidanceAnchors) * 0.92) : null
  const suggestedRangeHighCents =
    guidanceAnchors.length > 0 ? Math.round(Math.max(...guidanceAnchors) * 1.12) : null
  const priceRisk =
    suggestedRangeLowCents == null || suggestedRangeHighCents == null || currentPriceCents <= 0
      ? 'insufficient_data'
      : currentPriceCents < suggestedRangeLowCents
        ? 'too_cheap'
        : currentPriceCents > suggestedRangeHighCents
          ? 'too_expensive'
          : 'balanced'

  return {
    eventId,
    eventName: event.occasion ?? 'Untitled Event',
    guestCount: numberOrNull(event.guest_count),
    menu:
      menuCosts.menuIds.length > 0
        ? {
            menuIds: menuCosts.menuIds,
            menuNames: menuCosts.menuNames,
            totalComponentCount: menuCosts.totalComponentCount,
            hasAllRecipeCosts: menuCosts.hasAllRecipeCosts,
          }
        : null,
    projected: {
      foodCostCents: projectedFoodCostCents,
      laborCostCents: projectedLaborCostCents,
      travelCostCents: projectedTravelCostCents,
      overheadCostCents: projectedOverheadCostCents,
      rentalsCostCents: 0,
      miscellaneousCostCents: 0,
      totalCostCents: projectedTotalCostCents,
      quoteTotalCents,
      suggestedPriceCents: suggested.suggestedPriceCents,
      suggestedPriceSource: suggested.source,
      suggestedPriceReason: suggested.reason,
      targetFoodCostPercent,
      targetMarginPercent,
      projectedFoodCostPercent,
      expectedProfitCents,
      expectedMarginPercent,
    },
    actual: {
      foodCostCents: actualFoodCostCents,
      laborCostCents: actualBuckets.laborCostCents,
      travelCostCents: actualBuckets.travelCostCents,
      overheadCostCents: actualBuckets.overheadCostCents,
      rentalsCostCents: actualBuckets.rentalsCostCents,
      miscellaneousCostCents: actualBuckets.miscellaneousCostCents,
      totalCostCents: actualTotalCostCents,
      revenueCents: actualRevenueCents,
      actualProfitCents,
      actualMarginPercent,
      actualFoodCostPercent,
    },
    variance: {
      estimatedVsActualCostCents: variance.varianceCents,
      estimatedVsActualPercent: variance.variancePercent,
      foodCostVarianceCents: actualFoodCostCents - projectedFoodCostCents,
      marginDeltaPercent,
    },
    warnings,
    confidence: {
      pricingConfidence: suggested.pricingConfidence,
      fallbackUsed: suggested.fallbackUsed,
      stalePriceCount: ingredientSignals.stalePriceCount,
      lowConfidenceIngredientCount: ingredientSignals.lowConfidenceIngredientCount,
      missingPriceCount: ingredientSignals.missingPriceCount,
      totalIngredientCount: ingredientSignals.totalIngredientCount,
    },
    priceSignals: {
      ingredientSpikes: ingredientSignals.ingredientSpikes,
      ingredientSpikeCount: ingredientSignals.ingredientSpikeCount,
      insufficientHistoryCount: ingredientSignals.insufficientHistoryCount,
    },
    similarEvents,
    guidance: {
      suggestedRangeLowCents,
      suggestedRangeHighCents,
      priceRisk,
    },
  }
}
