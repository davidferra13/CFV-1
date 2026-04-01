# Spec: Restaurant Ops Surface and Reliability Pass

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date             | Agent/Session      | Commit  |
| ------------- | ---------------- | ------------------ | ------- |
| Created       | 2026-04-01 00:58 | Planner + Research |         |
| Status: ready | 2026-04-01 00:58 | Planner + Research |         |
| Status: built | 2026-04-01       | Builder            | pending |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer described ChefFlow as already having an elaborate restaurant-operating system, not a thin task list. In their words, the product already projects what needs to be made, shows what is being made, lets operators understand production state, assign and delegate work, and lets staff with less access perform work, check tasks off, and leave notes in both directions. They emphasized that stations already exist, that station types like grill and oven were part of the thinking, that station-level recipe books were part of the build, and that the system was meant to make prep state, grocery state, ordering state, and day-to-day station status fully transparent. The request is to surface everything that already exists, preserve the reasoning behind it, talk about it honestly in chat, and polish the feature until it works as one coherent restaurant-operations system instead of a collection of partially drifted surfaces.

### Developer Intent

- **Core goal:** Turn the existing restaurant-operations footprint into a coherent, trustworthy product surface that chefs and staff can actually rely on day to day.
- **Key constraints:** Reuse the existing routes, auth boundaries, and data model where possible; do not invent a new station-template platform or broaden staff permissions during this pass.
- **Motivation:** The leverage is no longer in adding more operational concepts; it is in making the already-built concepts visible, internally consistent, and faithful to the developer's original restaurant workflow intent.
- **Success from the developer's perspective:** A builder can see what exists today, preserve why it exists, and implement a polish/reliability pass that makes stations, tasks, recipes, shift execution, prep visibility, and inventory support read as one intentional operating system.

### Execution Translation

#### Requirements

- Surface the existing restaurant-operations breadth honestly from the current chef and staff entry points.
- Make station recipe books truly station-scoped by using existing menu-item-to-recipe relationships instead of falling back to all recipes.
- Complete the staff station execution loop by supporting both check-in and check-out from the staff UI.
- Repair task accountability so task completion writes and reads the same schema fields everywhere.
- Repair task dependency and Gantt surfaces so they use the current task schema and remove dependencies by stable data, not a mismatched id.
- Repair inventory/procurement drift where auto-reorder and vendor invoice refresh behavior no longer matches the schema or route structure.
- Remove or relabel misleading affordances that imply capabilities the current code does not actually provide.

#### Constraints

- No new database tables or columns in this pass.
- No widening of staff write access beyond the current clipboard/task boundaries.
- No fallback from a station-specific recipe request to the full recipe catalog.
- No station preset/template system in this pass unless separately specified later.
- No task-duration schema expansion in this pass.

#### Behaviors

- When station-linked recipes do not exist, the UI must show an honest empty state instead of unrelated recipes.
- When a staff member has an active shift, the staff station surface must present a check-out action without requiring hidden ids or admin tooling.
- When a link or button cannot complete the named action, it must be removed, relabeled, or routed to a real destination.

---

## What This Does (Plain English)

This spec turns the existing station, clipboard, task, recipe, shift, prep, and inventory surfaces into one reliable restaurant-operations layer. Chefs keep the broad operational controls they already have, staff keep limited execution access, and the broken joins, stale schema assumptions, and misleading UI affordances that currently undermine trust are repaired without introducing a new platform or schema rewrite.

---

## Why It Matters

ChefFlow already contains a large amount of restaurant-operations infrastructure, but several critical flows have drifted away from the current schema and UI reality. This pass matters because trust breaks faster from a few dishonest or stale surfaces than from missing features.

---

## Files to Create

| File | Purpose                                                            |
| ---- | ------------------------------------------------------------------ |
| None | This pass is a reliability/polish pass over existing product code. |

---

## Files to Modify

| File                                            | What to Change                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `app/(chef)/stations/page.tsx`                  | Surface the existing station-adjacent operational links more clearly from the chef station hub. |
| `components/stations/daily-ops-actions-bar.tsx` | Remove or correct the misleading `Print Clipboards` link.                                       |
| `lib/staff/staff-portal-actions.ts`             | Fix station recipe loading; return active-shift state cleanly; support safe check-out flow.     |
| `app/(staff)/staff-station/page.tsx`            | Render active-shift state so check-in/check-out are both available in the staff workflow.       |
| `components/staff/staff-shift-controls.tsx`     | Add check-out state and actions using server-returned shift state instead of hidden ids.        |
| `app/(staff)/staff-recipes/page.tsx`            | Show honest station-scoped recipe results and empty states.                                     |
| `lib/tasks/actions.ts`                          | Write task completion log entries using the actual schema field names.                          |
| `lib/tasks/dependency-actions.ts`               | Replace stale task-field usage and pair-id mismatch with current-schema dependency behavior.    |
| `components/tasks/dependency-picker.tsx`        | Remove dependencies by stable task pair and display current task fields.                        |
| `components/tasks/gantt-view.tsx`               | Consume the corrected dependency/task model and expose any duration heuristic explicitly.       |
| `lib/staff/activity-board.ts`                   | Read task completion log entries using the actual schema fields.                                |
| `lib/inventory/auto-reorder-actions.ts`         | Align reorder-setting lookups with the actual schema keying.                                    |
| `lib/inventory/vendor-invoice-actions.ts`       | Revalidate the correct route after vendor-invoice mutations.                                    |

---

## Database Changes

None.

---

## Data Model

- `stations` is a lightweight station definition with `name`, optional `description`, `display_order`, and timestamps; there is no verified preset/template field or companion template table in the current schema (`lib/db/migrations/schema.ts:22424-22445`).
- `station_menu_items` links a station to `menu_items`, and `station_components` links a station to production components; these are the current bridge tables for station-specific operational context (`lib/db/migrations/schema.ts:22398-22422`, `lib/db/migrations/schema.ts:22366-22395`).
- `clipboard_entries` stores day-level station production state including `need_to_make`, `made`, `notes`, and `is_86d`; `shift_logs` stores check-in, check-out, and handoff notes for station shifts (`lib/db/migrations/schema.ts:11084-11112`, `lib/db/migrations/schema.ts:21458-21486`).
- `tasks` uses the current task vocabulary: `title`, `status`, due fields, assignee, station, and recurrence metadata; completion history lives in `task_completion_log`, whose schema uses `staff_member_id` rather than `completed_by` (`lib/db/migrations/schema.ts:22888-22916`, `lib/db/migrations/schema.ts:22648-22676`).
- `task_dependencies` is the dependency join table used by the Gantt/dependency surfaces (`lib/db/migrations/schema.ts:22680-22713`).
- Station recipe scoping can use the existing chain `station_menu_items.menu_item_id -> menu_items.recipe_id -> recipes.id`; `recipes` uses `name`, `method`, and `tenant_id`, not the older `title`/`instructions` shape still referenced by some staff code (`lib/db/migrations/schema.ts:16812-16832`, `lib/db/migrations/schema.ts:24383-24411`).
- `reorder_settings` is keyed by `ingredient_name`, which is why `ingredient_id` lookups are currently unverified/drifted (`lib/db/migrations/schema.ts:7459-7487`).

---

## Server Actions

| Action                                                            | Auth             | Input                                    | Output                                           | Side Effects                                                                               |
| ----------------------------------------------------------------- | ---------------- | ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `getStationRecipes(stationId)`                                    | `requireStaff()` | `stationId: string`                      | Station-linked recipes or an honest empty result | Reads `station_menu_items`, `menu_items`, and `recipes`; no fallback to all recipes        |
| `getMyStationData(stationId)`                                     | `requireStaff()` | `stationId: string`                      | Station metadata plus active-shift state         | Reads station and active shift together for the staff station page                         |
| `staffShiftCheckIn(stationId, shiftType)`                         | `requireStaff()` | `stationId: string`, `shiftType: string` | Success plus active shift metadata               | Creates/updates `shift_logs`, revalidates staff station view                               |
| `staffShiftCheckOut(shiftLogId, notes?)`                          | `requireStaff()` | `shiftLogId: string`, optional notes     | Success plus closed shift metadata               | Updates `shift_logs`, revalidates staff station view                                       |
| `completeTask(...)`                                               | `requireChef()`  | Existing task-complete inputs            | Existing success/error shape                     | Writes `task_completion_log.staff_member_id` instead of the stale field name               |
| `completeMyTask(taskId)`                                          | `requireStaff()` | `taskId: string`                         | Existing success/error shape                     | Writes `task_completion_log.staff_member_id` for staff completions                         |
| `getTasksWithDependencies(options?)`                              | `requireChef()`  | Existing filters                         | Tasks plus dependency metadata                   | Uses current `tasks` fields (`title`, `status`) and explicit duration heuristic            |
| `addDependency(input)`                                            | `requireChef()`  | Task id pair                             | Existing success/error shape                     | Creates `task_dependencies` row                                                            |
| `removeDependency({ taskId, dependsOnTaskId })`                   | `requireChef()`  | Two task ids                             | Existing success/error shape                     | Deletes dependency by stable pair instead of a mismatched dependency-record id from the UI |
| `previewAutoReorder()`                                            | `requireChef()`  | Existing preview inputs                  | Existing preview payload                         | Matches reorder settings by schema-correct key                                             |
| `generateAutoReorderPOs()`                                        | `requireChef()`  | Existing generation inputs               | Existing success/error shape                     | Same schema alignment as preview                                                           |
| `createVendorInvoice / updateVendorInvoice / deleteVendorInvoice` | `requireChef()`  | Existing inputs                          | Existing success/error shape                     | Revalidates the real vendor-invoice route                                                  |

---

## UI / Component Spec

### Page Layout

- The chef station hub remains the existing station list/create surface, but it must more clearly expose the adjacent operational surfaces already present in the codebase: Daily Ops, Ops Log, Waste Log, and Order Sheet (`app/(chef)/stations/page.tsx:17-90`, `app/(chef)/stations/daily-ops/page.tsx:141-503`, `app/(chef)/stations/ops-log/page.tsx:36-97`, `app/(chef)/stations/waste/page.tsx:30-128`, `app/(chef)/stations/orders/page.tsx:13-149`).
- The staff station page remains the entry point for limited station execution, but it must present current shift state and both shift actions in the visible workflow (`app/(staff)/staff-station/page.tsx:20-128`, `components/staff/staff-shift-controls.tsx:20-77`).
- The staff recipe page remains station-filter-driven, but the contents must come only from actual station-linked recipes (`app/(staff)/staff-recipes/page.tsx:17-101`, `lib/staff/staff-portal-actions.ts:521-605`).

### States

- **Loading:** Keep the current loading behavior for each route; do not introduce fake production numbers.
- **Empty:** For station recipes, show that the station has no linked recipes yet; for station operations surfaces, show missing data as missing, not zeroed or substituted.
- **Error:** Preserve existing error-card/toast patterns; do not silently fall back to unrelated global data.
- **Populated:** Show the existing lists and tables, but ensure labels and actions match what the backend really supports.

### Interactions

- A staff user checks in from the station page, refreshes or navigates, and still sees the active shift until they check out.
- A staff user checks out from the same station page without supplying a hidden shift-log id manually.
- A chef adds or removes a task dependency from the dependency picker, and the Gantt/dependency UI reflects the current task schema.
- A chef using Daily Ops does not see a `Print Clipboards` action unless it routes to a real print surface for the named action.

---

## Edge Cases and Error Handling

| Scenario                                                   | Correct Behavior                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Station has no linked `station_menu_items`                 | Return no recipes and show an honest empty state; do not fall back to all recipes.            |
| `menu_items` are linked but `recipe_id` is null            | Treat as no station recipes and surface the gap honestly.                                     |
| Staff user refreshes after check-in                        | Active shift remains visible from `shift_logs` and the UI presents check-out.                 |
| Staff user attempts to check out another user's shift      | Reject with auth/ownership error.                                                             |
| UI tries to remove a dependency pair that no longer exists | Return a safe no-op success or friendly error; do not break the page.                         |
| Ingredient naming does not match a reorder setting         | Treat the ingredient as unmatched and document the data-quality gap instead of inventing ids. |
| Vendor invoice mutation succeeds                           | Revalidate the vendor-invoice page route, not a stale inventory route.                        |

---

## Verification Steps

1. Sign in as a chef and open `/stations`; verify the station hub exposes the nearby operational surfaces already implemented in code.
2. Open `/stations/daily-ops`; verify no misleading `Print Clipboards` action remains.
3. Sign in as a staff user, open `/staff-station`, check in, refresh, and verify the page still shows an active shift and a check-out action.
4. Check out from `/staff-station`, refresh, and verify the shift resets to the non-active state.
5. Open `/staff-recipes` with a station that has linked menu items; verify only recipes reachable through `station_menu_items -> menu_items.recipe_id -> recipes` are shown.
6. Open `/staff-recipes` with a station that has no linked recipes; verify the page shows an honest empty state rather than the full recipe catalog.
7. Complete a task as staff and as chef; verify `task_completion_log` writes align with the schema and the activity board still renders completions.
8. Open `/tasks/gantt`, add a dependency, remove it, and verify the dependency picker and Gantt view both use the current task fields.
9. Open auto-reorder preview/generation from inventory and verify reorder-setting matches follow the current schema key.
10. Create, update, and delete a vendor invoice; verify `/inventory/vendor-invoices` reflects the changes after mutation.

---

## Out of Scope

- Building a reusable station preset/template system.
- Expanding the task schema with first-class duration/estimate modeling.
- Redesigning navigation structure across the product.
- Widening staff clipboard write permissions beyond the current limited surface.
- Building a multi-station clipboard print workflow if one does not already exist.

---

## Notes for Builder Agent

- Use the verified station recipe bridge that already exists in the schema: `station_menu_items.menu_item_id -> menu_items.recipe_id -> recipes.id` (`lib/db/migrations/schema.ts:22398-22422`, `lib/db/migrations/schema.ts:16812-16832`, `lib/db/migrations/schema.ts:24383-24411`).
- Fix both task completion-log writers and the activity-board reader together; repairing only the writers will leave `/staff/live` broken (`lib/tasks/actions.ts:364-373`, `lib/staff/staff-portal-actions.ts:213-220`, `lib/staff/activity-board.ts:58-63`, `app/(chef)/staff/live/page.tsx:139-145`).
- Preserve the current chef/staff auth and permission boundaries; staff clipboard fields are intentionally limited (`lib/auth/get-user.ts:122-143`, `lib/auth/get-user.ts:222-259`, `components/staff/staff-clipboard-view.tsx:184-213`, `components/staff/staff-clipboard-view.tsx:250-253`).
- Do not treat `clean-schema.sql` drift as an automatic migration requirement for this pass unless tooling explicitly depends on it; the feature scope is product reliability, not schema snapshot cleanup.

---

## Spec Validation

### 1. What exists today that this touches?

The product already has a broad station-operations stack: chef station hub, station detail, clipboard, orders, waste log, ops log, and daily ops pages backed by station actions and station-related tables (`app/(chef)/stations/page.tsx:17-90`, `app/(chef)/stations/[id]/page.tsx:23-62`, `app/(chef)/stations/[id]/clipboard/page.tsx:19-110`, `app/(chef)/stations/orders/page.tsx:13-149`, `app/(chef)/stations/waste/page.tsx:30-128`, `app/(chef)/stations/ops-log/page.tsx:36-97`, `app/(chef)/stations/daily-ops/page.tsx:141-503`, `lib/stations/actions.ts:63-99`, `lib/stations/clipboard-actions.ts:53-174`, `lib/db/migrations/schema.ts:22366-22445`, `lib/db/migrations/schema.ts:11084-11112`, `lib/db/migrations/schema.ts:21458-21486`, `lib/db/migrations/schema.ts:17354-17501`, `lib/db/migrations/schema.ts:23780-23808`). The staff portal already has dashboard, tasks, station, recipes, and schedule routes plus portal actions, but the staff shift UI is incomplete and the station-recipe loader drifts from the current recipe schema (`app/(staff)/staff-dashboard/page.tsx:19-220`, `app/(staff)/staff-tasks/page.tsx:13-123`, `app/(staff)/staff-station/page.tsx:20-128`, `app/(staff)/staff-recipes/page.tsx:17-101`, `lib/staff/staff-portal-actions.ts:103-173`, `lib/staff/staff-portal-actions.ts:430-605`, `lib/staff/staff-portal-actions.ts:611-679`, `components/staff/staff-shift-controls.tsx:20-77`). The task system, dependency layer, activity board, and inventory surfaces already exist, but several of them use stale fields or route assumptions (`app/(chef)/tasks/page.tsx:17-64`, `app/(chef)/tasks/gantt/page.tsx:5-39`, `lib/tasks/actions.ts:136-183`, `lib/tasks/actions.ts:336-409`, `lib/tasks/dependency-actions.ts:47-50`, `lib/tasks/dependency-actions.ts:122-149`, `lib/tasks/dependency-actions.ts:189-208`, `lib/staff/activity-board.ts:58-63`, `app/(chef)/inventory/vendor-invoices/page.tsx:49-98`, `lib/inventory/auto-reorder-actions.ts:148-157`, `lib/inventory/vendor-invoice-actions.ts:126`, `lib/db/migrations/schema.ts:22648-22916`, `lib/db/migrations/schema.ts:7459-7487`).

### 2. What exactly changes?

This spec only modifies existing files. At the file level it updates chef station surfacing, fixes one misleading Daily Ops action, makes staff shift execution two-way, makes station recipes use the existing station-to-recipe bridge, corrects task completion log field usage, corrects dependency removal/data loading, and fixes two inventory revalidation/schema mismatches (`components/stations/daily-ops-actions-bar.tsx:63-75`, `lib/staff/staff-portal-actions.ts:521-605`, `lib/staff/staff-portal-actions.ts:611-679`, `components/staff/staff-shift-controls.tsx:20-77`, `lib/tasks/actions.ts:364-373`, `lib/staff/staff-portal-actions.ts:213-220`, `lib/staff/activity-board.ts:58-63`, `lib/tasks/dependency-actions.ts:47-50`, `lib/tasks/dependency-actions.ts:189-208`, `lib/inventory/auto-reorder-actions.ts:148-157`, `lib/inventory/vendor-invoice-actions.ts:126`, `lib/inventory/vendor-invoice-actions.ts:200`, `lib/inventory/vendor-invoice-actions.ts:298`). At the data level it does not add or remove tables; it changes how existing rows are read and written so code matches the actual schema (`lib/db/migrations/schema.ts:22648-22676`, `lib/db/migrations/schema.ts:22680-22713`, `lib/db/migrations/schema.ts:24383-24411`, `lib/db/migrations/schema.ts:7459-7487`).

### 3. What assumptions are you making?

- Verified: station-specific recipe books can be built from current tables because `station_menu_items` references `menu_items`, and `menu_items` already carries `recipe_id` (`lib/staff/staff-portal-actions.ts:537-565`, `lib/db/migrations/schema.ts:22398-22422`, `lib/db/migrations/schema.ts:16812-16832`).
- Verified: no station preset/template system is currently represented in the station schema or create action (`lib/stations/actions.ts:63-99`, `lib/db/migrations/schema.ts:22424-22445`).
- Verified: staff shift check-in/out data exists server-side, but only check-in is surfaced cleanly in the current UI (`lib/staff/staff-portal-actions.ts:611-679`, `components/staff/staff-shift-controls.tsx:20-77`).
- Unverified: how complete current tenant data is for station-to-menu-item-to-recipe linking; the path exists, but data coverage was not audited across live tenants.
- Unverified: whether reorder-setting ingredient naming is normalized enough across tenants for auto-reorder matching to be fully reliable after the schema-alignment fix.

### 4. Where will this most likely break?

First, station recipe surfacing can still appear "broken" if tenant data lacks `station_menu_items` or `menu_items.recipe_id` coverage, even when the code path is corrected (`lib/staff/staff-portal-actions.ts:537-582`, `lib/db/migrations/schema.ts:16812-16832`). Second, task-completion fixes will regress `/staff/live` if the writers are updated without also updating the activity-board reader, because that reader still selects `completed_by` (`lib/tasks/actions.ts:364-373`, `lib/staff/staff-portal-actions.ts:213-220`, `lib/staff/activity-board.ts:58-63`, `app/(chef)/staff/live/page.tsx:139-145`). Third, dependency removal can remain brittle if the builder preserves the current "remove by dependency id" assumption while the UI still passes task ids (`components/tasks/dependency-picker.tsx:60-67`, `components/tasks/dependency-picker.tsx:91-97`, `lib/tasks/dependency-actions.ts:189-208`).

### 5. What is underspecified?

Three areas could still cause guessing if not kept explicit. The Gantt view does not have a real task-duration field in the current schema, so any rendered duration must be defined as a heuristic rather than implied as authoritative (`lib/tasks/dependency-actions.ts:47-50`, `lib/db/migrations/schema.ts:22888-22916`). The Daily Ops `Print Clipboards` affordance must either route to a verified print surface or be removed; the current link points at `/stations`, which is not the named action (`components/stations/daily-ops-actions-bar.tsx:63-75`). The station-recipes empty state must explicitly say "no station-linked recipes" rather than silently broadening scope to all recipes (`lib/staff/staff-portal-actions.ts:545-582`).

### 6. What dependencies or prerequisites exist?

No migration or config prerequisite is required for the scoped pass because all needed tables, routes, and auth guards already exist (`lib/db/migrations/schema.ts:11084-11112`, `lib/db/migrations/schema.ts:22366-22916`, `lib/auth/get-user.ts:122-143`, `lib/auth/get-user.ts:222-259`). The only prerequisite is that the builder work from current schema reality rather than stale field names in legacy code paths.

### 7. What existing logic could this conflict with?

This work can conflict with shared task flows, the shared activity board, and the shared staff clipboard/station permission model. Task completion changes hit both chef and staff completion writers plus the activity board consumer (`lib/tasks/actions.ts:336-409`, `lib/staff/staff-portal-actions.ts:179-268`, `lib/staff/activity-board.ts:58-105`). Staff station changes sit on top of the current limited clipboard permissions and cannot widen them accidentally (`components/staff/staff-clipboard-view.tsx:184-213`, `components/staff/staff-clipboard-view.tsx:250-253`). Chef-side surfacing must also respect the existing navigation structure that already exposes stations, inventory, and briefing clusters (`components/navigation/nav-config.tsx:1169-1185`, `components/navigation/nav-config.tsx:1392-1444`, `components/navigation/nav-config.tsx:1504-1506`).

### 8. What is the end-to-end data flow?

- Station recipes: staff opens `/staff-recipes` -> route requests station recipes through staff portal actions -> action resolves `station_menu_items` to `menu_items.recipe_id` to `recipes` -> UI renders only linked recipes or honest empty state (`app/(staff)/staff-recipes/page.tsx:17-101`, `lib/staff/staff-portal-actions.ts:521-605`, `lib/db/migrations/schema.ts:16812-16832`, `lib/db/migrations/schema.ts:24383-24411`).
- Staff shift loop: staff opens `/staff-station` -> route loads station and current shift state -> check-in/out action mutates `shift_logs` -> page revalidates and shows active or inactive state accordingly (`app/(staff)/staff-station/page.tsx:20-128`, `components/staff/staff-shift-controls.tsx:20-77`, `lib/staff/staff-portal-actions.ts:611-679`, `lib/db/migrations/schema.ts:21458-21486`).
- Task accountability: chef/staff completes task -> completion action writes `task_completion_log` -> activity board reads the same field names -> `/staff/live` reflects completion accurately (`lib/tasks/actions.ts:336-409`, `lib/staff/staff-portal-actions.ts:179-268`, `lib/staff/activity-board.ts:58-105`, `app/(chef)/staff/live/page.tsx:139-145`, `lib/db/migrations/schema.ts:22648-22676`).
- Dependencies/Gantt: chef uses dependency picker -> dependency action writes/deletes `task_dependencies` -> Gantt/dependency UI reloads current task/dependency data using current task schema (`components/tasks/dependency-picker.tsx:40-97`, `lib/tasks/dependency-actions.ts:23-266`, `components/tasks/gantt-view.tsx:25-40`, `lib/db/migrations/schema.ts:22680-22916`).
- Auto-reorder/vendor invoices: chef previews or generates reorder flow -> reorder logic resolves settings against current schema -> invoice mutations revalidate the vendor-invoices route so UI refreshes accurately (`lib/inventory/auto-reorder-actions.ts:148-157`, `app/(chef)/inventory/vendor-invoices/page.tsx:49-98`, `lib/inventory/vendor-invoice-actions.ts:126`, `lib/inventory/vendor-invoice-actions.ts:200`, `lib/inventory/vendor-invoice-actions.ts:298`).

### 9. What is the correct implementation order?

1. Fix server-action/schema drift first: station recipes, task completion writes/reads, dependency actions, auto-reorder matching, vendor-invoice revalidation.
2. Update UI consumers second: staff shift controls/page, staff recipes page, dependency picker/Gantt, Daily Ops action bar.
3. Adjust chef station surfacing last so the entry point exposes only verified working flows.
4. Run verification across chef and staff routes after the data contracts are aligned.

This order is required because the current UI already depends on stale backend assumptions in several places (`lib/staff/staff-portal-actions.ts:521-605`, `lib/tasks/dependency-actions.ts:47-50`, `lib/staff/activity-board.ts:58-63`, `lib/inventory/auto-reorder-actions.ts:148-157`).

### 10. What are the exact success criteria?

Success is the verification list in this spec: chef station hub surfaces the real ops pages; Daily Ops no longer advertises a fake print path; staff can check in, refresh, and check out from the station flow; station recipes are truly station-scoped; task completion writes/read the same schema fields; dependency add/remove works with current task fields; auto-reorder and vendor invoices reflect current schema/route behavior (`components/stations/daily-ops-actions-bar.tsx:63-75`, `lib/staff/staff-portal-actions.ts:521-605`, `lib/staff/staff-portal-actions.ts:611-679`, `lib/tasks/actions.ts:364-373`, `lib/staff/activity-board.ts:58-63`, `lib/tasks/dependency-actions.ts:47-50`, `lib/inventory/auto-reorder-actions.ts:148-157`, `lib/inventory/vendor-invoice-actions.ts:126`).

### 11. What are the non-negotiable constraints?

Chef/staff auth boundaries and tenant scoping must remain intact (`lib/auth/get-user.ts:16-18`, `lib/auth/get-user.ts:96-143`, `lib/auth/get-user.ts:222-259`). Staff write access must remain limited to the current task/clipboard/shift interactions and must not expand into chef-level controls (`components/staff/staff-clipboard-view.tsx:184-213`, `components/staff/staff-clipboard-view.tsx:250-253`). No new database schema work is allowed in this pass (`lib/db/migrations/schema.ts:7459-7487`, `lib/db/migrations/schema.ts:11084-11112`, `lib/db/migrations/schema.ts:22366-22916`).

### 12. What should NOT be touched?

Do not build a station preset/template system, do not redesign navigation, do not introduce new task-duration schema, and do not widen staff permissions. Those are adjacent concerns, but they are not required to make the current restaurant-ops system trustworthy (`lib/stations/actions.ts:63-99`, `lib/db/migrations/schema.ts:22424-22445`, `components/navigation/nav-config.tsx:1169-1185`, `components/navigation/nav-config.tsx:1392-1444`, `components/staff/staff-clipboard-view.tsx:184-213`).

### 13. Is this the simplest complete version?

Yes. The broad capability footprint already exists in code, so the smallest complete version is a reliability/surfacing pass that repairs drift and removes dishonest affordances instead of adding new operational concepts (`app/(chef)/stations/page.tsx:17-90`, `app/(staff)/staff-station/page.tsx:20-128`, `app/(chef)/inventory/page.tsx:107-157`, `components/navigation/nav-config.tsx:1169-1185`, `components/navigation/nav-config.tsx:1392-1444`).

### 14. If implemented exactly as written, what would still be wrong?

Three things would still remain imperfect even after a correct implementation. First, there would still be no reusable station preset/template system; stations remain manually configured (`lib/stations/actions.ts:63-99`, `lib/db/migrations/schema.ts:22424-22445`). Second, station-recipe quality would still depend on existing tenant link coverage and `recipe_id` completeness, which this pass does not backfill. Third, Gantt timing would still be heuristic because the current schema does not carry first-class duration estimates (`lib/db/migrations/schema.ts:16812-16832`, `lib/db/migrations/schema.ts:22888-22916`).

---

## Final Check

This spec is production-ready for the scoped reliability pass. The remaining uncertainty is not about implementation shape; it is about live data quality in station recipe linking and reorder-setting naming, which can only be fully resolved by tenant data verification after the code path is corrected.
