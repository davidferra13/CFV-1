import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildClientSafeStrategySummary,
  containsPrivateStrategyLeak,
  deriveMostRestrictiveStrategySignal,
  isPrivateStrategyVisibility,
  type StrategySignalContract,
  type StrategySignalFactor,
} from '../../lib/intelligence/chef-life-strategy-map-contract.js'
import {
  buildPrivateRemyStrategySummary,
  buildStrategyReviewRitual,
  deriveStrategySignal,
  type StrategySignalInput,
} from '../../lib/intelligence/chef-life-strategy-map.js'

const baseFactor: StrategySignalFactor = {
  area: 'client_mix',
  state: 'aligned',
  label: 'Recurring household work supports the target client mix.',
  explanation: 'Repeat household service is one of the active client mix goals.',
  confidence: 'high',
  sourceRefs: [{ source: 'goal_snapshot', table: 'goal_snapshots', rowId: 'goal-1' }],
  visibility: 'client_safe_summary',
}

describe('Chef Life Strategy Map contract', () => {
  it('ranks strategy signal states and recognizes private visibility', () => {
    assert.equal(deriveMostRestrictiveStrategySignal(['aligned', 'neutral', 'risky']), 'risky')
    assert.equal(deriveMostRestrictiveStrategySignal(['aligned', 'unknown']), 'unknown')
    assert.equal(deriveMostRestrictiveStrategySignal([]), 'unknown')

    assert.equal(isPrivateStrategyVisibility('private_only'), true)
    assert.equal(isPrivateStrategyVisibility('chef_internal'), true)
    assert.equal(isPrivateStrategyVisibility('client_safe_summary'), false)
  })

  it('derives strategic fit with unknown and stale areas instead of fake precision', () => {
    const input: StrategySignalInput = {
      tenantId: 'tenant-1',
      subjectType: 'client',
      subjectId: 'client-1',
      factors: [
        baseFactor,
        {
          ...baseFactor,
          area: 'capacity_boundary',
          state: 'risky',
          label: 'This cadence may collide with the current capacity boundary.',
          visibility: 'private_only',
        },
      ],
      expectedAreas: ['client_mix', 'capacity_boundary', 'values', 'exit_legacy'],
      staleGoalIds: ['goal-old'],
    }

    const signal = deriveStrategySignal(input)

    assert.equal(signal.state, 'risky')
    assert.equal(signal.confidence, 'low')
    assert.deepEqual(signal.unknownAreas, ['values', 'exit_legacy'])
    assert.deepEqual(signal.staleGoalIds, ['goal-old'])
    assert.equal(signal.chefOnlySummary.includes('2 unknown'), true)
    assert.equal(signal.clientSafeSummary?.allowedReasons.includes(baseFactor.label), true)
    assert.equal(JSON.stringify(signal.clientSafeSummary).includes('capacity boundary'), false)
  })

  it('redacts private life strategy terms from client-safe summaries', () => {
    const signal: StrategySignalContract = {
      tenantId: 'tenant-1',
      subjectType: 'quote',
      subjectId: 'quote-1',
      state: 'neutral',
      factors: [
        baseFactor,
        {
          ...baseFactor,
          area: 'family_constraint',
          label: 'Family caregiving window is the real constraint.',
          explanation: 'Private reason should never leave chef-owned surfaces.',
          visibility: 'client_safe_summary',
        },
      ],
      unknownAreas: [],
      staleGoalIds: [],
      confidence: 'medium',
      chefOnlySummary: 'Neutral fit with one private reason.',
      clientSafeSummary: null,
    }

    const summary = buildClientSafeStrategySummary(signal)

    assert.equal(containsPrivateStrategyLeak('Family caregiving window'), true)
    assert.deepEqual(summary.allowedReasons, [baseFactor.label])
    assert.equal(summary.blockedPrivateReasonCount, 1)
    assert.equal(JSON.stringify(summary).includes('caregiving'), false)
  })

  it('builds seasonal review rituals and private Remy summaries without public leakage', () => {
    const ritual = buildStrategyReviewRitual({
      tenantId: 'tenant-1',
      cadence: 'seasonal',
      periodStart: '2026-06-01',
      periodEnd: '2026-08-31',
      strategyAreas: ['client_mix', 'income', 'values'],
      staleGoalIds: ['income-2025'],
    })

    assert.equal(ritual.visibility, 'private_only')
    assert.deepEqual(ritual.promptAreas, ['client_mix', 'income', 'values'])
    assert.equal(
      ritual.recommendedQuestions.some((question) => question.includes('values')),
      true
    )

    const summary = buildPrivateRemyStrategySummary({
      tenantId: 'tenant-1',
      signal: deriveStrategySignal({
        tenantId: 'tenant-1',
        subjectType: 'public_profile',
        subjectId: 'profile-1',
        factors: [baseFactor],
        expectedAreas: ['client_mix'],
      }),
      reviewRitual: ritual,
    })

    assert.equal(summary.visibility, 'private_only')
    assert.equal(summary.redactedForClient, true)
    assert.equal(summary.summary.includes('seasonal'), true)
  })
})
