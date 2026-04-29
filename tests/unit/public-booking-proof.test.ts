import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_PUBLIC_BOOKING_PROOF_HREF,
  summarizePublicBookingProof,
  type PublicBookingProofFacts,
} from '@/lib/validation/public-booking-proof'

function facts(overrides: Partial<PublicBookingProofFacts> = {}): PublicBookingProofFacts {
  return {
    totalTests: 0,
    hasStatusPageEvidence: false,
    unresolvedFollowup: 0,
    ...overrides,
  }
}

describe('public booking proof summary', () => {
  it('marks proof missing when there is no submitted test or status evidence', () => {
    const summary = summarizePublicBookingProof(facts())

    assert.equal(summary.status, 'missing')
    assert.equal(
      summary.evidence,
      '0 public booking tests exist; non-developer tester not confirmed; status page evidence missing; matched chef count not provided; no unresolved follow-up'
    )
    assert.equal(summary.nextStep, 'Capture one public booking test from the public booking flow.')
    assert.equal(summary.href, DEFAULT_PUBLIC_BOOKING_PROOF_HREF)
  })

  it('keeps system evidence below verification until a non-developer tester is confirmed', () => {
    const summary = summarizePublicBookingProof(
      facts({
        totalTests: 2,
        latestSubmittedAt: '2026-04-29T15:30:00.000Z',
        hasStatusPageEvidence: true,
        matchedChefCount: 1,
        href: '/admin/public-booking-proof',
      })
    )

    assert.equal(summary.status, 'system_evidence')
    assert.equal(
      summary.evidence,
      '2 public booking tests exist; latest submitted at 2026-04-29T15:30:00.000Z; non-developer tester not confirmed; status page evidence captured; 1 matched chef; no unresolved follow-up'
    )
    assert.equal(
      summary.nextStep,
      'Confirm the tester was not a developer and attach the operator decision.'
    )
    assert.equal(summary.href, '/admin/public-booking-proof')
  })

  it('requires operator review when confirmed evidence still has follow-up work', () => {
    const summary = summarizePublicBookingProof(
      facts({
        totalTests: 1,
        nonDeveloperConfirmed: true,
        hasStatusPageEvidence: true,
        matchedChefCount: 1,
        unresolvedFollowup: 2,
      })
    )

    assert.equal(summary.status, 'operator_review')
    assert.equal(
      summary.evidence,
      '1 public booking test exists; non-developer tester manually confirmed; status page evidence captured; 1 matched chef; 2 unresolved follow-ups'
    )
    assert.equal(
      summary.nextStep,
      'Resolve 2 follow-up items before marking public booking proof verified.'
    )
  })

  it('requires operator review when matched chef evidence is supplied as zero', () => {
    const summary = summarizePublicBookingProof(
      facts({
        totalTests: 1,
        nonDeveloperConfirmedCount: 1,
        hasStatusPageEvidence: true,
        matchedChefCount: 0,
      })
    )

    assert.equal(summary.status, 'operator_review')
    assert.equal(
      summary.nextStep,
      'Match the public booking test to a chef before marking proof verified.'
    )
  })

  it('verifies when submitted, non-developer, status, and follow-up facts are clean', () => {
    const summary = summarizePublicBookingProof(
      facts({
        totalTests: 1,
        nonDeveloperConfirmedCount: 1,
        hasStatusPageEvidence: true,
        matchedChefCount: 1,
      })
    )

    assert.equal(summary.status, 'verified')
    assert.equal(
      summary.evidence,
      '1 public booking test exists; 1 non-developer confirmation exists; status page evidence captured; 1 matched chef; no unresolved follow-up'
    )
    assert.equal(summary.nextStep, 'Public booking proof is verified.')
  })

  it('does not require matched chef count when that count is unavailable', () => {
    const summary = summarizePublicBookingProof(
      facts({
        totalTests: 1,
        nonDeveloperConfirmed: true,
        hasStatusPageEvidence: true,
      })
    )

    assert.equal(summary.status, 'verified')
    assert.match(summary.evidence, /matched chef count not provided/)
  })
})
