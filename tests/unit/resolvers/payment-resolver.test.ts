import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignPaymentTier,
  buildPaymentLabel,
  type PaymentRow,
} from '@/lib/discovery/resolvers/chef/payment-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const basePayment: PaymentRow = {
  eventId: 'evt-1',
  occasion: 'Henderson dinner',
  eventDate: '2026-05-10',
  outstandingBalanceCents: 185000,
  totalPaidCents: 0,
  quotedPriceCents: 185000,
  clientName: 'Henderson',
  guestCount: 8,
}

test('past event with balance is P0 (overdue)', () => {
  assert.equal(assignPaymentTier(basePayment, now), 'p0')
})

test('event today with balance is P1', () => {
  const today = { ...basePayment, eventDate: '2026-05-14' }
  assert.equal(assignPaymentTier(today, now), 'p1')
})

test('future event with partial payment is P2', () => {
  const future = {
    ...basePayment,
    eventDate: '2026-05-20',
    totalPaidCents: 50000,
  }
  assert.equal(assignPaymentTier(future, now), 'p2')
})

test('zero balance returns null', () => {
  const paid = { ...basePayment, outstandingBalanceCents: 0 }
  assert.equal(assignPaymentTier(paid, now), null)
})

test('buildPaymentLabel includes amount and client', () => {
  const label = buildPaymentLabel(basePayment)
  assert.ok(label.includes('$1,850'))
  assert.ok(label.includes('Henderson'))
})
