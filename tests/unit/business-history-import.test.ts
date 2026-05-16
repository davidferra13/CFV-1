import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyBusinessHistoryEmail,
  promoteBusinessHistoryClassification,
} from '@/lib/business-history-import/gmail-recovery'
import {
  buildBusinessHistorySummary,
  buildUnifiedReviewQueue,
  extractEmail,
  findDuplicateHints,
} from '@/lib/business-history-import/review-queue'
import type { BusinessHistoryFinding } from '@/lib/business-history-import/types'

test('business history Gmail classifier expands beyond missed inquiries', () => {
  const payment = classifyBusinessHistoryEmail({
    fromAddress: 'Jordan Client <jordan@example.com>',
    subject: 'Deposit paid for June dinner',
    body: 'I sent the $750 deposit by Zelle. Please invoice the remaining balance.',
  })

  assert.equal(payment?.category, 'payment_invoice')
  assert.equal(payment?.proposedDestination, 'finance')

  const preference = classifyBusinessHistoryEmail({
    fromAddress: 'maria@example.com',
    subject: 'Menu for anniversary',
    body: 'Maria loves scallops, no mushrooms, and needs gluten free dessert.',
  })

  assert.equal(preference?.category, 'preference')
  assert.equal(preference?.proposedDestination, 'preferences')
})

test('base spam and marketing classifications are not promoted into staged findings', () => {
  const promoted = promoteBusinessHistoryClassification(
    {
      category: 'marketing',
      confidence: 'high',
      reasoning: 'List unsubscribe',
      is_food_related: false,
    },
    {
      fromAddress: 'promo@example.com',
      subject: 'Invoice templates on sale',
      body: 'Limited offer for payment tools',
    }
  )

  assert.equal(promoted.category, 'marketing')
})

test('review queue detects client and staged duplicates without canonical writes', () => {
  const finding = {
    id: 'finding-1',
    fromAddress: 'Alex Smith <alex@example.com>',
    subject: 'Birthday dinner',
    summary: 'Birthday dinner for 12',
    receivedAt: '2026-05-01T00:00:00.000Z',
  }

  assert.equal(extractEmail(finding.fromAddress), 'alex@example.com')

  const hints = findDuplicateHints(
    finding,
    [{ id: 'client-1', fullName: 'Alex Smith', email: 'alex@example.com' }],
    [{ id: 'event-1', occasion: 'Birthday dinner', eventDate: '2026-05-01' }],
    [{ ...finding, id: 'finding-2' }]
  )

  assert.ok(hints.some((hint) => hint.entityType === 'client' && hint.strength === 'exact'))
  assert.ok(hints.some((hint) => hint.entityType === 'event'))
  assert.ok(hints.some((hint) => hint.entityType === 'finding'))
})

test('unified review queue maps Gmail rows into category review records', () => {
  const queue = buildUnifiedReviewQueue({
    gmailRows: [
      {
        id: 'finding-1',
        gmail_message_id: 'gmail-1',
        from_address: 'client@example.com',
        subject: 'Need menu',
        body_preview: 'No shellfish please.',
        classification: 'preference',
        confidence: 'medium',
        status: 'pending',
        received_at: '2026-05-01T00:00:00.000Z',
      },
    ],
    existingClients: [],
    existingEvents: [],
  })

  assert.equal(queue[0]?.category, 'preference')
  assert.equal(queue[0]?.proposedDestination, 'preferences')
  assert.equal(queue[0]?.source, 'gmail')
})

test('business history summary uses staged findings plus real tenant counts', () => {
  const findings: Pick<BusinessHistoryFinding, 'category' | 'status'>[] = [
    { category: 'client', status: 'pending' },
    { category: 'event', status: 'imported' },
    { category: 'follow_up', status: 'dismissed' },
  ]

  const summary = buildBusinessHistorySummary({
    findings,
    canonicalCounts: {
      staged: 0,
      imported: 0,
      dismissed: 0,
      clients: 4,
      events: 3,
      inquiries: 2,
      expenses: 1,
      ledgerEntries: 6,
    },
    scan: null,
    importLogCount: 5,
  })

  assert.equal(summary.counts.staged, 1)
  assert.equal(summary.counts.imported, 1)
  assert.equal(summary.counts.dismissed, 1)
  assert.equal(summary.counts.clients, 4)
  assert.ok(summary.nextActions.some((action) => action.href === '#review'))
})
