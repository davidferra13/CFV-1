/**
 * QA Validation: Dietary Safety Check
 *
 * Tests the pure logic in lib/dietary/safety-check.ts:
 *   - Menu safety checks against guest allergies
 *   - Critical allergen detection (FDA Big 9)
 *   - Safe dishes per guest computation
 *   - Edge cases: empty dishes, empty guests, no conflicts
 *
 * Run: npm run test:unit
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

type MenuSafetyGuest = {
  name: string
  allergies: string[]
  dietaryRestrictions: string[]
}

type MenuSafetyDish = {
  id: string
  name: string
  ingredientNames: string[]
  allergenFlags: string[]
}

type MenuSafetyResult = {
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

const CRITICAL_ALLERGENS = new Set([
  'milk', 'dairy', 'eggs', 'egg', 'fish', 'shellfish',
  'tree nuts', 'nuts', 'peanuts', 'peanut', 'wheat',
  'soybeans', 'soy', 'sesame',
])

function isCriticalAllergen(allergen: string): boolean {
  const lower = allergen.toLowerCase().trim()
  return (
    CRITICAL_ALLERGENS.has(lower) ||
    [...CRITICAL_ALLERGENS].some((c) => lower.includes(c) || c.includes(lower))
  )
}

function checkMenuSafety(
  dishes: MenuSafetyDish[],
  guests: MenuSafetyGuest[]
): MenuSafetyResult {
  const conflicts: MenuSafetyResult['conflicts'] = []
  const safeDishesByGuest: Record<string, string[]> = {}

  for (const guest of guests) {
    const guestRestrictions = [...guest.allergies, ...guest.dietaryRestrictions].filter(Boolean)
    if (guestRestrictions.length === 0) {
      safeDishesByGuest[guest.name] = dishes.map((d) => d.name)
      continue
    }
    const conflictedDishNames = new Set<string>()
    for (const restriction of guestRestrictions) {
      const restrictionLower = restriction.toLowerCase().trim()
      for (const dish of dishes) {
        const flagMatch = dish.allergenFlags.some((flag) => {
          const flagLower = flag.toLowerCase().trim()
          return flagLower.includes(restrictionLower) || restrictionLower.includes(flagLower)
        })
        const ingredientMatch = dish.ingredientNames.some((ing) => {
          const ingLower = ing.toLowerCase().trim()
          return ingLower.includes(restrictionLower) || restrictionLower.includes(ingLower)
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
    safeDishesByGuest[guest.name] = dishes.map((d) => d.name).filter((name) => !conflictedDishNames.has(name))
  }
  const criticalConflicts = conflicts.filter((c) => c.isCritical).length
  return { safe: conflicts.length === 0, totalConflicts: conflicts.length, criticalConflicts, conflicts, safeDishesByGuest }
}

const SAMPLE_DISHES: MenuSafetyDish[] = [
  { id: 'd1', name: 'Lobster Bisque', ingredientNames: ['lobster', 'cream', 'butter', 'shallot', 'brandy'], allergenFlags: ['shellfish', 'dairy'] },
  { id: 'd2', name: 'Caesar Salad', ingredientNames: ['romaine', 'parmesan', 'anchovy', 'croutons', 'egg yolk'], allergenFlags: ['dairy', 'fish', 'wheat', 'eggs'] },
  { id: 'd3', name: 'Grilled Chicken', ingredientNames: ['chicken breast', 'olive oil', 'lemon', 'herbs'], allergenFlags: [] },
  { id: 'd4', name: 'Chocolate Mousse', ingredientNames: ['dark chocolate', 'eggs', 'cream', 'sugar', 'vanilla'], allergenFlags: ['dairy', 'eggs', 'soy'] },
]

describe('QA Validation: checkMenuSafety', () => {
  describe('No conflicts', () => {
    it('returns safe when guest has no allergies', () => {
      const guests: MenuSafetyGuest[] = [{ name: 'Alice', allergies: [], dietaryRestrictions: [] }]
      const result = checkMenuSafety(SAMPLE_DISHES, guests)
      assert.equal(result.safe, true)
      assert.equal(result.totalConflicts, 0)
      assert.equal(result.criticalConflicts, 0)
      assert.equal(result.safeDishesByGuest['Alice'].length, SAMPLE_DISHES.length)
    })
    it('returns safe for empty guest list', () => {
      const result = checkMenuSafety(SAMPLE_DISHES, [])
      assert.equal(result.safe, true)
      assert.equal(result.totalConflicts, 0)
    })
    it('returns safe for empty dish list', () => {
      const guests: MenuSafetyGuest[] = [{ name: 'Bob', allergies: ['dairy'], dietaryRestrictions: [] }]
      const result = checkMenuSafety([], guests)
      assert.equal(result.safe, true)
      assert.equal(result.totalConflicts, 0)
    })
  })

  describe('Allergen flag conflicts', () => {
    it('detects dairy conflict from allergen flags', () => {
      const guests: MenuSafetyGuest[] = [{ name: 'Charlie', allergies: ['dairy'], dietaryRestrictions: [] }]
      const result = checkMenuSafety(SAMPLE_DISHES, guests)
      assert.equal(result.safe, false)
      assert.ok(result.totalConflicts >= 3, `Expected at least 3 dairy conflicts, got ${result.totalConflicts}`)
      assert.ok(result.criticalConflicts >= 3, 'Dairy is FDA Big 9, should be critical')
    })
    it('detects shellfish conflict', () => {
      const guests: MenuSafetyGuest[] = [{ name: 'Dana', allergies: ['shellfish'], dietaryRestrictions: [] }]
      const result = checkMenuSafety(SAMPLE_DISHES, guests)
      assert.equal(result.safe, false)
      const shellConflicts = result.conflicts.filter((c) => c.allergen === 'shellfish')
      assert.ok(shellConflicts.length >= 1)
      assert.equal(shellConflicts[0].dishName, 'Lobster Bisque')
      assert.equal(shellConflicts[0].isCritical, true)
    })
  })

  describe('Ingredient name conflicts', () => {
    it('detects egg conflict from ingredient names', () => {
      const guests: MenuSafetyGuest[] = [{ name: 'Eve', allergies: ['egg'], dietaryRestrictions: [] }]
      const result = checkMenuSafety(SAMPLE_DISHES, guests)
      assert.equal(result.safe, false)
      const eggConflicts = result.conflicts.filter((c) => c.allergen === 'egg')
      assert.ok(eggConflicts.length >= 1)
    })
  })

  describe('Safe dishes per guest', () => {
    it('identifies safe dishes for allergic guest', () => {
      const guests: MenuSafetyGuest[] = [{ name: 'Frank', allergies: ['shellfish'], dietaryRestrictions: [] }]
      const result = checkMenuSafety(SAMPLE_DISHES, guests)
      const safeDishes = result.safeDishesByGuest['Frank']
      assert.ok(!safeDishes.includes('Lobster Bisque'), 'Lobster Bisque should not be safe')
      assert.ok(safeDishes.includes('Grilled Chicken'), 'Grilled Chicken should be safe')
    })
    it('non-allergic guest gets all dishes as safe', () => {
      const guests: MenuSafetyGuest[] = [{ name: 'Grace', allergies: [], dietaryRestrictions: [] }]
      const result = checkMenuSafety(SAMPLE_DISHES, guests)
      assert.equal(result.safeDishesByGuest['Grace'].length, 4)
    })
  })

  describe('Multiple guests with different allergies', () => {
    it('tracks conflicts per guest independently', () => {
      const guests: MenuSafetyGuest[] = [
        { name: 'Hank', allergies: ['shellfish'], dietaryRestrictions: [] },
        { name: 'Ivy', allergies: ['dairy'], dietaryRestrictions: [] },
      ]
      const result = checkMenuSafety(SAMPLE_DISHES, guests)
      assert.equal(result.safe, false)
      const hankConflicts = result.conflicts.filter((c) => c.guestName === 'Hank')
      const ivyConflicts = result.conflicts.filter((c) => c.guestName === 'Ivy')
      assert.ok(hankConflicts.length >= 1, 'Hank should have shellfish conflicts')
      assert.ok(ivyConflicts.length >= 3, 'Ivy should have dairy conflicts on multiple dishes')
    })
  })

  describe('Critical allergen classification', () => {
    it('FDA Big 9 allergens are critical', () => {
      const big9 = ['milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soy', 'sesame']
      for (const a of big9) {
        assert.equal(isCriticalAllergen(a), true, `${a} should be critical`)
      }
    })
    it('non-FDA allergens are not critical', () => {
      const nonCritical = ['nightshade', 'garlic', 'onion', 'pepper']
      for (const a of nonCritical) {
        assert.equal(isCriticalAllergen(a), false, `${a} should not be critical`)
      }
    })
  })

  describe('Dietary restrictions (non-allergy)', () => {
    it('detects conflicts from dietary restrictions field', () => {
      const guests: MenuSafetyGuest[] = [{ name: 'Jack', allergies: [], dietaryRestrictions: ['fish'] }]
      const result = checkMenuSafety(SAMPLE_DISHES, guests)
      assert.equal(result.safe, false)
      const fishConflicts = result.conflicts.filter((c) => c.allergen === 'fish')
      assert.ok(fishConflicts.length >= 1, 'Should detect fish from dietary restrictions')
    })
  })
})