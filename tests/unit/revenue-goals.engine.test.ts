import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyPipelineWeight,
  buildRangeProgress,
  buildRevenueGoalRecommendations,
  computeDinnersNeeded,
} from '@/lib/revenue-goals/engine'

test('buildRangeProgress calculates gap and percent', () => {
  const progress = buildRangeProgress({
    start: '2026-02-01',
    end: '2026-02-28',
    targetCents: 1000000,
    realizedCents: 400000,
    projectedCents: 700000,
  })

  assert.equal(progress.gapCents, 300000)
  assert.equal(progress.progressPercent, 70)
})

test('computeDinnersNeeded rounds up by average booking value', () => {
  assert.equal(computeDinnersNeeded(300000, 150000), 2)
  assert.equal(computeDinnersNeeded(1, 150000), 1)
  assert.equal(computeDinnersNeeded(0, 150000), 0)
})

test('applyPipelineWeight increases with nudge level', () => {
  const gentle = applyPipelineWeight(400000, 200000, 'gentle')
  const standard = applyPipelineWeight(400000, 200000, 'standard')
  const aggressive = applyPipelineWeight(400000, 200000, 'aggressive')

  assert.ok(gentle < standard)
  assert.ok(standard < aggressive)
})

test('buildRevenueGoalRecommendations emits booking and date recommendations when behind', () => {
  const recs = buildRevenueGoalRecommendations({
    monthlyGapCents: 350000,
    monthlyTargetCents: 1000000,
    dinnersNeededThisMonth: 3,
    avgBookingValueCents: 120000,
    openDatesThisMonth: ['2026-02-21', '2026-02-24', '2026-02-28'],
    dormantClientNames: ['Alex Rivera'],
    customGoals: [],
  })

  assert.ok(recs.some((rec) => rec.id === 'monthly-gap-bookings'))
  assert.ok(recs.some((rec) => rec.id === 'open-dates-promotion'))
})
