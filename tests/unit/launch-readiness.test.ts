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
    productFeedbackSignals: 0,
    acquisition: {
      publicBookingSubmissions: 0,
      utmAttributedSubmissions: 0,
      referralAttributedSubmissions: 0,
      uniqueSources: 0,
      latestSubmissionAt: null,
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

  it('uses product feedback as real launch feedback evidence', () => {
    const report = buildLaunchReadinessReport(
      facts({
        productFeedbackSignals: 2,
      })
    )

    const feedbackCheck = report.checks.find((check) => check.key === 'feedback_captured')

    assert.equal(feedbackCheck?.status, 'verified')
    assert.equal(feedbackCheck?.evidence, '2 feedback signals exist')
    assert.deepEqual(
      feedbackCheck?.evidenceItems.map((item) => item.source),
      ['post_event_surveys and chef_feedback', 'user_feedback']
    )
  })

  it('does not count stale build-state evidence as verified', () => {
    const report = buildLaunchReadinessReport(
      facts({
        generatedAt: '2026-04-29T12:00:00.000Z',
        buildIntegrity: {
          typecheckGreen: true,
          buildGreen: true,
          lastVerified: '2026-04-01T12:00:00.000Z',
          commit: 'abc123',
        },
      })
    )

    const buildCheck = report.checks.find((check) => check.key === 'build_integrity')

    assert.equal(buildCheck?.status, 'needs_action')
    assert.equal(
      buildCheck?.evidence,
      'Build-state file is green but stale or missing a parseable verification time'
    )
    assert.equal(
      buildCheck?.evidenceItems.find((item) => item.label === 'Freshness')?.value,
      '672 hours since verification'
    )
  })

  it('ranks pilot candidates by system proof before rendering the candidate list', () => {
    const report = buildLaunchReadinessReport(
      facts({
        pilotCandidates: [
          {
            chefId: 'chef-low',
            chefName: 'Low Evidence',
            createdAt: '2026-04-01T12:00:00.000Z',
            activeSpanDays: 28,
            publicBookingHref: null,
            completedSystemSteps: 1,
            totalSystemSteps: 6,
            nextStepLabel: 'Enable booking',
            evidence: {
              inquiries: 0,
              publicBookingTests: 0,
              sentQuotes: 0,
              events: 0,
              prepSignals: 0,
              invoiceArtifacts: 0,
              feedbackSignals: 0,
              onboardingCompleted: false,
            },
          },
          {
            chefId: 'chef-high',
            chefName: 'High Evidence',
            createdAt: '2026-04-20T12:00:00.000Z',
            activeSpanDays: 9,
            publicBookingHref: '/book/high-evidence',
            completedSystemSteps: 4,
            totalSystemSteps: 6,
            nextStepLabel: 'Capture feedback',
            evidence: {
              inquiries: 1,
              publicBookingTests: 1,
              sentQuotes: 1,
              events: 1,
              prepSignals: 1,
              invoiceArtifacts: 1,
              feedbackSignals: 0,
              onboardingCompleted: true,
            },
          },
        ],
      })
    )

    assert.equal(report.pilotCandidates[0].chefId, 'chef-high')
  })

  it('surfaces acquisition attribution as a launch gate', () => {
    const report = buildLaunchReadinessReport(
      facts({
        acquisition: {
          publicBookingSubmissions: 4,
          utmAttributedSubmissions: 2,
          referralAttributedSubmissions: 1,
          uniqueSources: 2,
          latestSubmissionAt: '2026-04-29T10:00:00.000Z',
        },
      })
    )

    const acquisitionCheck = report.checks.find((check) => check.key === 'acquisition_attribution')

    assert.equal(acquisitionCheck?.status, 'verified')
    assert.equal(acquisitionCheck?.evidence, '3 attributed submissions across 2 sources')
    assert.ok(
      report.nextActions.every((action) => action.label !== 'Acquisition source is attributable')
    )
  })
})
