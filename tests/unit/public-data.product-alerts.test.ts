import test from 'node:test'
import assert from 'node:assert/strict'
import { matchRecallSnapshotsToProduct } from '@/lib/public-data/product-alerts'
import type { StoredFoodRecallSnapshot } from '@/lib/public-data/store'

function buildRecall(
  overrides: Partial<StoredFoodRecallSnapshot>
): StoredFoodRecallSnapshot {
  return {
    recall_number: 'F-0001-2026',
    product_description: 'Ferrero Nutella Hazelnut Spread distributed nationwide',
    classification: 'Class II',
    status: 'Ongoing',
    report_date: '2026-03-10',
    reason_for_recall: 'Undeclared milk allergen',
    recalling_firm: 'Ferrero',
    distribution_pattern: 'US',
    source_name: 'openFDA',
    freshness_expires_at: '2026-03-11T00:00:00.000Z',
    raw_payload: {},
    updated_at: '2026-03-10T00:00:00.000Z',
    ...overrides,
  }
}

test('matchRecallSnapshotsToProduct returns strong phrase/token matches', () => {
  const matches = matchRecallSnapshotsToProduct(
    {
      name: 'Nutella Hazelnut Spread',
      brand: 'Ferrero',
    },
    [
      buildRecall({}),
      buildRecall({
        recall_number: 'F-0002-2026',
        product_description: 'Sparkling mineral water with lemon',
      }),
    ]
  )

  assert.equal(matches.length, 1)
  assert.equal(matches[0]?.recallNumber, 'F-0001-2026')
  assert.ok(matches[0]?.matchedTerms.includes('nutella hazelnut spread'))
})

test('matchRecallSnapshotsToProduct does not flag weak generic overlaps', () => {
  const matches = matchRecallSnapshotsToProduct(
    {
      name: 'Sparkling Water',
      brand: 'House',
    },
    [
      buildRecall({
        recall_number: 'F-0003-2026',
        product_description: 'Bottled spring water from regional distributor',
      }),
    ]
  )

  assert.equal(matches.length, 0)
})

test('matchRecallSnapshotsToProduct can use brand plus product token overlap', () => {
  const matches = matchRecallSnapshotsToProduct(
    {
      name: 'Chocolate Wafer Cookies',
      brand: 'Oreo',
    },
    [
      buildRecall({
        recall_number: 'F-0004-2026',
        product_description: 'Oreo chocolate wafer cookies recalled for packaging defect',
      }),
    ]
  )

  assert.equal(matches.length, 1)
  assert.equal(matches[0]?.recallNumber, 'F-0004-2026')
  assert.ok(matches[0]?.matchedTerms.includes('oreo'))
})
