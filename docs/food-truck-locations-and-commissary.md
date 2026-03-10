# Food Truck: Locations and Commissary Load-Out

Two features for food truck operators in ChefFlow.

## Feature 1: Spot/Location Roster and Rotation Calendar

### What it does

Food trucks visit the same locations on a regular rotation (farmers market on Saturday, office park on Tuesday, etc). This feature provides:

- **Location Roster**: a master list of all spots the truck visits, with address, contact info, permit status, and notes
- **Rotation Calendar**: a 7-day weekly grid showing which location the truck is visiting each day, with start/end times and expected covers
- **Copy Week**: duplicate one week's schedule to the next, for repeating rotations
- **Post-Service Tracking**: actual covers and revenue can be entered after each stop for location-level performance history

### Database

- `truck_locations`: roster of spots (name, address, lat/lng, contact, permit flag, notes, active flag)
- `truck_schedule`: per-date entries (location, date, start/end time, status, expected/actual covers, revenue in cents, weather notes)
- Both tables use `tenant_id` referencing `chefs(id)` with RLS
- Unique constraint on `(tenant_id, date, location_id)` prevents double-booking a spot on the same day
- Status values: scheduled, active, completed, cancelled (enforced by CHECK constraint)

### Files

| File                                                                       | Purpose                                                                                 |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `supabase/migrations/20260331000016_food_truck_locations_and_schedule.sql` | Migration for both tables                                                               |
| `lib/food-truck/location-actions.ts`                                       | Server actions: CRUD for locations + schedule, weekly view, copy week, location history |
| `components/food-truck/location-roster.tsx`                                | Client component: tabbed UI with roster list and 7-day grid                             |
| `app/(chef)/food-truck/locations/page.tsx`                                 | Page: server component wrapper                                                          |

### Key patterns

- All amounts in cents (`revenue_cents`)
- Tenant ID from session (`requireChef()`)
- `startTransition` with `try/catch` and rollback on all mutations
- Week navigation loads data client-side via server action
- Copy Week uses `upsert` with the unique constraint to handle conflicts gracefully

---

## Feature 2: Commissary Load-Out Workflow

### What it does

Food trucks prep at a commissary kitchen, then load everything onto the truck. This feature generates a checklist of what to load based on the day's schedule:

- **Auto-generated checklist**: based on scheduled stops and expected covers for the date
- **Four categories**: Ingredients, Prepped Items, Equipment, Supplies
- **Quantity scaling**: quantities scale with expected cover count (deterministic math, no AI)
- **Interactive checklist**: check items off as they're loaded, with progress bar
- **Ready confirmation**: "All Loaded - Ready to Roll" state when everything is checked

### Storage approach

Load-out data is stored as JSON in the `notes` field of the first `truck_schedule` entry for the date. This avoids creating an additional table while keeping the data server-side and persistent. The `dop_task_completions` table was considered but requires an `event_id` FK which doesn't apply to food truck operations.

### Files

| File                                           | Purpose                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `lib/food-truck/commissary-actions.ts`         | Server actions: generate, save, toggle, get, mark ready                             |
| `components/food-truck/commissary-loadout.tsx` | Client component: date picker, generate button, categorized checklist, progress bar |
| `app/(chef)/food-truck/loadout/page.tsx`       | Page: server component wrapper                                                      |

### Quantity scaling logic

All deterministic (Formula > AI):

- Proteins: `ceil(covers / 25) * 25` portions
- Dry goods: `covers * 1.1` (10% buffer)
- Desserts: `covers * 0.3` (30% uptake estimate)
- Disposables: `covers * 1.2` (20% buffer)
- Napkins: `covers * 3`

### Key patterns

- Formula > AI: all quantity calculations are deterministic math
- Optimistic updates with rollback on toggle
- Progress bar updates in real-time as items are checked
- Date picker defaults to today
- Regenerate overwrites existing checklist for the date
