import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderOpsCoverage,
  buildOrderOpsDebt,
  buildOrderOpsMetrics,
  normalizeIntegrationEvent,
  normalizeOrderQueueRow,
  normalizeReservationRow,
  normalizeWaitlistRow,
} from '@/lib/order-operations/normalize'

test('native ChefFlow order queue rows normalize into actionable order work', () => {
  const item = normalizeOrderQueueRow({
    id: 'o1',
    order_number: '1042',
    status: 'preparing',
    customer_name: 'Taylor',
    received_at: '2026-09-16T18:00:00.000Z',
    sales: { total_cents: 4250 },
  })

  assert.equal(item.kind, 'order')
  assert.equal(item.interactionMode, 'NATIVE')
  assert.equal(item.lane, 'active')
  assert.equal(item.amountCents, 4250)
  assert.equal(item.chefFlowHref, '/commerce/orders')
})
test('reservations and waitlist demand stay inside ChefFlow', () => {
  const reservation = normalizeReservationRow({
    id: 'r1',
    reservation_date: '2026-09-17',
    reservation_time: '19:00:00',
    party_size: 4,
    table_number: '12',
    status: 'confirmed',
    guests: { name: 'Morgan' },
  })
  const waitlist = normalizeWaitlistRow({
    id: 'w1',
    requested_date: '2026-09-20',
    guest_count_estimate: 8,
    status: 'waiting',
    clients: { full_name: 'Casey' },
  })

  assert.equal(reservation.lane, 'scheduled')
  assert.equal(reservation.interactionMode, 'NATIVE')
  assert.equal(reservation.partySize, 4)
  assert.equal(waitlist.lane, 'attention')
  assert.equal(waitlist.interactionMode, 'NATIVE')
  assert.equal(waitlist.chefFlowHref, '/waitlist')
})
test('external channel events are normalized but remain observed until a write adapter exists', () => {
  const item = normalizeIntegrationEvent({
    id: 'e1',
    provider: 'toast',
    canonical_event_type: 'order_created',
    source_event_type: 'order.created',
    normalized_payload: {
      payload: {
        customer_name: 'Jordan',
        total_cents: 6100,
        status: 'received',
      },
    },
    received_at: '2026-09-16T18:05:00.000Z',
  })

  assert.equal(item.kind, 'order')
  assert.equal(item.source.category, 'pos')
  assert.equal(item.interactionMode, 'OBSERVED')
  assert.equal(item.amountCents, 6100)
  assert.equal(item.chefFlowHref, null)
})

test('coverage distinguishes available connectors from missing adapters', () => {
  const coverage = buildOrderOpsCoverage(['toast'])
  assert.equal(coverage.find((item) => item.system === 'Toast')?.state, 'configured')
  assert.equal(coverage.find((item) => item.system === 'Square')?.state, 'available')
  assert.equal(coverage.find((item) => item.system === 'OpenTable')?.state, 'adapter_required')
})
test('metrics and debt make unresolved stack interactions explicit', () => {
  const native = normalizeOrderQueueRow({ id: 'o2', status: 'ready', sales: { total_cents: 1000 } })
  const observed = normalizeIntegrationEvent({
    id: 'e2',
    provider: 'toast',
    canonical_event_type: 'order_updated',
    source_event_type: 'order.updated',
    raw_payload: { status: 'preparing' },
  })
  const items = [native, observed]
  const coverage = buildOrderOpsCoverage(['toast'])
  const metrics = buildOrderOpsMetrics(items)
  const debt = buildOrderOpsDebt(items, coverage)

  assert.equal(metrics.totalOpen, 2)
  assert.equal(metrics.activeOrders, 1)
  assert.equal(metrics.externalSignals, 1)
  assert.ok(debt.some((item) => item.id === 'write-path:toast'))
  assert.ok(debt.some((item) => item.id === 'adapter:opentable'))
})
