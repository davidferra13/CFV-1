import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildLaunchReadinessDecisionPacket } from '@/lib/validation/launch-readiness-decision-packet'
import type { LaunchReadinessReport } from '@/lib/validation/launch-readiness'

function report(overrides: Partial<LaunchReadinessReport> = {}): LaunchReadinessReport {
  return {
    generatedAt: '2026-04-29T20:00:00.000Z',
    status: 'blocked',
    verifiedChecks: 1,
    totalChecks: 3,
    checks: [
      {
        key: 'build_integrity',
        label: 'Build integrity is green',
        status: 'verified',
        evidence: 'Type check and build green as of 2026-04-29T19:00:00.000Z',
        evidenceItems: [
          {
            label: 'Type check',
            value: 'Green',
            source: 'docs/build-state.md',
            href: '/admin/system',
          },
        ],
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
        key: 'backup_integrity',
        label: 'Database backup heartbeat is fresh',
        status: 'needs_action',
        evidence: 'No backup heartbeat found in cron executions',
        evidenceItems: [],
        nextStep: 'Run or repair the approved backup heartbeat path before launch.',
        href: '/admin/system',
      },
    ],
    pilotCandidates: [
      {
        chefId: 'chef-1',
        chefName: 'Pilot Chef',
        createdAt: '2026-04-01T12:00:00.000Z',
        activeSpanDays: 28,
        publicBookingHref: '/book/pilot-chef',
        completedSystemSteps: 5,
        totalSystemSteps: 6,
        nextStepLabel: 'Capture operator review',
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
    evidenceLog: [
      {
        label: 'Best pilot candidate',
        value: 'Pilot Chef: 5/6 system checks',
        source: 'chefs plus first-week activation evidence',
        href: '/admin/users',
      },
    ],
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

describe('launch readiness decision packet', () => {
  it('serializes a blocked report into an operator decision artifact', () => {
    const packet = buildLaunchReadinessDecisionPacket(report())

    assert.equal(packet.filename, 'chefflow-launch-readiness-2026-04-29.md')
    assert.equal(packet.summary.decision, 'not_ready')
    assert.equal(packet.summary.operatorReviewCount, 1)
    assert.equal(packet.summary.needsActionCount, 1)
    assert.match(packet.markdown, /# ChefFlow Launch Readiness Decision Packet/)
    assert.match(packet.markdown, /Decision: Not ready/)
    assert.match(packet.markdown, /Operator review does not count as verified/)
    assert.match(packet.markdown, /### Public booking tested by a non-developer/)
    assert.match(packet.markdown, /Pilot Chef: 5\/6 system checks/)
  })

  it('marks a fully verified report as ready for launch', () => {
    const base = report()
    const packet = buildLaunchReadinessDecisionPacket({
      ...base,
      status: 'ready',
      verifiedChecks: 3,
      checks: base.checks.map((check) => ({ ...check, status: 'verified' })),
      nextActions: [],
    })

    assert.equal(packet.summary.decision, 'ready_for_launch')
    assert.equal(packet.summary.operatorReviewCount, 0)
    assert.equal(packet.summary.needsActionCount, 0)
    assert.match(packet.markdown, /Decision: Ready for launch/)
    assert.match(packet.markdown, /No open launch evidence actions/)
  })
})
