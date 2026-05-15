import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignQuoteTier,
  buildQuoteLabel,
  type QuoteRow,
} from '@/lib/discovery/resolvers/chef/quote-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const baseQuote: QuoteRow = {
  id: 'q-1',
  status: 'sent',
  total_quoted_cents: 240000,
  valid_until: '2026-05-16',
  guest_count_estimated: 12,
  created_at: '2026-05-10T12:00:00.000Z',
  client: { id: 'c-1', full_name: 'Patel', email: 'patel@test.com' },
}

test('sent quote expiring in 2 days is P0', () => {
  assert.equal(assignQuoteTier(baseQuote, now), 'p0')
})

test('sent quote expiring in 5 days is P1', () => {
  const fiveDays = { ...baseQuote, valid_until: '2026-05-19' }
  assert.equal(assignQuoteTier(fiveDays, now), 'p1')
})

test('sent quote expiring in 14 days is P2', () => {
  const twoWeeks = { ...baseQuote, valid_until: '2026-05-28' }
  assert.equal(assignQuoteTier(twoWeeks, now), 'p2')
})

test('draft quote is P2', () => {
  const draft = { ...baseQuote, status: 'draft' as const, valid_until: null }
  assert.equal(assignQuoteTier(draft, now), 'p2')
})

test('accepted quote returns null', () => {
  const accepted = { ...baseQuote, status: 'accepted' as const }
  assert.equal(assignQuoteTier(accepted, now), null)
})

test('expired quote returns null', () => {
  const expired = { ...baseQuote, status: 'expired' as const }
  assert.equal(assignQuoteTier(expired, now), null)
})

test('sent quote already past valid_until is P0', () => {
  const overdue = { ...baseQuote, valid_until: '2026-05-13' }
  assert.equal(assignQuoteTier(overdue, now), 'p0')
})

test('buildQuoteLabel includes client and amount', () => {
  const label = buildQuoteLabel(baseQuote, now)
  assert.ok(label.includes('Patel'))
  assert.ok(label.includes('$2,400'))
})
