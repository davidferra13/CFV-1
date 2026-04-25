# Live Service Execution Tracker Regression Coverage

> Build Spec | Scope: Live Service Execution Tracker only
> Status: Ready to build
> Priority: P1
> Risk: Low (additive tests + small pure helper extraction)

## Recommendation

Build regression coverage for the live service execution tracker before adding any more execution
features.

This is the single highest-leverage remaining action because the tracker now has persistence,
server mutations, and active-service UI, but there are no tests protecting the most important
behavior: idempotent initialization, tenant-scoped status transitions, and in-progress-only
visibility.

## Evidence

- The new table exists and stores course execution state:
  `database/migrations/20260425000003_event_course_progress.sql:4`.
- The table has one progress row per event/course order, enforced by a unique index:
  `database/migrations/20260425000003_event_course_progress.sql:27`.
- Server actions now load, initialize, advance, and update course progress:
  `lib/service-execution/actions.ts:85`,
  `lib/service-execution/actions.ts:91`,
  `lib/service-execution/actions.ts:163`,
  `lib/service-execution/actions.ts:218`.
- Initialization is explicitly gated to active service:
  `lib/service-execution/actions.ts:110`.
- Initialization uses conflict-safe upsert for idempotency:
  `lib/service-execution/actions.ts:153`.
- The client component auto-initializes and advances status from the UI:
  `components/events/live-service-tracker.tsx:117`,
  `components/events/live-service-tracker.tsx:160`.
- The event detail page fetches progress only for `in_progress` events:
  `app/(chef)/events/[id]/page.tsx:385`.
- The Ops tab renders the tracker only for `in_progress` events:
  `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx:111`.
- There is currently no matching test coverage:
  `rg -n "service-execution|event_course_progress|LiveServiceTracker|course progress" tests`
  returns no matches.

## What to Build

Add focused unit/source-guard coverage for live service execution behavior.

### Files to Create

1. `lib/service-execution/progress-core.ts`
2. `tests/unit/service-execution-core.test.ts`
3. `tests/unit/live-service-tracker-source-guard.test.ts`

### Files to Modify

1. `lib/service-execution/actions.ts`

## Implementation Requirements

### 1. Extract Pure Helpers

Create `lib/service-execution/progress-core.ts` with pure helpers used by
`lib/service-execution/actions.ts`.

Export:

```ts
export type CourseStatus = 'queued' | 'firing' | 'served' | 'skipped'

export type CourseProgress = {
  id: string
  event_id: string
  tenant_id: string
  menu_dish_id: string | null
  course_name: string
  course_order: number
  status: CourseStatus
  planned_time: string | null
  fired_at: string | null
  served_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type EventCourseDish = {
  id: string
  course_name: string | null
  course_number: number | null
  sort_order?: number | null
}

export function toCourseProgress(row: unknown): CourseProgress

export function buildCourseProgressInsertRows(params: {
  eventId: string
  tenantId: string
  dishes: EventCourseDish[]
}): Array<{
  event_id: string
  tenant_id: string
  menu_dish_id: string
  course_name: string
  course_order: number
  status: 'queued'
}>

export function buildCourseStatusUpdate(params: {
  current: Pick<CourseProgress, 'fired_at' | 'served_at'>
  newStatus: 'firing' | 'served' | 'skipped'
  nowIso: string
}): Record<string, unknown>
```

Rules:

- Preserve current behavior.
- Keep `CourseStatus` and `CourseProgress` exported from `lib/service-execution/actions.ts` by
  re-exporting the core types, so existing imports keep working.
- `buildCourseProgressInsertRows` must group by `course_number`, keep the first dish after
  `course_number ASC, sort_order ASC`, ignore null/zero course numbers, and emit one row per
  course.
- `buildCourseStatusUpdate` must preserve already-set `fired_at` and `served_at`.
- Do not move authentication or database access into the core file.

### 2. Add Unit Tests

Create `tests/unit/service-execution-core.test.ts`.

Test cases:

1. Groups multiple dishes for the same course into one insert row.
2. Uses the first sorted dish name for the course label.
3. Falls back to `Course N` when `course_name` is empty/null.
4. Ignores invalid course numbers (`null`, `0`).
5. Builds a firing update that sets `fired_at` only when it is missing.
6. Builds a served update that sets `served_at` only when it is missing.
7. Builds a skipped update that does not add timestamps.
8. Normalizes Date timestamps to ISO strings in `toCourseProgress`.

### 3. Add Source Guards

Create `tests/unit/live-service-tracker-source-guard.test.ts`.

Use `node:test`, `node:assert/strict`, and `node:fs`.

Guard:

1. Migration contains `event_course_progress`.
2. Migration contains `CHECK (status IN ('queued', 'firing', 'served', 'skipped'))`.
3. Migration contains `idx_course_progress_event_order`.
4. Event detail page gates `getCourseProgress` behind `event.status === 'in_progress'`.
5. Ops tab gates `LiveServiceTracker` behind `event.status === 'in_progress'`.
6. Tracker calls `initializeCourseProgress(eventId)` when no initial courses exist.
7. Tracker calls `advanceCourseStatus(course.id, newStatus)`.
8. Tracker includes the no-menu empty state text.

## What Not to Do

- Do not add new UI.
- Do not change the event FSM.
- Do not change table names or migration timestamps.
- Do not run `drizzle-kit push`.
- Do not add browser/E2E coverage in this pass.
- Do not broaden scope to KDS, service simulation, prep plans, documents, or AAR.
- Do not rewrite `LiveServiceTracker`; only adjust imports if needed for the helper extraction.

## Verification Commands

Run:

```bash
node --test --import tsx tests/unit/service-execution-core.test.ts tests/unit/live-service-tracker-source-guard.test.ts
npx tsc --noEmit --skipLibCheck
```

If running a full build, use the larger heap that passed in this workspace:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'; npx next build --no-lint
```

## Acceptance Criteria

- New tests pass.
- Existing TypeScript check passes.
- `lib/service-execution/actions.ts` behavior remains unchanged.
- The tracker still initializes only for active service.
- The tracker still renders only inside the Ops tab for `in_progress` events.
