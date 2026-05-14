import test from 'node:test'
import assert from 'node:assert/strict'

import { createPreferenceSignalEntry } from '@/lib/discovery/preference-contract'
import {
  applyPreferenceReviewDecision,
  filterReviewInboxSuggestions,
} from '@/lib/discovery/preference-review-inbox'

test('review inbox sorts pending inferred suggestions by confidence and recency', () => {
  const lowConfidence = createPreferenceSignalEntry({
    id: 'low',
    ownerId: 'client-1',
    domain: 'search',
    source: 'search',
    rawValue: 'brunch',
    kind: 'tag',
    polarity: 'like',
    confidence: 0.35,
    observedAt: '2026-05-12T12:00:00.000Z',
  })
  const highConfidence = createPreferenceSignalEntry({
    id: 'high',
    ownerId: 'client-1',
    domain: 'discovery',
    source: 'repeated_behavior',
    rawValue: 'Thai',
    kind: 'cuisine',
    polarity: 'like',
    confidence: 0.74,
    observedAt: '2026-05-12T11:00:00.000Z',
  })
  const explicit = createPreferenceSignalEntry({
    id: 'explicit',
    ownerId: 'client-1',
    domain: 'profile',
    source: 'user_entered',
    rawValue: 'Italian',
    kind: 'cuisine',
    polarity: 'like',
    observedAt: '2026-05-12T10:00:00.000Z',
  })

  assert.deepEqual(
    filterReviewInboxSuggestions([lowConfidence, highConfidence, explicit], {
      now: '2026-05-12T13:00:00.000Z',
    }).map((signal) => signal.id),
    ['high', 'low']
  )
})

test('review decisions accept, reject, ignore, and suppress inferred suggestions deterministically', () => {
  const suggestion = createPreferenceSignalEntry({
    id: 'suggestion-thai',
    ownerId: 'client-1',
    domain: 'discovery',
    source: 'repeated_behavior',
    rawValue: 'Thai',
    kind: 'cuisine',
    polarity: 'like',
    confidence: 0.72,
    observedAt: '2026-05-12T12:00:00.000Z',
  })

  const accepted = applyPreferenceReviewDecision(suggestion, 'accept', {
    actorId: 'client-1',
    decidedAt: '2026-05-12T13:00:00.000Z',
  })
  const rejected = applyPreferenceReviewDecision(suggestion, 'reject', {
    decidedAt: '2026-05-12T13:00:00.000Z',
  })
  const ignored = applyPreferenceReviewDecision(suggestion, 'ignore', {
    decidedAt: '2026-05-12T13:00:00.000Z',
    ignoreDays: 7,
  })
  const neverAskAgain = applyPreferenceReviewDecision(suggestion, 'never_ask_again', {
    decidedAt: '2026-05-12T13:00:00.000Z',
  })

  assert.equal(accepted.suggestion.reviewState, 'superseded')
  assert.equal(accepted.promotedSignal?.source, 'user_entered')
  assert.equal(accepted.promotedSignal?.explicit, true)
  assert.deepEqual(accepted.promotedSignal?.supersedesSignalIds, ['suggestion-thai'])
  assert.equal(rejected.suggestion.reviewState, 'rejected')
  assert.equal(ignored.suggestion.reviewState, 'pending_review')
  assert.equal(ignored.decision.suppressUntil, '2026-05-19T13:00:00.000Z')
  assert.equal(neverAskAgain.decision.neverAskAgain, true)

  assert.deepEqual(
    filterReviewInboxSuggestions([ignored.suggestion], {
      now: '2026-05-13T13:00:00.000Z',
    }),
    []
  )
  assert.deepEqual(
    filterReviewInboxSuggestions([ignored.suggestion], {
      now: '2026-05-20T13:00:00.000Z',
    }).map((signal) => signal.id),
    ['suggestion-thai']
  )
})
