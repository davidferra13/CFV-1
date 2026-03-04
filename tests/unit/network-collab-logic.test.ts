import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveHandoffStatusFromRecipientStatuses,
  hasCollabHandoffExpired,
  isCollabHandoffActionable,
  scoreCollabRecipientSuggestion,
} from '../../lib/network/collab-logic.js'

describe('deriveHandoffStatusFromRecipientStatuses', () => {
  it('returns open when recipients are pending only', () => {
    const status = deriveHandoffStatusFromRecipientStatuses(['sent', 'viewed'])
    assert.equal(status, 'open')
  })

  it('returns partially_accepted when accepted + pending are mixed', () => {
    const status = deriveHandoffStatusFromRecipientStatuses(['accepted', 'sent'])
    assert.equal(status, 'partially_accepted')
  })

  it('returns closed when no pending recipients remain', () => {
    const status = deriveHandoffStatusFromRecipientStatuses(['accepted', 'rejected', 'converted'])
    assert.equal(status, 'closed')
  })
})

describe('scoreCollabRecipientSuggestion', () => {
  it('scores trusted + available + matching signals above baseline', () => {
    const result = scoreCollabRecipientSuggestion({
      trustLevel: 'inner_circle',
      signal: {
        date_start: '2026-04-10',
        date_end: '2026-04-20',
        region_text: 'Brooklyn, NY',
        cuisines: ['italian', 'mediterranean'],
        max_guest_count: 30,
        status: 'available',
      },
      eventDate: '2026-04-15',
      guestCount: 12,
      locationText: 'Brooklyn',
      cuisines: ['Italian'],
    })

    assert.ok(result.score >= 90)
    assert.equal(result.hasActiveSignal, true)
    assert.ok(result.reasons.some((reason) => reason.includes('Inner circle')))
    assert.ok(result.reasons.some((reason) => reason.includes('Marked available')))
  })

  it('penalizes unavailable and under-capacity signals', () => {
    const result = scoreCollabRecipientSuggestion({
      trustLevel: null,
      signal: {
        date_start: '2026-04-10',
        date_end: '2026-04-12',
        region_text: 'Queens',
        cuisines: ['bbq'],
        max_guest_count: 8,
        status: 'unavailable',
      },
      eventDate: '2026-04-15',
      guestCount: 20,
      locationText: 'Manhattan',
      cuisines: ['vegan'],
    })

    assert.ok(result.score < 0)
    assert.ok(result.reasons.some((reason) => reason.includes('unavailable')))
  })
})

describe('collab handoff timing/status helpers', () => {
  it('treats open and partially_accepted as actionable', () => {
    assert.equal(isCollabHandoffActionable('open'), true)
    assert.equal(isCollabHandoffActionable('partially_accepted'), true)
    assert.equal(isCollabHandoffActionable('closed'), false)
    assert.equal(isCollabHandoffActionable('cancelled'), false)
    assert.equal(isCollabHandoffActionable('expired'), false)
  })

  it('flags handoff as expired when expiry timestamp is in the past', () => {
    const now = new Date('2026-03-03T18:00:00.000Z')
    assert.equal(hasCollabHandoffExpired('2026-03-03T17:59:59.000Z', now), true)
    assert.equal(hasCollabHandoffExpired('2026-03-03T18:00:00.000Z', now), true)
    assert.equal(hasCollabHandoffExpired('2026-03-03T18:00:01.000Z', now), false)
    assert.equal(hasCollabHandoffExpired(null, now), false)
    assert.equal(hasCollabHandoffExpired('not-a-date', now), false)
  })
})
