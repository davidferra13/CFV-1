# Travel Route Planning System

**Branch:** `feature/packing-list-system`
**Migration:** `supabase/migrations/20260303000020_travel_route_planning.sql`
**Status:** Complete

---

## What Changed

Added a complete travel route planning system to ChefFlow. Chefs can now plan every discrete trip associated with an event — from specialty ingredient sourcing runs weeks before, to the consolidated grocery run, through to the drive to the venue and return home. The system tracks stops, timing, ingredients, and multi-event consolidation.

---

## Why This Exists

Previously the system only had a binary "shop day before / shop day of" toggle. There was no way to:

- Plan a specialty sourcing trip (driving to a farm or specialty importer weeks before)
- Consolidate a grocery run that serves multiple events in the same week
- Track the full spatial arc of an event: home → stores → venue → home
- Remove day-of shopping from the timeline when shopping was pre-planned
- Mark specialty-sourced ingredients as "already have it" on the grocery list

---

## Data Model

### `event_travel_legs`

One row per trip leg. Central table for all route planning.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `chef_id` | UUID → chefs | Ownership |
| `tenant_id` | UUID | Tenant scoping |
| `primary_event_id` | UUID → events | The event this leg is "for" (nullable for standalone trips) |
| `linked_event_ids` | UUID[] | Additional events sharing this leg (consolidated runs) |
| `leg_type` | TEXT | See Leg Types below |
| `leg_date` | DATE | Date of the trip |
| `departure_time` | TIME | When the chef leaves |
| `estimated_return_time` | TIME | When the chef expects to be back |
| `origin_type` / `origin_address` / `origin_label` | TEXT | Where the leg starts |
| `destination_type` / `destination_address` / `destination_label` | TEXT | Where it ends |
| `stops` | JSONB | Ordered stop list (see Stop shape below) |
| `total_drive_minutes` | INTEGER | Computed: sum of driving estimates |
| `total_stop_minutes` | INTEGER | Computed: sum of on-site time across stops |
| `total_estimated_minutes` | INTEGER | Computed: drive + stop |
| `status` | TEXT | `planned` → `in_progress` → `completed` \| `cancelled` |

**Stop shape (JSONB):**
```json
{
  "order": 1,
  "name": "Belcampo Farms",
  "address": "123 Farm Rd, Petaluma CA",
  "purpose": "Pick up dry-aged beef",
  "estimated_minutes": 20,
  "notes": "Call ahead"
}
```

### `travel_leg_ingredients`

Links specialty sourcing legs to specific ingredients from the event's recipe graph. Used to track what has been sourced and exclude those items from the printed grocery list.

| Column | Notes |
|---|---|
| `leg_id` | FK to event_travel_legs |
| `ingredient_id` | FK to ingredients |
| `event_id` | Which event this ingredient is for (when leg is consolidated) |
| `quantity`, `unit` | How much to source |
| `store_name` | Which stop to pick it up at |
| `status` | `to_source` → `sourced` \| `unavailable` |

### Events table addition

```sql
ALTER TABLE events ADD COLUMN travel_route_ready BOOLEAN DEFAULT false;
```

---

## Leg Types

| Type | Purpose | Default Origin → Dest |
|---|---|---|
| `specialty_sourcing` | Specific ingredients, farms, importers | Home → Home |
| `grocery_shopping` | Standard grocery run | Home → Home |
| `consolidated_shopping` | One run covering 2+ events | Home → Home |
| `service_travel` | Drive to service venue | Home → Venue |
| `return_home` | Drive home after service | Venue → Home |
| `other` | Any other trip | Free entry |

When `service_travel` is created, origin auto-fills from `chef_preferences.home_address` and destination from `events.location_address`.

---

## Files Added

| File | Purpose |
|---|---|
| `supabase/migrations/20260303000020_travel_route_planning.sql` | Schema: event_travel_legs + travel_leg_ingredients tables, RLS, indexes |
| `lib/travel/types.ts` | TypeScript types, display maps, helper functions |
| `lib/travel/actions.ts` | Server actions: CRUD, status transitions, ingredient tracking, auto-create service legs |
| `components/events/travel-leg-form.tsx` | Add/edit leg form with collapsible sections, stop builder, ingredient picker |
| `components/events/travel-plan-client.tsx` | Event travel plan interactive UI: leg cards, status management, consolidation banners |
| `app/(chef)/events/[id]/travel/page.tsx` | Event-level travel planner page |
| `app/(chef)/travel/page.tsx` | Global weekly view: all legs across all events for next 90 days |
| `lib/documents/generate-travel-route.ts` | PDF generator: one page per leg with stops, timing, ingredient checklist |

---

## Files Modified

| File | Change |
|---|---|
| `lib/scheduling/timeline.ts` | Extended `generateTimeline()` with `legs?: TravelLeg[]` parameter. Service legs override drive time. Shopping legs on a different date suppress the day-of shopping block. |
| `lib/documents/generate-grocery-list.ts` | Pre-sourced ingredients (status='sourced' on a specialty leg) are excluded from the shopping list and shown in a separate "PRE-SOURCED" section with checkboxes pre-checked. |
| `lib/documents/actions.ts` | Added `travelRoute` to `DocumentReadiness` type. Ready when at least one `service_travel` leg exists. |
| `app/api/documents/[eventId]/route.ts` | Added `?type=travel` case → generates travel route PDF. |
| `components/navigation/nav-config.tsx` | Added "Travel" to `standaloneTop` nav (MapPin icon, href `/travel`). |
| `app/(chef)/events/[id]/page.tsx` | Added "Travel Plan" button to event header actions. |

---

## Key Server Actions (`lib/travel/actions.ts`)

| Action | Purpose |
|---|---|
| `getTravelPlan(eventId)` | Fetch all legs + ingredients + nearby events for event |
| `getAllTravelLegs(options)` | Global view (date/status filters) |
| `createTravelLeg(input)` | Create a leg; auto-computes stop/drive/total minutes |
| `updateTravelLeg(input)` | Update; recomputes totals if stops changed |
| `markLegComplete(legId)` | Sets status='completed', records completed_at |
| `markLegInProgress(legId)` | Sets status='in_progress' |
| `cancelTravelLeg(legId)` | Sets status='cancelled' |
| `deleteTravelLeg(legId)` | Hard delete (leg must belong to chef) |
| `upsertLegIngredient(input)` | Add or update ingredient on a specialty leg |
| `markIngredientSourced(id)` | Status → 'sourced', records sourced_at |
| `updateIngredientStatus(id, status)` | Set any TravelIngredientStatus |
| `deleteLegIngredient(id)` | Remove ingredient link |
| `searchIngredientsForEvent(eventId, query)` | Search ingredients from event's recipe graph |
| `autoCreateServiceLegs(eventId)` | Idempotent: create service_travel + return_home legs on event confirmation; skips if already exist |

---

## Timeline Engine Integration

`generateTimeline()` in `lib/scheduling/timeline.ts` now accepts `legs?: TravelLeg[]`.

**Service leg override:**
If a `service_travel` leg (non-cancelled) exists, its `total_estimated_minutes` is used instead of `events.travel_time_minutes` for the departure calculation.

**Shopping suppression:**
If a `grocery_shopping` or `consolidated_shopping` leg (non-cancelled) exists on a **different date** from the event, the day-of shopping blocks (`leave_for_store` and `home_from_shopping`) are suppressed from the timeline. The timeline shows only `start_prep` and `wake`, treating it as if `shop_day_before` were true.

---

## Grocery List Integration

`generate-grocery-list.ts` queries `travel_leg_ingredients` for the event at fetch time:

- Rows with `status='sourced'` and `leg_type='specialty_sourcing'` are **excluded** from the main shopping aggregation
- They appear in a separate **"✓ PRE-SOURCED (specialty run)"** section at the bottom of the grocery PDF, with checkboxes pre-checked (PDF checkbox renders a ✓ inside the box)
- If the `event_travel_legs` table doesn't exist yet (migration pending), the fetch degrades gracefully — no crash, full grocery list still generates without the pre-sourced section

---

## PDF Document

`GET /api/documents/[eventId]?type=travel`

Generates one page per leg (sorted by date → departure time). Each page contains:
1. Header: event label, leg type, date, chef name, status
2. Departure: time and origin address
3. Stop list: numbered, with address, purpose, time on-site, notes
4. Arrival: destination address and ETA
5. Time summary: drive, stop, total
6. Notes (if any)
7. Ingredient sourcing checklist (specialty legs only; sourced items pre-checked)

Unlike other documents, this is not constrained to one page — it uses `pdf.newPage()` between legs.

`DocumentReadiness.travelRoute` is `ready: true` when at least one non-cancelled `service_travel` leg exists for the event.

---

## Multi-Event Consolidation

A `consolidated_shopping` leg stores multiple event IDs in `linked_event_ids UUID[]`. The leg appears on the Travel Plan page for every linked event. When the chef edits it from any event's Travel Plan, the changes propagate to all (one row, multiple event views).

Three consolidation modes supported in `travel-plan-client.tsx`:
1. **Manual linking** — expand "Also for events" in the leg form, multi-select upcoming events
2. **Auto-suggest** — on save, the system checks for other events within ±7 days and shows a banner on the travel plan page if found
3. **Shared consolidated leg** — `consolidated_shopping` legs show a "Shared run — N events" indicator on each event's travel plan

---

## Navigation

- **Per-event:** "Travel Plan" button in the event page header → `/events/[id]/travel`
- **Global:** "Travel" tab in the chef nav (standaloneTop, MapPin icon) → `/travel` — weekly grouped view of all legs for the next 90 days

---

## TypeScript Notes

`event_travel_legs` and `travel_leg_ingredients` are new tables not yet in `types/database.ts` (which is auto-generated from the live schema). Until `supabase gen types typescript --linked > types/database.ts` is run after migration, `lib/travel/actions.ts` uses `// @ts-nocheck` and an `AnySupabase` cast to bypass the typed client. The `generate-travel-route.ts` and `generate-grocery-list.ts` files use `as any` casts on the Supabase client for the new table queries only.

To regenerate types after applying the migration:
```bash
npx supabase gen types typescript --linked > types/database.ts
```

---

## Verification Checklist

- [ ] Apply migration `20260303000020` to remote Supabase
- [ ] Navigate to any event → "Travel Plan" button appears
- [ ] `/events/[id]/travel` loads with TravelPlanClient
- [ ] Add a `specialty_sourcing` leg — link 2 ingredients, mark one sourced
- [ ] Generate grocery list → sourced ingredient appears in PRE-SOURCED section (pre-checked)
- [ ] Add a `grocery_shopping` leg on the day before the event — timeline loses the day-of shopping blocks
- [ ] Add a `service_travel` leg with a departure time — timeline departure uses leg's `total_estimated_minutes`
- [ ] Navigate to `/travel` — global weekly view shows all legs
- [ ] Hit `?type=travel` on document API — PDF generates with one page per leg
- [ ] Run `npx tsc --noEmit` — no TypeScript errors
