import test from 'node:test'
import assert from 'node:assert/strict'
import {
  detectCalendarConflicts,
  getConflictsForMove,
  summarizeCalendarHealth,
} from '@/lib/calendar/conflict-engine'
import type { UnifiedCalendarItem } from '@/lib/calendar/types'

function item(overrides: Partial<UnifiedCalendarItem>): UnifiedCalendarItem {
  return {
    id: 'item',
    type: 'event',
    category: 'events',
    title: 'Item',
    startDate: '2026-05-01',
    endDate: '2026-05-01',
    allDay: false,
    startTime: '18:00',
    endTime: '21:00',
    color: '#111111',
    borderStyle: 'solid',
    isBlocking: true,
    isMultiDay: false,
    ...overrides,
  }
}

test('detectCalendarConflicts flags overlapping events as critical', () => {
  const conflicts = detectCalendarConflicts([
    item({ id: 'event-a', title: 'Dinner A', startTime: '18:00', endTime: '21:00' }),
    item({ id: 'event-b', title: 'Dinner B', startTime: '19:00', endTime: '22:00' }),
  ])

  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].severity, 'critical')
  assert.deepEqual(conflicts[0].itemIds, ['event-a', 'event-b'])
})

test('detectCalendarConflicts flags event versus call as warning', () => {
  const conflicts = detectCalendarConflicts([
    item({ id: 'event-a', title: 'Dinner A', startTime: '18:00', endTime: '21:00' }),
    item({
      id: 'call-a',
      type: 'call',
      category: 'calls',
      title: 'Client Call',
      startTime: '18:30',
      endTime: '19:00',
      isBlocking: false,
    }),
  ])

  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].severity, 'warning')
})

test('getConflictsForMove previews conflicts after moving an event', () => {
  const conflicts = getConflictsForMove(
    [
      item({ id: 'event-a', title: 'Dinner A', startDate: '2026-05-01', endDate: '2026-05-01' }),
      item({ id: 'event-b', title: 'Dinner B', startDate: '2026-05-02', endDate: '2026-05-02' }),
    ],
    'event-a',
    '2026-05-02'
  )

  assert.equal(conflicts.length, 1)
  assert.equal(conflicts[0].date, '2026-05-02')
})

test('summarizeCalendarHealth counts conflicts, signals, waitlist, unpaid events, and gaps', () => {
  const health = summarizeCalendarHealth(
    [
      item({ id: 'event-a', paymentStatus: 'unpaid' }),
      item({ id: 'event-b', startTime: '19:00', endTime: '20:00' }),
      item({
        id: 'signal-a',
        type: 'calendar_entry',
        category: 'intentions',
        title: 'Open Friday',
        subType: 'target_booking',
        isBlocking: false,
      }),
      item({
        id: 'wait-a',
        type: 'waitlist',
        category: 'leads',
        title: 'Waitlist',
        allDay: true,
        isBlocking: false,
      }),
    ],
    [
      {
        event_id: 'event-a',
        event_date: '2026-05-01',
        event_occasion: 'Dinner',
        client_name: 'Client',
        days_until_event: 1,
        missing_block_types: ['prep_session'],
        severity: 'critical',
      },
    ]
  )

  assert.equal(health.conflictCount, 1)
  assert.equal(health.publicSignalCount, 1)
  assert.equal(health.waitlistOpportunityCount, 1)
  assert.equal(health.unpaidEventCount, 1)
  assert.equal(health.criticalPrepGapCount, 1)
})
