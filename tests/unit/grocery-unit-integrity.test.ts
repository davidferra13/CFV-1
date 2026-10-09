import test from 'node:test'
import assert from 'node:assert/strict'
import { addQuantities, canConvert } from '@/lib/grocery/unit-conversion'
import { convertWithDensity } from '@/lib/units/conversion-engine'

const aliases = [
  ['fluid ounces', 8, 'cup', 1],
  ['deciliters', 2, 'ml', 100],
  ['milligrams', 500, 'g', 1],
] as const
for (const [unitA, qtyA, unitB, qtyB] of aliases) {
  test(`shopping merges ${unitA} with ${unitB} using canonical factors`, () => {
    assert.equal(canConvert(unitA, unitB), true)
    const result = addQuantities(qtyA, unitA, qtyB, unitB)
    const original = convertWithDensity(qtyA, unitA, result.unit, null)!
    const added = convertWithDensity(qtyB, unitB, result.unit, null)!
    assert.ok(Math.abs(result.quantity - original - added) <= 0.0051)
    assert.ok(result.quantity > 0)
  })
}
test('counts and weights cannot become a single grocery total', () => {
  assert.equal(canConvert('each', 'g'), false)
  assert.throws(() => addQuantities(2, 'each', 100, 'g'), /Cannot combine each and g/)
})
test('container sizes are not guessed from matching ingredient names', () => {
  assert.throws(() => addQuantities(2, 'can', 3, 'jar'), /Cannot combine can and jar/)
})
for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
  test(`invalid shopping quantities are rejected: ${invalid}`, () => {
    assert.throws(() => addQuantities(invalid, 'g', 1, 'g'), /finite and non-negative/)
    assert.throws(() => addQuantities(1, 'g', invalid, 'g'), /finite and non-negative/)
  })
}
for (const density of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
  test(`invalid density cannot authorize weight/volume conversion: ${density}`, () => {
    assert.equal(canConvert('cup', 'oz', density), false)
    assert.throws(() => addQuantities(2, 'cup', 8, 'oz', density), /Cannot combine/)
  })
}
test('zero quantities remain valid', () => {
  assert.deepEqual(addQuantities(0, 'cup', 0, 'cup'), { quantity: 0, unit: 'cup' })
})
test('known ingredient density still supports mixed weight/volume recipes', () => {
  const result = addQuantities(2, 'cup', 8, 'oz', 0.53)
  assert.equal(result.unit, 'cup')
  assert.ok(Math.abs(result.quantity - 3.81) < 0.01)
})
test('an unused density does not block compatible measurements', () => {
  assert.equal(canConvert('g', 'kg', Number.POSITIVE_INFINITY), true)
  assert.deepEqual(addQuantities(500, 'g', 0.5, 'kg', Number.POSITIVE_INFINITY), {
    quantity: 1,
    unit: 'kg',
  })
})
