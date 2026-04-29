import test from 'node:test'
import assert from 'node:assert/strict'

import { getCostConfidenceStatus } from '@/lib/pricing/cost-confidence'

test('cost confidence returns complete for fully covered high-confidence prices', () => {
  assert.equal(
    getCostConfidenceStatus({
      coveragePct: 100,
      avgConfidence: 0.92,
      minConfidence: 0.7,
      lowConfidenceCount: 0,
    }),
    'complete'
  )
})

test('cost confidence flags missing prices from partial coverage or explicit count', () => {
  assert.equal(getCostConfidenceStatus({ coveragePct: 75, avgConfidence: 0.9 }), 'missing_prices')
  assert.equal(
    getCostConfidenceStatus({ coveragePct: 100, avgConfidence: 0.9, missingPriceCount: 1 }),
    'missing_prices'
  )
  assert.equal(
    getCostConfidenceStatus({ coveragePct: 100, avgConfidence: 0.9, isPartial: true }),
    'missing_prices'
  )
})

test('cost confidence prioritizes unit mismatches over missing or stale prices', () => {
  assert.equal(
    getCostConfidenceStatus({
      coveragePct: 70,
      avgConfidence: 0.9,
      unitMismatchCount: 1,
      stalePriceCount: 2,
    }),
    'unit_mismatch'
  )
})

test('cost confidence flags stale prices when coverage is otherwise complete', () => {
  assert.equal(
    getCostConfidenceStatus({
      coveragePct: 100,
      avgConfidence: 0.91,
      stalePriceCount: 2,
    }),
    'stale_prices'
  )
})

test('cost confidence flags estimated pricing from estimates or low confidence', () => {
  assert.equal(
    getCostConfidenceStatus({
      coveragePct: 100,
      avgConfidence: 0.93,
      estimatedPriceCount: 1,
    }),
    'estimated'
  )
  assert.equal(getCostConfidenceStatus({ coveragePct: 100, avgConfidence: 0.62 }), 'estimated')
  assert.equal(
    getCostConfidenceStatus({
      coveragePct: 100,
      avgConfidence: 0.9,
      minConfidence: 0.4,
    }),
    'estimated'
  )
  assert.equal(
    getCostConfidenceStatus({
      coveragePct: 100,
      avgConfidence: 0.9,
      lowConfidenceCount: 1,
    }),
    'estimated'
  )
})

test('cost confidence returns unknown when no pricing signal is available', () => {
  assert.equal(getCostConfidenceStatus({ coveragePct: null }), 'unknown')
  assert.equal(getCostConfidenceStatus({}), 'unknown')
})

test('cost confidence uses explicit blocker counts without coverage', () => {
  assert.equal(getCostConfidenceStatus({ coveragePct: null, missingPriceCount: 2 }), 'missing_prices')
  assert.equal(getCostConfidenceStatus({ coveragePct: null, unitMismatchCount: 1 }), 'unit_mismatch')
})
