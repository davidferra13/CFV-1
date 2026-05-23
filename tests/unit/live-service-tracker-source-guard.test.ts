import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('live service execution migration keeps the progress table contract', () => {
  const migration = read('database/migrations/20260425000003_event_course_progress.sql')

  assert.match(migration, /event_course_progress/)
  assert.match(migration, /CHECK \(status IN \('queued', 'firing', 'served', 'skipped'\)\)/)
  assert.match(migration, /idx_course_progress_event_order/)
})

test('event detail page only loads live service mode for in-progress events', () => {
  const page = read('app/(chef)/events/[id]/page.tsx')

  assert.match(
    page,
    /event\.status === 'in_progress' && \(\s*<Suspense fallback=\{<SkeletonCard \/>\}>\s*<DayOfServiceSection eventId=\{params\.id\} \/>/
  )
  assert.match(page, /getServiceTrackerState\(eventId\)\.catch\(\(\) => null\)/)
  assert.match(page, /getServiceTimeline\(eventId\)\.catch\(\(\) => null\)/)
})

test('ops tab only renders the live service tracker for in-progress events', () => {
  const opsTab = read('app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx')

  assert.match(
    opsTab,
    /event\.status === 'in_progress' && \(\s*<LiveServiceTracker eventId=\{event\.id\} initialCourses=\{courseProgress\} \/>/
  )
})

test('tracker calls initializeCourseProgress(eventId) when no initial courses exist', () => {
  const tracker = read('components/events/live-service-tracker.tsx')

  assert.match(tracker, /initializeCourseProgress\(eventId\)/)
})

test('tracker calls advanceCourseStatus(course.id, newStatus)', () => {
  const tracker = read('components/events/live-service-tracker.tsx')

  assert.match(tracker, /advanceCourseStatus\(course\.id, newStatus\)/)
})

test('tracker keeps the no-menu empty state copy', () => {
  const tracker = read('components/events/live-service-tracker.tsx')

  assert.match(
    tracker,
    /No menu attached to this event\. Add a menu to track service progression\./
  )
})
