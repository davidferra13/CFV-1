# Spec: Component-Aware Prep Scheduling

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event                 | Date             | Agent/Session         | Commit   |
| --------------------- | ---------------- | --------------------- | -------- |
| Created               | 2026-03-31 22:00 | Planner (Opus 4.6)    |          |
| Status: ready         | 2026-03-31 22:00 | Planner (Opus 4.6)    |          |
| Claimed (in-progress) | 2026-03-31 22:30 | Builder (Opus 4.6)    |          |
| Spike completed       | 2026-03-31 22:30 | Builder (Opus 4.6)    |          |
| Pre-flight passed     | 2026-03-31 22:30 | Builder (Opus 4.6)    |          |
| Build completed       | 2026-03-31 23:00 | Builder (Opus 4.6)    | 97ddb458 |
| Type check passed     | 2026-03-31 23:00 | Builder (Opus 4.6)    | 97ddb458 |
| Build check passed    |                  |                       |          |
| Playwright verified   | 2026-04-01       | QA Agent (Sonnet 4.6) |          |
| Status: verified      | 2026-04-01       | QA Agent (Sonnet 4.6) |          |

---

## Developer Notes

### Raw Signal

A beta tester (private chef/caterer) has been trying to build their own management app for 2 years. They said the exact thing they need: "I'm working on a flow with food cost, ordering, prep list & prep times so I can hand over kitchen management to a sous chef." They currently track every single step with a client in a spreadsheet. They tried Monday.com and other platforms but "it's clear none were designed by a chef."

She wants "a gatekeeping system that understands where you are in every single inquiry" and "the second somebody confirms a menu, all documents can be made." She's self-described as "not organized" and needs the system to impose structure for her.

The developer audited ChefFlow against her 10 problems and scored prep scheduling at 8/10: "Data model complete, auto-scheduling missing." The gap: components have `make_ahead_window_hours` and `prep_day_offset` but the scheduling engine ignores them, generating only generic blocks based on chef preference defaults.

The developer's exact instruction: "Proceed with the most intelligent decisions on my behalf, in the correct order." The intelligent call: close the prep gap first (8→10), because it's a prerequisite for sous chef delegation (6→10), and it's the most visually impressive feature for the demo video promised to Grace.

### Developer Intent

- **Core goal:** Connect the component-level prep data to the event-level scheduling engine so prep blocks are menu-aware, not generic.
- **Key constraints:** No AI. Pure formula/deterministic. No new tables. No breaking existing auto-placement flow. Chef always confirms suggestions before they save (AI Policy compliance).
- **Motivation:** First real beta tester (Grace) needs to see that ChefFlow understands her kitchen workflow. Generic "Main Prep Session" blocks don't demonstrate that. "Make demi-glace (72h ahead)" on Wednesday for Saturday's event does.
- **Success from the developer's perspective:** When an event is confirmed, the generated prep plan shows component-specific blocks mapped to actual calendar days, with aggregate prep time. Grace sees this in the demo video and says "that's exactly what I need."

---

## What This Does (Plain English)

When a chef confirms an event, the prep block engine reads the event's menu components (their `make_ahead_window_hours`, `prep_day_offset`, `prep_time_of_day`, and `prep_station` data) and generates component-specific prep blocks mapped to real calendar days. Instead of "Main Prep Session - Saturday," the chef sees "Make demi-glace - Wednesday (3 days ahead)", "Marinate proteins - Friday (1 day ahead)", "A la minute sauces - Saturday (service day)." The event detail page shows an aggregate prep summary: total prep hours, number of prep days, and a day-by-day breakdown.

---

## Why It Matters

Grace and every chef like her currently does this math in their head or on a spreadsheet. The component data already exists in the database. The scheduling engine already exists. This spec connects them, closing the last gap between "the system knows what to prep" and "the system tells you when to prep it."

---

## Files to Create

| File                                    | Purpose                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| `components/events/prep-plan-panel.tsx` | Self-contained client component showing day-by-day prep breakdown |

---

## Files to Modify

| File                                                          | What to Change                                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/scheduling/prep-block-engine.ts`                         | Add `suggestComponentBlocks()` function. Modify `suggestPrepBlocks()` to call it and merge component-specific blocks with generic blocks. |
| `lib/scheduling/prep-block-actions.ts`                        | Modify `autoSuggestEventBlocks()` to fetch menu components and pass them to the engine.                                                   |
| `lib/scheduling/types.ts`                                     | Add `MenuComponent` input type for the engine. Add `PrepBlockSuggestion.component_id` optional field.                                     |
| `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx` | Add "Prep Plan" section showing component-aware prep breakdown with aggregate time.                                                       |

---

## Database Changes

None. All required columns already exist:

- `components.is_make_ahead` (boolean) - [Layer 4 migration:373](../database/migrations/20260215000004_layer_4_menus_recipes_costing.sql)
- `components.make_ahead_window_hours` (integer) - [Layer 4 migration:374](../database/migrations/20260215000004_layer_4_menus_recipes_costing.sql)
- `components.prep_day_offset` (integer, <=0) - [20260324000006:13](../database/migrations/20260324000006_prep_timeline.sql)
- `components.prep_time_of_day` (text enum) - [20260324000006:16](../database/migrations/20260324000006_prep_timeline.sql)
- `components.prep_station` (text) - [20260324000006:19](../database/migrations/20260324000006_prep_timeline.sql)
- `event_prep_blocks` table - already has all needed columns including `title`, `notes`, `block_type`, `block_date`, `start_time`

---

## Data Model

### Input: Menu Components for an Event

The engine needs to receive the event's menu components. Query path:

```
events.id → menus.event_id → dishes.menu_id → components.dish_id
```

Filter: `components.is_make_ahead = true` (only make-ahead components generate scheduled blocks; day-of components are rolled into the existing "Main Prep Session" block).

### Component → Prep Block Mapping

For each make-ahead component:

| Component Field              | Maps To                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `prep_day_offset` (e.g., -3) | `block_date` = event_date + offset (e.g., Wednesday for Saturday event)                                                          |
| `make_ahead_window_hours`    | Fallback if `prep_day_offset` is null: `block_date` = event_date - ceil(hours/24)                                                |
| `prep_time_of_day`           | `start_time` mapped to: early_morning=07:00, morning=09:00, afternoon=13:00, evening=17:00, service=null (rolled into main prep) |
| `prep_station`               | Included in `notes` field for context                                                                                            |
| `name`                       | `title` = component name (e.g., "Demi-glace")                                                                                    |
| `storage_notes`              | Appended to `notes`                                                                                                              |

### Aggregate Calculation

```
total_prep_hours = sum of:
  - Each make-ahead component's recipe prep_time_minutes (if recipe linked)
  - Fallback: 60 min per component without a recipe link
  - Plus existing generic block durations (shopping, packing, equipment, admin)

prep_days = count of distinct block_dates across all suggestions
```

---

## Server Actions

No new server actions. Modifications to existing:

| Action                                                       | What Changes                                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `autoSuggestEventBlocks(eventId)` in `prep-block-actions.ts` | Now fetches make-ahead components for the event's menu(s) and passes them to `suggestPrepBlocks()` as a new parameter. |
| `autoPlacePrepBlocks(eventId)` in `prep-block-actions.ts`    | No direct changes. It already calls `autoSuggestEventBlocks()`, so it inherits the component awareness automatically.  |

Auth, tenant scoping, error handling, cache busting all remain unchanged.

---

## UI / Component Spec

### Prep Plan Section (Event Detail Ops Tab)

Added to `event-detail-ops-tab.tsx` as a new section, positioned after the existing prep-related content.

### Layout

```
┌─────────────────────────────────────────────┐
│ Prep Plan                     Total: ~8.5h  │
│ 4 prep days · 6 make-ahead components       │
├─────────────────────────────────────────────┤
│ Wed Mar 25 (3 days before)                  │
│   ○ Demi-glace          station: sauté  2h  │
│   ○ Confit duck legs     station: oven   4h  │
│                                             │
│ Thu Mar 26 (2 days before)                  │
│   ○ Equipment Check                    30m  │
│                                             │
│ Fri Mar 27 (1 day before)                   │
│   ○ Marinate proteins    station: prep  30m  │
│   ○ Grocery Run                        60m  │
│                                             │
│ Sat Mar 28 (event day)                      │
│   ○ Main Prep Session                   3h  │
│   ○ Pack the Car                       30m  │
│                                             │
│ Sun Mar 29 (day after)                      │
│   ○ Post-Event Admin                   45m  │
└─────────────────────────────────────────────┘
```

- Component-specific blocks show component name, station (if set), and estimated duration
- Generic blocks (grocery, packing, equipment, admin) remain as before
- All blocks sorted chronologically within each day
- Days sorted chronologically
- Aggregate header: total hours, prep day count, component count

### States

- **Loading:** Skeleton with 3 placeholder rows
- **Empty:** "No menu assigned to this event yet. Assign a menu to see your prep plan." with link to menu assignment.
- **No make-ahead components:** Shows only generic blocks. Note: "No make-ahead components on this menu. All prep is day-of."
- **Error:** "Could not load prep plan" with retry. Never show fake data.
- **Populated:** Full day-by-day breakdown as described above.

### Interactions

- Each block row is read-only in this view (prep plan is a preview of what `autoPlacePrepBlocks` will create on confirmation)
- For events already confirmed (blocks already placed): show completion status (checkbox filled/empty) pulled from existing `event_prep_blocks` data
- "Regenerate Suggestions" button (only for draft/proposed events): calls `autoSuggestEventBlocks()` and refreshes the view

---

## Edge Cases and Error Handling

| Scenario                                                      | Correct Behavior                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Component has `prep_day_offset` AND `make_ahead_window_hours` | `prep_day_offset` wins (more precise). `make_ahead_window_hours` is fallback only.          |
| Component has neither offset nor hours                        | Treated as day-of prep. Rolled into "Main Prep Session" block. Not shown as separate block. |
| Component has `prep_time_of_day = 'service'`                  | Not a make-ahead block. Rolled into main prep. Not shown separately.                        |
| Event has no menu                                             | Show empty state. No suggestions generated.                                                 |
| Event has menu but zero make-ahead components                 | Show generic blocks only with note.                                                         |
| Multiple menus on same event                                  | Aggregate all components from all menus.                                                    |
| Component's recipe has no prep_time_minutes                   | Use fallback of 60 minutes per component.                                                   |
| prep_day_offset would place block in the past                 | Clamp to today. Add warning: "This component's lead time has already passed."               |
| Event already confirmed (blocks already exist)                | Show existing blocks with completion status. Don't re-suggest.                              |

---

## Verification Steps

1. Sign in with agent account
2. Create or find an event with a menu that has make-ahead components (components with `is_make_ahead = true` and `make_ahead_window_hours` set)
3. Navigate to the event detail page, ops tab
4. Verify: Prep Plan section appears with component-specific blocks mapped to correct calendar dates
5. Verify: Aggregate header shows total hours and prep day count
6. Verify: A component with `prep_day_offset: -3` on a Saturday event shows on Wednesday
7. Verify: A component with `make_ahead_window_hours: 48` (no offset) shows 2 days before event
8. Verify: Generic blocks (grocery, packing, equipment, admin) still appear
9. Verify: Event with no menu shows empty state
10. Verify: Event with menu but no make-ahead components shows generic blocks only with note
11. Screenshot the final result

---

## Out of Scope

- Sous chef delegation / staff task board (separate spec, depends on this one)
- Drag-and-drop rescheduling of prep blocks
- Calendar integration of component blocks (existing Google Calendar sync handles event-level blocks)
- Modifying the `/culinary/prep` or `/culinary/prep/timeline` pages (those remain menu-centric)
- AI-powered prep time estimation (this is pure formula)
- New database tables or migrations

---

## Notes for Builder Agent

### Critical Pattern: The Engine Is Pure

`prep-block-engine.ts` has ZERO database calls. All data is passed in. The action layer (`prep-block-actions.ts`) fetches data and passes it to the engine. **Do not add DB calls to the engine file.** Fetch components in the action, pass them to the engine function.

### How to Fetch Components for an Event

```sql
-- Given eventId, get make-ahead components:
SELECT c.id, c.name, c.is_make_ahead, c.make_ahead_window_hours,
       c.prep_day_offset, c.prep_time_of_day, c.prep_station,
       c.storage_notes, c.recipe_id,
       r.prep_time_minutes
FROM components c
JOIN dishes d ON d.id = c.dish_id
JOIN menus m ON m.id = d.menu_id
LEFT JOIN recipes r ON r.id = c.recipe_id
WHERE m.event_id = :eventId
  AND c.is_make_ahead = true
  AND c.tenant_id = :tenantId
```

Using the compat shim, this becomes a chained `.from('components').select(...).eq(...)` query. The join to recipes is for getting `prep_time_minutes` for duration estimation.

### Existing Dedup Logic

`isCovered()` at [prep-block-engine.ts:87-89](../lib/scheduling/prep-block-engine.ts#L87-L89) checks by event_id + block_type. Component blocks all use `block_type: 'prep_session'` but with different titles. The builder needs to handle dedup at the component level (by component name or ID in notes/title), not just block_type.

### AI Policy Compliance

The auto-placement on `paid→confirmed` is non-blocking and idempotent. Component blocks are system-generated (`is_system_generated: true`). The `autoSuggestEventBlocks()` path generates but does NOT save - the chef reviews and confirms via `bulkCreatePrepBlocks()`. Both paths already exist and are policy-compliant. No changes needed to the save/confirm flow.

### Aggregate Prep Time

Use `recipe.prep_time_minutes` when the component has a linked recipe. Fallback to 60 minutes. Sum all component durations + generic block durations. Display as "~Xh" (rounded to nearest 0.5h). This is an estimate, not a promise.

### What NOT to Touch

- Do NOT modify the `/culinary/prep` pages (those are menu-centric, not event-centric, and serve a different purpose)
- Do NOT add new server action exports (modify existing `autoSuggestEventBlocks`)
- Do NOT create new database tables
- Do NOT add AI calls (this is deterministic, Formula > AI rule)
- Do NOT change the `paid→confirmed` transition in `transitions.ts` (it already calls `autoPlacePrepBlocks` which will inherit the changes)

---

## Spec Validation

### 1. What exists today that this touches?

- `lib/scheduling/prep-block-engine.ts` (335 lines): Pure computation engine. `suggestPrepBlocks()` at line 133 generates generic blocks. `detectGaps()` at line 292 scans for missing blocks.
- `lib/scheduling/prep-block-actions.ts` (577 lines): Server actions wrapping the engine. `autoSuggestEventBlocks()` at line 537 fetches event data and calls the engine. `autoPlacePrepBlocks()` at line 475 is the non-blocking auto-placer.
- `lib/scheduling/types.ts` (1183 lines): Type definitions including `PrepBlockSuggestion`, `PrepBlock`, `SchedulingEvent`.
- `lib/events/transitions.ts:719-720`: Calls `autoPlacePrepBlocks(eventId)` on confirmed transition.
- `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`: Event detail ops tab, where the prep plan section will be added.
- `lib/menus/actions.ts:1189-1245`: `getAllComponents()` fetches components with menu joins. Already has `is_make_ahead` filter.
- `database/migrations/20260324000006_prep_timeline.sql`: Added `prep_day_offset`, `prep_time_of_day`, `prep_station` to components table.
- `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql:373-374`: Original `is_make_ahead` and `make_ahead_window_hours` columns.

### 2. What exactly changes?

- **Modify** `prep-block-engine.ts`: Add ~60-line `suggestComponentBlocks()` pure function. Modify `suggestPrepBlocks()` to accept optional `MenuComponent[]` param and merge results.
- **Modify** `prep-block-actions.ts`: Add component fetch query (~20 lines) in `autoSuggestEventBlocks()`. Pass components to engine.
- **Modify** `types.ts`: Add `MenuComponent` interface (~10 lines). Add optional `component_id` to `PrepBlockSuggestion`.
- **Modify** `event-detail-ops-tab.tsx`: Add Prep Plan section (~80-100 lines of JSX) with day-by-day breakdown and aggregate header.

### 3. What assumptions am I making?

- **Verified:** Components table has `prep_day_offset`, `prep_time_of_day`, `prep_station` columns (read migration 20260324000006, lines 13-19)
- **Verified:** `menus.event_id` exists for linking menus to events (read Layer 4 migration, `menus` table definition)
- **Verified:** `autoPlacePrepBlocks` is idempotent and checks for existing blocks before creating (read prep-block-actions.ts:487-489)
- **Unverified:** Whether any real menu data in the database currently has `prep_day_offset` populated. If not, the system falls back to `make_ahead_window_hours` which IS populated on demo data. Builder should verify with a DB query.

### 4. Where will this most likely break?

1. **Component fetch join chain** (events → menus → dishes → components): If `menus.event_id` is null for standalone menus, the query returns nothing. Builder must filter for menus that are linked to the specific event.
2. **Dedup with existing blocks**: Current `isCovered()` checks by block_type. All component blocks are `prep_session` type. Builder needs to prevent duplicating the generic "Main Prep Session" with component-specific blocks. Solution: if component blocks exist, skip or reduce the generic prep session.

### 5. What is underspecified?

- How to handle the overlap between component-specific prep blocks and the generic "Main Prep Session": should the generic session be removed, shortened, or kept alongside? **Decision: keep it for day-of components that aren't make-ahead. Reduce its duration by the sum of day-of component times if any are explicitly day-of.**

### 6. What dependencies or prerequisites exist?

None. All database columns exist. All server actions exist. All types exist.

### 7. What existing logic could this conflict with?

- The `isCovered()` dedup function only checks by `block_type`, not by component. Multiple component blocks all using `prep_session` type means `isCovered` will return `true` after the first one, suppressing subsequent components. **Builder must either use a new block_type for component blocks OR check by title/component_id in notes.**

### 8. What is the end-to-end data flow?

1. Chef confirms event payment (paid→confirmed transition)
2. `transitions.ts:719` calls `autoPlacePrepBlocks(eventId)`
3. `autoPlacePrepBlocks` calls `autoSuggestEventBlocks(eventId)`
4. `autoSuggestEventBlocks` NOW fetches event's menu components (NEW)
5. Passes components to `suggestPrepBlocks(event, existingBlocks, prefs, components)` (MODIFIED)
6. Engine generates component-specific blocks + generic blocks
7. `autoPlacePrepBlocks` persists all blocks via `bulkCreatePrepBlocks`
8. Event detail page Ops tab renders Prep Plan section by reading existing blocks

### 9. What is the correct implementation order?

1. Add `MenuComponent` type to `types.ts`
2. Add `suggestComponentBlocks()` to `prep-block-engine.ts`
3. Modify `suggestPrepBlocks()` to accept and merge component blocks
4. Modify `autoSuggestEventBlocks()` in `prep-block-actions.ts` to fetch components
5. Add Prep Plan UI section to `event-detail-ops-tab.tsx`
6. Type check, build check, Playwright verify

### 10. What are the exact success criteria?

- Component with `prep_day_offset: -3` on Saturday event generates block on Wednesday
- Component with `make_ahead_window_hours: 48` generates block 2 days before event
- Aggregate header shows correct total hours and prep day count
- Generic blocks still appear (grocery, packing, equipment, admin)
- Event with no menu shows empty state
- `autoPlacePrepBlocks` on confirmed transition creates component-aware blocks
- No type errors, clean build

### 11. What are the non-negotiable constraints?

- Pure deterministic computation, no AI (Formula > AI rule)
- Chef confirms before save (AI Policy)
- Tenant scoping on all queries
- Engine file has zero DB calls (pure computation pattern)
- No new migrations

### 12. What should NOT be touched?

- `/culinary/prep` pages (menu-centric, separate purpose)
- `transitions.ts` (already calls autoPlacePrepBlocks, inherits changes)
- `prep_timeline` table / `lib/prep/actions.ts` (separate timer system)
- `event_prep_steps` table (lifecycle milestones, separate concern)

### 13. Is this the simplest complete version?

Yes. Four file modifications, zero new files, zero migrations. The data model already exists. The scheduling engine already exists. The CRUD already exists. This spec wires them together.

### 14. If implemented exactly as written, what would still be wrong?

- Components without `prep_day_offset` AND without `make_ahead_window_hours` but with `is_make_ahead = true` would use the 60-min fallback and appear on the event day, which might not be what the chef intended. This is acceptable as a v1 (the chef can always edit the component to add proper lead times).
- The aggregate prep time is an estimate (uses recipe prep_time_minutes or 60-min fallback). Real prep time varies. Displaying "~" prefix communicates this.

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

**Production-ready.** One unverified item: whether real data has `prep_day_offset` populated. The fallback to `make_ahead_window_hours` (which IS populated on demo data) handles this. The builder should run a quick DB query to check, but the spec works either way.

> What would a builder get wrong?

1. **Adding DB calls to the engine file.** The engine is pure computation. The action layer fetches data.
2. **Using `isCovered()` for component-level dedup.** It checks by block_type only. All component blocks are `prep_session`. Builder needs component-level dedup.
3. **Forgetting the generic→component overlap.** If there are 4 make-ahead components, the builder might still generate the full generic "Main Prep Session" on top of them. The spec says: reduce generic session duration by the sum of day-of component times.
4. **Not handling null `menus.event_id`.** Standalone menus (templates, drafts not linked to events) must be filtered out. The query must join through `menus WHERE event_id = :eventId`.
