import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCourseProgressInsertRows,
  buildCourseStatusUpdate,
  toCourseProgress,
} from '@/lib/service-execution/progress-core'

test('groups multiple dishes for the same course into one insert row', () => {
  const rows = buildCourseProgressInsertRows({
    eventId: 'event-1',
    tenantId: 'tenant-1',
    dishes: [
      { id: 'dish-1', course_name: 'Canapes', course_number: 1, sort_order: 1 },
      { id: 'dish-2', course_name: 'Soup', course_number: 1, sort_order: 2 },
      { id: 'dish-3', course_name: 'Entree', course_number: 2, sort_order: 1 },
    ],
  })

  assert.deepEqual(
    rows.map((row) => row.course_order),
    [1, 2]
  )
  assert.equal(rows[0].menu_dish_id, 'dish-1')
})

test('uses the first sorted dish name for the course label', () => {
  const rows = buildCourseProgressInsertRows({
    eventId: 'event-1',
    tenantId: 'tenant-1',
    dishes: [
      { id: 'dish-late', course_name: 'Late Main', course_number: 2, sort_order: 20 },
      { id: 'dish-first', course_name: 'First Main', course_number: 2, sort_order: 10 },
    ],
  })

  assert.equal(rows[0].menu_dish_id, 'dish-first')
  assert.equal(rows[0].course_name, 'First Main')
})

test('falls back to Course N when course_name is empty or null', () => {
  const rows = buildCourseProgressInsertRows({
    eventId: 'event-1',
    tenantId: 'tenant-1',
    dishes: [
      { id: 'dish-1', course_name: '   ', course_number: 1, sort_order: 1 },
      { id: 'dish-2', course_name: null, course_number: 2, sort_order: 1 },
    ],
  })

  assert.equal(rows[0].course_name, 'Course 1')
  assert.equal(rows[1].course_name, 'Course 2')
})

test('ignores invalid course numbers', () => {
  const rows = buildCourseProgressInsertRows({
    eventId: 'event-1',
    tenantId: 'tenant-1',
    dishes: [
      { id: 'dish-null', course_name: 'No Course', course_number: null, sort_order: 1 },
      { id: 'dish-zero', course_name: 'Zero Course', course_number: 0, sort_order: 1 },
      { id: 'dish-valid', course_name: 'Starter', course_number: 1, sort_order: 1 },
    ],
  })

  assert.deepEqual(
    rows.map((row) => row.menu_dish_id),
    ['dish-valid']
  )
})

test('builds a firing update that sets fired_at only when it is missing', () => {
  const nowIso = '2026-04-24T12:00:00.000Z'

  assert.deepEqual(
    buildCourseStatusUpdate({
      current: { fired_at: null, served_at: null },
      newStatus: 'firing',
      nowIso,
    }),
    { status: 'firing', updated_at: nowIso, fired_at: nowIso }
  )

  assert.deepEqual(
    buildCourseStatusUpdate({
      current: { fired_at: '2026-04-24T11:00:00.000Z', served_at: null },
      newStatus: 'firing',
      nowIso,
    }),
    { status: 'firing', updated_at: nowIso, fired_at: '2026-04-24T11:00:00.000Z' }
  )
})

test('builds a served update that sets served_at only when it is missing', () => {
  const nowIso = '2026-04-24T12:00:00.000Z'

  assert.deepEqual(
    buildCourseStatusUpdate({
      current: { fired_at: null, served_at: null },
      newStatus: 'served',
      nowIso,
    }),
    { status: 'served', updated_at: nowIso, served_at: nowIso }
  )

  assert.deepEqual(
    buildCourseStatusUpdate({
      current: { fired_at: null, served_at: '2026-04-24T11:30:00.000Z' },
      newStatus: 'served',
      nowIso,
    }),
    { status: 'served', updated_at: nowIso, served_at: '2026-04-24T11:30:00.000Z' }
  )
})

test('builds a skipped update that does not add timestamps', () => {
  assert.deepEqual(
    buildCourseStatusUpdate({
      current: { fired_at: null, served_at: null },
      newStatus: 'skipped',
      nowIso: '2026-04-24T12:00:00.000Z',
    }),
    { status: 'skipped', updated_at: '2026-04-24T12:00:00.000Z' }
  )
})

test('normalizes Date timestamps to ISO strings in toCourseProgress', () => {
  const progress = toCourseProgress({
    id: 'progress-1',
    event_id: 'event-1',
    tenant_id: 'tenant-1',
    menu_dish_id: 'dish-1',
    course_name: 'Starter',
    course_order: 1,
    status: 'firing',
    planned_time: null,
    fired_at: new Date('2026-04-24T12:00:00.000Z'),
    served_at: null,
    notes: null,
    created_at: new Date('2026-04-24T10:00:00.000Z'),
    updated_at: new Date('2026-04-24T12:05:00.000Z'),
  })

  assert.equal(progress.fired_at, '2026-04-24T12:00:00.000Z')
  assert.equal(progress.created_at, '2026-04-24T10:00:00.000Z')
  assert.equal(progress.updated_at, '2026-04-24T12:05:00.000Z')
})
