import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluatePromotionForLines } from '@/lib/commerce/promotion-engine'

test('applies percent order promotion across all lines proportionally', () => {
  const result = evaluatePromotionForLines({
    promotion: {
      id: 'promo-1',
      code: 'SAVE10',
      name: 'Save 10%',
      discountType: 'percent_order',
      discountPercent: 10,
      discountCents: null,
      minSubtotalCents: 0,
      maxDiscountCents: null,
      targetTaxClasses: [],
    },
    lines: [
      { id: 'line-a', taxClass: 'prepared_food', lineSubtotalCents: 1000 },
      { id: 'line-b', taxClass: 'standard', lineSubtotalCents: 2000 },
    ],
    orderSubtotalCents: 3000,
  })

  assert.ok(result)
  assert.equal(result.totalDiscountCents, 300)
  assert.equal(result.lineDiscounts['line-a'], 100)
  assert.equal(result.lineDiscounts['line-b'], 200)
})

test('applies fixed item promotion only to targeted tax classes', () => {
  const result = evaluatePromotionForLines({
    promotion: {
      id: 'promo-2',
      code: 'SANDWICH5',
      name: 'Sandwich $5 Off',
      discountType: 'fixed_item',
      discountPercent: null,
      discountCents: 500,
      minSubtotalCents: 0,
      maxDiscountCents: null,
      targetTaxClasses: ['prepared_food'],
    },
    lines: [
      { id: 'line-a', taxClass: 'prepared_food', lineSubtotalCents: 1500 },
      { id: 'line-b', taxClass: 'standard', lineSubtotalCents: 700 },
    ],
    orderSubtotalCents: 2200,
  })

  assert.ok(result)
  assert.equal(result.totalDiscountCents, 500)
  assert.equal(result.lineDiscounts['line-a'], 500)
  assert.equal(result.lineDiscounts['line-b'] ?? 0, 0)
})

test('honors min subtotal and returns null when threshold is not met', () => {
  const result = evaluatePromotionForLines({
    promotion: {
      id: 'promo-3',
      code: 'BIGORDER',
      name: 'Big Order Discount',
      discountType: 'percent_order',
      discountPercent: 15,
      discountCents: null,
      minSubtotalCents: 5000,
      maxDiscountCents: null,
      targetTaxClasses: [],
    },
    lines: [{ id: 'line-a', taxClass: 'prepared_food', lineSubtotalCents: 3000 }],
    orderSubtotalCents: 3000,
  })

  assert.equal(result, null)
})

test('caps discount by max_discount_cents', () => {
  const result = evaluatePromotionForLines({
    promotion: {
      id: 'promo-4',
      code: 'MEGA50',
      name: 'Half Off',
      discountType: 'percent_order',
      discountPercent: 50,
      discountCents: null,
      minSubtotalCents: 0,
      maxDiscountCents: 400,
      targetTaxClasses: [],
    },
    lines: [{ id: 'line-a', taxClass: 'prepared_food', lineSubtotalCents: 2000 }],
    orderSubtotalCents: 2000,
  })

  assert.ok(result)
  assert.equal(result.totalDiscountCents, 400)
  assert.equal(result.lineDiscounts['line-a'], 400)
})

test('never discounts below zero subtotal', () => {
  const result = evaluatePromotionForLines({
    promotion: {
      id: 'promo-5',
      code: 'FREE',
      name: 'Overlarge fixed',
      discountType: 'fixed_order',
      discountPercent: null,
      discountCents: 5000,
      minSubtotalCents: 0,
      maxDiscountCents: null,
      targetTaxClasses: [],
    },
    lines: [{ id: 'line-a', taxClass: 'prepared_food', lineSubtotalCents: 1200 }],
    orderSubtotalCents: 1200,
  })

  assert.ok(result)
  assert.equal(result.totalDiscountCents, 1200)
  assert.equal(result.lineDiscounts['line-a'], 1200)
})
