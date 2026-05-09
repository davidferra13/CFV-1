import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isProductRelevantToIngredient } from '../../lib/pricing/product-relevance.js'

describe('PIE product relevance guard', () => {
  it('accepts raw butter products', () => {
    assert.equal(isProductRelevantToIngredient('Kerrygold Unsalted Butter 8 oz', 'butter'), true)
  })

  it('rejects non-food butter catalog pollution', () => {
    assert.equal(isProductRelevantToIngredient('NIVEA Cocoa Butter Lotion', 'butter'), false)
    assert.equal(isProductRelevantToIngredient('Dove Shea Butter Beauty Bar Soap', 'butter'), false)
  })

  it('rejects prepared foods that use the ingredient as a flavor', () => {
    assert.equal(
      isProductRelevantToIngredient('Haagen-Dazs Butter Pecan Ice Cream', 'butter'),
      false
    )
    assert.equal(isProductRelevantToIngredient('Cilantro Lime Chicken', 'cilantro'), false)
  })

  it('accepts direct raw ingredient products', () => {
    assert.equal(isProductRelevantToIngredient('Wild Atlantic Salmon Fillet', 'salmon'), true)
    assert.equal(isProductRelevantToIngredient('Organic Cilantro Bunch', 'cilantro'), true)
  })

  it('does not match unrelated foods', () => {
    assert.equal(isProductRelevantToIngredient('Chicken Breast', 'salmon'), false)
  })
})
