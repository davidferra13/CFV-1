// Dietary Safety Check Module
//
// Single entry point for "is this menu safe for these guests?"
// Wraps the existing cross-contamination and allergen check logic
// into a unified interface.
//
// NOT a 'use server' file. Called BY server actions and components.

import { checkDishAgainstAllergens, type AllergenConflict } from '@/lib/menus/allergen-check'

export type MenuSafetyGuest = {
  name: string
  allergies: string[]
  dietaryRestrictions: string[]
}

export type MenuSafetyDish = {
  id: string
  name: string
  ingredientNames: string[]
  allergenFlags: string[]
}

export type MenuSafetyResult = {
  safe: boolean
  totalConflicts: number
  criticalConflicts: number
  conflicts: Array<{
    guestName: string
    dishName: string
    allergen: string
    isCritical: boolean
  }>
  safeDishesByGuest: Record<string, string[]>
}

// FDA Big 9 allergens (lowercase for matching)
const CRITICAL_ALLERGENS = new Set([
  'milk', 'dairy', 'eggs', 'egg', 'fish', 'shellfish',
  'tree nuts', 'nuts', 'peanuts', 'peanut', 'wheat',
  'soybeans', 'soy', 'sesame',
])

function isCriticalAllergen(allergen: string): boolean {
  const lower = allergen.toLowerCase().trim()
  return CRITICAL_ALLERGENS.has(lower) ||
    [...CRITICAL_ALLERGENS].some((c) => lower.includes(c) || c.includes(lower))
}

/**
 * Check whether a menu is safe for a set of guests.
 * Returns a structured result with conflict details.
 *
 * This is a pure function: no DB calls, no auth checks.
 * The caller is responsible for fetching dishes and guest data.
 */
export function checkMenuSafety(
  dishes: MenuSafetyDish[],
  guests: MenuSafetyGuest[]
): MenuSafetyResult {
  const conflicts: MenuSafetyResult['conflicts'] = []
  const safeDishesByGuest: Record<string, string[]> = {}

  for (const guest of guests) {
    const guestRestrictions = [
      ...guest.allergies,
      ...guest.dietaryRestrictions,
    ].filter(Boolean)

    if (guestRestrictions.length === 0) {
      safeDishesByGuest[guest.name] = dishes.map((d) => d.name)
      continue
    }

    const conflictedDishNames = new Set<string>()

    for (const restriction of guestRestrictions) {
      const restrictionLower = restriction.toLowerCase().trim()

      for (const dish of dishes) {
        // Check allergen flags
        const flagMatch = dish.allergenFlags.some((flag) => {
          const flagLower = flag.toLowerCase().trim()
          return flagLower.includes(restrictionLower) ||
            restrictionLower.includes(flagLower)
        })

        // Check ingredient names
        const ingredientMatch = dish.ingredientNames.some((ing) => {
          const ingLower = ing.toLowerCase().trim()
          return ingLower.includes(restrictionLower) ||
            restrictionLower.includes(ingLower)
        })

        if (flagMatch || ingredientMatch) {
          conflictedDishNames.add(dish.name)
          conflicts.push({
            guestName: guest.name,
            dishName: dish.name,
            allergen: restriction,
            isCritical: isCriticalAllergen(restriction),
          })
        }
      }
    }

    safeDishesByGuest[guest.name] = dishes
      .map((d) => d.name)
      .filter((name) => !conflictedDishNames.has(name))
  }

  const criticalConflicts = conflicts.filter((c) => c.isCritical).length

  return {
    safe: conflicts.length === 0,
    totalConflicts: conflicts.length,
    criticalConflicts,
    conflicts,
    safeDishesByGuest,
  }
}

/**
 * Quick safety check: does any guest have a conflict with any dish?
 * Returns true if the menu is safe (no conflicts).
 * Lightweight alternative to checkMenuSafety when you only need a boolean.
 */
export function isMenuSafeForGuests(
  dishes: MenuSafetyDish[],
  guests: MenuSafetyGuest[]
): boolean {
  return checkMenuSafety(dishes, guests).safe
}
