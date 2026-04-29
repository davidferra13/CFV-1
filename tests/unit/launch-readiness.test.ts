import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLaunchReadinessReport,
  type LaunchReadinessFacts,
} from '@/lib/validation/launch-readiness'

function facts(overrides: Partial<LaunchReadinessFacts> = {}): LaunchReadinessFacts {
  return {
    generatedAt: '2026-04-29T12:00:00.000Z',
    pilotCandidates: [],
    operatorSurvey: {
      activeSurveys: 0,
      submittedResponses: 0,
      totalResponses: 0,
    },
    buildIntegrity: {
      typecheckGreen: false,
      buildGreen: false,
      lastVerified: null,
      commit: null,
    },
    backupIntegrity: {
      latestStatus: 'missing',
      latestExecutedAt: null,
      hoursSinceSuccess: null,
    },
    ...overrides,
  }
}

describe('launch readiness report', () => {
  it('does not mark an empty validation program as ready', () => {
    const report = buildLaunchReadinessReport(facts())

    assert.equal(report.status, 'blocked')
    assert.equal(report.verifiedChecks, 0)
    assert.equal(
      report.checks.find((check) => check.key === 'public_booking_test')?.status,
      'needs_action'
    )
    assert.equal(
      report.checks.find((check) => check.key === 'build_integrity')?.status,
      'needs_action'
    )
  })

  it('keeps non-developer proof in operator review even when system evidence exists', () => {
    const report = buildLaunchReadinessReport(
      facts({
        pilotCandidates: [
          {
            chefId: 'chef-1',
            chefName: 'Pilot Chef',
            createdAt: '2026-04-01T12:00:00.000Z',
            activeSpanDays: 28,
            publicBookingHref: '/book/pilot-chef',
            completedSystemSteps: 5,
            totalSystemSteps: 6,
            nextStepLabel: null,
            evidence: {
              inquiries: 1,
              publicBookingTests: 1,
              sentQuotes: 1,
              events: 1,
              prepSignals: 1,
              invoiceArtifacts: 1,
              feedbackSignals: 1,
              onboardingCompleted: true,
            },
          },
        ],
        operatorSurvey: {
          activeSurveys: 1,
          submittedResponses: 2,
          totalResponses: 2,
        },
        buildIntegrity: {
          typecheckGreen: true,
          buildGreen: true,
          lastVerified: '2026-04-29',
          commit: 'abc123',
        },
        backupIntegrity: {
          latestStatus: 'success',
          latestExecutedAt: '2026-04-29T09:00:00.000Z',
          hoursSinceSuccess: 3,
        },
      })
    )

    assert.equal(
      report.checks.find((check) => check.key === 'first_booking_loop')?.status,
      'verified'
    )
    assert.equal(
      report.checks.find((check) => check.key === 'event_money_loop')?.status,
      'verified'
    )
    assert.equal(
      report.checks.find((check) => check.key === 'feedback_captured')?.status,
      'verified'
    )
    assert.equal(
      report.checks.find((check) => check.key === 'public_booking_test')?.status,
      'operator_review'
    )
    assert.equal(
      report.checks.find((check) => check.key === 'real_chef_two_weeks')?.status,
      'operator_review'
    )
    assert.equal(report.status, 'blocked')
  })

  it('blocks launch when backup heartbeat is stale', () => {
    const report = buildLaunchReadinessReport(
      facts({
        buildIntegrity: {
          typecheckGreen: true,
          buildGreen: true,
          lastVerified: '2026-04-29',
          commit: 'abc123',
        },
        backupIntegrity: {
          latestStatus: 'success',
          latestExecutedAt: '2026-04-27T00:00:00.000Z',
          hoursSinceSuccess: 60,
        },
      })
    )

    assert.equal(
      report.checks.find((check) => check.key === 'backup_integrity')?.status,
      'needs_action'
    )
  })
})
