import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  deriveComparableUnitPrice,
  normalizeIngredientName,
} = require('../../lib/vendors/price-normalization.ts')

test('deriveComparableUnitPrice normalizes weight price to per-100g basis', () => {
  const result = deriveComparableUnitPrice({
    priceCents: 2750,
    itemName: 'Mozzarella 5lb bag',
    unitSize: 5,
    unitMeasure: 'lb',
  })

  assert.equal(result.displayUnit, '100g')
  assert.equal(result.usedNormalization, true)
  assert.ok(result.comparableCents > 120 && result.comparableCents < 122)
})

test('deriveComparableUnitPrice parses inline pack patterns (12 x 16 oz)', () => {
  const result = deriveComparableUnitPrice({
    priceCents: 7999,
    itemName: 'Tomato Sauce 12 x 16 oz',
    unitSize: null,
    unitMeasure: null,
  })

  assert.equal(result.displayUnit, '100g')
  assert.equal(result.packCount, 12)
  assert.equal(result.usedNormalization, true)
  assert.ok(result.comparableCents > 146 && result.comparableCents < 148)
})

test('deriveComparableUnitPrice normalizes count units to per-each basis', () => {
  const result = deriveComparableUnitPrice({
    priceCents: 1299,
    itemName: 'Disposable gloves 100 ct',
    unitSize: 100,
    unitMeasure: 'ct',
  })

  assert.equal(result.displayUnit, 'ea')
  assert.equal(result.usedNormalization, true)
  assert.ok(result.comparableCents > 12 && result.comparableCents < 14)
})

test('deriveComparableUnitPrice falls back to raw item price when unit cannot be normalized', () => {
  const result = deriveComparableUnitPrice({
    priceCents: 4599,
    itemName: 'Premium olive oil',
    unitSize: null,
    unitMeasure: null,
  })

  assert.equal(result.usedNormalization, false)
  assert.equal(result.displayUnit, 'item')
  assert.equal(result.comparableCents, 4599)
})

test('normalizeIngredientName strips pack and size tokens', () => {
  const normalized = normalizeIngredientName('Mozzarella Cheese (Whole Milk) 12 x 16 oz Pack')
  assert.equal(normalized, 'mozzarella cheese')
})
