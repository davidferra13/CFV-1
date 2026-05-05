/**
 * Unit tests for PIE Price Resolution Core
 *
 * Tests the pure logic functions in lib/pricing/resolve-price.ts:
 * - Freshness computation
 * - Confidence decay
 * - Coverage level mapping
 * - Inline synthetic generation
 * - RPP adjustment
 * - LRU cache behavior
 *
 * Does NOT test DB queries (those need integration tests).
 * Run: npm run test:unit
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// We test the name normalizer separately since it's a pure module
import { normalizeIngredientName, ingredientNamesMatch } from '../../lib/pricing/name-normalizer.js'

// --- Name Normalizer Tests ---

describe('Name Normalizer', () => {
  describe('prefix stripping', () => {
    it('strips single preparation prefix', () => {
      assert.equal(normalizeIngredientName('Fresh Cilantro'), 'cilantro')
    })

    it('strips stacked prefixes', () => {
      assert.equal(normalizeIngredientName('Fresh Organic Large Onion'), 'onion')
    })

    it('strips frozen/canned/dried', () => {
      assert.equal(normalizeIngredientName('Frozen Sweet Corn'), 'sweet corn')
      assert.equal(normalizeIngredientName('Canned Tomatoes'), 'tomato')
      assert.equal(normalizeIngredientName('Dried Thyme'), 'thyme')
    })
  })

  describe('quantity stripping', () => {
    it('strips numeric quantities with units', () => {
      assert.equal(normalizeIngredientName('2 lbs chicken thighs'), 'chicken thigh')
    })

    it('strips fractions', () => {
      assert.equal(normalizeIngredientName('1/2 cup butter'), 'butter')
    })

    it('strips unicode fractions', () => {
      assert.equal(normalizeIngredientName('\u00BD cup cream'), 'cream')
    })

    it('strips number words', () => {
      // "three" stripped, "cloves" singularized to "clove", "garlic" kept
      assert.equal(normalizeIngredientName('three cloves garlic'), 'clove garlic')
    })
  })

  describe('brand stripping', () => {
    it('strips Kraft and prep prefixes', () => {
      // Kraft stripped (brand), then "shredded" stripped (prefix) -> "cheddar"
      assert.equal(normalizeIngredientName('Kraft Shredded Cheddar'), 'cheddar')
    })

    it('strips Barilla', () => {
      assert.equal(normalizeIngredientName('Barilla Spaghetti'), 'spaghetti')
    })

    it('strips store brand', () => {
      assert.equal(normalizeIngredientName('Great Value Butter'), 'butter')
    })
  })

  describe('parenthetical/bracket stripping', () => {
    it('strips parenthetical qualifiers', () => {
      assert.equal(normalizeIngredientName('cilantro (fresh, chopped)'), 'cilantro')
    })

    it('strips bracket recipe refs', () => {
      assert.equal(normalizeIngredientName('Lemons [Lemon Olive Oil Cake]'), 'lemon')
    })
  })

  describe('trailing instruction stripping', () => {
    it('strips comma-separated prep instructions', () => {
      assert.equal(normalizeIngredientName('onion, diced'), 'onion')
    })

    it('strips "for garnish"', () => {
      assert.equal(normalizeIngredientName('parsley, for garnish'), 'parsley')
    })

    it('strips "to taste"', () => {
      assert.equal(normalizeIngredientName('salt, to taste'), 'salt')
    })
  })

  describe('pluralization', () => {
    it('singularizes basic -s plurals', () => {
      assert.equal(normalizeIngredientName('carrots'), 'carrot')
    })

    it('singularizes -es plurals', () => {
      assert.equal(normalizeIngredientName('tomatoes'), 'tomato')
    })

    it('singularizes -ies plurals', () => {
      assert.equal(normalizeIngredientName('strawberries'), 'strawberry')
    })

    it('handles irregular plurals', () => {
      assert.equal(normalizeIngredientName('leaves'), 'leaf')
    })

    it('does not over-singularize', () => {
      // "bass" should not become "bas"
      assert.equal(normalizeIngredientName('bass'), 'bass')
    })
  })

  describe('synonym resolution', () => {
    it('maps green onion to scallion', () => {
      assert.equal(normalizeIngredientName('green onions'), 'scallion')
    })

    it('maps spring onion to scallion', () => {
      assert.equal(normalizeIngredientName('spring onion'), 'scallion')
    })

    it('maps evoo to extra virgin olive oil', () => {
      assert.equal(normalizeIngredientName('evoo'), 'extra virgin olive oil')
    })

    it('maps aubergine to eggplant', () => {
      assert.equal(normalizeIngredientName('aubergine'), 'eggplant')
    })

    it('maps courgette to zucchini', () => {
      assert.equal(normalizeIngredientName('courgette'), 'zucchini')
    })

    it('maps garbanzo to chickpea', () => {
      assert.equal(normalizeIngredientName('garbanzo'), 'chickpea')
    })

    it('maps powdered sugar to confectioners sugar', () => {
      assert.equal(normalizeIngredientName('powdered sugar'), 'confectioners sugar')
    })

    it('maps baby bella to cremini mushroom', () => {
      assert.equal(normalizeIngredientName('baby bella'), 'cremini mushroom')
    })
  })

  describe('abbreviation expansion', () => {
    it('expands ap flour', () => {
      assert.equal(normalizeIngredientName('ap flour'), 'all purpose flour')
    })

    it('expands parm', () => {
      assert.equal(normalizeIngredientName('parm'), 'parmesan')
    })
  })

  describe('ingredientNamesMatch', () => {
    it('matches synonyms', () => {
      assert.equal(ingredientNamesMatch('Green Onions', 'Scallions'), true)
    })

    it('matches despite prefix differences', () => {
      assert.equal(ingredientNamesMatch('Fresh Basil', 'Dried Basil'), true)
    })

    it('does not match unrelated ingredients', () => {
      assert.equal(ingredientNamesMatch('Chicken', 'Salmon'), false)
    })
  })

  describe('real-world chef inputs', () => {
    it('handles messy recipe input', () => {
      assert.equal(normalizeIngredientName('3 large Yellow Onions, diced fine'), 'yellow onion')
    })

    it('handles branded product', () => {
      assert.equal(normalizeIngredientName('Heinz Tomato Ketchup'), 'tomato ketchup')
    })

    it('handles complex recipe notation', () => {
      assert.equal(normalizeIngredientName('Fresh Organic Cilantro (chopped)'), 'cilantro')
    })
  })
})

// --- Non-Food Filter Tests ---

import { isNonFood, filterFoodOnly } from '../../lib/pricing/non-food-filter.js'

describe('Non-Food Filter', () => {
  describe('identifies non-food products', () => {
    it('catches Kotex', () => {
      assert.equal(isNonFood('U by Kotex Pads'), true)
    })

    it('catches Krazy Glue', () => {
      assert.equal(isNonFood('Krazy Glue Super Glue'), true)
    })

    it('catches detergent', () => {
      assert.equal(isNonFood('Tide Liquid Detergent'), true)
    })

    it('catches toilet paper', () => {
      assert.equal(isNonFood('Charmin Ultra Soft Toilet Paper'), true)
    })

    it('catches pet food', () => {
      assert.equal(isNonFood('Purina Dog Chow'), true)
    })

    it('catches shampoo', () => {
      assert.equal(isNonFood('Pantene Pro-V Shampoo'), true)
    })

    it('catches batteries', () => {
      assert.equal(isNonFood('Duracell AA Batteries'), true)
    })
  })

  describe('allows food products', () => {
    it('allows chicken breast', () => {
      assert.equal(isNonFood('Boneless Skinless Chicken Breast'), false)
    })

    it('allows olive oil', () => {
      assert.equal(isNonFood('Extra Virgin Olive Oil'), false)
    })

    it('allows pasta', () => {
      assert.equal(isNonFood('Barilla Spaghetti No 5'), false)
    })

    it('allows milk', () => {
      assert.equal(isNonFood('Whole Milk 1 Gallon'), false)
    })
  })

  describe('handles false positive cases', () => {
    it('allows Dove Chocolate (not Dove soap)', () => {
      assert.equal(isNonFood('Dove Chocolate Bar'), false)
    })

    it('allows Angel Food Cake (not Angel Soft)', () => {
      assert.equal(isNonFood('Angel Food Cake Mix'), false)
    })

    it('allows Old Bay seasoning (not Old Spice)', () => {
      assert.equal(isNonFood('Old Bay Seasoning'), false)
    })
  })

  describe('category-based filtering', () => {
    it('excludes items in Personal Care category', () => {
      assert.equal(isNonFood('Some Product', 'Personal Care'), true)
    })

    it('excludes items in Household category', () => {
      assert.equal(isNonFood('Some Product', 'Household'), true)
    })

    it('allows items in Produce category', () => {
      assert.equal(isNonFood('Bananas', 'Produce'), false)
    })
  })

  describe('filterFoodOnly', () => {
    it('removes non-food from array', () => {
      const products = [
        { name: 'Chicken Breast', category: 'Meat' },
        { name: 'Kotex Pads', category: 'Personal Care' },
        { name: 'Olive Oil', category: 'Pantry' },
      ]
      const result = filterFoodOnly(products)
      assert.equal(result.length, 2)
      assert.equal(result[0].name, 'Chicken Breast')
      assert.equal(result[1].name, 'Olive Oil')
    })
  })
})

// --- Circuit Breaker Tests ---

import { getCircuitState } from '../../lib/pricing/pi-bridge.js'

describe('Pi Bridge Circuit Breaker', () => {
  it('starts in closed state', () => {
    const state = getCircuitState()
    assert.equal(state.state, 'closed')
    assert.equal(state.failures, 0)
  })
})
