import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildClientInteractionLedgerEntries } from '@/lib/clients/interaction-ledger-core'
import {
  buildClientInteractionSignalSnapshot,
  getClientInteractionSignalShortLabel,
} from '@/lib/clients/interaction-signals'
import type { ClientHealthScore } from '@/lib/clients/health-score'

function buildHealthScore(
  overrides: Partial<ClientHealthScore> = {}
): ClientHealthScore {
  return {
    clientId: 'client-1',
    score: 78,
    tier: 'champion',
    recencyScore: 30,
    frequencyScore: 20,
    monetaryScore: 18,
    engagementScore: 10,
    daysSinceLastEvent: 21,
    totalEvents: 4,
    lifetimeValueCents: 180000,
    ...overrides,
  }
}

describe('client interaction signals', () => {
  it('derives quote follow-up signals from the canonical interaction ledger', () => {
    const ledger = buildClientInteractionLedgerEntries({
      clientId: 'client-1',
      quotes: [
        {
          id: 'quote-1',
          created_at: '2026-04-10T10:00:00.000Z',
          sent_at: '2026-04-10T11:00:00.000Z',
          valid_until: '2026-04-15T00:00:00.000Z',
          status: 'sent',
          quote_name: 'Spring tasting',
          total_quoted_cents: 240000,
          version: 1,
          previous_version_id: null,
          is_superseded: false,
        },
      ],
      activityEvents: [
        {
          id: 'activity-1',
          created_at: '2026-04-11T09:00:00.000Z',
          event_type: 'quote_viewed',
          entity_type: 'quote',
          entity_id: 'quote-1',
        },
      ],
    })

    const snapshot = buildClientInteractionSignalSnapshot({
      clientId: 'client-1',
      ledger,
      healthScore: buildHealthScore(),
      milestones: {
        birthday: null,
        anniversary: null,
      },
      now: new Date('2026-04-12T12:00:00.000Z'),
    })

    assert.equal(snapshot.ordered[0]?.type, 'quote_viewed_without_response')
    assert.equal(snapshot.byType.quote_viewed_without_response?.actionType, 'follow_up_quote')
    assert.deepEqual(snapshot.byType.quote_viewed_without_response?.ledgerEntryIds, [
      'activity:activity-1',
      'quote:quote-1',
    ])
    assert.equal(snapshot.byType.quote_expiring_soon?.context.daysUntil, 3)
    assert.equal(snapshot.byType.relationship_champion?.actionType, 'ask_referral')
  })

  it('keeps milestone and health-tier signals distinct without creating a second store', () => {
    const snapshot = buildClientInteractionSignalSnapshot({
      clientId: 'client-1',
      ledger: [],
      healthScore: buildHealthScore({
        score: 12,
        tier: 'new',
        daysSinceLastEvent: null,
        totalEvents: 0,
        lifetimeValueCents: 0,
      }),
      milestones: {
        birthday: '1990-04-16',
        anniversary: null,
      },
      now: new Date('2026-04-12T12:00:00.000Z'),
    })

    assert.equal(snapshot.ordered[0]?.type, 'milestone_upcoming')
    assert.equal(snapshot.byType.milestone_upcoming?.context.milestoneType, 'birthday')
    assert.equal(snapshot.byType.first_event_conversion_needed?.actionType, 'schedule_event')
    assert.equal(getClientInteractionSignalShortLabel('first_event_conversion_needed'), 'First booking needed')
  })
})
