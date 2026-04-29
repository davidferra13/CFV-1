import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildLaunchReadinessRiskRegister } from '@/lib/validation/launch-readiness-risk-register'
import type { LaunchReadinessCheck, LaunchReadinessReport } from '@/lib/validation/launch-readiness'

function check(overrides: Partial<LaunchReadinessCheck>): LaunchReadinessCheck {
  return {
    key: 'build_integrity',
    label: 'Build integrity is green',
    status: 'verified',
    evidence: 'Type check and build green.',
    evidenceItems: [],
    nextStep: 'Re-run release validation before shipping.',
    href: '/admin/system',
    ...overrides,
  }
}

function nextAction(
  overrides: Partial<LaunchReadinessReport['nextActions'][number]>
): LaunchReadinessReport['nextActions'][number] {
  return {
    label: 'Build integrity is green',
    reason: 'Run the approved verification flow.',
    href: '/admin/system',
    ...overrides,
  }
}

describe('launch readiness risk register', () => {
  it('returns prioritized launch-blocking risks for non-verified checks only', () => {
    const risks = buildLaunchReadinessRiskRegister({
      checks: [
        check({
          key: 'feedback_captured',
          label: 'Real feedback captured',
          status: 'needs_action',
          evidence: 'No completed survey or logged chef feedback exists yet',
          nextStep: 'Send a post-event survey.',
          href: '/admin/feedback',
        }),
        check({
          key: 'build_integrity',
          label: 'Build integrity is green',
          status: 'verified',
        }),
        check({
          key: 'backup_integrity',
          label: 'Database backup heartbeat is fresh',
          status: 'needs_action',
          evidence: 'No backup heartbeat found in cron executions',
          evidenceItems: [
            {
              label: 'Latest status',
              value: 'missing',
              source: 'cron_executions',
              href: '/admin/system',
            },
          ],
          nextStep: 'Run or repair the approved backup heartbeat path before launch.',
          href: '/admin/system',
        }),
        check({
          key: 'public_booking_test',
          label: 'Public booking tested by a non-developer',
          status: 'operator_review',
          evidence: '1 public booking inquiry exists',
          nextStep: 'Confirm the tester was not a developer.',
          href: '/book/pilot-chef',
        }),
      ],
    })

    assert.deepEqual(
      risks.map((risk) => risk.checkKey),
      ['backup_integrity', 'public_booking_test', 'feedback_captured']
    )
    assert.equal(risks[0].severity, 'critical')
    assert.equal(risks[0].ownerHint, 'engineering')
    assert.equal(risks[0].blockerClass, 'backup')
    assert.equal(risks[0].evidenceSource, 'cron_executions')
    assert.equal(risks[0].launchBlocking, true)
  })

  it('uses report next actions before falling back to the check next step', () => {
    const risks = buildLaunchReadinessRiskRegister({
      checks: [
        check({
          key: 'operator_survey_signal',
          label: 'Wave-1 survey signal supports launch',
          status: 'operator_review',
          evidence: 'Survey signal score is 57%.',
          evidenceItems: [
            {
              label: 'Readiness status',
              value: 'needs more signal',
              source: 'deterministic Wave-1 survey analysis',
              href: '/admin/beta-surveys',
            },
            {
              label: 'Top signal',
              value: 'Automation value',
              source: 'submitted survey text fields',
              href: '/admin/beta-surveys',
            },
            {
              label: 'Repeated source',
              value: 'Automation value',
              source: 'submitted survey text fields',
              href: '/admin/beta-surveys',
            },
          ],
          nextStep: 'Collect enough qualified operator responses.',
          href: '/admin/beta-surveys',
        }),
      ],
      nextActions: [
        nextAction({
          label: 'Wave-1 survey signal supports launch',
          reason: 'Interview two qualified operators before launch messaging changes.',
          href: '/admin/beta-surveys',
        }),
      ],
    })

    assert.equal(risks.length, 1)
    assert.equal(
      risks[0].nextAction,
      'Interview two qualified operators before launch messaging changes.'
    )
    assert.equal(
      risks[0].evidenceSource,
      'deterministic Wave-1 survey analysis; submitted survey text fields'
    )
    assert.equal(risks[0].severity, 'high')
    assert.equal(risks[0].ownerHint, 'product')
    assert.equal(risks[0].blockerClass, 'survey')
  })

  it('is deterministic and does not mutate inputs', () => {
    const checks = [
      check({
        key: 'acquisition_attribution',
        label: 'Acquisition source is attributable',
        status: 'operator_review',
        evidence: 'Submissions have a single attributed source.',
        nextStep: 'Review whether the source is enough for launch.',
        href: '/admin/activity',
      }),
      check({
        key: 'onboarding_test',
        label: 'Onboarding tested with a non-technical user',
        status: 'operator_review',
        evidence: 'Ready for watched onboarding.',
        nextStep: 'Run a watched onboarding test.',
        href: '/admin/users',
      }),
    ]
    const before = JSON.stringify(checks)

    const first = buildLaunchReadinessRiskRegister({ checks })
    const second = buildLaunchReadinessRiskRegister({ checks })

    assert.equal(JSON.stringify(checks), before)
    assert.deepEqual(first, second)
    assert.deepEqual(
      first.map((risk) => risk.checkKey),
      ['onboarding_test', 'acquisition_attribution']
    )
  })
})
