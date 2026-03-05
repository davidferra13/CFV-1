import test from 'node:test'
import assert from 'node:assert/strict'
import { detectSessionEventConflicts } from '@/lib/availability/session-conflicts'

test('detectSessionEventConflicts flags same-day events when timing is unknown', () => {
  const conflicts = detectSessionEventConflicts({
    sessions: [
      {
        session_date: '2026-04-12',
        meal_slot: 'dinner',
        start_time: null,
        end_time: null,
      },
    ],
    events: [
      {
        id: 'evt-1',
        event_date: '2026-04-12',
        status: 'confirmed',
        occasion: 'Birthday',
        serve_time: null,
        arrival_time: null,
        departure_time: null,
      },
    ],
  })

  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0]?.event_id, 'evt-1')
})

test('detectSessionEventConflicts flags overlapping time windows', () => {
  const conflicts = detectSessionEventConflicts({
    sessions: [
      {
        session_date: '2026-05-01',
        meal_slot: 'lunch',
        start_time: '12:00:00',
        end_time: '14:00:00',
      },
    ],
    events: [
      {
        id: 'evt-2',
        event_date: '2026-05-01',
        status: 'paid',
        occasion: 'Corporate lunch',
        serve_time: '13:00:00',
        arrival_time: '12:30:00',
        departure_time: '15:00:00',
      },
    ],
  })

  assert.equal(conflicts.length, 1)
  assert.match(conflicts[0]?.reason || '', /Time window overlaps/)
})

test('detectSessionEventConflicts falls back to meal-slot overlap when windows do not overlap', () => {
  const conflicts = detectSessionEventConflicts({
    sessions: [
      {
        session_date: '2026-05-02',
        meal_slot: 'dinner',
        start_time: null,
        end_time: null,
      },
    ],
    events: [
      {
        id: 'evt-3',
        event_date: '2026-05-02',
        status: 'accepted',
        occasion: 'Anniversary',
        serve_time: '18:30:00',
        arrival_time: null,
        departure_time: null,
      },
    ],
  })

  assert.equal(conflicts.length, 1)
  assert.match(conflicts[0]?.reason || '', /Meal slot overlaps/)
})

test('detectSessionEventConflicts ignores different dates', () => {
  const conflicts = detectSessionEventConflicts({
    sessions: [
      {
        session_date: '2026-06-01',
        meal_slot: 'dinner',
        start_time: '18:00:00',
        end_time: '20:00:00',
      },
    ],
    events: [
      {
        id: 'evt-4',
        event_date: '2026-06-02',
        status: 'confirmed',
        occasion: 'Different day',
        serve_time: '18:00:00',
        arrival_time: '17:00:00',
        departure_time: '21:00:00',
      },
    ],
  })

  assert.equal(conflicts.length, 0)
})
