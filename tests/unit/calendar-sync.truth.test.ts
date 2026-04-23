import test from 'node:test'
import assert from 'node:assert/strict'

import { __calendarTruthTestUtils } from '@/lib/scheduling/calendar-sync'

const CALENDAR = { id: 'primary', label: 'Primary' }

test('calendar truth expands all-day Google events into blocked date keys', () => {
  const range = __calendarTruthTestUtils.normalizeBusyRange(
    {
      id: 'google-all-day',
      status: 'confirmed',
      start: { date: '2026-06-10' },
      end: { date: '2026-06-12' },
    },
    CALENDAR
  )

  assert.ok(range)
  assert.deepEqual(__calendarTruthTestUtils.getBusyDateKeys(range), ['2026-06-10', '2026-06-11'])
})

test('calendar truth filters self-synced Google events out of external busy reconciliation', () => {
  const selfSynced = __calendarTruthTestUtils.normalizeBusyRange(
    {
      id: 'chef-sync-1',
      status: 'confirmed',
      start: { dateTime: '2026-06-10T18:00:00-04:00' },
      end: { dateTime: '2026-06-10T22:00:00-04:00' },
    },
    CALENDAR
  )
  const external = __calendarTruthTestUtils.normalizeBusyRange(
    {
      id: 'external-1',
      status: 'confirmed',
      start: { dateTime: '2026-06-11T12:00:00-04:00' },
      end: { dateTime: '2026-06-11T14:00:00-04:00' },
    },
    CALENDAR
  )

  assert.ok(selfSynced)
  assert.ok(external)

  const reconciled = __calendarTruthTestUtils.reconcileBusyRanges(
    [selfSynced, external],
    [
      { dateKey: '2026-06-10', googleEventId: 'chef-sync-1' },
      { dateKey: '2026-06-11', googleEventId: null },
    ]
  )

  assert.equal(reconciled.reconciled.length, 1)
  assert.equal(reconciled.reconciled[0]?.googleEventId, 'external-1')
  assert.deepEqual(reconciled.externalBusyDates, ['2026-06-11'])
  assert.equal(reconciled.conflictCount, 1)
})
