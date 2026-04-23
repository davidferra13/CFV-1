import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildClientWorkGraph, suggestClientNavFromWorkGraph } from '@/lib/client-work-graph/build'
import type { ClientWorkGraphInput } from '@/lib/client-work-graph/types'

function createBaseInput(): ClientWorkGraphInput {
  return {
    events: [],
    quotes: [],
    inquiries: [],
    profileSummary: {
      completionPercent: 100,
      completedFields: 6,
      totalFields: 6,
      pendingMealRequests: 0,
      signalNotificationsEnabled: true,
    },
    hubSummary: {
      groupCount: 0,
      friendCount: 0,
      pendingFriendRequestCount: 0,
      totalUnreadCount: 0,
    },
    rsvpSummary: null,
    notificationSummary: {
      unreadCount: 0,
      unread: [],
    },
    eventStubs: [],
  }
}

describe('client work graph', () => {
  it('reuses event lifecycle truth and dedupes a matching sent quote', () => {
    const graph = buildClientWorkGraph({
      ...createBaseInput(),
      events: [
        {
          id: 'event-1',
          status: 'proposed',
          event_date: '2026-05-10',
          occasion: 'Anniversary Dinner',
          quoted_price_cents: 145000,
          guest_count: 8,
        },
      ],
      quotes: [
        {
          id: 'quote-1',
          event_id: 'event-1',
          status: 'sent',
          quote_name: 'Anniversary Dinner Quote',
          total_quoted_cents: 145000,
        },
      ],
    })

    assert.equal(graph.summary.proposalCount, 1)
    assert.equal(graph.summary.quotePendingCount, 0)
    assert.equal(graph.items[0]?.kind, 'event_proposal')
    assert.equal(graph.eventActionsById['event-1']?.ctaLabel, 'Review Proposal')
    assert.equal(graph.eventActionsById['event-1']?.href, '/my-events/event-1/proposal')
  })

  it('prioritizes balances over post-event reviews and surfaces later lifecycle actions', () => {
    const graph = buildClientWorkGraph({
      ...createBaseInput(),
      events: [
        {
          id: 'event-balance',
          status: 'completed',
          event_date: '2026-04-18',
          occasion: 'Garden Dinner',
          quoted_price_cents: 220000,
          guest_count: 10,
          hasOutstandingBalance: true,
          hasReview: false,
        },
        {
          id: 'event-menu',
          status: 'confirmed',
          event_date: '2026-04-28',
          occasion: 'Birthday Tasting',
          quoted_price_cents: 98000,
          guest_count: 6,
          menu_approval_status: 'sent',
        },
      ],
    })

    assert.equal(graph.items[0]?.kind, 'event_balance')
    assert.equal(graph.eventActionsById['event-balance']?.ctaLabel, 'Pay Balance')
    assert.equal(graph.eventActionsById['event-menu']?.ctaLabel, 'Review Menu')
    assert.equal(graph.summary.outstandingBalanceCount, 1)
    assert.equal(graph.summary.menuApprovalCount, 1)
  })

  it('matches Remy payment questions to the same work graph routes', () => {
    const graph = buildClientWorkGraph({
      ...createBaseInput(),
      events: [
        {
          id: 'event-2',
          status: 'accepted',
          event_date: '2026-05-04',
          occasion: 'Lake Dinner',
          quoted_price_cents: 160000,
          guest_count: 12,
        },
      ],
      profileSummary: {
        completionPercent: 66,
        completedFields: 4,
        totalFields: 6,
        pendingMealRequests: 0,
        signalNotificationsEnabled: false,
      },
    })

    const paymentSuggestions = suggestClientNavFromWorkGraph('How do I pay my deposit?', graph)
    assert.deepEqual(paymentSuggestions, [{ label: 'Pay Now', href: '/my-events/event-2/pay' }])

    const genericSuggestions = suggestClientNavFromWorkGraph('What needs attention?', graph)
    assert.equal(genericSuggestions[0]?.href, '/my-events/event-2/pay')
  })

  it('keeps proposal review ahead of contract signing when a contract arrives early', () => {
    const graph = buildClientWorkGraph({
      ...createBaseInput(),
      events: [
        {
          id: 'event-early-contract',
          status: 'proposed',
          event_date: '2026-05-14',
          occasion: 'Anniversary Supper',
          quoted_price_cents: 185000,
          guest_count: 8,
          hasContract: true,
          contractStatus: 'sent',
          contractSignedAt: null,
        },
      ],
    })

    assert.equal(graph.items[0]?.kind, 'event_proposal')
    assert.equal(graph.eventActionsById['event-early-contract']?.ctaLabel, 'Review Proposal')
    assert.equal(
      graph.eventActionsById['event-early-contract']?.href,
      '/my-events/event-early-contract/proposal'
    )
    assert.equal(graph.summary.proposalCount, 1)
  })

  it('holds payment until a required contract is actually signable', () => {
    const signableContract = buildClientWorkGraph({
      ...createBaseInput(),
      events: [
        {
          id: 'event-contract',
          status: 'accepted',
          event_date: '2026-05-20',
          occasion: 'Private Tasting',
          quoted_price_cents: 210000,
          guest_count: 10,
          hasContract: true,
          contractStatus: 'viewed',
          contractSignedAt: null,
          hasOutstandingBalance: true,
        },
      ],
    })

    assert.equal(signableContract.items[0]?.kind, 'event_contract')
    assert.equal(signableContract.eventActionsById['event-contract']?.ctaLabel, 'Sign Contract')
    assert.equal(
      signableContract.eventActionsById['event-contract']?.href,
      '/my-events/event-contract/contract'
    )

    const awaitingChefContract = buildClientWorkGraph({
      ...createBaseInput(),
      events: [
        {
          id: 'event-awaiting-contract',
          status: 'accepted',
          event_date: '2026-05-22',
          occasion: 'Chef Table',
          quoted_price_cents: 240000,
          guest_count: 12,
          hasContract: true,
          contractStatus: 'draft',
          contractSignedAt: null,
          hasOutstandingBalance: true,
        },
      ],
    })

    assert.equal(awaitingChefContract.items.length, 0)
    assert.equal(awaitingChefContract.summary.paymentDueCount, 0)
    assert.equal(awaitingChefContract.summary.outstandingBalanceCount, 0)
  })

  it('keeps accepted payment collection on the booking path instead of post-event balance collection', () => {
    const graph = buildClientWorkGraph({
      ...createBaseInput(),
      events: [
        {
          id: 'event-payment',
          status: 'accepted',
          event_date: '2026-05-18',
          occasion: 'Client Supper',
          quoted_price_cents: 190000,
          guest_count: 8,
          hasOutstandingBalance: true,
        },
      ],
    })

    assert.equal(graph.items[0]?.kind, 'event_payment')
    assert.equal(graph.eventActionsById['event-payment']?.ctaLabel, 'Pay Now')
    assert.equal(graph.eventActionsById['event-payment']?.href, '/my-events/event-payment/pay')
    assert.equal(graph.summary.paymentDueCount, 1)
    assert.equal(graph.summary.outstandingBalanceCount, 0)
  })

  it('surfaces pending guest-count requests on the same event action surface Remy uses', () => {
    const graph = buildClientWorkGraph({
      ...createBaseInput(),
      events: [
        {
          id: 'event-guest-change',
          status: 'confirmed',
          event_date: '2026-05-12',
          occasion: 'Birthday Dinner',
          quoted_price_cents: 180000,
          guest_count: 8,
          pendingGuestCountChange: {
            id: 'change-1',
            previousCount: 8,
            newCount: 10,
            requestedAt: '2026-05-01T12:00:00.000Z',
          },
        },
      ],
    })

    assert.equal(graph.items[0]?.kind, 'event_booking_change')
    assert.equal(
      graph.eventActionsById['event-guest-change']?.href,
      '/my-events/event-guest-change#booking-change-center'
    )

    const suggestions = suggestClientNavFromWorkGraph(
      'How do I check my guest count change request?',
      graph
    )
    assert.deepEqual(suggestions, [
      { label: 'View Request', href: '/my-events/event-guest-change#booking-change-center' },
    ])
  })

  it('reuses shared quote and inquiry graph projections for client follow-through lanes', () => {
    const graph = buildClientWorkGraph({
      ...createBaseInput(),
      quotes: [
        {
          id: 'quote-standalone',
          status: 'sent',
          quote_name: 'Anniversary Quote',
          total_quoted_cents: 145000,
          valid_until: '2026-05-20',
          inquiry: {
            confirmed_occasion: 'Anniversary Dinner',
            confirmed_date: '2026-05-24',
          },
        },
      ],
      inquiries: [
        {
          id: 'inquiry-awaiting-client',
          status: 'awaiting_client',
          confirmed_occasion: 'Birthday Dinner',
          confirmed_date: '2026-05-28',
          confirmed_guest_count: 10,
          confirmed_location: 'Brooklyn',
          follow_up_due_at: '2026-05-03T12:00:00.000Z',
          next_action_required: 'Confirm the final menu choices.',
          updated_at: '2026-05-01T12:00:00.000Z',
        },
      ],
    })

    assert.equal(graph.summary.quotePendingCount, 1)
    assert.equal(graph.summary.inquiryAwaitingCount, 1)
    assert.ok(graph.items.some((item) => item.kind === 'quote_review' && item.href === '/my-quotes/quote-standalone'))
    assert.ok(
      graph.items.some(
        (item) => item.kind === 'inquiry_reply' && item.href === '/my-inquiries/inquiry-awaiting-client'
      )
    )
  })
})
