import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSeriesSchedulePlan,
  getDefaultServeTimeForMealSlot,
} from '@/lib/booking/series-planning'

test('buildSeriesSchedulePlan expands a date range into daily default sessions', () => {
  const plan = buildSeriesSchedulePlan({
    scheduleRequest: {
      start_date: '2026-04-10',
      end_date: '2026-04-13',
      outline: 'Client wants flexible lunch/dinner mix.',
    },
    fallbackDate: '2026-04-10',
    fallbackGuestCount: 8,
  })

  assert.equal(plan.start_date, '2026-04-10')
  assert.equal(plan.end_date, '2026-04-13')
  assert.equal(plan.sessions.length, 4)
  assert.deepEqual(
    plan.sessions.map((session) => session.session_date),
    ['2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13']
  )
  assert.ok(plan.sessions.every((session) => session.meal_slot === 'dinner'))
  assert.equal(plan.sessions[0]?.notes, 'Client wants flexible lunch/dinner mix.')
})

test('buildSeriesSchedulePlan normalizes, sorts, and deduplicates explicit sessions', () => {
  const plan = buildSeriesSchedulePlan({
    scheduleRequest: {
      start_date: '2026-05-01',
      end_date: '2026-05-03',
      sessions: [
        {
          service_date: '2026-05-02',
          meal_slot: 'dinner',
          execution_type: 'on_site',
          start_time: '19:30',
        },
        {
          service_date: '2026-05-01',
          meal_slot: 'lunch',
          execution_type: 'drop_off',
          start_time: '12:00:00',
        },
        {
          service_date: '2026-05-01',
          meal_slot: 'lunch',
          execution_type: 'drop_off',
          start_time: '12:00',
        },
      ],
    },
    fallbackDate: '2026-05-01',
    fallbackGuestCount: 6,
  })

  assert.equal(plan.sessions.length, 2)
  assert.deepEqual(
    plan.sessions.map((session) => ({
      date: session.session_date,
      slot: session.meal_slot,
      start: session.start_time,
      order: session.sort_order,
    })),
    [
      { date: '2026-05-01', slot: 'lunch', start: '12:00:00', order: 1 },
      { date: '2026-05-02', slot: 'dinner', start: '19:30:00', order: 2 },
    ]
  )
})

test('buildSeriesSchedulePlan falls back to a single default session when no range exists', () => {
  const plan = buildSeriesSchedulePlan({
    scheduleRequest: {},
    fallbackDate: '2026-06-15',
    fallbackGuestCount: 4,
  })

  assert.equal(plan.start_date, '2026-06-15')
  assert.equal(plan.end_date, '2026-06-15')
  assert.equal(plan.sessions.length, 1)
  assert.equal(plan.sessions[0]?.session_date, '2026-06-15')
  assert.equal(plan.sessions[0]?.guest_count, 4)
})

test('getDefaultServeTimeForMealSlot returns stable defaults', () => {
  assert.equal(getDefaultServeTimeForMealSlot('breakfast'), '08:00:00')
  assert.equal(getDefaultServeTimeForMealSlot('lunch'), '12:00:00')
  assert.equal(getDefaultServeTimeForMealSlot('dinner'), '18:00:00')
  assert.equal(getDefaultServeTimeForMealSlot('late_snack'), '22:00:00')
  assert.equal(getDefaultServeTimeForMealSlot('dropoff'), '10:00:00')
  assert.equal(getDefaultServeTimeForMealSlot('other'), '18:00:00')
})
