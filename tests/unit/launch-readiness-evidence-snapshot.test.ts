import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLaunchReadinessEvidenceReviewPayload,
  fingerprintLaunchReadinessEvidence,
} from '@/lib/validation/launch-readiness-evidence-snapshot'
import type { LaunchReadinessCheck } from '@/lib/validation/launch-readiness'

function check(overrides: Partial<LaunchReadinessCheck> = {}): LaunchReadinessCheck {
  return {
    key: 'public_booking_test',
    label: 'Public booking tested by a non-developer',
    status: 'operator_review',
    evidence: '1 public booking inquiry exists',
    evidenceItems: [
      {
        label: 'Tester',
        value: 'Non-developer tester confirmed',
        source: 'public booking proof',
        href: '/admin/launch-readiness',
      },
    ],
    nextStep: 'Confirm the tester was not a developer.',
    href: '/book/pilot-chef',
    ...overrides,
  }
}

describe('launch readiness evidence snapshot', () => {
  it('captures stable review evidence and fingerprints it deterministically', () => {
    const first = buildLaunchReadinessEvidenceReviewPayload(check())
    const second = buildLaunchReadinessEvidenceReviewPayload(check())

    assert.deepEqual(first, second)
    assert.match(first.fingerprint, /^[a-f0-9]{64}$/)
    assert.equal(first.snapshot.label, 'Public booking tested by a non-developer')
    assert.equal(first.snapshot.evidenceItems[0]?.source, 'public booking proof')
  })

  it('changes fingerprint when current evidence changes', () => {
    const first = buildLaunchReadinessEvidenceReviewPayload(check())
    const changed = buildLaunchReadinessEvidenceReviewPayload(
      check({ evidence: '2 public booking inquiries exist' })
    )

    assert.notEqual(first.fingerprint, changed.fingerprint)
    assert.equal(first.fingerprint, fingerprintLaunchReadinessEvidence(first.snapshot))
  })
})
