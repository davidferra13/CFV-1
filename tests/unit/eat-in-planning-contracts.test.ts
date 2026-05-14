import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildEatInMealDirections,
  expandEatInMealDirectionToRecipes,
} from '@/lib/dinner-circles/eat-in-planning-contract'
import { buildPantrySeasonalGrocerySupport } from '@/lib/dinner-circles/pantry-grocery-contract'

test('eat-in planning creates meal directions from cuisine, vibe, and ingredient intent', () => {
  const [direction] = buildEatInMealDirections({
    fulfillmentMode: 'eat_in',
    prompt: 'Northern European cozy pasta night with peak ingredients',
    pantryItems: ['rye berries', 'cabbage'],
    dietaryConstraints: ['nut allergy'],
  })

  assert.equal(direction.cuisine, 'Northern European')
  assert.equal(direction.vibe, 'cozy')
  assert.equal(direction.ingredientAngle, 'peak_ingredients')
  assert.deepEqual(direction.pantryUses, ['rye berries', 'cabbage'])
  assert.equal(direction.recipeExpansionEligible, false)
})

test('recipe expansion preserves quality gates before generated cooking guidance is treated as ready', () => {
  const [direction] = buildEatInMealDirections({
    fulfillmentMode: 'eat_in',
    prompt: 'cozy pasta night',
    pantryItems: ['olive oil'],
    dietaryConstraints: ['gluten free'],
    ingredientAngles: ['dietary_fit'],
  })

  const expansion = expandEatInMealDirectionToRecipes({
    direction,
    allowGeneratedGuidance: true,
    acknowledgedDietaryConstraints: ['gluten free'],
  })

  assert.equal(expansion.status, 'needs_review')
  assert.equal(expansion.qualityGate.dietaryReviewed, true)
  assert.equal(expansion.qualityGate.hasTrustedSource, false)
  assert.equal(expansion.options[0]?.source, 'generated_guidance')
  assert.ok(expansion.blockers.includes('hasTrustedSource'))
})

test('pantry and grocery support favors seasonal pantry-first eating at home', () => {
  const [direction] = buildEatInMealDirections({
    fulfillmentMode: 'eat_in',
    prompt: 'cozy pasta night with peak ingredients',
    pantryItems: ['tomatoes', 'basil'],
  })
  const plan = buildPantrySeasonalGrocerySupport({
    direction,
    month: 8,
    budgetCents: 2000,
    pantry: [
      { name: 'tomatoes', seasonalMonths: [7, 8, 9], expiresSoon: true },
      { name: 'basil', seasonalMonths: [6, 7, 8], leftover: true },
      { name: 'olive oil', staple: true },
    ],
  })

  assert.equal(plan.mode, 'seasonal')
  assert.deepEqual(plan.useNow, ['Tomatoes', 'Basil'])
  assert.deepEqual(plan.seasonalHighlights, ['Tomatoes', 'Basil'])
  assert.equal(plan.budgetStatus, 'within_budget')
  assert.ok(plan.groceryList.some((item) => item.name === 'pasta'))
})
