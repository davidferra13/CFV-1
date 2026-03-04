import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hasTaxableItems, isTaxableTaxClass } from '@/lib/commerce/tax-policy'

describe('commerce tax policy', () => {
  it('treats exempt and zero classes as non-taxable', () => {
    assert.equal(isTaxableTaxClass('exempt'), false)
    assert.equal(isTaxableTaxClass('zero'), false)
  })

  it('treats prepared food and standard classes as taxable', () => {
    assert.equal(isTaxableTaxClass('prepared_food'), true)
    assert.equal(isTaxableTaxClass('standard'), true)
  })

  it('detects taxable items in mixed carts', () => {
    assert.equal(
      hasTaxableItems([{ taxClass: 'exempt' }, { taxClass: 'prepared_food' }, { taxClass: 'zero' }]),
      true
    )
  })

  it('returns false when all cart items are non-taxable', () => {
    assert.equal(hasTaxableItems([{ taxClass: 'exempt' }, { taxClass: 'zero' }]), false)
  })
})

