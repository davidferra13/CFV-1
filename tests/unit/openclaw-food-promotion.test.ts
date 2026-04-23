import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFoodAliases,
  evaluateCanonicalFoodReadiness,
  mapCanonicalCategoryToSystemCategory,
  normalizeFoodStandardUnit,
  slugifyFoodName,
} from '@/lib/openclaw/food-promotion'

test('food readiness marks priced, documented culinary foods as fully ready', () => {
  const readiness = evaluateCanonicalFoodReadiness({
    id: 'artichoke-globe-raw',
    name: 'Artichoke, (globe or french), raw',
    category: 'Produce',
    standardUnit: 'lb',
    normalizationHits: 6,
    hasMarketPrice: true,
    hasDocumentation: true,
  })

  assert.equal(readiness.promotable, true)
  assert.equal(readiness.chefFlowReady, true)
  assert.equal(readiness.fullyReady, true)
  assert.equal(readiness.systemIngredient.category, 'produce')
  assert.equal(readiness.systemIngredient.standardUnit, 'oz')
  assert.equal(readiness.systemIngredient.unitType, 'weight')
  assert.equal(readiness.systemIngredient.slug, 'artichoke')
})

test('food readiness allows promotion before docs/prices are complete but keeps gaps explicit', () => {
  const readiness = evaluateCanonicalFoodReadiness({
    id: 'duck-fat',
    name: 'Duck Fat',
    category: 'Pantry',
    standardUnit: 'each',
    normalizationHits: 2,
  })

  assert.equal(readiness.promotable, true)
  assert.equal(readiness.chefFlowReady, false)
  assert.equal(readiness.fullyReady, false)
  assert.deepEqual(readiness.missing, ['pricing', 'documentation'])
})

test('food readiness blocks obvious non-food items even when catalog matches exist', () => {
  const readiness = evaluateCanonicalFoodReadiness({
    id: 'duck-tape',
    name: 'Duck Tape',
    category: 'Other',
    standardUnit: 'each',
    normalizationHits: 4,
    hasMarketPrice: true,
    hasDocumentation: true,
  })

  assert.equal(readiness.isPublishable, false)
  assert.equal(readiness.promotable, false)
  assert.equal(readiness.chefFlowReady, false)
})

test('food promotion helpers clean aliases and normalize categories/units', () => {
  assert.equal(slugifyFoodName('Artichoke, (globe or french), raw'), 'artichoke')
  assert.deepEqual(buildFoodAliases('Artichoke, (globe or french), raw'), ['artichoke'])
  assert.equal(mapCanonicalCategoryToSystemCategory('Condiments & Sauces'), 'condiment')
  assert.equal(normalizeFoodStandardUnit('fl oz'), 'fl_oz')
})
