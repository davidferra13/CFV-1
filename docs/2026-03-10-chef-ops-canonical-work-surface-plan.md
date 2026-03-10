# Chef Ops Canonical Work Surface Plan

## Goal

Make ChefFlow answer one question truthfully every time a chef opens the app:

`What is the next real thing I should do right now for each event?`

The current product intent is already correct. The implementation is split across too many systems, and those systems do not all read from the same source of operational truth.

## What I audited

I swept the chef-facing route tree and the shared libraries that can currently surface "what now?" guidance.

Primary route groups reviewed:

- `app/(chef)/dashboard/*`
- `app/(chef)/briefing/*`
- `app/(chef)/queue/*`
- `app/(chef)/events/[id]/*`
- `app/(chef)/shopping/*`
- `app/(chef)/stations/*`
- `app/(chef)/schedule/*`
- `app/(chef)/scheduling/*`
- `app/(chef)/travel/*`
- `app/(chef)/operations/*`
- `app/(chef)/documents/*`

Primary shared libraries reviewed:

- `lib/workflow/*`
- `lib/queue/*`
- `lib/briefing/*`
- `lib/scheduling/*`
- `lib/events/*`
- `lib/documents/*`
- `lib/shopping/*`
- `lib/packing/*`
- `lib/ai/*` where chef readiness is echoed into prompts or summaries

Primary UI components reviewed:

- `components/dashboard/*`
- `components/events/*`
- `components/documents/*`
- `components/scheduling/*`
- `components/stations/*`

Primary tests reviewed:

- `tests/e2e/*`
- `tests/interactions/*`
- `tests/product/*`
- `tests/journey/*`
- `tests/unit/*`

This was not a line by line review of every file in the repo. It was a full route and subsystem sweep of every area that can affect chef operational guidance.

## Current system map

Today the chef can be told what to do by multiple independent systems:

1. Work Surface
   - `lib/workflow/actions.ts`
   - `lib/workflow/confirmed-facts.ts`
   - `lib/workflow/stage-definitions.ts`
   - `lib/workflow/preparable-actions.ts`
   - `components/dashboard/work-surface.tsx`

2. Queue
   - `lib/queue/actions.ts`
   - `lib/queue/build.ts`
   - `lib/queue/providers/event.ts`

3. Briefing
   - `lib/briefing/get-morning-briefing.ts`
   - `lib/briefing/daily-actions.ts`
   - `app/(chef)/briefing/page.tsx`

4. Schedule and prep prompts
   - `lib/scheduling/actions.ts`
   - `lib/scheduling/prep-prompts.ts`
   - `lib/scheduling/dop.ts`
   - `lib/scheduling/task-digest.ts`
   - `app/(chef)/dashboard/_sections/schedule-section.tsx`
   - `components/scheduling/prep-prompts-view.tsx`

5. Event detail operations view
   - `lib/events/readiness.ts`
   - `lib/documents/actions.ts`
   - `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`
   - `components/events/readiness-gate-panel.tsx`
   - `components/documents/document-section.tsx`

6. Mutation points that change readiness
   - `lib/shopping/actions.ts`
   - `lib/scheduling/prep-checklist-actions.ts`
   - `lib/packing/actions.ts`
   - `lib/events/transitions.ts`
   - `app/api/documents/[eventId]/route.ts`

7. AI and assistant surfaces that repeat readiness
   - `lib/ai/remy-context.ts`
   - `app/api/remy/stream/route-instant-answers.ts`
   - `app/api/remy/stream/route-prompt-utils.ts`
   - `lib/ai/remy-morning-briefing.ts`

## What is wrong right now

### 1. The Work Surface does not use enough real ops data

`lib/workflow/actions.ts` currently fetches:

- events
- client relation
- menus
- dish counts
- `event_financial_summary`

It does not fetch or derive enough of the actual operational state that the product already stores.

### 2. Real ops truth already exists elsewhere

Operational truth already lives in the event record and adjacent tables:

- `grocery_list_ready`
- `prep_list_ready`
- `packing_list_ready`
- `timeline_ready`
- `execution_sheet_ready`
- `non_negotiables_checked`
- `shopping_completed_at`
- `prep_completed_at`
- `car_packed`
- `car_packed_at`

Those fields are already used in:

- `lib/scheduling/actions.ts`
- `lib/scheduling/prep-prompts.ts`
- `lib/scheduling/dop.ts`
- `lib/scheduling/task-digest.ts`
- `lib/events/readiness.ts`
- `lib/ai/remy-context.ts`

### 3. There is at least one confirmed state-sync bug

`lib/shopping/actions.ts` marks a shopping list complete, but it does not push that completion back onto the related event. The list becomes complete while the event can still look unshopped.

That means dashboard, queue, briefing, and readiness logic can stay wrong after the chef has actually finished shopping.

### 4. Deep links are too generic

`components/dashboard/work-surface.tsx` and `lib/queue/providers/event.ts` currently send most work items to `/events/[id]`.

That is not good enough. The action needs to open the correct working screen, not just the event shell.

### 5. The dashboard still treats the Work Surface like one widget among many

`work_surface` is configured in `lib/scheduling/types.ts` like a dashboard widget, not like the primary chef operating surface.

That keeps the product in a fragmented state:

- one section for work surface
- one section for prep prompts
- one section for DOP tasks
- one section for shopping
- one section for readiness

Those are all valid views, but they should reflect the same canonical truth.

## Build principles

1. No new guessing.
   - If the system knows a real state, use it.
   - Only fall back to heuristic logic when there is no stored truth.

2. One canonical event ops context.
   - Dashboard, queue, briefing, event detail, and assistant responses should all derive from the same event ops context.

3. One event can have many views, but one truth.
   - Work Surface, Queue, Briefing, and Event Ops can present the state differently.
   - They must not derive different next actions from the same event.

4. Mutations must update canonical state.
   - Shopping complete, prep complete, packing complete, document readiness, and transition overrides must all keep the canonical context current.

5. Build this without a schema migration first.
   - Most of the fields already exist.
   - Start by wiring the existing state together.
   - Only add a database view or RPC later if performance or duplication demands it.

## Implementation plan

## Phase 1 - Create the canonical event ops context

### Purpose

Give the workflow engine a complete event context instead of the current shallow one.

### Files to change

- `lib/workflow/types.ts`
- `lib/workflow/actions.ts`
- `lib/workflow/confirmed-facts.ts`

### Build work

Extend `EventContext` to include:

- event ops flags from `events`
- document readiness summary
- shopping list state
- packing progress summary
- direct action targets per stage if needed

Suggested shape additions:

- `ops`
  - `groceryListReady`
  - `prepListReady`
  - `packingListReady`
  - `timelineReady`
  - `executionSheetReady`
  - `nonNegotiablesChecked`
  - `shoppingCompletedAt`
  - `prepCompletedAt`
  - `carPacked`
  - `carPackedAt`
- `documents`
  - summary booleans for event summary, grocery, prep, execution, checklist, packing, reset, travel
- `shopping`
  - active list id
  - active list status
  - completed list count
- `packing`
  - item counts if available
  - confirmed count if available

Update `getDashboardWorkSurface()` so it fetches all of that in one server pass.

Fetch targets:

- `events`
- `menus`
- `dishes`
- `event_financial_summary`
- `shopping_lists`
- `packing_confirmations`
- any existing document-readiness helper data needed to avoid N+1 calls

### Expected result

The workflow engine now has enough state to answer real operational questions instead of inferring from date, status, and payment alone.

## Phase 2 - Replace proxy facts with real facts

### Purpose

Make the workflow engine stop treating operational readiness like a guess.

### Files to change

- `lib/workflow/confirmed-facts.ts`
- `lib/workflow/stage-definitions.ts`
- `lib/workflow/preparable-actions.ts`

### Build work

Rewrite the operational facts to favor actual state:

- grocery work depends on `grocery_list_ready`
- prep work depends on `prep_list_ready` and `shopping_completed_at` where appropriate
- packing depends on `packing_list_ready` and `car_packed`
- timeline depends on `timeline_ready`
- execution depends on `execution_sheet_ready`
- travel and final day checks depend on `non_negotiables_checked`, `car_packed`, and date windows

Status and payment should remain supporting facts, not the primary operational truth.

Use heuristics only where there is no stored truth, for example:

- if an event is far away, an optional early action can still be heuristic
- if no packing confirmations exist, packing detail can fall back to `packing_list_ready`

### Expected result

For a given event, the engine can say:

- shopping blocks prep
- prep complete means move to packing
- packing complete means move to travel or execution
- missing document readiness blocks specific downstream stages

## Phase 3 - Give every work item a real destination

### Purpose

Make every surfaced action open the exact screen where the chef can do the work.

### Files to change

- `lib/workflow/types.ts`
- `lib/workflow/stage-definitions.ts`
- `components/dashboard/work-surface.tsx`
- `lib/queue/providers/event.ts`

### Build work

Add fields to `WorkItem`:

- `actionUrl`
- `actionLabel`

Stage mapping should be explicit:

- document and setup gaps -> `/events/[id]/documents`
- grocery and shopping work -> `/shopping/[listId]` when an active list exists, otherwise `/events/[id]/documents`
- prep work -> `/events/[id]/prep`
- timeline work -> `/events/[id]/schedule`
- packing work -> `/events/[id]/pack`
- travel work -> `/events/[id]/travel`
- execution and ops review -> `/events/[id]?tab=ops` or the best existing ops target

Update dashboard and queue to use `actionUrl` instead of sending everything to `/events/[id]`.

### Expected result

The main chef screen becomes operational, not informational.

## Phase 4 - Make the Work Surface primary on the dashboard

### Purpose

Turn the dashboard into the chef's actual operating home screen.

### Files to change

- `app/(chef)/dashboard/page.tsx`
- `app/(chef)/dashboard/_sections/intelligence-section.tsx`
- `app/(chef)/dashboard/_sections/schedule-section.tsx`
- `lib/scheduling/types.ts`

### Build work

Promote the canonical Work Surface to the top of the dashboard.

Do not remove prep prompts, DOP tasks, or shopping widgets immediately. Instead:

- make the Work Surface the top answer
- keep the other widgets as supporting views
- reduce duplication where they are merely restating the same truth

Move `work_surface` out of an analytics-style widget role and into a core operations role.

### Expected result

When the chef opens the dashboard, the first thing they see is the truthful next-action board.

## Phase 5 - Fix mutation truth gaps

### Purpose

Ensure every completion action updates the canonical state that the dashboard reads.

### Files to change

- `lib/shopping/actions.ts`
- `lib/scheduling/prep-checklist-actions.ts`
- `lib/packing/actions.ts`
- `app/api/documents/[eventId]/route.ts`
- optionally a new helper such as `lib/events/ops-state.ts`

### Build work

Fix `completeShoppingList()`:

- fetch related `event_id`
- update `events.shopping_completed_at`
- optionally update `grocery_list_ready` only if that matches intended semantics
- revalidate affected event, dashboard, queue, and briefing paths

Audit all other completion paths:

- prep completion already updates `prep_completed_at`
- car packed already updates `car_packed`, `car_packed_at`, `packing_list_ready`
- document generation may need to push or confirm readiness flags if that is part of the intended workflow

If several actions need to update event ops state, centralize that logic in one helper instead of repeating direct table writes.

### Expected result

If the chef finishes work, the rest of the product knows immediately.

## Phase 6 - Rewire queue and briefing to the same truth

### Purpose

Stop queue and briefing from drifting away from the dashboard.

### Files to change

- `lib/queue/actions.ts`
- `lib/queue/build.ts`
- `lib/queue/providers/event.ts`
- `lib/briefing/get-morning-briefing.ts`
- `lib/briefing/daily-actions.ts`
- `app/(chef)/briefing/page.tsx`

### Build work

Queue:

- keep consuming `getDashboardWorkSurface()`
- update queue item hrefs to use the new `actionUrl`
- confirm queue scoring still works when the work items become more operationally accurate

Briefing:

- add a concise "next actions" section derived from the canonical work surface
- avoid duplicating separate readiness heuristics unless they come from the same event ops context

### Expected result

Dashboard, queue, and briefing all tell the same story for the same event.

## Phase 7 - Align assistant and AI surfaces

### Purpose

Stop Remy and other assistant surfaces from reflecting outdated or partial readiness logic.

### Files to change

- `lib/ai/remy-context.ts`
- `lib/ai/remy-morning-briefing.ts`
- `app/api/remy/stream/route-instant-answers.ts`
- `app/api/remy/stream/route-prompt-utils.ts`

### Build work

Where possible, source chef ops truth from the same canonical event ops context or the same underlying fields used by the new workflow engine.

Do not let assistant guidance invent a different next action than dashboard or queue.

### Expected result

If the chef asks the assistant what to do next, the answer matches the dashboard.

## Phase 8 - Add behavioral tests

### Purpose

Test truth transitions, not just page loads.

### Files to add or expand

- `tests/unit/workflow-confirmed-facts.test.ts`
- `tests/unit/workflow-stage-definitions.test.ts`
- `tests/integration/workflow-ops-state-sync.integration.test.ts`
- `tests/e2e/02-dashboard.spec.ts`
- `tests/interactions/40-core-flow-completions.spec.ts`
- `tests/interactions/07-dop-and-kds.spec.ts`
- `tests/product/04-tier4-operations.spec.ts`

### Test cases

1. Shopping completion updates event ops state
   - complete shopping list
   - assert `shopping_completed_at` is set on event
   - assert dashboard item changes from shopping blocker to prep-ready work

2. Prep completion advances next action
   - mark prep complete
   - assert next action becomes packing or travel depending on state

3. Car packed clears packing blocker
   - mark car packed
   - assert packing stage leaves blocked state

4. Missing timeline keeps execution blocked
   - even if other items are ready
   - timeline-dependent work should stay blocked

5. Dashboard, queue, and briefing agree
   - seed one event
   - assert all three surfaces point to the same next action and same target URL

## Recommended delivery order

Use small build slices instead of one giant rewrite.

### Slice 1

Canonical event ops context plus workflow engine update.

Files:

- `lib/workflow/types.ts`
- `lib/workflow/actions.ts`
- `lib/workflow/confirmed-facts.ts`
- `lib/workflow/stage-definitions.ts`
- `lib/workflow/preparable-actions.ts`

### Slice 2

Action URLs and dashboard wiring.

Files:

- `components/dashboard/work-surface.tsx`
- `app/(chef)/dashboard/_sections/intelligence-section.tsx`
- `app/(chef)/dashboard/page.tsx`
- `lib/queue/providers/event.ts`

### Slice 3

Mutation sync fixes.

Files:

- `lib/shopping/actions.ts`
- `lib/scheduling/prep-checklist-actions.ts`
- `lib/packing/actions.ts`
- optional `lib/events/ops-state.ts`

### Slice 4

Queue and briefing alignment.

Files:

- `lib/queue/*`
- `lib/briefing/*`
- `app/(chef)/briefing/page.tsx`

### Slice 5

Assistant alignment and tests.

Files:

- `lib/ai/*`
- `tests/*`

## Acceptance criteria

This build is complete when all of the following are true:

1. The dashboard's top section tells the chef the next real action for each active event.
2. Clicking a work item opens the exact working screen for that action.
3. Completing shopping, prep, and packing updates the event state that drives dashboard truth.
4. Queue and briefing agree with the dashboard for the same event.
5. Assistant responses do not contradict the dashboard.
6. Behavioral tests cover ops-state transitions end to end.

## What not to do

1. Do not create a second readiness engine.
2. Do not keep adding more widget-specific heuristics.
3. Do not solve this with more text or AI summaries first.
4. Do not add a schema migration before wiring the existing fields together.

## Immediate next build step

Start with Phase 1 and Phase 2 together.

That means:

- expand `EventContext`
- fetch real ops state in `getDashboardWorkSurface()`
- replace proxy operational facts with real ones

Everything else becomes easier once the canonical event ops context exists.
