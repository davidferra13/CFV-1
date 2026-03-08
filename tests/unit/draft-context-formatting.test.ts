import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDraftClientProfileBlock,
  buildDraftContextSections,
  buildDraftRelationshipBlock,
  formatDraftCurrency,
} from '../../lib/ai/draft-context-formatting'

describe('draft context formatting', () => {
  it('formats client profile details with loyalty and dietary context', () => {
    const text = buildDraftClientProfileBlock({
      fullName: 'Sarah Henderson',
      firstName: 'Sarah',
      loyaltyTier: 'gold',
      loyaltyPoints: 640,
      vibeNotes: 'Classic French. Appreciates polished service.',
      dietaryRestrictions: ['pescatarian'],
      allergies: ['shellfish'],
    })

    assert.match(text, /Sarah Henderson/)
    assert.match(text, /gold/i)
    assert.match(text, /640 points/)
    assert.match(text, /pescatarian/)
    assert.match(text, /shellfish/)
  })

  it('formats relationship history with recent event summaries', () => {
    const text = buildDraftRelationshipBlock({
      totalEvents: 3,
      recentEvents: [
        {
          occasion: 'Anniversary Dinner',
          eventDate: '2026-02-14',
          guestCount: 8,
          status: 'completed',
        },
      ],
    })

    assert.match(text, /Total non-cancelled events together: 3/)
    assert.match(text, /Anniversary Dinner/)
    assert.match(text, /8 guests/)
    assert.match(text, /completed/)
  })

  it('builds a combined context block with event financial details', () => {
    const text = buildDraftContextSections({
      client: {
        fullName: 'James Chen',
        firstName: 'James',
      },
      targetEvent: {
        occasion: 'Holiday Dinner',
        eventDate: '2026-12-10',
        paymentStatus: 'deposit_paid',
        outstandingBalanceCents: 240000,
      },
      targetEventTitle: 'PAYMENT CONTEXT',
      totalEvents: 1,
      recentEvents: [],
    })

    assert.match(text, /PAYMENT CONTEXT/)
    assert.match(text, /Holiday Dinner/)
    assert.match(text, /deposit_paid/)
    assert.match(text, /\$2,400/)
    assert.match(text, /James Chen/)
  })

  it('formats USD currency from cents', () => {
    assert.equal(formatDraftCurrency(125000), '$1,250')
  })
})
