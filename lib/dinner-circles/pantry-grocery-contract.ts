import type { EatInMealDirection } from './eat-in-planning-contract'

export type PantryIngredient = {
  name: string
  quantity?: string
  seasonalMonths?: readonly number[]
  expiresSoon?: boolean
  leftover?: boolean
  staple?: boolean
  estimatedCostCents?: number | null
}

export type GrocerySupportInput = {
  direction: Pick<
    EatInMealDirection,
    'title' | 'ingredientAngle' | 'pantryUses' | 'dietaryConstraints'
  >
  pantry: readonly PantryIngredient[]
  month: number
  budgetCents?: number | null
}

export type GrocerySupportPlan = {
  mode: 'pantry_first' | 'seasonal' | 'grocery_light' | 'needs_shop'
  useNow: string[]
  seasonalHighlights: string[]
  groceryList: Array<{ name: string; reason: string }>
  estimatedGroceryCents: number
  budgetStatus: 'unknown' | 'within_budget' | 'over_budget'
  reasonCodes: string[]
}

function cleanName(value: string): string {
  return value.trim().toLowerCase()
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ')
}

export function buildPantrySeasonalGrocerySupport(input: GrocerySupportInput): GrocerySupportPlan {
  const pantryNames = new Set(input.pantry.map((item) => cleanName(item.name)))
  const requestedPantry = input.direction.pantryUses.filter((item) =>
    pantryNames.has(cleanName(item))
  )
  const useNow = input.pantry
    .filter((item) => item.expiresSoon || item.leftover || requestedPantry.includes(item.name))
    .map((item) => titleCase(item.name))

  const seasonalHighlights = input.pantry
    .filter((item) => item.seasonalMonths?.includes(input.month))
    .map((item) => titleCase(item.name))

  const groceryList = inferMissingGroceries(input).filter(
    (item) => !pantryNames.has(cleanName(item.name))
  )
  const estimatedGroceryCents = groceryList.reduce(
    (total, item) => total + estimateCost(item.name),
    0
  )
  const budgetStatus =
    input.budgetCents == null
      ? 'unknown'
      : estimatedGroceryCents <= input.budgetCents
        ? 'within_budget'
        : 'over_budget'

  const mode =
    input.direction.ingredientAngle === 'peak_ingredients' && seasonalHighlights.length > 0
      ? 'seasonal'
      : useNow.length >= 2
        ? 'pantry_first'
        : groceryList.length <= 3
          ? 'grocery_light'
          : 'needs_shop'

  return {
    mode,
    useNow,
    seasonalHighlights,
    groceryList,
    estimatedGroceryCents,
    budgetStatus,
    reasonCodes: [
      useNow.length ? 'pantry_items_available' : 'pantry_items_missing',
      seasonalHighlights.length ? 'seasonal_items_available' : 'seasonal_items_missing',
      groceryList.length ? 'grocery_support_needed' : 'no_grocery_gap',
      budgetStatus,
    ],
  }
}

function inferMissingGroceries(
  input: GrocerySupportInput
): Array<{ name: string; reason: string }> {
  const directionText = input.direction.title.toLowerCase()
  const groceries: Array<{ name: string; reason: string }> = [
    { name: 'fresh herbs', reason: 'finish the meal direction' },
    { name: 'lemon or vinegar', reason: 'add acid and balance' },
  ]

  if (directionText.includes('pasta')) {
    groceries.push({ name: 'pasta', reason: 'core dinner component' })
  }
  if (input.direction.ingredientAngle === 'peak_ingredients') {
    groceries.push({ name: 'seasonal produce', reason: 'requested peak ingredient angle' })
  }
  if (input.direction.dietaryConstraints.length > 0) {
    groceries.push({ name: 'constraint-safe staple', reason: 'protect dietary fit' })
  }

  return groceries
}

function estimateCost(name: string): number {
  if (name.includes('produce')) return 900
  if (name.includes('staple')) return 700
  if (name.includes('pasta')) return 450
  return 300
}
