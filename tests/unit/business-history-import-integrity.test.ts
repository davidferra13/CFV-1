import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mapGmailFindingRow,
  buildUnifiedReviewQueue,
  buildBusinessHistorySummary,
} from '@/lib/business-history-import/review-queue'
const base = {
  id: 'source-1',
  gmail_message_id: 'mail-1',
  classification: 'event',
  status: 'imported',
  reviewed_at: '2026-10-01T00:00:00Z',
}
test('reviewed history without a destination stays available for reconstruction', () => {
  const finding = mapGmailFindingRow(base)
  assert.equal(finding.status, 'pending')
  assert.equal(finding.reviewedAt, base.reviewed_at)
})
test('only an inquiry with a persisted destination can count as imported', () => {
  for (const category of ['client', 'event', 'preference', 'payment_invoice', 'follow_up']) {
    assert.equal(mapGmailFindingRow({ ...base, classification: category }).status, 'pending')
  }
  assert.equal(
    mapGmailFindingRow({ ...base, classification: 'inquiry', imported_inquiry_id: 'inquiry-1' })
      .status,
    'imported'
  )
  assert.equal(mapGmailFindingRow({ ...base, classification: 'inquiry' }).status, 'pending')
})
test('dismissed findings remain dismissed and incomplete imports do not inflate progress', () => {
  assert.equal(mapGmailFindingRow({ ...base, status: 'dismissed' }).status, 'dismissed')
  const findings = buildUnifiedReviewQueue({
    gmailRows: [base],
    existingClients: [],
    existingEvents: [],
  })
  const summary = buildBusinessHistorySummary({
    findings,
    canonicalCounts: {
      staged: 0,
      imported: 0,
      dismissed: 0,
      clients: 0,
      events: 0,
      inquiries: 0,
      expenses: 0,
      ledgerEntries: 0,
    },
    scan: null,
    importLogCount: 0,
  })
  assert.equal(summary.counts.imported, 0)
  assert.equal(summary.counts.staged, 1)
})
