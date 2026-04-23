// Tests for cross-type unit merging via density in grocery aggregation
import test from 'node:test'
import assert from 'node:assert/strict'
import { canConvert, addQuantities } from '@/lib/grocery/unit-conversion'

// Flour density = 0.53 g/ml
const FLOUR_DENSITY = 0.53

// ── canConvert with density ───────────────────────────────────────────

test('canConvert: same type works without density', () => {
  assert.equal(canConvert('oz', 'lb'), true)
  assert.equal(canConvert('cup', 'tbsp'), true)
})

test('canConvert: cross-type fails without density', () => {
  assert.equal(canConvert('cup', 'oz'), false)
})

test('canConvert: cross-type succeeds with numeric density', () => {
  assert.equal(canConvert('cup', 'oz', FLOUR_DENSITY), true)
  assert.equal(canConvert('oz', 'cup', FLOUR_DENSITY), true)
})

test('canConvert: cross-type succeeds with ingredient name', () => {
  assert.equal(canConvert('cup', 'oz', 'flour'), true)
  assert.equal(canConvert('cup', 'oz', 'all-purpose flour'), true)
})

test('canConvert: cross-type fails with unknown ingredient name', () => {
  assert.equal(canConvert('cup', 'oz', 'unobtainium'), false)
})

// ── addQuantities with density ────────────────────────────────────────

test('addQuantities: merges cross-type flour (cup + oz) into single quantity', () => {
  const result = addQuantities(2, 'cup', 8, 'oz', FLOUR_DENSITY)
  // Should produce a single consolidated number in the first unit type (cup)
  assert.equal(result.unit, 'cup')
  assert.equal(typeof result.quantity, 'number')
  // 8 oz = 226.8g; 226.8g / 0.53 = 427.9ml; 427.9ml / 236.588 = 1.81 cups
  // Total ~ 2 + 1.81 = 3.81 cups
  assert.ok(result.quantity > 3, `Expected > 3 cups, got ${result.quantity}`)
  assert.ok(result.quantity < 5, `Expected < 5 cups, got ${result.quantity}`)
})

test('addQuantities: falls back to raw addition without density', () => {
  const result = addQuantities(2, 'cup', 8, 'oz')
  // Without density, incompatible units: add raw numbers, keep first unit
  assert.equal(result.unit, 'cup')
  assert.equal(result.quantity, 10)
})

test('addQuantities: same-type merge unaffected by density param', () => {
  const result = addQuantities(2, 'oz', 8, 'oz', FLOUR_DENSITY)
  assert.equal(result.unit, 'oz')
  assert.equal(result.quantity, 10)
})

test('addQuantities: weight-to-weight merge ignores density', () => {
  const result = addQuantities(1, 'lb', 8, 'oz', FLOUR_DENSITY)
  assert.equal(result.unit, 'lb')
  // 1 lb + 8 oz = 1 lb + 0.5 lb = 1.5 lb
  assert.ok(Math.abs(result.quantity - 1.5) < 0.01)
})
