import assert from 'node:assert/strict'
import test from 'node:test'

import { getEventIndexPaymentState } from '@/lib/events/payment-state'

const TODAY = new Date('2026-05-18T12:00:00Z')

test('event index payment state marks paid events with no balance', () => {
  const state = getEventIndexPaymentState({
    eventDate: '2026-05-20',
    paymentStatus: 'paid',
    quotedPriceCents: 240000,
    totalPaidCents: 240000,
    outstandingBalanceCents: 0,
    today: TODAY,
  })

  assert.equal(state.kind, 'paid')
  assert.equal(state.label, 'Paid')
  assert.equal(state.showOutstanding, false)
})

test('event index payment state distinguishes partial, unpaid, overdue, refunded, and unknown', () => {
  assert.equal(
    getEventIndexPaymentState({
      eventDate: '2026-05-20',
      paymentStatus: 'partial',
      quotedPriceCents: 240000,
      totalPaidCents: 50000,
      outstandingBalanceCents: 190000,
      today: TODAY,
    }).kind,
    'partial'
  )

  assert.equal(
    getEventIndexPaymentState({
      eventDate: '2026-05-20',
      paymentStatus: 'unpaid',
      quotedPriceCents: 240000,
      totalPaidCents: 0,
      outstandingBalanceCents: 240000,
      today: TODAY,
    }).kind,
    'unpaid'
  )

  assert.equal(
    getEventIndexPaymentState({
      eventDate: '2026-05-10',
      paymentStatus: 'partial',
      quotedPriceCents: 240000,
      totalPaidCents: 50000,
      outstandingBalanceCents: 190000,
      today: TODAY,
    }).kind,
    'overdue'
  )

  assert.equal(
    getEventIndexPaymentState({
      eventDate: '2026-05-10',
      paymentStatus: 'refunded',
      quotedPriceCents: 240000,
      totalPaidCents: 0,
      outstandingBalanceCents: 0,
      today: TODAY,
    }).kind,
    'refunded'
  )

  assert.equal(
    getEventIndexPaymentState({
      eventDate: '2026-05-20',
      paymentStatus: null,
      quotedPriceCents: null,
      totalPaidCents: null,
      outstandingBalanceCents: null,
      today: TODAY,
    }).kind,
    'unknown'
  )
})
