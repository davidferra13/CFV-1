# Spec: Event Scheduling Surface Ownership and Route Truth

> **Status:** ready
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** medium-large (12+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 03:58 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 03:58 EDT | Planner (Codex) |        |
| Claimed (in-progress) |                      |                 |        |
| Spike completed       |                      |                 |        |
| Pre-flight passed     |                      |                 |        |
| Build completed       |                      |                 |        |
| Type check passed     |                      |                 |        |
| Build check passed    |                      |                 |        |
| Playwright verified   |                      |                 |        |
| Status: verified      |                      |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Before taking action, fully understand the current system, constraints, and context.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.
- The phase-shift audit already identified an unclear boundary between `/events` and `/production`.
- The deeper inspection shows this is really an event-and-scheduling ownership problem, not just one duplicate route pair.
- The builder needs route truth and ownership, not another vague note that events, production, calendar, and schedule "overlap."

### Developer Intent

- **Core goal:** assign explicit jobs to the chef-facing event and scheduling surfaces so the repo stops presenting them like interchangeable doors into the same concept.
- **Key constraints:** do not delete real routes, do not rebuild event data logic, do not merge unlike scheduling surfaces blindly, and do not widen this into a full event or scheduling redesign.
- **Motivation:** the current repo has a real event hub, a real planning calendar, a real operational schedule workspace, a real monthly event overview, and a real per-event day-of-service schedule. The confusion comes from labels, nav structure, help metadata, and route suggestion drift.
- **Success from the developer's perspective:** a builder can answer, without guessing, what each of these routes is for: `/events`, `/events/upcoming`, `/events/board`, `/calendar`, `/schedule`, `/production`, and `/events/[id]/schedule`.

---

## What This Does (Plain English)

This spec locks the event and scheduling route contract:

- `/events` = canonical event hub and event-record root
- `/events/upcoming` = filtered active-bookings list
- `/events/board` = event pipeline board
- `/calendar` = canonical planning calendar and availability workspace
- `/schedule` = operational schedule workspace
- `/production` = month-only event overview
- `/events/[id]/schedule` = per-event execution schedule

This spec does **not** merge these routes. It makes their jobs explicit, fixes naming drift, repairs misleading labels, and ensures generic navigation points to the right owning surface.

---

## Why It Matters

The underlying code is less redundant than the surface suggests. The confusion is mostly presentation drift:

- the Events nav group has no direct item back to the actual `/events` hub
- `/production` is labeled `Event Calendar`, which collides with `/calendar`
- `/production` help metadata describes a prep timeline that the page does not actually render
- `/schedule` is labeled `Calendar` in mobile navigation even though `/calendar` is already a separate real route
- Remy and command-route maps describe `/schedule` and `/calendar` in a loose way that does not match the real route jobs

Without a route-ownership spec, builders will keep fixing this piecemeal and recreating the same ambiguity.

---

## Current State (What Already Exists)

### Verified route roles

- `/events` is a full event hub:
  - planning, pipeline, and review tiles
  - event list with status filtering
  - create-event entry
- `/events/upcoming` is a dedicated filtered list of proposed, accepted, paid, confirmed, and in-progress events.
- `/events/board` is a real kanban board.
- `/calendar` is a planning calendar:
  - unified calendar data
  - waitlist integration
  - day/week/year/share subroutes
  - planning and availability language
- `/schedule` is a real full-calendar schedule workspace:
  - separate scheduling data source
  - full-calendar style interface
  - mobile and archetype prominence
- `/production` is a real monthly event-only overview:
  - month query param
  - month stats
  - grid of event chips
  - event list below the grid
- `/events/[id]/schedule` is the event-specific day-of-service schedule.

### Verified presentation drift

- The phase-shift audit flags `/events` and `/production` as an unclear-boundary lane.
- The events nav group currently exposes:
  - `/calendar`
  - `/production` labeled `Event Calendar`
  - `/events/upcoming`
  - `/schedule`
  - but not a direct `/events` hub item
- Mobile tab options expose `/schedule` with the label `Calendar`.
- The mobile chef dashboard also labels `/schedule` as `Calendar`.
- Help metadata currently describes `/production` as `Event production planning - prep timeline and execution schedule`, which does not match the actual page.
- The events help metadata still describes `/events` as if it has an internal list/kanban toggle, while the current code uses a hub-plus-list page and a separate `/events/board` route.

### Verified system gravity that should be preserved

- Generic event navigation already points overwhelmingly to `/events` and `/events/[id]`.
- Dashboard and command surfaces already use `/calendar` for generic calendar/planning entry.
- Week-strip and several schedule-oriented flows already use `/schedule` for full-schedule navigation.
- `/production` is barely referenced outside navigation and help metadata, which means it should be positioned as a companion overview, not as a competing primary root.

---

## Files to Create

None.

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/navigation/nav-config.tsx`                                     | Add a direct `Events Hub` item for `/events` inside the Events group, keep `/events/upcoming` and `/events/board` as focused views, relabel `/production` so it no longer competes with `/calendar`, and make `/schedule` and `/calendar` labels clearly different. Add `/calendar` as a mobile-tab option if needed, and stop labeling `/schedule` as `Calendar`. |
| `app/(chef)/events/page.tsx`                                               | Keep the route as the canonical event hub, but update any tile labels or descriptions needed so `Calendar`, `Production Calendar`, and pipeline surfaces reflect the final ownership model.                                                                                                                                                                        |
| `app/(chef)/production/page.tsx`                                           | Rewrite header and helper copy so it is explicitly a monthly event overview, not a generic calendar or prep timeline. Add clear sibling links back to `/events` and `/calendar`.                                                                                                                                                                                   |
| `app/(chef)/calendar/page.tsx`                                             | Keep `/calendar` as the planning calendar, but tune header/subcopy if needed so it is clearly the planning and availability workspace.                                                                                                                                                                                                                             |
| `app/(chef)/schedule/page.tsx`                                             | Keep `/schedule` as the operational schedule workspace, but tune header/subcopy if needed so it is clearly distinct from `/calendar`.                                                                                                                                                                                                                              |
| `app/(mobile)/chef/[slug]/dashboard/page.tsx`                              | Stop labeling `/schedule` as `Calendar` if the ownership model says `/calendar` owns the generic calendar name.                                                                                                                                                                                                                                                    |
| `lib/help/page-info-sections/02-chef-portal-events.ts`                     | Update `/events`, `/events/upcoming`, `/events/board`, and `/events/[id]/schedule` descriptions so they match the current route contract.                                                                                                                                                                                                                          |
| `lib/help/page-info-sections/09-chef-portal-calendar.ts`                   | Make `/calendar` explicitly the planning calendar and availability workspace.                                                                                                                                                                                                                                                                                      |
| `lib/help/page-info-sections/20-chef-portal-miscellaneous.ts`              | Correct `/production` and `/schedule` descriptions so they match the actual pages and no longer collapse into one vague scheduling concept.                                                                                                                                                                                                                        |
| `app/api/remy/stream/route-prompt-utils.ts`                                | Update the route map wording so `/events`, `/calendar`, and `/schedule` are described according to the new ownership model.                                                                                                                                                                                                                                        |
| `lib/ai/remy-actions.ts`                                                   | Same route-map wording correction as above.                                                                                                                                                                                                                                                                                                                        |
| `lib/ai/command-intent-parser.ts`                                          | Keep route parsing intact, but expand aliases so commands like `production calendar`, `event board`, or `upcoming events` resolve correctly and calendar-versus-schedule routing follows the new route contract.                                                                                                                                                   |
| `lib/ai/remy-activity-tracker.ts`                                          | Add or correct human-readable labels for `/production`, `/calendar`, and `/schedule` so session context reflects the new ownership model.                                                                                                                                                                                                                          |
| `docs/app-complete-audit.md`                                               | Update the events, calendar, schedule, and production sections so the document describes explicit route ownership instead of ambiguous overlap.                                                                                                                                                                                                                    |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Add this as the event-and-scheduling ownership slice under the redundancy lane and update the remaining-overlap note accordingly.                                                                                                                                                                                                                                  |

Builder note:

- Do not treat this as a redirect spec.
- This slice is mostly about route ownership, labels, descriptions, and honest navigation.
- Only change actual route behavior where the UI needs small copy or sibling-link corrections.

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No schema work belongs in this slice.
- Do not create route alias tables, navigation registries, or scheduling preference tables just to settle ownership.

---

## Data Model

This is a route-ownership correction, not a persistence change.

### Canonical route contract

- `canonicalEventRoot = '/events'`
- `canonicalUpcomingEvents = '/events/upcoming'`
- `canonicalEventBoard = '/events/board'`
- `canonicalPlanningCalendar = '/calendar'`
- `canonicalScheduleWorkspace = '/schedule'`
- `canonicalMonthlyEventOverview = '/production'`
- `canonicalPerEventSchedule = '/events/[id]/schedule'`

### Meaning of each route

- `/events`
  - the event hub
  - event record list
  - event creation and event-management root
- `/events/upcoming`
  - filtered list of active-booking events
  - not the root event hub
- `/events/board`
  - kanban board over event pipeline stages
  - not the root event hub
- `/calendar`
  - planning calendar
  - availability and shared-calendar workspace
  - planning views under `/calendar/day`, `/calendar/week`, `/calendar/year`, `/calendar/share`
- `/schedule`
  - operational schedule workspace
  - fast full-calendar style schedule management surface
  - not the generic planning-calendar root
- `/production`
  - month-only event overview
  - event chips plus monthly stats
  - not the generic calendar root
  - not the per-event execution schedule
- `/events/[id]/schedule`
  - execution schedule for one event
  - distinct from `/calendar`, `/schedule`, and `/production`

### Explicit invariants

- Do not redirect `/production` into `/calendar` or `/events`.
- Do not redirect `/schedule` into `/calendar`.
- Do not call `/production` the generic `Event Calendar`.
- Do not label `/schedule` as `Calendar` when `/calendar` is already a first-class route.
- Do not present `/events` as if its board view lives on the same page when `/events/board` is already separate.

---

## Server Actions

No new server actions are required.

| Function / Surface            | Current Problem                                                                                       | Required Change                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| route maps and intent parsing | route suggestions blur calendar versus schedule and omit production-specific phrasing                 | update descriptions and aliases so route suggestions follow the ownership model |
| session activity labels       | recent-page labels do not fully describe `/production` and keep `schedule` and `calendar` too generic | align route labels with the final route contract                                |

Builder note:

- Do not build a new routing abstraction layer for this.
- Update the existing route maps and labels directly.

---

## UI / Component Spec

### Page Layout

#### `/events`

- Keep this as the canonical event hub.
- It should remain the answer to generic prompts like:
  - `go to events`
  - `show all events`
  - `open event management`
- Its hub tiles may link out to:
  - `/calendar`
  - `/production`
  - `/events/board`
  - `/events/upcoming`

#### `/calendar`

- Keep this as the planning calendar and availability workspace.
- Generic `Calendar` copy and generic calendar navigation should point here.
- It owns:
  - planning
  - availability
  - shareable calendar flows
  - the `/calendar/day|week|year|share` family

#### `/schedule`

- Keep this as the operational schedule workspace.
- It should be labeled as `Schedule` or `Full Schedule`, not plain `Calendar` if that would compete with `/calendar`.
- It may stay prominent in mobile or operational surfaces if that is the better execution-oriented calendar.

#### `/production`

- Keep the route.
- Relabel it as `Production Calendar`, `Monthly Event Overview`, or equivalent language that matches the actual month grid.
- Add sibling links in the header so a chef can move cleanly to:
  - `/events`
  - `/calendar`
- Do not describe this page as a prep timeline or execution scheduler.

#### `/events/[id]/schedule`

- Keep this as the event-specific schedule.
- Do not let generic calendar or schedule copy point here unless the user is already in one event context.

### Navigation and label rules

- Events nav group must contain a direct path to `/events`.
- Generic `Calendar` nav means `/calendar`.
- `Schedule` means `/schedule`.
- `Production Calendar` means `/production`.
- `Event Board` means `/events/board`.
- `Upcoming Events` means `/events/upcoming`.

### Mobile rule

- If mobile keeps `/schedule` as the primary quick-access calendar-like route, label it `Schedule`.
- If the product wants a true `Calendar` option in mobile customization, expose `/calendar` directly instead of mislabeling `/schedule`.

### Route-truth fixes

- Help metadata, nav labels, Remy route maps, and activity labels must all tell the same story.
- No generic `Calendar` CTA should land on `/production`.
- No generic `Event Hub` CTA should bypass `/events` in favor of `/events/upcoming`.

### States

- **Loading:** `/production`, `/calendar`, and `/schedule` can keep their own loading states. Loading does not justify relabeling one as another.
- **Empty:** empty state copy should stay route-specific. An empty `/production` month should still describe a month overview, not a scheduling workspace.
- **Error:** error and fallback text should use the correct owning route names.
- **Populated:** populated data does not change ownership. A rich month grid on `/production` does not make it the event root.

---

## Edge Cases and Error Handling

| Scenario                                                                                                           | Correct Behavior                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| A builder tries to solve the overlap by redirecting `/production` into `/calendar`                                 | Do not do that in this slice. `/production` is a real companion view with a distinct month-only job.                  |
| A builder leaves the Events nav group without a direct `/events` item                                              | That keeps the hub discoverability problem alive. Add a direct event-hub item.                                        |
| A builder keeps labeling `/production` as `Event Calendar`                                                         | That recreates the current confusion with `/calendar`. Use production-specific language.                              |
| A builder keeps labeling `/schedule` as `Calendar` in mobile surfaces                                              | That hides the distinction between planning calendar and schedule workspace. Align the label with the route contract. |
| A builder rewrites `/events` copy as if board view lives on the same page                                          | That makes help and navigation dishonest. `/events/board` is already a separate route.                                |
| A builder merges `/calendar` and `/schedule` conceptually without inspecting their different data sources and jobs | Do not do that here. This slice assigns ownership; it does not force a merge.                                         |

---

## Verification Steps

1. Sign in as a chef and open the Events navigation group.
2. Verify: there is a direct item for `/events`.
3. Verify: `/events/upcoming`, `/events/board`, `/calendar`, `/schedule`, and `/production` all have distinct labels that match their jobs.
4. Open `/events`.
5. Verify: it still reads as the event hub and list root.
6. Open `/events/upcoming`.
7. Verify: it still behaves as a filtered active-bookings list, not the event root.
8. Open `/events/board`.
9. Verify: it still behaves as the kanban board.
10. Open `/calendar`.
11. Verify: it reads as the planning and availability calendar.
12. Open `/schedule`.
13. Verify: it reads as the schedule workspace and is not mislabeled as the generic planning calendar.
14. Open `/production`.
15. Verify: header and helper copy describe a monthly event overview, not a prep timeline or generic calendar root.
16. Verify: `/production` offers clear navigation back to `/events` and `/calendar`.
17. Use a Remy prompt like `take me to calendar`, `take me to schedule`, `open upcoming events`, and `open production calendar`.
18. Verify: route suggestions map to the correct owning surfaces.
19. Open any mobile navigation touched by this slice.
20. Verify: `/schedule` is not mislabeled as `Calendar` unless the route contract explicitly says so.

---

## Out of Scope

- Rebuilding event data queries or scheduling engines.
- Merging `/calendar` and `/schedule`.
- Reworking per-event day-of-service logic.
- Rewriting the entire event information architecture.
- Redirecting or deleting `/production`.
- Building new scheduling views.

---

## Notes for Builder Agent

1. **Do not confuse companion surfaces with duplicates.** The problem here is unclear ownership, not proof that every neighboring route must collapse into one page.

2. **Follow the route gravity already present in the repo.** `/events` already owns event records, `/calendar` already owns planning language, and `/schedule` already owns many full-schedule references. The spec is making that explicit.

3. **Production is the easiest place to lie by accident.** Its current help copy does not match the page. Fix that directly.

4. **Nav honesty matters more than clever taxonomy.** If the labels are clear and consistent, the product feels less redundant even before any deeper merge decision is made.

5. **Do not widen this into a calendar-platform rewrite.** This slice is about route ownership and user-facing truth, not new scheduling capabilities.
