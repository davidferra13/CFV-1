import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyLaunchReadinessOperatorReviews } from '@/lib/validation/launch-readiness-operator-review'
import type { LaunchReadinessReport } from '@/lib/validation/launch-readiness'

function report(overrides: Partial<LaunchReadinessReport> = {}): LaunchReadinessReport {
  return {
    generatedAt: '2026-04-29T20:00:00.000Z',
    status: 'blocked',
    verifiedChecks: 1,
    totalChecks: 4,
    checks: [
      {
        key: 'build_integrity',
        label: 'Build integrity is green',
        status: 'verified',
        evidence: 'Type check and build green as of 2026-04-29T19:00:00.000Z',
        evidenceItems: [],
        nextStep: 'Re-run release validation before shipping.',
        href: '/admin/system',
      },
      {
        key: 'public_booking_test',
        label: 'Public booking tested by a non-developer',
        status: 'operator_review',
        evidence: '1 public booking inquiry exists',
        evidenceItems: [],
        nextStep: 'Confirm the tester was not a developer.',
        href: '/book/pilot-chef',
      },
      {
        key: 'real_chef_two_weeks',
        label: 'Real chef used ChefFlow for 2 weeks',
        status: 'operator_review',
        evidence: 'Pilot chef has 14+ days of evidence',
        evidenceItems: [],
        nextStep: 'Confirm this is a real non-developer pilot.',
        href: '/admin/users',
      },
      {
        key: 'backup_integrity',
        label: 'Database backup heartbeat is fresh',
        status: 'needs_action',
        evidence: 'No backup heartbeat found in cron executions',
        evidenceItems: [],
        nextStep: 'Run or repair the approved backup heartbeat path before launch.',
        href: '/admin/system',
      },
    ],
    pilotCandidates: [],
    evidenceLog: [],
    nextActions: [
      {
        label: 'Public booking tested by a non-developer',
        reason: 'Confirm the tester was not a developer.',
        href: '/book/pilot-chef',
      },
    ],
    ...overrides,
  }
}

describe('launch readiness operator review', () => {
  it('applies configured operator_review verification decisions without mutating the source report', () => {
    const source = report()
    const result = applyLaunchReadinessOperatorReviews(
      source,
      [
        {
          checkKey: 'public_booking_test',
          decision: 'verified',
          reviewerId: 'operator-1',
          reviewedAt: '2026-04-29T21:00:00.000Z',
          note: 'Confirmed by watched pilot.',
        },
      ],
      { allowedCheckKeys: ['public_booking_test'] }
    )

    assert.equal(
      source.checks.find((check) => check.key === 'public_booking_test')?.status,
      'operator_review'
    )
    assert.equal(
      result.report.checks.find((check) => check.key === 'public_booking_test')?.status,
      'verified'
    )
    assert.equal(result.summary.verifiedChecks, 2)
    assert.equal(result.summary.operatorReviewCount, 1)
    assert.equal(result.summary.needsActionCount, 1)
    assert.equal(result.summary.status, 'blocked')
    assert.equal(result.summary.appliedDecisionCount, 1)
    assert.equal(result.summary.rejectedDecisionCount, 0)
    assert.deepEqual(result.appliedDecisions[0], {
      index: 0,
      checkKey: 'public_booking_test',
      decision: 'verified',
      reviewerId: 'operator-1',
      reviewedAt: '2026-04-29T21:00:00.000Z',
      note: 'Confirmed by watched pilot.',
    })
    assert.ok(
      result.report.nextActions.every(
        (action) => action.label !== 'Public booking tested by a non-developer'
      )
    )
  })

  it('rejects verification for checks that are not configured for operator review', () => {
    const result = applyLaunchReadinessOperatorReviews(
      report(),
      [{ checkKey: 'real_chef_two_weeks', decision: 'verified' }],
      { allowedCheckKeys: ['public_booking_test'] }
    )

    assert.equal(
      result.report.checks.find((check) => check.key === 'real_chef_two_weeks')?.status,
      'operator_review'
    )
    assert.equal(result.summary.verifiedChecks, 1)
    assert.equal(result.summary.rejectedDecisionCount, 1)
    assert.equal(result.rejectedDecisions[0]?.reason, 'check_not_configured')
  })

  it('rejects verification for needs_action and already verified checks', () => {
    const result = applyLaunchReadinessOperatorReviews(
      report(),
      [
        { checkKey: 'backup_integrity', decision: 'verified' },
        { checkKey: 'build_integrity', decision: 'verified' },
      ],
      { allowedCheckKeys: ['backup_integrity', 'build_integrity'] }
    )

    assert.deepEqual(
      result.rejectedDecisions.map((decision) => decision.reason),
      ['check_not_in_operator_review', 'check_not_in_operator_review']
    )
    assert.equal(result.summary.verifiedChecks, 1)
  })

  it('records operator rejections without changing check status', () => {
    const result = applyLaunchReadinessOperatorReviews(
      report(),
      [
        {
          checkKey: 'public_booking_test',
          decision: 'rejected',
          reviewerId: 'operator-2',
          note: 'Tester was internal.',
        },
      ],
      { allowedCheckKeys: ['public_booking_test'] }
    )

    assert.equal(
      result.report.checks.find((check) => check.key === 'public_booking_test')?.status,
      'operator_review'
    )
    assert.equal(result.summary.appliedDecisionCount, 0)
    assert.equal(result.summary.rejectedDecisionCount, 1)
    assert.equal(result.rejectedDecisions[0]?.reason, 'operator_rejected')
    assert.equal(result.rejectedDecisions[0]?.note, 'Tester was internal.')
  })

  it('validates malformed external review records deterministically', () => {
    const result = applyLaunchReadinessOperatorReviews(
      report(),
      [
        null,
        { decision: 'verified' },
        { checkKey: 'public_booking_test', decision: 'approved' },
        { checkKey: 'missing_check', decision: 'verified' },
      ],
      { allowedCheckKeys: ['public_booking_test'] }
    )

    assert.deepEqual(
      result.rejectedDecisions.map((decision) => decision.reason),
      ['invalid_record', 'invalid_check_key', 'invalid_decision', 'check_not_found']
    )
    assert.equal(result.summary.appliedDecisionCount, 0)
    assert.equal(result.summary.rejectedDecisionCount, 4)
  })

  it('applies only the first decision for each check', () => {
    const result = applyLaunchReadinessOperatorReviews(
      report(),
      [
        { checkKey: 'public_booking_test', decision: 'verified' },
        { checkKey: 'public_booking_test', decision: 'rejected' },
      ],
      { allowedCheckKeys: ['public_booking_test'] }
    )

    assert.equal(result.summary.appliedDecisionCount, 1)
    assert.equal(result.summary.rejectedDecisionCount, 1)
    assert.equal(result.rejectedDecisions[0]?.reason, 'duplicate_decision')
    assert.equal(
      result.report.checks.find((check) => check.key === 'public_booking_test')?.status,
      'verified'
    )
  })

  it('marks the report ready when operator review clears the final open checks', () => {
    const base = report({
      checks: report().checks.filter((check) => check.status !== 'needs_action'),
      verifiedChecks: 1,
      totalChecks: 3,
    })
    const result = applyLaunchReadinessOperatorReviews(
      base,
      [
        { checkKey: 'public_booking_test', decision: 'verified' },
        { checkKey: 'real_chef_two_weeks', decision: 'verified' },
      ],
      { allowedCheckKeys: ['public_booking_test', 'real_chef_two_weeks'] }
    )

    assert.equal(result.report.status, 'ready')
    assert.equal(result.summary.status, 'ready')
    assert.equal(result.summary.verifiedChecks, 3)
    assert.equal(result.summary.totalChecks, 3)
    assert.deepEqual(result.report.nextActions, [])
  })
})
