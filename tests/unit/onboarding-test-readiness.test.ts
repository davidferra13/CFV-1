import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildOnboardingTestReadiness } from '@/lib/validation/onboarding-test-readiness'

describe('onboarding test readiness', () => {
  it('requires a pilot candidate before testing can start', () => {
    const result = buildOnboardingTestReadiness({
      pilotCandidateCount: 0,
      setupReadyCount: 0,
    })

    assert.equal(result.status, 'missing')
    assert.match(result.evidence, /No pilot candidate/)
  })

  it('marks setup-ready candidates as ready to test', () => {
    const result = buildOnboardingTestReadiness({
      pilotCandidateCount: 2,
      setupReadyCount: 1,
    })

    assert.equal(result.status, 'ready_to_test')
    assert.match(result.nextStep, /nontechnical tester/)
  })

  it('keeps watched runs in operator review until confirmed clean', () => {
    const result = buildOnboardingTestReadiness({
      pilotCandidateCount: 1,
      setupReadyCount: 1,
      watchedRuns: 1,
      unresolvedBlockers: 2,
    })

    assert.equal(result.status, 'operator_review')
    assert.match(result.evidence, /2 unresolved blockers/)
  })

  it('verifies completed watched runs with no unresolved blockers', () => {
    const result = buildOnboardingTestReadiness({
      pilotCandidateCount: 1,
      setupReadyCount: 1,
      watchedRuns: 1,
      completedRuns: 1,
      unresolvedBlockers: 0,
    })

    assert.equal(result.status, 'verified')
  })
})
