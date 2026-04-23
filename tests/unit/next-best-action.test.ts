import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { selectNextBestAction } from '@/lib/clients/next-best-action-core'
import type { ClientHealthScore } from '@/lib/clients/health-score'
import type { ClientInteractionSignal } from '@/lib/clients/interaction-signals'

function buildHealthScore(overrides: Partial<ClientHealthScore> = {}): ClientHealthScore {
  return {
    clientId: 'client-1',
    score: 74,
    tier: 'loyal',
    recencyScore: 25,
    frequencyScore: 20,
    monetaryScore: 14,
    engagementScore: 15,
    daysSinceLastEvent: 48,
    totalEvents: 3,
    lifetimeValueCents: 150000,
    ...overrides,
  }
}

function buildSignal(
  overrides: Partial<ClientInteractionSignal> & Pick<ClientInteractionSignal, 'type' | 'actionType'>
): ClientInteractionSignal {
  return {
    type: overrides.type,
    label: overrides.label ?? overrides.type,
    shortLabel: overrides.shortLabel ?? overrides.type,
    actionType: overrides.actionType,
    occurredAt: overrides.occurredAt ?? '2026-04-12T12:00:00.000Z',
    reasons: overrides.reasons ?? [
      {
        code: overrides.type,
        message: `${overrides.type} reason`,
        sourceType: 'ledger_entry',
        sourceId: overrides.type,
        ledgerEntryId: `${overrides.type}-entry`,
        table: 'test_rows',
        recordId: `${overrides.type}-record`,
        happenedAt: '2026-04-12T12:00:00.000Z',
      },
    ],
    ledgerEntryIds: overrides.ledgerEntryIds ?? [`${overrides.type}-entry`],
    context: overrides.context ?? {},
  }
}

describe('next best action', () => {
  it('keeps booking blockers above all signal-driven actions', () => {
    const action = selectNextBestAction({
      clientId: 'client-1',
      clientName: 'Maya Chen',
      healthScore: buildHealthScore(),
      bookingBlocker: {
        actionId: 'guest_count_review:event-1',
        eventId: 'event-1',
        bookingSource: 'guest_count_change',
        evidence: ['guest_count_changes.id=change-1'],
        label: 'Review guest-count request for Anniversary Dinner',
        description: 'A client requested a guest-count change from 8 to 10.',
        href: '/events/event-1?tab=money',
        urgency: 'critical',
        priority: 1000,
        eventDate: '2026-05-10',
      },
      signals: [
        buildSignal({
          type: 'awaiting_chef_reply',
          actionType: 'reply_inquiry',
          context: { href: '/pipeline/inquiries/inquiry-1', inquiryId: 'inquiry-1' },
        }),
      ],
    })

    assert.equal(action?.actionType, 'booking_blocker')
    assert.equal(action?.primarySignal, 'booking_blocker_active')
    assert.equal(action?.reasons[0]?.sourceType, 'booking_blocker')
    assert.equal(action?.href, '/events/event-1?tab=money')
  })

  it('uses signal precedence and carries explainability into the chosen action', () => {
    const action = selectNextBestAction({
      clientId: 'client-1',
      clientName: 'Jordan Patel',
      healthScore: buildHealthScore(),
      signals: [
        buildSignal({
          type: 'relationship_champion',
          actionType: 'ask_referral',
          reasons: [
            {
              code: 'relationship_champion',
              message: 'Champion relationship reason',
              sourceType: 'health_score',
              sourceId: 'client-1',
            },
          ],
        }),
        buildSignal({
          type: 'quote_expiring_soon',
          actionType: 'follow_up_quote',
          reasons: [
            {
              code: 'quote_expiring_soon',
              message: 'The quote expires in 3 days.',
              sourceType: 'ledger_entry',
              sourceId: 'quote:quote-1',
              ledgerEntryId: 'quote:quote-1',
              table: 'quotes',
              recordId: 'quote-1',
              happenedAt: '2026-04-15T00:00:00.000Z',
            },
          ],
          context: {
            quoteId: 'quote-1',
            validUntil: '2026-04-15T00:00:00.000Z',
            daysUntil: 3,
          },
        }),
        buildSignal({
          type: 'quote_viewed_without_response',
          actionType: 'follow_up_quote',
          reasons: [
            {
              code: 'quote_viewed_without_response',
              message: 'The client viewed the quote, but no later client response is recorded.',
              sourceType: 'ledger_entry',
              sourceId: 'activity:activity-1',
              ledgerEntryId: 'activity:activity-1',
              table: 'activity_events',
              recordId: 'activity-1',
              happenedAt: '2026-04-12T10:00:00.000Z',
            },
          ],
          ledgerEntryIds: ['activity:activity-1', 'quote:quote-1'],
          context: {
            quoteId: 'quote-1',
            validUntil: '2026-04-15T00:00:00.000Z',
            daysUntil: 3,
          },
        }),
      ],
    })

    assert.equal(action?.actionType, 'follow_up_quote')
    assert.equal(action?.primarySignal, 'quote_viewed_without_response')
    assert.equal(action?.urgency, 'high')
    assert.equal(action?.href, '/clients/client-1/relationship')
    assert.equal(action?.label, 'Follow up on quote')
    assert.equal(
      action?.description,
      'The client viewed the quote, but no later client response is recorded.'
    )
    assert.ok(action?.reasons.some((reason) => reason.code === 'quote_viewed_without_response'))
    assert.ok(action?.reasons.some((reason) => reason.code === 'quote_expiring_soon'))
  })

  it('prefers a graph-backed prepared quote revision over signal-only follow-up work', () => {
    const action = selectNextBestAction({
      clientId: 'client-1',
      clientName: 'Jordan Patel',
      healthScore: buildHealthScore(),
      graphAction: {
        actionId: 'quote_revision:quote:quote-1',
        entityType: 'quote',
        entityId: 'quote-1',
        actionKind: 'quote_revision',
        actionSource: 'quote_feedback',
        evidence: ['quotes.status=rejected', 'quotes.rejected_reason=Budget needs revision'],
        label: 'Prepare revised quote for Birthday Dinner Quote',
        description: 'Open a revised draft before following up with the client.',
        href: '/quotes/new?source=quote_revision&quote_name=Birthday+Dinner+Quote+Revised',
        urgency: 'high',
        actionType: 'quote_revision',
        primarySignal: 'quote_revision_ready',
        intervention: {
          mode: 'prepare',
          reason: 'reversible_draft',
          href: '/quotes/new?source=quote_revision&quote_name=Birthday+Dinner+Quote+Revised',
        },
        interventionLabel: 'Prepared draft',
      },
      signals: [
        buildSignal({
          type: 'quote_expiring_soon',
          actionType: 'follow_up_quote',
        }),
      ],
    })

    assert.equal(action?.actionType, 'quote_revision')
    assert.equal(action?.primarySignal, 'quote_revision_ready')
    assert.equal(action?.interventionLabel, 'Prepared draft')
    assert.equal(
      action?.href,
      '/quotes/new?source=quote_revision&quote_name=Birthday+Dinner+Quote+Revised'
    )
    assert.equal(action?.reasons[0]?.sourceType, 'action_graph')
  })
})
