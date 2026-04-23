import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCanonicalBookingActions,
  buildCanonicalInquiryActions,
  buildCanonicalQuoteActions,
} from '@/lib/action-graph/bookings'

describe('canonical booking actions', () => {
  it('reuses a pending guest-count request across client and chef projections', () => {
    const [action] = buildCanonicalBookingActions({
      id: 'event-guest-change',
      status: 'confirmed',
      occasion: 'Birthday Dinner',
      event_date: '2026-05-12',
      pendingGuestCountChange: {
        id: 'change-1',
        previousCount: 8,
        newCount: 10,
        requestedAt: '2026-05-01T12:00:00.000Z',
      },
    })

    assert.equal(action?.kind, 'guest_count_review')
    assert.equal(action?.ownerSurface, 'chef')
    assert.equal(action?.client?.href, '/my-events/event-guest-change#booking-change-center')
    assert.equal(action?.chef?.href, '/events/event-guest-change?tab=money')
  })

  it('keeps chef contract handoff ahead of client signing and payment', () => {
    const [action] = buildCanonicalBookingActions({
      id: 'event-contract',
      status: 'accepted',
      occasion: 'Private Tasting',
      event_date: '2026-05-20',
      hasContract: true,
      contractStatus: 'draft',
      contractSignedAt: null,
    })

    assert.equal(action?.kind, 'contract_send')
    assert.equal(action?.ownerSurface, 'chef')
    assert.equal(action?.client, null)
    assert.equal(action?.chef?.href, '/events/event-contract')
  })

  it('normalizes sent menu approvals into the live client review action', () => {
    const [action] = buildCanonicalBookingActions({
      id: 'event-menu',
      status: 'confirmed',
      occasion: 'Anniversary Dinner',
      event_date: '2026-05-30',
      menu_approval_status: 'sent',
    })

    assert.equal(action?.kind, 'menu_review')
    assert.equal(action?.ownerSurface, 'client')
    assert.equal(action?.client?.href, '/my-events/event-menu/approve-menu')
    assert.equal(action?.client?.ctaLabel, 'Review Menu')
  })

  it('creates a chef reply action for open inquiry lanes', () => {
    const [action] = buildCanonicalInquiryActions({
      id: 'inquiry-1',
      client_id: 'client-1',
      status: 'awaiting_chef',
      confirmed_occasion: 'Anniversary Dinner',
      confirmed_date: '2026-05-18',
      follow_up_due_at: '2026-05-02T12:00:00.000Z',
      next_action_required: 'Confirm the final guest count and arrival window.',
    })

    assert.equal(action?.kind, 'inquiry_reply')
    assert.equal(action?.ownerSurface, 'chef')
    assert.equal(action?.chef?.href, '/inquiries/inquiry-1')
    assert.equal(action?.intervention?.mode, 'approval_required')
  })

  it('creates a safe prepared-draft revision action for rejected quotes', () => {
    const [action] = buildCanonicalQuoteActions({
      id: 'quote-1',
      client_id: 'client-1',
      inquiry_id: '11111111-1111-4111-8111-111111111111',
      event_id: '22222222-2222-4222-8222-222222222222',
      status: 'rejected',
      quote_name: 'Birthday Dinner Quote',
      valid_until: '2099-05-10',
      rejected_reason: 'Please trim the total and reduce the deposit.',
      pricing_model: 'flat_rate',
      guest_count_estimated: 10,
      total_quoted_cents: 180000,
      price_per_person_cents: null,
      deposit_required: true,
      deposit_amount_cents: 54000,
      deposit_percentage: 30,
      pricing_notes: 'Seasonal tasting menu.',
      internal_notes: 'Original draft notes.',
      inquiry: {
        confirmed_occasion: 'Birthday Dinner',
        confirmed_date: '2026-05-18',
        confirmed_guest_count: 10,
      },
      event: {
        occasion: 'Birthday Dinner',
        event_date: '2026-05-18',
      },
    })

    assert.equal(action?.kind, 'quote_revision')
    assert.equal(action?.ownerSurface, 'chef')
    assert.equal(action?.intervention?.mode, 'prepare')
    assert.match(action?.chef?.href ?? '', /^\/quotes\/new\?/)
    assert.match(action?.chef?.href ?? '', /source=quote_revision/)
    assert.match(action?.chef?.href ?? '', /quote_name=Birthday\+Dinner\+Quote\+Revised/)
  })
})
