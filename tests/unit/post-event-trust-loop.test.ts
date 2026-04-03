import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  booleanToLegacyWouldBookAgain,
  getReviewRequestGate,
  normalizePublicReviewText,
  shouldPromoteSurveyToPublicReview,
} from '@/lib/post-event/trust-loop-helpers'

describe('post-event trust loop helpers', () => {
  it('normalizes the first usable public review text candidate', () => {
    assert.strictEqual(
      normalizePublicReviewText('   ', undefined, 'Loved the evening  '),
      'Loved the evening'
    )
    assert.strictEqual(normalizePublicReviewText('', null, '   '), null)
  })

  it('only promotes positive consented survey feedback into the public review feed', () => {
    assert.strictEqual(
      shouldPromoteSurveyToPublicReview({
        overall: 5,
        consent: true,
        publicReviewText: 'Wonderful dinner.',
      }),
      true
    )

    assert.strictEqual(
      shouldPromoteSurveyToPublicReview({
        overall: 3,
        consent: true,
        publicReviewText: 'Fine night.',
      }),
      false
    )

    assert.strictEqual(
      shouldPromoteSurveyToPublicReview({
        overall: 5,
        consent: false,
        publicReviewText: 'Wonderful dinner.',
      }),
      false
    )

    assert.strictEqual(
      shouldPromoteSurveyToPublicReview({
        overall: 5,
        consent: true,
        publicReviewText: '   ',
        fallbackText: 'Would book again in a heartbeat.',
      }),
      true
    )
  })

  it('blocks duplicate or invalid review-request sends', () => {
    assert.deepStrictEqual(
      getReviewRequestGate({
        completedAt: null,
        reviewRequestEligible: true,
        reviewRequestSentAt: null,
      }),
      { ok: false, reason: 'incomplete' }
    )

    assert.deepStrictEqual(
      getReviewRequestGate({
        completedAt: '2026-04-02T20:00:00.000Z',
        reviewRequestEligible: false,
        reviewRequestSentAt: null,
      }),
      { ok: false, reason: 'not_eligible' }
    )

    assert.deepStrictEqual(
      getReviewRequestGate({
        completedAt: '2026-04-02T20:00:00.000Z',
        reviewRequestEligible: true,
        reviewRequestSentAt: '2026-04-03T12:00:00.000Z',
      }),
      { ok: false, reason: 'already_sent' }
    )

    assert.deepStrictEqual(
      getReviewRequestGate({
        completedAt: '2026-04-02T20:00:00.000Z',
        reviewRequestEligible: true,
        reviewRequestSentAt: null,
      }),
      { ok: true, reason: null }
    )
  })

  it('maps boolean rebook intent into the legacy dashboard shape', () => {
    assert.strictEqual(booleanToLegacyWouldBookAgain(true), 'yes')
    assert.strictEqual(booleanToLegacyWouldBookAgain(false), 'no')
    assert.strictEqual(booleanToLegacyWouldBookAgain(null), null)
  })
})
