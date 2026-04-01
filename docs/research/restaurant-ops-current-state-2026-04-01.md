# Research: Restaurant Ops Current State

**Date:** 2026-04-01  
**Question:** What restaurant-operations functionality already exists in ChefFlow today, where has it drifted, and what is the smallest reliable polish scope?

## Origin Context

The developer's reasoning was explicit: ChefFlow already has a serious restaurant-running system, including production projection, task assignment and delegation, station setup, station-level recipe access, prep visibility, grocery visibility, ordering visibility, and day-to-day operational transparency. The research goal was not to invent features but to surface what already exists, preserve why those systems were built, and identify what must be polished or repaired so the product can honestly present itself as a real restaurant-operations system.

## Summary

ChefFlow already has a substantial restaurant-operations foundation. Stations, clipboards, orders, waste logs, ops logs, daily ops, tasks, staff execution surfaces, morning briefing, inventory forecasting, and vendor invoices are all present in code (`app/(chef)/stations/page.tsx:17-90`, `app/(chef)/stations/daily-ops/page.tsx:141-503`, `app/(chef)/tasks/page.tsx:17-64`, `app/(staff)/staff-station/page.tsx:20-128`, `app/(chef)/inventory/page.tsx:107-157`, `app/(chef)/briefing/page.tsx:62-80`).

The main problem is not missing concepts. The main problem is drift: station templates are not actually verified, station recipe loading falls back to the wrong data, staff check-out is not surfaced cleanly, task completion logging disagrees with the schema, dependency/Gantt code uses stale task fields, auto-reorder uses the wrong lookup key, vendor-invoice actions revalidate the wrong route, and Daily Ops advertises a print action that does not go where it says (`lib/staff/staff-portal-actions.ts:545-582`, `components/staff/staff-shift-controls.tsx:20-77`, `lib/tasks/actions.ts:364-373`, `lib/staff/activity-board.ts:58-63`, `lib/tasks/dependency-actions.ts:47-50`, `lib/inventory/auto-reorder-actions.ts:148-157`, `lib/inventory/vendor-invoice-actions.ts:126`, `components/stations/daily-ops-actions-bar.tsx:63-75`).

## Detailed Findings

### 1. Station operations are broad and real

ChefFlow already has a chef station hub, station detail pages, a daily clipboard flow, print surfaces, orders, waste logging, ops logging, and daily ops aggregation (`app/(chef)/stations/page.tsx:17-90`, `app/(chef)/stations/[id]/page.tsx:23-62`, `app/(chef)/stations/[id]/clipboard/page.tsx:19-110`, `app/(chef)/stations/[id]/clipboard/print/page.tsx:14-146`, `app/(chef)/stations/orders/page.tsx:13-149`, `app/(chef)/stations/waste/page.tsx:30-128`, `app/(chef)/stations/ops-log/page.tsx:36-97`, `app/(chef)/stations/daily-ops/page.tsx:141-503`).

The server-side station stack is also real. `lib/stations/actions.ts` creates stations, loads station detail, and manages station menu-item/component links; `lib/stations/clipboard-actions.ts` generates clipboard rows, updates counts and notes, marks 86s, and manages shift handoff snapshots (`lib/stations/actions.ts:63-99`, `lib/stations/actions.ts:210-437`, `lib/stations/clipboard-actions.ts:53-174`, `lib/stations/clipboard-actions.ts:176-243`, `lib/stations/clipboard-actions.ts:359-506`).

The current schema supports this footprint through `stations`, `station_components`, `station_menu_items`, `clipboard_entries`, `shift_logs`, `order_requests`, `ops_log`, and `waste_log` (`lib/db/migrations/schema.ts:22366-22445`, `lib/db/migrations/schema.ts:11084-11112`, `lib/db/migrations/schema.ts:21458-21486`, `lib/db/migrations/schema.ts:17354-17501`, `lib/db/migrations/schema.ts:23780-23808`).

What is not verified is a reusable station preset/template system. The current station create path only inserts basic station fields, and the `stations` table itself is also basic (`lib/stations/actions.ts:63-99`, `lib/db/migrations/schema.ts:22424-22445`).

### 2. Daily Ops and briefing already aggregate restaurant operations

The Daily Ops page already synthesizes station, prep, inventory, and related operational data into one chef-facing surface, and Morning Briefing already exists as a separate aggregation layer (`app/(chef)/stations/daily-ops/page.tsx:141-503`, `lib/stations/daily-ops-actions.ts:70-305`, `app/(chef)/briefing/page.tsx:62-80`, `lib/briefing/get-morning-briefing.ts:112-394`).

The polish issue here is honesty, not breadth. The Daily Ops action bar includes a `Print Clipboards` control that routes to `/stations`, which is not the named print action (`components/stations/daily-ops-actions-bar.tsx:63-75`).

### 3. The staff execution portal exists, but key flows drift from the intent

The staff side already has dashboard, tasks, station, recipes, and schedule pages, along with staff-specific actions for tasks, clipboard data, station data, recipes, and shift logging (`app/(staff)/staff-dashboard/page.tsx:19-220`, `app/(staff)/staff-tasks/page.tsx:13-123`, `app/(staff)/staff-station/page.tsx:20-128`, `app/(staff)/staff-recipes/page.tsx:17-101`, `app/(staff)/staff-schedule/page.tsx:12-137`, `lib/staff/staff-portal-actions.ts:103-173`, `lib/staff/staff-portal-actions.ts:343-679`).

The permission boundary is also intentional. Staff clipboard UI exposes editable notes and some production-state fields but keeps `need_to_make`, `made`, and 86 controls read-only where appropriate (`components/staff/staff-clipboard-view.tsx:184-213`, `components/staff/staff-clipboard-view.tsx:250-253`).

Two drift problems stand out. First, the server already supports shift check-in and check-out, but the visible staff controls only render a check-in path cleanly (`lib/staff/staff-portal-actions.ts:611-679`, `components/staff/staff-shift-controls.tsx:20-77`). Second, the staff recipe loader verifies the station, reads station menu links, and then still falls back to all recipes while also querying stale recipe fields (`lib/staff/staff-portal-actions.ts:521-605`, `lib/db/migrations/schema.ts:24383-24411`).

The good news is that true station-scoped recipe books do not require a new table. The existing bridge is already present: `station_menu_items.menu_item_id -> menu_items.recipe_id -> recipes.id` (`lib/staff/staff-portal-actions.ts:537-565`, `lib/db/migrations/schema.ts:22398-22422`, `lib/db/migrations/schema.ts:16812-16832`).

### 4. Tasks are substantial, but advanced scheduling drifted from the current schema

ChefFlow already has a real task system with chef task pages, recurring/carry-forward/template support, and a separate Gantt/dependency surface (`app/(chef)/tasks/page.tsx:17-64`, `app/(chef)/tasks/gantt/page.tsx:5-39`, `lib/tasks/actions.ts:136-183`, `lib/tasks/actions.ts:336-409`, `lib/tasks/carry-forward.ts:19-49`, `lib/tasks/template-actions.ts:57-214`, `lib/db/migrations/schema.ts:22888-22916`, `lib/db/migrations/schema.ts:22866-22886`).

The dependency layer is where drift is visible. `lib/tasks/dependency-actions.ts` still selects `text`, `completed`, and `estimated_minutes`, while the current `tasks` table uses `title` and `status` and does not define `estimated_minutes` (`lib/tasks/dependency-actions.ts:47-50`, `lib/tasks/dependency-actions.ts:122-149`, `lib/tasks/dependency-actions.ts:223-266`, `lib/db/migrations/schema.ts:22888-22916`).

There is also an id-contract bug: the UI passes task ids to remove a dependency, but the server action deletes by dependency-record id (`components/tasks/dependency-picker.tsx:60-67`, `components/tasks/dependency-picker.tsx:91-97`, `lib/tasks/dependency-actions.ts:189-208`).

### 5. Task accountability is internally inconsistent

Task completion history is meant to be first-class, but the code does not consistently use the schema. Both chef and staff completion writers insert a `completed_by` field, while the actual `task_completion_log` schema uses `staff_member_id` (`lib/tasks/actions.ts:364-373`, `lib/staff/staff-portal-actions.ts:213-220`, `lib/db/migrations/schema.ts:22648-22676`).

The reader is also stale. `lib/staff/activity-board.ts` selects and matches `completed_by`, and `/staff/live` depends on that board output, so fixing only the writers would still leave the activity feed wrong (`lib/staff/activity-board.ts:58-63`, `lib/staff/activity-board.ts:100-105`, `app/(chef)/staff/live/page.tsx:139-145`).

### 6. Inventory and procurement are real, but two flows have drifted

The inventory area already exposes forecasting and adjacent operational tools, and demand forecasting itself walks event/menu/dish/component/ingredient relationships rather than using a trivial placeholder (`app/(chef)/inventory/page.tsx:107-157`, `lib/inventory/demand-forecast-actions.ts:55-257`).

Two specific mismatches were verified. Auto-reorder looks up `reorder_settings` by `ingredient_id`, but the current schema is keyed by `ingredient_name` (`lib/inventory/auto-reorder-actions.ts:148-157`, `lib/db/migrations/schema.ts:7459-7487`). Vendor invoice mutations call `revalidatePath` for the wrong route even though the page lives at `/inventory/vendor-invoices` (`app/(chef)/inventory/vendor-invoices/page.tsx:49-98`, `lib/inventory/vendor-invoice-actions.ts:126`, `lib/inventory/vendor-invoice-actions.ts:200`, `lib/inventory/vendor-invoice-actions.ts:298`).

### 7. Navigation already surfaces most of the system

The chef navigation already exposes stations, tasks, inventory, and briefing clusters. That means the immediate problem is not missing top-level nav real estate; it is making the linked surfaces behave truthfully (`components/navigation/nav-config.tsx:1169-1185`, `components/navigation/nav-config.tsx:1392-1444`, `components/navigation/nav-config.tsx:1504-1506`).

### 8. Auth and tenant boundaries are already present

Chef and staff auth are already separated through `requireChef()` and `requireStaff()`, and chef identity/tenant scoping already flows through the existing auth helpers (`lib/auth/get-user.ts:16-18`, `lib/auth/get-user.ts:96-143`, `lib/auth/get-user.ts:222-259`). This supports a reliability pass that fixes behavior without reopening the role model.

## Gaps

- Tenant data completeness for station-to-menu-item-to-recipe linking was not audited across live data. The relational path exists, but live coverage is still unknown.
- Ingredient-name quality for `reorder_settings` matching is not verified across tenant data, so schema-aligned logic may still expose data-normalization gaps.
- The operational importance of `clean-schema.sql` drift was not fully investigated; schema reality in `lib/db/migrations/schema.ts` was prioritized instead.
- No runtime tenant session was used during this research pass; findings are code-verified, not live-behavior-verified.

## Recommendations

- Treat this as a surfacing and reliability pass, not a new platform build.
- Fix task completion logging and activity-board reading together first because they are the most likely to create false accountability data (`lib/tasks/actions.ts:364-373`, `lib/staff/activity-board.ts:58-63`).
- Fix station recipe scoping and staff check-out next because they directly affect the staff operating loop the developer described (`lib/staff/staff-portal-actions.ts:521-605`, `lib/staff/staff-portal-actions.ts:611-679`, `components/staff/staff-shift-controls.tsx:20-77`).
- Fix dependency/Gantt stale fields, auto-reorder schema mismatch, vendor-invoice revalidation, and the Daily Ops print affordance in the same pass so the broader operations footprint becomes trustworthy instead of selectively broken (`lib/tasks/dependency-actions.ts:47-50`, `lib/inventory/auto-reorder-actions.ts:148-157`, `lib/inventory/vendor-invoice-actions.ts:126`, `components/stations/daily-ops-actions-bar.tsx:63-75`).
- Keep station presets/templates out of this scope unless separately specified, because current code does not verify that capability yet (`lib/stations/actions.ts:63-99`, `lib/db/migrations/schema.ts:22424-22445`).
