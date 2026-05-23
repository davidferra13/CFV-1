import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateFrictionTier, countOverridesInWindow } from '../../lib/commitment/friction'
import type { Commitment, CommitmentOverride, FrictionTier } from '../../lib/commitment/types'

// ---- Helpers ----

function makeCommitment(overrides?: Partial<Commitment>): Commitment {
  return {
    id: 'c1',
    tenantId: 't1',
    domain: 'pricing',
    source: 'chef_declared',
    rule: { type: 'pricing_floor', minPerHead: 100 },
    status: 'active',
    frictionLevel: 1,
    overrideCount: 0,
    lastOverrideAt: null,
    currentStreak: 0,
    longestStreak: 0,
    futureSelfletter: null,
    seasonalProfile: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeOverride(daysAgo: number, overrides?: Partial<CommitmentOverride>): CommitmentOverride {
  return {
    id: `o-${daysAgo}-${Math.random().toString(36).slice(2, 6)}`,
    commitmentId: 'c1',
    tenantId: 't1',
    category: null,
    reason: 'test override',
    frictionTierAtOverride: 1,
    regretPrediction: null,
    context: null,
    createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    ...overrides,
  }
}

function makeOverrides(daysAgoList: number[]): CommitmentOverride[] {
  return daysAgoList.map((d) => makeOverride(d))
}

// ---- Tests: countOverridesInWindow ----

describe('countOverridesInWindow', () => {
  it('returns 0 for empty overrides', () => {
    assert.equal(countOverridesInWindow([], 30), 0)
  })

  it('counts overrides within the window', () => {
    const overrides = makeOverrides([5, 10, 25, 35, 50])
    assert.equal(countOverridesInWindow(overrides, 30), 3)
    assert.equal(countOverridesInWindow(overrides, 60), 5)
    assert.equal(countOverridesInWindow(overrides, 7), 1)
  })

  it('excludes overrides exactly at the boundary', () => {
    // Override at exactly 30 days ago should NOT be included (cutoff is exclusive)
    const overrides = [makeOverride(30)]
    // 30 days ago in ms: the filter is > cutoff, so exactly 30 days ago is excluded
    assert.equal(countOverridesInWindow(overrides, 30), 0)
  })
})

// ---- Tests: calculateFrictionTier ----

describe('calculateFrictionTier', () => {
  it('returns domain default (1) for new commitment with no overrides', () => {
    const commitment = makeCommitment()
    assert.equal(calculateFrictionTier(commitment, []), 1)
  })

  it('returns tier 1 for pricing domain with 1 override in 30 days', () => {
    const commitment = makeCommitment()
    const overrides = makeOverrides([5])
    assert.equal(calculateFrictionTier(commitment, overrides), 1)
  })

  it('escalates to tier 2 with 2+ overrides in 30 days', () => {
    const commitment = makeCommitment()
    const overrides = makeOverrides([5, 10])
    assert.equal(calculateFrictionTier(commitment, overrides), 2)
  })

  it('escalates to tier 3 with 3+ overrides in 60 days', () => {
    const commitment = makeCommitment()
    const overrides = makeOverrides([10, 20, 40])
    assert.equal(calculateFrictionTier(commitment, overrides), 3)
  })

  it('escalates to tier 4 with 5+ overrides in 90 days', () => {
    const commitment = makeCommitment()
    const overrides = makeOverrides([10, 20, 40, 50, 70])
    assert.equal(calculateFrictionTier(commitment, overrides), 4)
  })

  it('escalates to tier 5 with 8+ overrides in 90 days', () => {
    const commitment = makeCommitment()
    const overrides = makeOverrides([5, 10, 15, 20, 30, 45, 60, 75])
    assert.equal(calculateFrictionTier(commitment, overrides), 5)
  })

  it('never exceeds tier 5', () => {
    const commitment = makeCommitment()
    const overrides = makeOverrides([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    assert.equal(calculateFrictionTier(commitment, overrides), 5)
  })

  it('respects dietary domain default tier (3)', () => {
    const commitment = makeCommitment({ domain: 'dietary' })
    // No overrides, but dietary starts at tier 3
    assert.equal(calculateFrictionTier(commitment, []), 3)
  })

  it('respects contingency domain default tier (2)', () => {
    const commitment = makeCommitment({ domain: 'contingency' })
    assert.equal(calculateFrictionTier(commitment, []), 2)
  })

  it('dietary domain with overrides escalates above default', () => {
    const commitment = makeCommitment({ domain: 'dietary' })
    // 5 overrides in 90 days should escalate dietary from 3 to 4
    const overrides = makeOverrides([10, 20, 40, 50, 70])
    assert.equal(calculateFrictionTier(commitment, overrides), 4)
  })

  it('de-escalates by one tier after 60 days clean', () => {
    const commitment = makeCommitment({
      lastOverrideAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
    })
    // 3 overrides in 60 days would normally be tier 3, but all are old (> 60 days)
    // With no recent overrides and lastOverrideAt > 60 days, de-escalation triggers
    const overrides = makeOverrides([70, 75, 80])
    const tier = calculateFrictionTier(commitment, overrides)
    // All overrides are outside the 60-day window, so base tier is 1 (domain default)
    // De-escalation: max(default=1, 1-1=0) = 1 (clamped to domain default)
    assert.equal(tier, 1)
  })

  it('de-escalation does not go below domain default', () => {
    const commitment = makeCommitment({
      domain: 'dietary',
      lastOverrideAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000),
    })
    // Dietary default is 3. De-escalation should not drop below 3.
    const overrides: CommitmentOverride[] = []
    const tier = calculateFrictionTier(commitment, overrides)
    assert.equal(tier, 3)
  })

  it('ignores overrides older than 90 days for escalation', () => {
    const commitment = makeCommitment()
    // All overrides are >90 days old
    const overrides = makeOverrides([100, 110, 120, 130, 140, 150, 160, 170])
    assert.equal(calculateFrictionTier(commitment, overrides), 1)
  })

  it('takes the highest applicable tier when multiple thresholds are met', () => {
    const commitment = makeCommitment()
    // 8 overrides spread across windows: meets tier 2, 3, 4, and 5 thresholds
    const overrides = makeOverrides([1, 3, 7, 14, 21, 35, 50, 80])
    assert.equal(calculateFrictionTier(commitment, overrides), 5)
  })

  it('handles mixed old and recent overrides correctly', () => {
    const commitment = makeCommitment()
    // 2 in last 30 days (tier 2), plus some old ones outside windows
    const overrides = makeOverrides([5, 15, 100, 200])
    assert.equal(calculateFrictionTier(commitment, overrides), 2)
  })
})
