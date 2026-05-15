import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignEventTier,
  buildEventLabel,
  type EventRow,
} from '@/lib/discovery/resolvers/chef/event-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const baseEvent: EventRow = {
  id: 'evt-1',
  status: 'confirmed',
  event_date: '2026-05-14',
  serve_time: '18:00',
  guest_count: 8,
  occasion: 'Henderson dinner',
  location_city: 'Boston',
  location_state: 'MA',
  client: { id: 'c-1', full_name: 'Henderson', email: 'h@test.com' },
}

test('event today is P0', () => {
  assert.equal(assignEventTier(baseEvent, now), 'p0')
})

test('event tomorrow is P1', () => {
  const tomorrow = { ...baseEvent, event_date: '2026-05-15' }
  assert.equal(assignEventTier(tomorrow, now), 'p1')
})

test('event in 3 days is P2', () => {
  const threeDays = { ...baseEvent, event_date: '2026-05-17' }
  assert.equal(assignEventTier(threeDays, now), 'p2')
})

test('event next week+ is P3', () => {
  const nextWeek = { ...baseEvent, event_date: '2026-05-25' }
  assert.equal(assignEventTier(nextWeek, now), 'p3')
})

test('past event returns null', () => {
  const past = { ...baseEvent, event_date: '2026-05-10' }
  assert.equal(assignEventTier(past, now), null)
})

test('completed event returns null', () => {
  const done = { ...baseEvent, status: 'completed' }
  assert.equal(assignEventTier(done, now), null)
})

test('cancelled event returns null', () => {
  const cancelled = { ...baseEvent, status: 'cancelled' }
  assert.equal(assignEventTier(cancelled, now), null)
})

test('buildEventLabel includes occasion, guests, date', () => {
  const label = buildEventLabel(baseEvent, now)
  assert.ok(label.includes('Henderson'))
  assert.ok(label.includes('8'))
  assert.ok(label.includes('today'))
})
