# Spec: Recipe Peak Windows & Prep Timeline Engine

> **Status:** draft
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event   | Date             | Agent/Session | Commit |
| ------- | ---------------- | ------------- | ------ |
| Created | 2026-04-17 00:30 | Opus planner  |        |

---

## Developer Notes

### Raw Signal

"I extremely procrastinated about everything and didn't take anything seriously. I wrote down get the groceries by 10 a.m. the day before. I got the groceries at 1 p.m. the day of. I wrote down get prep done by 1 p.m. the day before. I did not get the prep done until 5:20 the day of, and I had to be there at 6:30, and it was an hour and a half drive.

I'm personally not performing properly at all with my time management. I have to be doing everything the day before, and I'm doing everything 24 to 48 hours later than when I'm supposed to be. I should always prep for a dinner and have it ready two days before. Almost the whole menu could have been grocery shopped beforehand, and almost the whole menu could have been prepped beforehand.

I think it's probably really important that we come up with a time span of every recipe, of how long it lasts and its peak. Some recipes peak at one day, some at seven days, some at a month, some at half an hour. Every single recipe needs a peak so that we can understand when to prep that ingredient in the most optimal point.

Also safety hazards obviously. But don't go crazy with the safety crap. Don't flood our visual senses with it. If there's anything redundant, put it on a little advanced settings tab. Get all the visual clutter out of the user's face. If there's obvious stuff like allergies, make symbols for it. And ChefFlow should have a key. A key no matter what going forward about anything."

### Developer Intent

- **Core goal:** Every recipe gets a peak freshness window so ChefFlow can auto-generate a reverse prep timeline from the event date, telling the chef exactly WHEN to prep each component for optimal quality.
- **Key constraints:** Safety data must exist but stay hidden. No visual clutter. Symbols over text. One global legend/key for the entire app.
- **Motivation:** The developer (ADHD, solo private chef) loses 24-48 hours to procrastination because there's no structural enforcement of prep timing. Willpower doesn't work. Math does.
- **Success from the developer's perspective:** Open an upcoming event, see a day-by-day prep calendar that tells you exactly what to make and when, computed from the peak windows of every recipe on the menu. No thinking required. Just follow the list.

---

## What This Does (Plain English)

Every recipe gets two new fields: how many hours before service it's at its best (quality peak), and how many hours before it becomes unsafe (safety ceiling). When a chef opens an event with a menu attached, ChefFlow computes a reverse prep timeline: a day-by-day calendar working backwards from service time, placing each recipe/component on the optimal prep day. The chef sees a clean visual countdown: "3 days out: make stock, pickle onions. 2 days out: pasta dough, braise. 1 day out: fill ravioli. Day of: cook pasta, plate." Safety limits are enforced silently (the system won't schedule something too early), but the chef never sees USDA tables cluttering their view. A global symbol key is accessible from any page.

---

## Why It Matters

Solo private chefs don't have sous chefs or prep teams to enforce timing. Without structural guidance, everything slides to day-of. This feature turns ChefFlow from a recipe book into a time-aware operating system that tells the chef what to do and when, based on the actual science of each prepared item. It solves procrastination with math, not motivation.

---

## Files to Create

| File                                        | Purpose                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `lib/prep-timeline/compute-timeline.ts`     | Pure function: takes recipes + event date/time, returns day-by-day prep schedule |
| `lib/prep-timeline/peak-defaults.ts`        | Default peak windows by recipe category (starter values before chef customizes)  |
| `lib/prep-timeline/actions.ts`              | Server actions: save peak windows, get timeline for event                        |
| `components/events/prep-timeline.tsx`       | Main prep timeline UI on event detail page                                       |
| `components/events/prep-timeline-day.tsx`   | Single day card within the timeline                                              |
| `components/ui/symbol-key.tsx`              | Global symbol key/legend component (sheet/drawer)                                |
| `components/ui/symbol-key-trigger.tsx`      | Small button/icon that opens the key from anywhere                               |
| `components/recipes/peak-window-fields.tsx` | Peak window input fields for recipe form                                         |

---

## Files to Modify

| File                                                 | What to Change                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `components/events/event-form.tsx`                   | No changes needed (timeline is read-only, computed from menu)                   |
| `app/(chef)/events/[id]/page.tsx`                    | Add Prep Timeline tab to event detail                                           |
| `components/events/event-detail-mobile-nav.tsx`      | Add "Prep" tab to mobile nav                                                    |
| `components/recipes/recipe-form.tsx` (or equivalent) | Add peak window fields (collapsible section)                                    |
| `app/(chef)/layout.tsx`                              | Add global symbol key trigger to layout (small icon, bottom corner or header)   |
| `components/ui/icons.ts`                             | Add symbol icons (snowflake/frozen, thermometer/safety, clock/peak, leaf/fresh) |
| `components/events/event-detail-money-tab.tsx`       | Reference only: pattern for event detail tab structure                          |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Recipe peak freshness windows (quality + safety)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS peak_hours_min INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS peak_hours_max INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS safety_hours_max INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS storage_method TEXT
  CHECK (storage_method IN ('room_temp', 'fridge', 'freezer'))
  DEFAULT 'fridge';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS freezable BOOLEAN DEFAULT false;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS frozen_extends_hours INTEGER;

COMMENT ON COLUMN recipes.peak_hours_min IS 'Minimum hours before service when this recipe is at peak quality (e.g., braise needs at least 24h to develop flavor)';
COMMENT ON COLUMN recipes.peak_hours_max IS 'Maximum hours before service this recipe stays at peak quality';
COMMENT ON COLUMN recipes.safety_hours_max IS 'Hard safety ceiling in hours (USDA-based). System uses min(peak_hours_max, safety_hours_max) for scheduling';
COMMENT ON COLUMN recipes.storage_method IS 'How the finished recipe is stored: room_temp, fridge, freezer';
COMMENT ON COLUMN recipes.freezable IS 'Whether this recipe can be frozen to extend the prep window';
COMMENT ON COLUMN recipes.frozen_extends_hours IS 'If freezable, how many additional hours freezing adds to the window';
```

No new tables needed. The timeline is computed on-the-fly from recipe peak windows + event date.

### Migration Notes

- Migration filename: `20260417000001_recipe_peak_windows.sql`
- Purely additive (new nullable columns). No data loss risk.
- Existing recipes will have NULL peak windows. The UI shows "Set peak window" prompt on recipes missing this data.
- The `components` table already has `is_make_ahead` and `make_ahead_window_hours`. These become derivable from the linked recipe's peak window but are NOT removed (backwards compatible). New timeline engine reads from `recipes.peak_*` first, falls back to `components.make_ahead_window_hours`.

---

## Data Model

### Peak Window Concept

Every prepared recipe has a quality curve over time:

```
Quality
  |
  |         ┌──── peak zone ────┐
  |        /                     \
  |       /                       \
  |      /                         \        ← safety ceiling (hard stop)
  |     /                           \       |
  |    /                             \      |
  |───/                               \─────X
  |
  └──────────────────────────────────────────── Hours before service
       peak_hours_max              peak_hours_min    0 (service)
       (earliest optimal)         (latest optimal)
```

- **peak_hours_max**: Earliest the chef should prep this (e.g., 72 hours = 3 days ahead). Anything earlier and quality degrades.
- **peak_hours_min**: Latest the chef should prep this (e.g., 12 hours = morning of, for a dinner). Anything later and they're rushing.
- **safety_hours_max**: Absolute ceiling. The system will never schedule prep earlier than this, regardless of what the chef enters for peak_hours_max. Enforced silently.

### Examples

| Recipe             | peak_hours_min | peak_hours_max | safety_hours_max | storage   | freezable |
| ------------------ | -------------- | -------------- | ---------------- | --------- | --------- |
| Pasta dough        | 4              | 72             | 72               | fridge    | yes       |
| Filled ravioli     | 2              | 36             | 48               | fridge    | yes       |
| Braised short ribs | 24             | 72             | 96               | fridge    | yes       |
| Vinaigrette        | 1              | 168            | 168              | fridge    | no        |
| Pickled onions     | 48             | 336            | 504              | fridge    | no        |
| Pan sauce          | 0              | 1              | 4                | room_temp | no        |
| Grilled protein    | 0              | 0.5            | 2                | room_temp | no        |
| Stock/broth        | 2              | 120            | 120              | fridge    | yes       |
| Compound butter    | 2              | 168            | 240              | fridge    | yes       |

### Category Defaults

When a chef hasn't set peak windows on a recipe, the system uses sensible defaults by `recipe_category`:

| Category  | Default peak_min | Default peak_max | Default safety_max | Default storage |
| --------- | ---------------- | ---------------- | ------------------ | --------------- |
| sauce     | 1                | 72               | 96                 | fridge          |
| protein   | 0                | 1                | 2                  | room_temp       |
| starch    | 1                | 48               | 72                 | fridge          |
| vegetable | 0                | 24               | 48                 | fridge          |
| dessert   | 2                | 48               | 72                 | fridge          |
| bread     | 1                | 24               | 48                 | room_temp       |
| condiment | 1                | 168              | 336                | fridge          |
| base      | 2                | 120              | 120                | fridge          |
| garnish   | 0                | 2                | 4                  | room_temp       |

These are starter values. Chefs override per-recipe as they learn their dishes.

### Timeline Computation (Pure Function)

```typescript
interface PrepItem {
  recipeId: string
  recipeName: string
  componentName: string
  dishName: string
  courseName: string
  peakHoursMin: number
  peakHoursMax: number
  safetyHoursMax: number
  storageMethod: 'room_temp' | 'fridge' | 'freezer'
  freezable: boolean
  prepTimeMinutes: number
  symbols: Symbol[] // allergens, frozen, etc.
}

interface PrepDay {
  date: Date
  label: string // "3 days before", "Day of", etc.
  isToday: boolean
  isPast: boolean
  items: PrepItem[]
  totalPrepMinutes: number
  deadlineType: 'grocery' | 'prep' | 'service' | null
}

function computePrepTimeline(items: PrepItem[], serviceDateTime: Date): PrepDay[]
```

**Algorithm:**

1. For each recipe/component on the event menu, resolve peak window (recipe fields > category defaults).
2. Compute the effective ceiling: `Math.min(peak_hours_max, safety_hours_max)`.
3. Place each item on the optimal prep day: the day that falls within `[peak_hours_min, effective_ceiling]`, preferring the middle of the window (gives the chef maximum flexibility).
4. Group items by calendar day.
5. Mark deadline days: grocery deadline (earliest prep day minus 1), prep deadline (last possible prep day for items with tight windows), service day.
6. If an item's entire window falls on service day (peak_max < 24), mark it as "day-of only."

### Grocery Deadline Derivation

The grocery deadline = earliest prep day in the timeline minus 1 day. This gives the chef a concrete "buy by" date computed from the recipes, not from guesswork.

---

## Server Actions

| Action                          | Auth            | Input                                                                                                      | Output                                                               | Side Effects                 |
| ------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------- |
| `updateRecipePeakWindow(input)` | `requireChef()` | `{ recipeId, peakHoursMin, peakHoursMax, safetyHoursMax?, storageMethod, freezable, frozenExtendsHours? }` | `{ success, error? }`                                                | Revalidates recipe page      |
| `getEventPrepTimeline(eventId)` | `requireChef()` | `{ eventId }`                                                                                              | `{ timeline: PrepDay[], groceryDeadline: Date, prepDeadline: Date }` | None (read-only)             |
| `bulkSetPeakWindows(input)`     | `requireChef()` | `{ updates: { recipeId, peakHoursMin, peakHoursMax }[] }`                                                  | `{ success, updated: number, error? }`                               | Revalidates affected recipes |

---

## UI / Component Spec

### Design Principles (from Developer Notes)

1. **Safety data is infrastructure, not interface.** The chef never sees USDA tables, safety hour numbers, or food science jargon on the main timeline. Safety enforces limits silently (won't let you schedule too early). The only time safety surfaces: a small warning symbol on an item if the chef manually overrides peak_max to exceed safety_max.
2. **Symbols over words.** Allergens, storage method, frozen status, day-of-only: all represented by small icons. No paragraph explanations.
3. **Global key is always accessible.** One legend component, reachable from any page.

### Prep Timeline (Event Detail Tab)

Lives on the event detail page as a new "Prep" tab alongside existing tabs (Details, Menu, Money, etc.).

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Event: Smith Anniversary Dinner            │
│  Service: April 16, 6:30 PM                 │
│                                             │
│  [Details] [Menu] [Prep] [Money] [Docs]     │
│                                             │
│  ┌─ GROCERY DEADLINE ─────────────────────┐ │
│  │  April 12 (Sat) - 4 days before        │ │
│  │  Buy everything for this event          │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ April 13 (Sun) - 3 days before ──────┐ │
│  │  ○ Pickle red onions      🧊 ⏱ 20min  │ │
│  │  ○ Make chicken stock     🧊 ⏱ 45min  │ │
│  │                          Total: 1h 5m  │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ April 14 (Mon) - 2 days before ──────┐ │
│  │  ○ Pasta dough            🧊 ⏱ 30min  │ │
│  │  ○ Braise short ribs         ⏱ 2h     │ │
│  │  ○ Compound butter        🧊 ⏱ 15min  │ │
│  │                          Total: 2h 45m │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ PREP DEADLINE ────────────────────────┐ │
│  │  April 15 (Tue) - 1 day before         │ │
│  │  ○ Fill & shape ravioli   🧊 ⏱ 1h     │ │
│  │  ○ Make vinaigrette          ⏱ 10min   │ │
│  │  ○ Prep mise en place        ⏱ 30min   │ │
│  │                          Total: 1h 40m │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ SERVICE DAY ──────────────────────────┐ │
│  │  April 16 (Wed) - Day of               │ │
│  │  ○ Cook pasta             🔥 ⏱ 15min   │ │
│  │  ○ Plate & garnish        🍃 ⏱ 20min   │ │
│  │  ○ Pan sauce              🔥 ⏱ 10min   │ │
│  │                          Total: 45min  │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  [🔑 Symbol Key]                            │
└─────────────────────────────────────────────┘
```

**Day cards:**

- Color-coded: past days (muted/gray), today (highlighted/blue border), future days (normal), service day (accent)
- Each item shows: recipe name, symbols, prep time
- Checkbox for marking items complete (persisted in localStorage, not DB)
- Total prep time per day shown at bottom of card
- Grocery deadline and prep deadline cards are visually distinct (banner-style)

**Symbols used on timeline:**

| Symbol        | Meaning                                    | When shown                                           |
| ------------- | ------------------------------------------ | ---------------------------------------------------- |
| 🧊            | Freezable (can be made earlier and frozen) | `freezable = true`                                   |
| 🔥            | Day-of only (must be done fresh)           | `peak_hours_max < 4`                                 |
| 🍃            | Fresh/garnish (very short window)          | `peak_hours_max < 2`                                 |
| ⏱             | Prep time                                  | Always (from `prep_time_minutes`)                    |
| ⚠️            | Safety warning                             | Only if chef overrides peak to exceed safety ceiling |
| Allergen dots | Colored dots per allergen type             | If recipe has flagged allergens                      |

### Recipe Form: Peak Window Fields

Added as a collapsible section on the recipe edit form, below the existing time fields.

```
┌─ Peak Freshness ──────────────────────────┐
│                                            │
│  How far ahead can you make this?          │
│                                            │
│  Earliest: [___] hours before service      │
│  Latest:   [___] hours before service      │
│                                            │
│  Storage: (○ Room temp) (● Fridge) (○ Freezer)  │
│  [x] Can be frozen to extend window       │
│      Frozen adds: [___] hours              │
│                                            │
│  ▸ Advanced (safety settings)              │
│    Safety ceiling: [___] hours (auto-set)  │
│                                            │
└────────────────────────────────────────────┘
```

**Behavior:**

- If chef leaves fields empty, category defaults apply. UI shows "(using default: 72h)" in muted text.
- Safety ceiling auto-populates based on recipe category + ingredients. Chef can override (advanced section, collapsed by default).
- "Can be frozen" checkbox reveals the additional hours field.
- Plain language labels. "Earliest" = peak_hours_max, "Latest" = peak_hours_min. The chef thinks "I can make this 3 days ahead" not "peak_hours_max = 72."

### Global Symbol Key

A small `🔑` icon in the app header (or floating bottom-right). Clicking opens a slide-out sheet:

```
┌─ ChefFlow Symbol Key ─────────────────────┐
│                                            │
│  Timeline                                  │
│  🧊  Freezable                             │
│  🔥  Day-of only                           │
│  🍃  Fresh (short window)                  │
│  ⏱  Prep time                             │
│  ⚠️  Safety warning                        │
│                                            │
│  Allergens                                 │
│  🔴  Nuts                                  │
│  🟡  Dairy                                 │
│  🟠  Gluten                                │
│  🔵  Shellfish                             │
│  🟣  Eggs                                  │
│  ⚫  Soy                                   │
│  🟢  Vegetarian                            │
│  🌱  Vegan                                 │
│                                            │
│  Storage                                   │
│  ❄️  Refrigerate                            │
│  🧊  Freeze                                │
│  🏠  Room temperature                      │
│                                            │
└────────────────────────────────────────────┘
```

**Key properties:**

- Accessible from every page (lives in layout)
- Sheet component (slides in from right, doesn't navigate away)
- Organized by category
- Shows ONLY symbols currently used in the app (not a hypothetical library)
- Updated whenever new symbol types are added to ChefFlow

### States

- **Loading:** Skeleton cards (3 gray blocks stacked)
- **Empty (no menu on event):** "Add a menu to see your prep timeline."
- **Empty (menu exists but no peak windows set):** "Your recipes don't have peak windows yet. Set them in the recipe editor to generate a prep timeline." With a link to the first recipe.
- **Error:** "Could not load prep timeline." (never fake data)
- **Populated:** Day cards as shown above
- **Partial (some recipes have windows, some don't):** Show timeline for recipes that have windows. Items without windows grouped in a "Not yet timed" section at the bottom with a prompt to set their windows.

---

## Edge Cases and Error Handling

| Scenario                                           | Correct Behavior                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recipe has no peak window set                      | Use category default. Show "(default)" label.                                                                                                     |
| Recipe has no category                             | Default to most conservative window (0-24h, fridge).                                                                                              |
| Chef sets peak_max > safety_max                    | Allow it but show ⚠️ symbol on the item. Tooltip: "Exceeds recommended safety window." Timeline still uses chef's value (they know their recipe). |
| Event has no service time set                      | Show timeline with day offsets only ("3 days before", "2 days before") instead of calendar dates.                                                 |
| Event is in the past                               | Show timeline grayed out. Label: "This event has passed."                                                                                         |
| All items are day-of                               | Show only the service day card. No multi-day timeline needed.                                                                                     |
| Recipe linked to multiple components on same event | Show once per component (different dish context).                                                                                                 |
| Menu changes after timeline is viewed              | Timeline recomputes. Checkboxes in localStorage clear for removed items.                                                                          |
| peak_hours_min > peak_hours_max (bad input)        | Validation: reject at save. "Earliest must be greater than Latest."                                                                               |
| Two items compete for same narrow window           | Both show on the same day. Total prep time helps chef assess feasibility.                                                                         |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to a recipe, open edit form
3. Verify: Peak Freshness section is visible (collapsed/expandable)
4. Set peak window values, save. Verify persistence on reload.
5. Navigate to an event that has a menu with the edited recipe
6. Click "Prep" tab. Verify: timeline renders with correct day placement
7. Verify: grocery deadline appears before earliest prep day
8. Verify: symbols display correctly (freezable, day-of, etc.)
9. Click the 🔑 key icon. Verify: symbol key sheet opens with all symbols
10. Verify: recipe with no peak window shows "(default)" on timeline
11. Verify: mobile layout renders day cards stacked properly
12. Screenshot the timeline and the symbol key

---

## Out of Scope

- Push notifications / reminders ("prep this today") - separate spec, depends on this one
- Automatic grocery list generation from timeline - separate spec
- Calendar sync (export prep timeline to Google Calendar / iCal) - separate spec
- AI-powered peak window suggestions based on recipe text - separate spec (and subject to AI policy: formula > AI)
- Per-component peak windows (different from the linked recipe) - future enhancement if needed
- Shopping trip route optimization - not this feature
- Multi-event timeline overlap (two events in one week) - future enhancement

---

## Notes for Builder Agent

1. **The `components` table already has `is_make_ahead` and `make_ahead_window_hours`.** The new peak window fields on `recipes` supersede these but don't remove them. The timeline engine should prefer `recipes.peak_hours_*` and fall back to `components.make_ahead_window_hours` for recipes that haven't been updated.

2. **The `ingredient_shelf_life` reference table already exists** with USDA FoodKeeper data (pantry/fridge/freezer days). Use this to auto-populate `safety_hours_max` defaults when a recipe's primary protein or perishable ingredient is identifiable. This is a nice-to-have, not blocking.

3. **Peak window input UX matters.** Chefs think in days, not hours, for most things. Consider showing a dual input: a dropdown ("hours" / "days") that converts. Internally, always store hours.

4. **Checkbox state in localStorage** (for marking items done on the timeline) uses key format: `cf-prep-{eventId}-{recipeId}-{componentId}`. Prefix `cf-` per CLAUDE.md rules (no "OpenClaw" in localStorage keys).

5. **Symbol key is the first instance of a global UI element.** Build it extensible. Other features (inventory, menu costing, allergen views) will add their own symbol categories to the same key. Use a registry pattern:

   ```typescript
   // lib/ui/symbol-registry.ts
   export const SYMBOL_REGISTRY: SymbolCategory[] = [
     { name: 'Timeline', symbols: [...] },
     { name: 'Allergens', symbols: [...] },
     { name: 'Storage', symbols: [...] },
   ]
   ```

6. **No real emoji in production.** The spec uses emoji for illustration. In the actual UI, use SVG icons from `components/ui/icons.ts` (Lucide-based). Map each symbol to a Lucide icon:
   - Freezable: `Snowflake`
   - Day-of: `Flame`
   - Fresh: `Leaf`
   - Prep time: `Clock`
   - Safety warning: `AlertTriangle`
   - Storage fridge: `Thermometer`
   - Allergen dots: small colored `Circle` with tooltip

7. **Interface Philosophy compliance:**
   - One primary action per screen: the timeline is read-only (view). Editing peak windows happens on the recipe form.
   - Max 7 items visible per group: if a prep day has 8+ items, paginate or collapse low-priority ones under "Show all."
   - Five mandatory states: all covered above.
   - Progressive disclosure: safety settings in collapsed "Advanced" section.

8. **Mobile:** Day cards stack vertically. Full-width. Swipeable if needed. The symbol key opens as a bottom sheet instead of a side sheet.
