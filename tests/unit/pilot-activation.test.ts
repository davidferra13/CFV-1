import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFirstWeekActivationProgress,
  type FirstWeekActivationFacts,
} from '@/lib/onboarding/first-week-activation'
import { buildPilotActivationStatus } from '@/lib/pilot/activation'

const baseFirstWeekFacts: FirstWeekActivationFacts = {
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

function firstWeek(overrides: Partial<FirstWeekActivationFacts> = {}) {
  return buildFirstWeekActivationProgress({ ...baseFirstWeekFacts, ...overrides })
}

describe('pilot activation status', () => {
  it('keeps launch proof incomplete when only profile setup exists', () => {
    const result = buildPilotActivationStatus({
      chefName: 'Pilot Chef',
      facts: {
        firstWeek: firstWeek(),
        bookingEnabled: false,
        bookingSlug: null,
        surveysSentCount: 0,
        surveysCompletedCount: 0,
        feedbackLoggedCount: 0,
      },
    })

    assert.equal(result.completedSteps, 0)
    assert.equal(result.totalSteps, 6)
    assert.equal(result.publicBookingHref, null)
    assert.equal(result.nextStep?.key, 'first_booking_loop')
  })

  it('uses the public booking slug when booking is enabled', () => {
    const result = buildPilotActivationStatus({
      chefName: 'Pilot Chef',
      facts: {
        firstWeek: firstWeek({ inquiriesCount: 1 }),
        bookingEnabled: true,
        bookingSlug: 'pilot-chef',
        surveysSentCount: 0,
        surveysCompletedCount: 0,
        feedbackLoggedCount: 0,
      },
    })

    assert.equal(result.publicBookingHref, '/book/pilot-chef')
    assert.equal(result.steps.find((step) => step.key === 'public_booking_ready')?.status, 'done')
    assert.equal(result.steps.find((step) => step.key === 'booking_test_captured')?.status, 'done')
  })

  it('marks system-verifiable proof complete while keeping pay intent manual', () => {
    const result = buildPilotActivationStatus({
      chefName: 'Pilot Chef',
      facts: {
        firstWeek: firstWeek({
          inquiriesCount: 1,
          sentQuotesCount: 1,
          eventsCount: 1,
          prepEvidenceCount: 1,
          invoiceArtifactCount: 1,
        }),
        bookingEnabled: true,
        bookingSlug: 'pilot-chef',
        surveysSentCount: 1,
        surveysCompletedCount: 1,
        feedbackLoggedCount: 0,
      },
    })

    assert.equal(result.completedSteps, 5)
    assert.equal(result.nextStep, null)
    assert.equal(result.steps.find((step) => step.key === 'pay_intent_recorded')?.status, 'manual')
  })
})
