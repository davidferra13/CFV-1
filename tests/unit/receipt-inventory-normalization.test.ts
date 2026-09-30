import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeReceiptInventoryQuantity } from '../../lib/receipts/inventory-normalization'

test('converts receipt weight into the ingredient default unit', () => {
  const result = normalizeReceiptInventoryQuantity({
    quantity: 2,
    sourceUnit: 'lb',
    targetUnit: 'oz',
  })

  assert.deepEqual(result, {
    quantity: 32,
    unit: 'oz',
    normalized: true,
    issue: null,
  })
})

test('preserves a compatible count quantity', () => {
  const result = normalizeReceiptInventoryQuantity({
    quantity: 3,
    sourceUnit: 'each',
    targetUnit: 'each',
  })

  assert.equal(result.quantity, 3)
  assert.equal(result.unit, 'each')
  assert.equal(result.normalized, true)
  assert.equal(result.issue, null)
})
test('preserves an incompatible source unit instead of inventing a default-unit quantity', () => {
  const result = normalizeReceiptInventoryQuantity({
    quantity: 2,
    sourceUnit: 'bags',
    targetUnit: 'lb',
  })

  assert.equal(result.quantity, 2)
  assert.equal(result.unit, 'bag')
  assert.equal(result.normalized, false)
  assert.equal(result.issue, 'incompatible_unit_preserved')
})

test('uses one default unit only when OCR provides neither quantity nor unit', () => {
  const result = normalizeReceiptInventoryQuantity({
    quantity: null,
    sourceUnit: null,
    targetUnit: 'lb',
  })

  assert.equal(result.quantity, 1)
  assert.equal(result.unit, 'lb')
  assert.equal(result.normalized, false)
  assert.equal(result.issue, 'missing_quantity_and_unit')
})

test('keeps an OCR quantity when only the unit is missing', () => {
  const result = normalizeReceiptInventoryQuantity({
    quantity: 5,
    sourceUnit: null,
    targetUnit: 'each',
  })

  assert.equal(result.quantity, 5)
  assert.equal(result.unit, 'each')
  assert.equal(result.issue, 'missing_unit_assumed_default')
})
