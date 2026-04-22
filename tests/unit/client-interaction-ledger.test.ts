import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildClientInteractionLedgerEntries,
  projectInteractionLedgerToUnifiedTimeline,
} from '@/lib/clients/interaction-ledger-core'

describe('client interaction ledger', () => {
  it('normalizes authoritative records into one chronologically sorted ledger', () => {
    const entries = buildClientInteractionLedgerEntries({
      clientId: 'client-1',
      events: [
        {
          id: 'event-1',
          created_at: '2026-04-10T10:00:00.000Z',
          event_date: '2026-05-01T18:00:00.000Z',
          status: 'confirmed',
          occasion: 'Birthday Dinner',
          guest_count: 10,
          quoted_price_cents: 320000,
        },
      ],
      messages: [
        {
          id: 'message-1',
          created_at: '2026-04-12T09:00:00.000Z',
          sent_at: '2026-04-12T09:05:00.000Z',
          direction: 'inbound',
          body: 'Can we add a pescatarian option?',
          channel: 'email',
        },
      ],
      quotes: [
        {
          id: 'quote-1',
          created_at: '2026-04-08T10:00:00.000Z',
          sent_at: '2026-04-08T11:00:00.000Z',
          status: 'sent',
          quote_name: 'Birthday Dinner Quote',
          total_quoted_cents: 320000,
          version: 1,
          previous_version_id: null,
          is_superseded: true,
        },
        {
          id: 'quote-2',
          created_at: '2026-04-11T10:00:00.000Z',
          sent_at: '2026-04-11T11:00:00.000Z',
          status: 'sent',
          quote_name: 'Birthday Dinner Quote',
          total_quoted_cents: 340000,
          version: 2,
          previous_version_id: 'quote-1',
          is_superseded: false,
        },
      ],
      activityEvents: [
        {
          id: 'activity-1',
          created_at: '2026-04-13T08:00:00.000Z',
          event_type: 'quote_viewed',
          entity_type: 'quote',
          entity_id: 'quote-2',
          metadata: { path: '/my-quotes/quote-2' },
        },
      ],
    })

    assert.deepEqual(
      entries.map((entry) => entry.id),
      [
        'activity:activity-1',
        'message:message-1',
        'quote:quote-2',
        'event:event-1',
        'quote:quote-1',
      ]
    )
    assert.equal(entries[0]?.code, 'quote_viewed')
    assert.equal(entries[0]?.artifact?.kind, 'quote')
    assert.equal(entries[2]?.artifact?.revision?.lineageKey, 'quote:quote-1')
    assert.equal(entries[2]?.artifact?.revision?.sequenceNumber, 2)
    assert.equal(entries[2]?.artifact?.revision?.isLatest, true)
    assert.equal(entries[4]?.artifact?.revision?.isLatest, false)
  })

  it('normalizes menu revisions and document versions into the same revision contract', () => {
    const entries = buildClientInteractionLedgerEntries({
      clientId: 'client-1',
      menus: [{ id: 'menu-1', event_id: 'event-1', name: 'Spring Tasting' }],
      menuRevisions: [
        {
          id: 'menu-rev-1',
          menu_id: 'menu-1',
          event_id: 'event-1',
          version: 1,
          revision_type: 'initial',
          created_at: '2026-04-01T10:00:00.000Z',
        },
        {
          id: 'menu-rev-2',
          menu_id: 'menu-1',
          event_id: 'event-1',
          version: 2,
          revision_type: 'chef_update',
          changes_summary: 'Swapped the second course',
          created_at: '2026-04-03T10:00:00.000Z',
        },
      ],
      documentVersions: [
        {
          id: 'doc-1',
          entity_type: 'menu',
          entity_id: 'menu-1',
          version_number: 1,
          change_summary: 'Initial export',
          created_at: '2026-04-02T10:00:00.000Z',
        },
        {
          id: 'doc-2',
          entity_type: 'menu',
          entity_id: 'menu-1',
          version_number: 2,
          change_summary: 'Updated after client feedback',
          created_at: '2026-04-04T10:00:00.000Z',
        },
      ],
    })

    const projected = projectInteractionLedgerToUnifiedTimeline(entries, 10)

    const menuRevision = entries.find((entry) => entry.id === 'menu_revision:menu-rev-2')
    const documentVersion = entries.find((entry) => entry.id === 'document_version:doc-2')
    const projectedMenuRevision = projected.find((entry) => entry.id === 'menu_revision:menu-rev-2')
    const projectedDocumentVersion = projected.find(
      (entry) => entry.id === 'document_version:doc-2'
    )

    assert.equal(menuRevision?.artifact?.revision?.lineageKey, 'menu:menu-1')
    assert.equal(menuRevision?.artifact?.revision?.previousArtifactId, 'menu-rev-1')
    assert.equal(menuRevision?.artifact?.revision?.isLatest, true)

    assert.equal(documentVersion?.artifact?.revision?.lineageKey, 'menu:menu-1')
    assert.equal(documentVersion?.artifact?.revision?.previousArtifactId, 'doc-1')
    assert.equal(documentVersion?.artifact?.revision?.isLatest, true)

    assert.ok(projectedMenuRevision?.badges?.includes('Menu v2'))
    assert.ok(projectedDocumentVersion?.badges?.includes('Menu doc v2'))
  })
})
