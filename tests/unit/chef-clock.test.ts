import test from 'node:test'
import assert from 'node:assert/strict'

import {
  dateKeyForChefClock,
  daysUntilChefDate,
  getChefClock,
  isSameChefDate,
  resolveChefClockTimezone,
} from '@/lib/time/chef-clock'

test('getChefClock uses chef timezone for local date across UTC midnight', () => {
  const clock = getChefClock({
    now: '2026-04-29T02:42:14.000Z',
    chefTimezone: 'America/New_York',
  })

  assert.equal(clock.utcNow, '2026-04-29T02:42:14.000Z')
  assert.equal(clock.timezone, 'America/New_York')
  assert.equal(clock.timezoneSource, 'chef')
  assert.equal(clock.localDate, '2026-04-28')
  assert.equal(clock.hour, 22)
  assert.equal(clock.timeOfDay, 'late_night')
  assert.match(clock.note, /late night/)
})

test('resolveChefClockTimezone prefers event, then chef, then browser, then fallback', () => {
  assert.deepEqual(
    resolveChefClockTimezone({
      eventTimezone: 'America/Los_Angeles',
      chefTimezone: 'America/New_York',
      browserTimezone: 'America/Chicago',
    }),
    { timezone: 'America/Los_Angeles', source: 'event' }
  )
  assert.deepEqual(
    resolveChefClockTimezone({
      eventTimezone: '',
      chefTimezone: 'America/New_York',
      browserTimezone: 'America/Chicago',
    }),
    { timezone: 'America/New_York', source: 'chef' }
  )
  assert.deepEqual(resolveChefClockTimezone({ chefTimezone: 'bad-zone' }), {
    timezone: 'America/New_York',
    source: 'fallback',
  })
})

test('date helpers compare date-only and timestamp values in chef local time', () => {
  const clock = getChefClock({
    now: '2026-04-29T02:42:14.000Z',
    chefTimezone: 'America/New_York',
  })

  assert.equal(dateKeyForChefClock('2026-04-28', clock), '2026-04-28')
  assert.equal(dateKeyForChefClock('2026-04-29T02:00:00.000Z', clock), '2026-04-28')
  assert.equal(isSameChefDate('2026-04-29T02:00:00.000Z', clock), true)
  assert.equal(daysUntilChefDate('2026-04-30', clock), 2)
})

test('getChefClock handles daylight saving transition instants', () => {
  const clock = getChefClock({
    now: '2026-03-08T07:30:00.000Z',
    chefTimezone: 'America/New_York',
  })

  assert.equal(clock.localDate, '2026-03-08')
  assert.equal(clock.hour, 3)
  assert.match(clock.timeLabel, /EDT/)
})
