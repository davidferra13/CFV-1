import {
  buildNoBlankPriceContract,
  summarizePriceContracts,
  type NoBlankPriceContract,
  type NoBlankPriceSummary,
} from '@/lib/pricing/no-blank-price-contract'
import {
  buildPricingEnforcementDecisionFromSummary,
  type PricingEnforcementDecision,
} from '@/lib/pricing/pricing-enforcement-gate'
import type { ResolutionTier } from '@/lib/pricing/resolve-price'

export type EventPricingEnforcementResult = {
  summary: NoBlankPriceSummary
  decision: PricingEnforcementDecision
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

function daysSince(date: Date | null): number | null {
  if (!date) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
}

function tierFromIngredientSource(source: unknown): ResolutionTier | 'national_median' | null {
  const value = typeof source === 'string' ? source : ''
  if (['manual', 'receipt', 'grocery_entry', 'po_receipt', 'vendor_invoice'].includes(value)) {
    return 'chef_receipt'
  }
  if (value === 'openclaw_wholesale' || value === 'wholesale') return 'wholesale'
  if (value === 'regional_average') return 'regional'
  if (value === 'market_aggregate') return 'market_national'
  if (value === 'government' || value === 'openclaw_government') return 'government'
  if (value === 'category_baseline') return 'category_baseline'
  if (value.startsWith('openclaw_')) return 'regional'
  return null
}

function emptyResult(): EventPricingEnforcementResult {
  const summary = summarizePriceContracts([])
  return {
    summary,
    decision: buildPricingEnforcementDecisionFromSummary(summary),
  }
}

function buildIngredientContract(ingredient: any): NoBlankPriceContract {
  const priceCents =
    numberOrZero(ingredient.cost_per_unit_cents) || numberOrZero(ingredient.last_price_cents)
  const averagePriceCents = numberOrZero(ingredient.average_price_cents)
  const date = parseDate(ingredient.last_price_date)

  return buildNoBlankPriceContract({
    ingredientId: String(ingredient.id),
    rawName: typeof ingredient.name === 'string' ? ingredient.name : '',
    normalizedName: typeof ingredient.name === 'string' ? ingredient.name.toLowerCase() : '',
    recognized: true,
    priceCents: priceCents > 0 ? priceCents : null,
    unit:
      typeof ingredient.price_unit === 'string' && ingredient.price_unit.trim()
        ? ingredient.price_unit
        : typeof ingredient.default_unit === 'string' && ingredient.default_unit.trim()
          ? ingredient.default_unit
          : null,
    confidence: numberOrNull(ingredient.last_price_confidence),
    freshnessDays: daysSince(date),
    resolutionTier: tierFromIngredientSource(ingredient.last_price_source),
    observedAt: date ? date.toISOString() : null,
    storeName:
      typeof ingredient.last_price_store === 'string' && ingredient.last_price_store.trim()
        ? ingredient.last_price_store
        : typeof ingredient.preferred_vendor === 'string' && ingredient.preferred_vendor.trim()
          ? ingredient.preferred_vendor
          : null,
    productName: typeof ingredient.name === 'string' ? ingredient.name : null,
    dataPoints: averagePriceCents > 0 ? 2 : priceCents > 0 ? 1 : 0,
    category: typeof ingredient.category === 'string' ? ingredient.category : null,
  })
}

export async function getEventPricingEnforcement(
  db: any,
  eventId: string,
  tenantId: string
): Promise<EventPricingEnforcementResult> {
  const { data: menus, error: menuError } = await db
    .from('menu_cost_summary')
    .select('menu_id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(20)

  if (menuError) throw menuError

  const menuIds = [
    ...new Set(((menus ?? []) as any[]).map((row) => row.menu_id).filter(Boolean)),
  ] as string[]
  if (menuIds.length === 0) return emptyResult()

  const { data: dishes, error: dishError } = await db
    .from('dishes')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('menu_id', menuIds)
    .limit(10_000)

  if (dishError) throw dishError

  const dishIds = ((dishes ?? []) as any[]).map((dish) => dish.id).filter(Boolean)
  if (dishIds.length === 0) return emptyResult()

  const { data: components, error: componentError } = await db
    .from('components')
    .select('recipe_id')
    .eq('tenant_id', tenantId)
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)
    .limit(10_000)

  if (componentError) throw componentError

  const recipeIds = [
    ...new Set(
      ((components ?? []) as any[]).map((component) => component.recipe_id).filter(Boolean)
    ),
  ] as string[]
  if (recipeIds.length === 0) return emptyResult()

  const { data: recipeIngredients, error: recipeIngredientError } = await db
    .from('recipe_ingredients')
    .select(
      'ingredient_id, ingredients(id, name, category, cost_per_unit_cents, last_price_cents, average_price_cents, price_unit, default_unit, last_price_date, last_price_confidence, last_price_source, last_price_store, preferred_vendor)'
    )
    .in('recipe_id', recipeIds)
    .limit(50_000)

  if (recipeIngredientError) throw recipeIngredientError

  const ingredientMap = new Map<string, any>()
  for (const row of (recipeIngredients ?? []) as any[]) {
    const ingredient = row.ingredients
    const ingredientId = row.ingredient_id ?? ingredient?.id
    if (!ingredientId || ingredientMap.has(ingredientId)) continue
    ingredientMap.set(ingredientId, { ...(ingredient ?? {}), id: ingredientId })
  }

  const contracts = Array.from(ingredientMap.values()).map(buildIngredientContract)
  const summary = summarizePriceContracts(contracts)

  return {
    summary,
    decision: buildPricingEnforcementDecisionFromSummary(summary),
  }
}
