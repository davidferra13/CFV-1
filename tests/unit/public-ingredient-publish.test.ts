import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateCanonicalIngredientPublicPublishability,
  isKnowledgeIngredientPubliclyIndexable,
} from '../../lib/openclaw/public-ingredient-publish'

test('canonical publish guard blocks obvious non-food ingredient slugs like duck-tape', () => {
  const result = evaluateCanonicalIngredientPublicPublishability({
    id: 'duck-tape',
    name: 'Duck Tape',
    category: 'Other',
    hasFoodProductMatch: false,
  })

  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'blocked_keyword')
})

test('canonical publish guard preserves legitimate food ingredients', () => {
  const result = evaluateCanonicalIngredientPublicPublishability({
    id: 'duck-fat',
    name: 'Duck Fat',
    category: 'Pantry',
    hasFoodProductMatch: false,
  })

  assert.equal(result.allowed, true)
  assert.equal(result.reason, 'food_category')
})

test('knowledge slugs block obvious non-culinary variants but keep real ingredients', () => {
  assert.equal(
    isKnowledgeIngredientPubliclyIndexable({ slug: 'duck-duct-tape', name: 'Duck Duct Tape' }),
    false
  )
  assert.equal(isKnowledgeIngredientPubliclyIndexable({ slug: 'duck-confit' }), true)
})
