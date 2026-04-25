import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBudgetToCents } from '@/lib/booking/budget-parser'
import { formatGuestCountForChef, resolveGuestCountRange } from '@/lib/booking/guest-count-map'

test('open booking budget parser maps known labels and free-text ranges to cents', () => {
  assert.equal(parseBudgetToCents('elevated'), 7500)
  assert.equal(parseBudgetToCents('$50-75/person'), 6250)
  assert.equal(parseBudgetToCents('$1,500-$2,000'), 175000)
  assert.equal(parseBudgetToCents('not-sure'), null)
})

test('open booking guest count mapping preserves bucket and midpoint display', () => {
  assert.deepEqual(resolveGuestCountRange(18), {
    label: '13-25 (large party)',
    min: 13,
    max: 25,
    midpoint: 18,
  })
  assert.equal(formatGuestCountForChef(18), '18 guests (from 13-25 range)')
})
