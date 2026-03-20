// Menu Simulator - "What If" dish swap impact calculator
// Pure deterministic math. No AI, no database calls, no server dependencies.
// Formula > AI: all calculations are pure functions on structured data.

import { checkDishAgainstAllergens, type AllergenConflict } from './allergen-check'

// ── Types ────────────────────────────────────────────────────────────────────

export type SimulatorDish = {
  id: string
  name: string
  /** Ingredients with names (for allergen checking + overlap detection) */
  ingredients: { name: string }[]
  /** Total food cost in cents for this dish (per serving) */
  costPerServingCents: number
  /** Prep time in minutes (null if unknown) */
  prepTimeMinutes: number | null
}

export type DishSwapParams = {
  /** All current dishes on the menu */
  currentDishes: SimulatorDish[]
  /** ID of the dish being removed */
  removeDishId: string
  /** The dish being added in its place */
  addDish: SimulatorDish
  /** Number of guests (used to scale total cost) */
  guestCount: number
  /** Guest allergens to check against (from client allergy records) */
  guestAllergens: { allergen: string; severity: string; confirmed_by_chef: boolean }[]
  /** Revenue for this menu in cents (for margin calculation) */
  menuRevenueCents: number
}

export type SimulationResult = {
  /** Change in total food cost (positive = more expensive) */
  foodCostDeltaCents: number
  /** New total food cost after swap */
  newTotalCostCents: number
  /** Original total food cost before swap */
  oldTotalCostCents: number
  /** Allergen conflicts introduced by the new dish */
  allergenConflicts: AllergenConflict[]
  /** Ingredient names shared between the new dish and other remaining dishes */
  ingredientOverlap: string[]
  /** Change in total prep time in minutes (positive = longer, null if either dish has unknown prep) */
  prepTimeEstimateDelta: number | null
  /** Margin impact comparison */
  marginImpact: {
    oldMarginPct: number
    newMarginPct: number
  }
  /** The dish being removed (for UI display) */
  removedDish: { id: string; name: string }
  /** The dish being added (for UI display) */
  addedDish: { id: string; name: string }
}

// ── Core simulator ───────────────────────────────────────────────────────────

/**
 * Calculate total food cost for a set of dishes scaled by guest count.
 * Each dish's costPerServingCents is multiplied by guestCount.
 */
function calculateTotalCost(dishes: SimulatorDish[], guestCount: number): number {
  let total = 0
  for (const dish of dishes) {
    total += dish.costPerServingCents * guestCount
  }
  return Math.round(total)
}

/**
 * Calculate margin percentage: (revenue - cost) / revenue * 100
 * Returns 0 if revenue is zero.
 */
function calculateMarginPct(revenueCents: number, costCents: number): number {
  if (revenueCents <= 0) return 0
  return Math.round(((revenueCents - costCents) / revenueCents) * 1000) / 10
}

/**
 * Find ingredients shared between a dish and a list of other dishes.
 * Comparison is case-insensitive on ingredient names.
 */
function findIngredientOverlap(
  dish: SimulatorDish,
  otherDishes: SimulatorDish[]
): string[] {
  const dishIngredients = new Set(
    dish.ingredients.map((i) => i.name.toLowerCase().trim())
  )

  const overlapping = new Set<string>()

  for (const other of otherDishes) {
    for (const ing of other.ingredients) {
      const normalized = ing.name.toLowerCase().trim()
      if (dishIngredients.has(normalized)) {
        // Use the original casing from the new dish's ingredient
        const original = dish.ingredients.find(
          (i) => i.name.toLowerCase().trim() === normalized
        )
        overlapping.add(original?.name ?? ing.name)
      }
    }
  }

  return Array.from(overlapping).sort()
}

/**
 * Calculate prep time delta between two dishes.
 * Returns null if either dish has unknown prep time.
 */
function calculatePrepTimeDelta(
  oldDish: SimulatorDish,
  newDish: SimulatorDish
): number | null {
  if (oldDish.prepTimeMinutes === null || newDish.prepTimeMinutes === null) {
    return null
  }
  return newDish.prepTimeMinutes - oldDish.prepTimeMinutes
}

/**
 * Simulate a dish swap and return the full impact analysis.
 * All calculations are deterministic from the input data.
 */
export function simulateDishSwap(params: DishSwapParams): SimulationResult {
  const {
    currentDishes,
    removeDishId,
    addDish,
    guestCount,
    guestAllergens,
    menuRevenueCents,
  } = params

  // Find the dish being removed
  const removedDish = currentDishes.find((d) => d.id === removeDishId)
  if (!removedDish) {
    throw new Error(`Dish with id "${removeDishId}" not found in current menu`)
  }

  // Build the new dish list (swap out old, swap in new)
  const newDishes = currentDishes
    .filter((d) => d.id !== removeDishId)
    .concat(addDish)

  // Cost calculations
  const safeGuestCount = Math.max(1, guestCount)
  const oldTotalCostCents = calculateTotalCost(currentDishes, safeGuestCount)
  const newTotalCostCents = calculateTotalCost(newDishes, safeGuestCount)
  const foodCostDeltaCents = newTotalCostCents - oldTotalCostCents

  // Allergen check on the new dish only
  const allergenConflicts = guestAllergens.length > 0
    ? checkDishAgainstAllergens(
        addDish.name,
        addDish.id,
        addDish.ingredients,
        guestAllergens
      )
    : []

  // Ingredient overlap between new dish and remaining dishes (excluding the one being removed)
  const remainingDishes = currentDishes.filter((d) => d.id !== removeDishId)
  const ingredientOverlap = findIngredientOverlap(addDish, remainingDishes)

  // Prep time delta
  const prepTimeEstimateDelta = calculatePrepTimeDelta(removedDish, addDish)

  // Margin impact
  const marginImpact = {
    oldMarginPct: calculateMarginPct(menuRevenueCents, oldTotalCostCents),
    newMarginPct: calculateMarginPct(menuRevenueCents, newTotalCostCents),
  }

  return {
    foodCostDeltaCents,
    newTotalCostCents,
    oldTotalCostCents,
    allergenConflicts,
    ingredientOverlap,
    prepTimeEstimateDelta,
    marginImpact,
    removedDish: { id: removedDish.id, name: removedDish.name },
    addedDish: { id: addDish.id, name: addDish.name },
  }
}

/**
 * Format cents as a dollar string for display.
 * e.g. 1250 -> "$12.50", -300 -> "-$3.00"
 */
export function formatCentsDelta(cents: number): string {
  const abs = Math.abs(cents)
  const dollars = (abs / 100).toFixed(2)
  if (cents < 0) return `-$${dollars}`
  if (cents > 0) return `+$${dollars}`
  return '$0.00'
}

/**
 * Format cents as a dollar string (no sign prefix).
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
