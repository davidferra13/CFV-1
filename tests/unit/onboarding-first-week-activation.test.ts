import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFirstWeekActivationProgress,
  type FirstWeekActivationFacts,
  type FirstWeekActivationStepKey,
} from '@/lib/onboarding/first-week-activation'

const baseFacts: FirstWeekActivationFacts = {
  profileBasicsReady: true,
  serviceSetupReady: true,
  inquiriesCount: 0,
  clientsCount: 0,
  sentQuotesCount: 0,
  eventsCount: 0,
  prepEvidenceCount: 0,
  invoiceArtifactCount: 0,
  recipesCount: 0,
  loyaltyConfigured: false,
  staffCount: 0,
}

function progress(overrides: Partial<FirstWeekActivationFacts> = {}) {
  return buildFirstWeekActivationProgress({ ...baseFacts, ...overrides })
}

function assertNext(
  overrides: Partial<FirstWeekActivationFacts>,
  expected: FirstWeekActivationStepKey | null
) {
  const result = progress(overrides)
  assert.equal(result.nextStep?.key ?? null, expected)
  assert.equal(result.steps.find((step) => !step.done)?.key ?? null, expected)
}

describe('first-week activation contract', () => {
  it('reports no progress when nothing can be proven complete', () => {
    const result = progress({ profileBasicsReady: false, serviceSetupReady: false })

    assert.equal(result.completedSteps, 0)
    assert.equal(result.totalSteps, 6)
    assert.equal(result.nextStep?.key, 'profile_ready')
  })

  it('selects quote as next when a lead exists without a sent quote', () => {
    assertNext({ inquiriesCount: 1 }, 'quote_sent')
  })

  it('selects event as next when a sent quote exists without an event', () => {
    assertNext({ inquiriesCount: 1, sentQuotesCount: 1 }, 'event_created')
  })

  it('selects prep as next when an event exists without prep evidence', () => {
    assertNext({ inquiriesCount: 1, sentQuotesCount: 1, eventsCount: 1 }, 'prep_started')
  })

  it('selects invoice as next when prep exists without a billing artifact', () => {
    assertNext(
      { inquiriesCount: 1, sentQuotesCount: 1, eventsCount: 1, prepEvidenceCount: 1 },
      'invoice_ready'
    )
  })

  it('marks fully complete when the booking loop reaches invoice', () => {
    const result = progress({
      inquiriesCount: 1,
      sentQuotesCount: 1,
      eventsCount: 1,
      prepEvidenceCount: 1,
      invoiceArtifactCount: 1,
    })

    assert.equal(result.completedSteps, 6)
    assert.equal(result.nextStep, null)
    assert.ok(result.steps.every((step) => step.done))
  })

  it('uses a manually created client only as lead fallback', () => {
    const result = progress({ clientsCount: 1 })

    assert.equal(result.steps.find((step) => step.key === 'lead_captured')?.done, true)
    assert.equal(result.nextStep?.key, 'quote_sent')
  })

  it('tracks secondary setup separately from primary activation', () => {
    const result = progress({ clientsCount: 2, recipesCount: 3, loyaltyConfigured: true })

    assert.equal(result.secondarySetup.clientsImported, true)
    assert.equal(result.secondarySetup.recipesAdded, true)
    assert.equal(result.secondarySetup.loyaltyConfigured, true)
    assert.equal(result.secondarySetup.staffAdded, false)
    assert.equal(result.nextStep?.key, 'quote_sent')
  })
})
