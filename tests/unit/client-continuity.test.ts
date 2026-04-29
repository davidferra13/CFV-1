import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildClientContinuitySummary } from '@/lib/client-continuity'
import type { ClientContinuitySnapshot } from '@/lib/client-continuity'
import type { ClientWorkGraph } from '@/lib/client-work-graph/types'

function createBaseWorkGraph(overrides: Partial<ClientWorkGraph> = {}): ClientWorkGraph {
  const summary: ClientWorkGraph['summary'] = {
    totalItems: 0,
    proposalCount: 0,
    paymentDueCount: 0,
    outstandingBalanceCount: 0,
    quotePendingCount: 0,
    inquiryAwaitingCount: 0,
    menuApprovalCount: 0,
    checklistCount: 0,
    rsvpPendingCount: 0,
    friendRequestCount: 0,
    hubUnreadCount: 0,
    profileCount: 0,
    notificationCount: 0,
    planningCount: 0,
    ...overrides.summary,
  }

  return {
    generatedAt: '2026-04-29T12:00:00.000Z',
    primary: null,
    items: [],
    eventActionsById: {},
    ...overrides,
    summary,
  }
}

function createBaseSnapshot(): ClientContinuitySnapshot {
  return {
    eventsResult: {
      upcoming: [],
      past: [],
      pastTotalCount: 0,
      cancelled: [],
      all: [],
    },
    quotes: [],
    inquiries: [],
    profileSummary: {
      completionPercent: 100,
      completedFields: 6,
      totalFields: 6,
      pendingMealRequests: 0,
      signalNotificationsEnabled: true,
    },
    rsvpSummary: null,
  }
}

describe('client continuity summary', () => {
  it('maps the primary work graph item as the deterministic next step', () => {
    const graph = createBaseWorkGraph({
      primary: {
        id: 'event_payment:event-1',
        kind: 'event_payment',
        category: 'event',
        sourceId: 'event-1',
        sourceType: 'event',
        urgency: 'high',
        title: 'Pay now for Anniversary Dinner',
        detail: 'Your deposit is ready for payment.',
        href: '/my-events/event-1/pay',
        ctaLabel: 'Pay Now',
        eventDate: '2026-05-12',
      },
      items: [
        {
          id: 'event_payment:event-1',
          kind: 'event_payment',
          category: 'event',
          sourceId: 'event-1',
          sourceType: 'event',
          urgency: 'high',
          title: 'Pay now for Anniversary Dinner',
          detail: 'Your deposit is ready for payment.',
          href: '/my-events/event-1/pay',
          ctaLabel: 'Pay Now',
          eventDate: '2026-05-12',
        },
      ],
      summary: {
        totalItems: 1,
        paymentDueCount: 1,
      } as Partial<ClientWorkGraph['summary']> as ClientWorkGraph['summary'],
    })

    const summary = buildClientContinuitySummary(graph)

    assert.equal(summary.caughtUp, false)
    assert.equal(summary.generatedAt, graph.generatedAt)
    assert.equal(summary.primaryNextStep?.label, 'Pay now for Anniversary Dinner')
    assert.equal(summary.primaryNextStep?.href, '/my-events/event-1/pay')
    assert.equal(summary.headline, 'Pay now for Anniversary Dinner')
    assert.equal(summary.importantItems[0]?.source, 'work_graph_primary')
    assert.equal(summary.counts[0]?.label, 'Payments due')
    assert.equal(summary.counts[0]?.href, '/my-events')
  })

  it('marks a client caught up without inventing work when the graph is empty', () => {
    const graph = createBaseWorkGraph()
    const snapshot = {
      ...createBaseSnapshot(),
      eventsResult: {
        ...createBaseSnapshot().eventsResult,
        upcoming: [
          {
            id: 'event-2',
            status: 'confirmed',
            event_date: '2026-05-20',
            occasion: 'Birthday Dinner',
            quoted_price_cents: 120000,
            guest_count: 8,
          },
        ],
        all: [
          {
            id: 'event-2',
            status: 'confirmed',
            event_date: '2026-05-20',
            occasion: 'Birthday Dinner',
            quoted_price_cents: 120000,
            guest_count: 8,
          },
        ],
      },
    }

    const summary = buildClientContinuitySummary(graph, { snapshot })

    assert.equal(summary.caughtUp, true)
    assert.equal(summary.primaryNextStep, null)
    assert.equal(summary.headline, 'Client is caught up')
    assert.match(summary.detail, /1 upcoming event is on file/)
    assert.equal(summary.importantItems[0]?.label, 'Upcoming events')
    assert.equal(summary.importantItems[0]?.href, '/my-events')
  })

  it('surfaces real work graph counts and shared snapshot counts with stable hrefs', () => {
    const graph = createBaseWorkGraph({
      summary: {
        totalItems: 3,
        proposalCount: 1,
        quotePendingCount: 1,
        inquiryAwaitingCount: 1,
      } as Partial<ClientWorkGraph['summary']> as ClientWorkGraph['summary'],
    })
    const snapshot = {
      ...createBaseSnapshot(),
      eventsResult: {
        ...createBaseSnapshot().eventsResult,
        pastTotalCount: 2,
      },
      inquiries: [
        {
          id: 'inquiry-1',
          status: 'awaiting_client',
          confirmed_occasion: 'Tasting',
          confirmed_date: '2026-06-01',
          confirmed_guest_count: 6,
          confirmed_location: 'Brooklyn',
          updated_at: '2026-04-29T12:00:00.000Z',
        },
      ],
    }

    const summary = buildClientContinuitySummary(graph, { snapshot })
    const labels = summary.counts.map((count) => count.label)

    assert.deepEqual(labels.slice(0, 3), ['Proposal reviews', 'Quotes waiting', 'Inquiry replies'])
    assert.ok(summary.counts.some((count) => count.label === 'Past events'))
    assert.ok(summary.counts.every((count) => count.count > 0))
  })

  it('prioritizes real notification changes ahead of open work items', () => {
    const graph = createBaseWorkGraph({
      primary: {
        id: 'event_menu:event-1',
        kind: 'event_menu',
        category: 'event',
        sourceId: 'event-1',
        sourceType: 'event',
        urgency: 'high',
        title: 'Review the updated menu',
        detail: 'Your chef sent a menu for review.',
        href: '/my-events/event-1/approve-menu',
        ctaLabel: 'Review Menu',
        eventDate: '2026-05-12',
      },
      items: [
        {
          id: 'event_menu:event-1',
          kind: 'event_menu',
          category: 'event',
          sourceId: 'event-1',
          sourceType: 'event',
          urgency: 'high',
          title: 'Review the updated menu',
          detail: 'Your chef sent a menu for review.',
          href: '/my-events/event-1/approve-menu',
          ctaLabel: 'Review Menu',
          eventDate: '2026-05-12',
        },
      ],
      summary: {
        totalItems: 1,
        menuApprovalCount: 1,
      } as Partial<ClientWorkGraph['summary']> as ClientWorkGraph['summary'],
    })

    const summary = buildClientContinuitySummary(graph, {
      changeDigest: {
        since: '2026-04-29T12:00:00.000Z',
        basis: 'last_dashboard_visit',
        label: '1 update since your last dashboard visit.',
        unreadCount: 1,
        items: [
          {
            id: 'notification:notif-1',
            source: 'notification_change',
            kind: 'notification_change',
            label: 'Menu ready for review',
            detail: 'Your chef sent the menu.',
            href: '/my-events/event-1/approve-menu',
            category: 'event',
            action: 'menu_sent_to_client',
            occurredAt: '2026-04-29T13:00:00.000Z',
            readAt: null,
          },
        ],
      },
    })

    assert.equal(summary.changeDigest.unreadCount, 1)
    assert.equal(summary.importantItems[0]?.source, 'notification_change')
    assert.equal(summary.importantItems[0]?.label, 'Menu ready for review')
  })
})
