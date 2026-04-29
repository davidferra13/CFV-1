import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildPilotFeedbackEvidenceProof,
  type PilotFeedbackEvidenceInput,
} from '@/lib/pilot/feedback-evidence'

function readyInput(overrides: PilotFeedbackEvidenceInput = {}): PilotFeedbackEvidenceInput {
  return {
    usage: {
      activeSpanDays: 18,
      inquiries: 1,
      publicBookingTests: 1,
      sentQuotes: 1,
      events: 1,
      prepSignals: 1,
      invoiceArtifacts: 1,
      ...overrides.usage,
    },
    feedback: {
      completedSurveys: 1,
      loggedChefFeedback: 0,
      operatorInterviews: 0,
      clientTestimonials: 0,
      otherFeedback: 0,
      ...overrides.feedback,
    },
    payIntent: {
      willingToPay: 1,
      paidPilots: 0,
      declinedToPay: 0,
      pricingObjections: 0,
      ...overrides.payIntent,
    },
  }
}

describe('pilot feedback evidence proof', () => {
  it('blocks an empty proof packet with deterministic missing evidence', () => {
    const result = buildPilotFeedbackEvidenceProof({})

    assert.equal(result.status, 'usage_incomplete')
    assert.deepEqual(
      result.missingEvidence.map((item) => item.key),
      [
        'real_chef_two_weeks',
        'workflow_activity',
        'booking_loop',
        'event_money_loop',
        'feedback',
        'pay_intent',
      ]
    )
    assert.deepEqual(result.feedbackSourceCounts, {
      completedSurveys: 0,
      loggedChefFeedback: 0,
      operatorInterviews: 0,
      clientTestimonials: 0,
      otherFeedback: 0,
      total: 0,
    })
    assert.equal(result.payIntentSignal, 'none')
    assert.equal(result.nextAction, 'Run one real chef through 14 calendar days of ChefFlow usage.')
  })

  it('counts feedback sources without inventing missing sources', () => {
    const result = buildPilotFeedbackEvidenceProof(
      readyInput({
        feedback: {
          completedSurveys: 2,
          loggedChefFeedback: 1,
          operatorInterviews: 1,
          clientTestimonials: 1,
          otherFeedback: 1,
        },
      })
    )

    assert.equal(result.status, 'pilot_proof_ready')
    assert.deepEqual(result.feedbackSourceCounts, {
      completedSurveys: 2,
      loggedChefFeedback: 1,
      operatorInterviews: 1,
      clientTestimonials: 1,
      otherFeedback: 1,
      total: 6,
    })
    assert.deepEqual(result.missingEvidence, [])
  })

  it('requires feedback after usage is complete', () => {
    const result = buildPilotFeedbackEvidenceProof(
      readyInput({
        feedback: {
          completedSurveys: 0,
          loggedChefFeedback: 0,
          operatorInterviews: 0,
          clientTestimonials: 0,
          otherFeedback: 0,
        },
      })
    )

    assert.equal(result.status, 'feedback_missing')
    assert.deepEqual(
      result.missingEvidence.map((item) => item.key),
      ['feedback']
    )
    assert.equal(
      result.nextAction,
      'Collect a completed survey, logged feedback item, interview note, or testimonial.'
    )
  })

  it('separates missing pay intent from positive usage and feedback evidence', () => {
    const result = buildPilotFeedbackEvidenceProof(
      readyInput({
        payIntent: {
          willingToPay: 0,
          paidPilots: 0,
          declinedToPay: 0,
          pricingObjections: 0,
        },
      })
    )

    assert.equal(result.status, 'pay_intent_missing')
    assert.equal(result.payIntentSignal, 'none')
    assert.deepEqual(
      result.missingEvidence.map((item) => item.key),
      ['pay_intent']
    )
    assert.equal(result.nextAction, 'Record whether the pilot would pay or has paid for ChefFlow.')
  })

  it('does not treat a pricing objection as validated pay intent', () => {
    const result = buildPilotFeedbackEvidenceProof(
      readyInput({
        payIntent: {
          willingToPay: 0,
          paidPilots: 0,
          declinedToPay: 0,
          pricingObjections: 1,
        },
      })
    )

    assert.equal(result.status, 'pay_intent_not_validated')
    assert.equal(result.payIntentSignal, 'pricing_objection')
    assert.deepEqual(result.missingEvidence, [])
    assert.equal(
      result.nextAction,
      'Follow up on the pricing objection before treating the pilot as validated.'
    )
  })

  it('prioritizes paid pilot evidence over other pay-intent signals', () => {
    const result = buildPilotFeedbackEvidenceProof(
      readyInput({
        payIntent: {
          willingToPay: 0,
          paidPilots: 1,
          declinedToPay: 3,
          pricingObjections: 2,
        },
      })
    )

    assert.equal(result.status, 'pilot_proof_ready')
    assert.equal(result.payIntentSignal, 'paid')
    assert.deepEqual(result.missingEvidence, [])
  })
})
