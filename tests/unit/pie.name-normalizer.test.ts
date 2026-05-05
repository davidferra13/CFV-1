/**
 * PIE Test Suite: Name Normalizer
 *
 * Tests normalizeIngredientName() and ingredientNamesMatch() pure functions.
 * These are the front door of PIE: if normalization fails, the entire
 * resolution chain matches wrong ingredients.
 *
 * Run: npm run test:unit -- tests/unit/pie.name-normalizer.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeIngredientName,
  ingredientNamesMatch,
  getCanonicalName,
} from '../../lib/pricing/name-normalizer.js'

// ─────────────────────────────────────────────────────────────────────────────
// QUANTITY STRIPPING
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Normalizer — quantity stripping', () => {
  it('strips numeric quantities with units', () => {
    assert.equal(normalizeIngredientName('2 lbs chicken thighs'), 'chicken thigh')
  })

  it('strips fractional quantities', () => {
    assert.equal(normalizeIngredientName('½ cup heavy cream'), 'heavy cream')
  })

  it('strips number words', () => {
    assert.equal(normalizeIngredientName('three cloves garlic'), 'garlic')
  })

  it('strips "1/2 cup" style fractions', () => {
    const result = normalizeIngredientName('1/2 cup flour')
    assert.equal(result, 'flour')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BRAND STRIPPING
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Normalizer — brand stripping', () => {
  it('strips Kraft', () => {
    assert.equal(normalizeIngredientName('Kraft Shredded Cheddar'), 'cheddar')
  })

  it('strips Kerrygold', () => {
    assert.equal(normalizeIngredientName('Kerrygold Butter'), 'butter')
  })

  it('strips store brands', () => {
    assert.equal(normalizeIngredientName('Great Value All Purpose Flour'), 'flour')
  })

  it('strips Barilla', () => {
    assert.equal(normalizeIngredientName('Barilla Spaghetti'), 'spaghetti')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PREPARATION PREFIX STRIPPING
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Normalizer — preparation stripping', () => {
  it('strips "fresh organic"', () => {
    assert.equal(normalizeIngredientName('Fresh Organic Cilantro'), 'cilantro')
  })

  it('strips "boneless skinless"', () => {
    assert.equal(normalizeIngredientName('boneless skinless chicken breast'), 'chicken breast')
  })

  it('strips up to 5 prefix passes', () => {
    assert.equal(normalizeIngredientName('fresh organic raw whole large carrot'), 'carrot')
  })

  it('strips parenthetical qualifiers', () => {
    assert.equal(normalizeIngredientName('cilantro (fresh)'), 'cilantro')
  })

  it('strips comma-separated instructions', () => {
    assert.equal(normalizeIngredientName('yellow onion, diced'), 'yellow onion')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ABBREVIATION EXPANSION
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Normalizer — abbreviations', () => {
  it('expands evoo', () => {
    assert.equal(normalizeIngredientName('evoo'), 'extra virgin olive oil')
  })

  it('expands chx', () => {
    assert.equal(normalizeIngredientName('chx'), 'chicken')
  })

  it('expands pb', () => {
    assert.equal(normalizeIngredientName('pb'), 'peanut butter')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SYNONYM RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Normalizer — synonyms', () => {
  it('green onion -> scallion', () => {
    assert.equal(normalizeIngredientName('green onion'), 'scallion')
  })

  it('aubergine -> eggplant', () => {
    assert.equal(normalizeIngredientName('aubergine'), 'eggplant')
  })

  it('prawn -> shrimp', () => {
    assert.equal(normalizeIngredientName('prawn'), 'shrimp')
  })

  it('powdered sugar -> confectioners sugar', () => {
    assert.equal(normalizeIngredientName('powdered sugar'), 'confectioners sugar')
  })

  it('chicken cutlet -> chicken breast', () => {
    assert.equal(normalizeIngredientName('chicken cutlet'), 'chicken breast')
  })

  it('chicken paillard -> chicken breast', () => {
    assert.equal(normalizeIngredientName('chicken paillard'), 'chicken breast')
  })

  it('ahi tuna -> tuna steak', () => {
    assert.equal(normalizeIngredientName('ahi tuna'), 'tuna steak')
  })

  it('branzino -> sea bass', () => {
    assert.equal(normalizeIngredientName('branzino'), 'sea bass')
  })

  it('chevre -> goat cheese', () => {
    assert.equal(normalizeIngredientName('chevre'), 'goat cheese')
  })

  it('tamari -> soy sauce', () => {
    assert.equal(normalizeIngredientName('tamari'), 'soy sauce')
  })

  it('london broil -> flank steak', () => {
    assert.equal(normalizeIngredientName('london broil'), 'flank steak')
  })

  it('fajita meat -> skirt steak', () => {
    assert.equal(normalizeIngredientName('fajita meat'), 'skirt steak')
  })

  it('panko breadcrumbs -> panko', () => {
    assert.equal(normalizeIngredientName('panko breadcrumbs'), 'panko')
  })

  it('wagyu beef -> wagyu', () => {
    assert.equal(normalizeIngredientName('wagyu beef'), 'wagyu')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SINGULARIZATION
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Normalizer — singularization', () => {
  it('tomatoes -> tomato', () => {
    assert.equal(normalizeIngredientName('tomatoes'), 'tomato')
  })

  it('anchovies -> anchovy', () => {
    assert.equal(normalizeIngredientName('anchovies'), 'anchovy')
  })

  it('strawberries -> strawberry', () => {
    assert.equal(normalizeIngredientName('strawberries'), 'strawberry')
  })

  it('leaves -> leaf', () => {
    assert.equal(normalizeIngredientName('leaves'), 'leaf')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EQUIVALENCE MATCHING
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Normalizer — ingredientNamesMatch', () => {
  it('matches identical after normalization', () => {
    assert.equal(ingredientNamesMatch('Green Onion', 'scallion'), true)
  })

  it('matches with quantities stripped', () => {
    assert.equal(ingredientNamesMatch('2 lbs chicken thighs', 'chicken thigh'), true)
  })

  it('does not match unrelated', () => {
    assert.equal(ingredientNamesMatch('chicken', 'beef'), false)
  })

  it('matches branded vs generic', () => {
    assert.equal(ingredientNamesMatch('Barilla Spaghetti', 'spaghetti'), true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED REAL-WORLD SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

describe('PIE Normalizer — real-world chef inputs', () => {
  it('handles receipt-style input: "Kerrygold Unsalted Butter 8oz"', () => {
    const result = normalizeIngredientName('Kerrygold Unsalted Butter 8oz')
    assert.ok(result.includes('butter'), `Expected "butter" in "${result}"`)
  })

  it('handles voice-to-text: "like 3 bunches of fresh cilantro"', () => {
    const result = normalizeIngredientName('3 bunches of fresh cilantro')
    assert.equal(result, 'of cilantro') // "of" stays, but core word is matched
  })

  it('handles recipe import: "1/2 cup Extra Virgin Olive Oil (for drizzling)"', () => {
    assert.equal(
      normalizeIngredientName('1/2 cup Extra Virgin Olive Oil (for drizzling)'),
      'extra virgin olive oil'
    )
  })

  it('getCanonicalName returns normalized', () => {
    assert.equal(getCanonicalName('Green Onions'), 'scallion')
  })
})
