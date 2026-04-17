# System Integrity Question Set: Recipe Peak Windows & Prep Timeline

**Scope:** Peak freshness windows, reverse prep timeline, food safety ceilings, symbol key system, and all surfaces that consume or display this data.

**Principle:** Every question is binary pass/fail. "Mostly works" is not passing. Each question targets a real failure mode that would harm a chef in production.

**Who benefits:** ALL users. Chefs get prep timelines and safety guards. Clients indirectly benefit because food quality improves. The system as a whole gains a global symbol language.

---

## Coverage Map

| Q    | Title                              | Domain        | Severity |
| ---- | ---------------------------------- | ------------- | -------- |
| PT1  | Peak Window Persistence            | Data          | P0       |
| PT2  | Category Default Completeness      | Logic         | P0       |
| PT3  | Safety Ceiling Never Exceeded      | Logic/Safety  | P0       |
| PT4  | Timeline Computation Determinism   | Logic         | P0       |
| PT5  | Tenant Isolation on Peak Windows   | Security      | P0       |
| PT6  | Reverse Timeline Math Correctness  | Logic         | P0       |
| PT7  | Grocery Deadline Derivation        | Logic         | P1       |
| PT8  | Zero-Recipe Event Graceful Empty   | UI/Zero-Data  | P0       |
| PT9  | Symbol Key Global Availability     | UI/UX         | P1       |
| PT10 | Symbol Registry Parity             | Struct        | P1       |
| PT11 | Prep Tab Renders Without Crash     | UI            | P0       |
| PT12 | localStorage Checkbox Isolation    | Data/Security | P1       |
| PT13 | Peak Window Validation Guards      | Input         | P0       |
| PT14 | Make-Ahead Fallback Chain          | Logic         | P1       |
| PT15 | Frozen Extends Hours Logic         | Logic         | P1       |
| PT16 | Allergen Flags Surface on Timeline | UI/Safety     | P0       |
| PT17 | Bulk Peak Window Idempotency       | Data          | P1       |
| PT18 | Past Day Visual Muting             | UI/UX         | P1       |
| PT19 | Service Day Always Present         | Logic         | P0       |
| PT20 | Component Without Recipe Handled   | Edge Case     | P1       |
| PT21 | Recipe Edit Peak Save Non-Blocking | Resilience    | P1       |
| PT22 | Peak Window Cache Invalidation     | Cache         | P1       |
| PT23 | Client Portal Timeline Absence     | Scope         | P2       |
| PT24 | Symbol Key Accessible on Mobile    | UI/A11y       | P1       |
| PT25 | Prep Timeline Does Not Leak PII    | Privacy       | P0       |

---

## Question Definitions

### PT1: Peak Window Persistence

**Hypothesis:** When a chef sets peak_hours_min, peak_hours_max, safety_hours_max, storage_method, freezable, and frozen_extends_hours on a recipe and saves, all 6 values persist to the database and reload correctly on the next edit visit.

**Failure:** Any value reverts to null, resets to default, or is silently dropped. Chef sets "48h" for a braise, comes back and sees the field empty.

**Verification:**

1. Edit a recipe, set all 6 peak fields
2. Save
3. Navigate away, come back to edit
4. All 6 fields reflect saved values (not placeholders)

**What breaks if this fails:** Chef thinks their peak windows are saved. Timeline computes from defaults instead. Prep schedule is wrong. Food quality degrades.

---

### PT2: Category Default Completeness

**Hypothesis:** Every value in the `recipe_category` database enum has a corresponding entry in `CATEGORY_DEFAULTS`. No category falls through to `FALLBACK_DEFAULT` silently.

**Failure:** A new recipe category is added to the enum but not to `CATEGORY_DEFAULTS`. Recipes in that category silently get 24h defaults regardless of food type.

**Verification:**

1. Extract all values from `recipe_category` enum in `types/database.ts`
2. Compare to keys in `CATEGORY_DEFAULTS` in `lib/prep-timeline/peak-defaults.ts`
3. Every enum value must have an explicit entry

**What breaks if this fails:** A "protein" recipe defaulting to 24h fridge is dangerous (real protein peaks at 1-2h). Category defaults ARE food safety - gaps are food safety gaps.

---

### PT3: Safety Ceiling Never Exceeded

**Hypothesis:** `computePrepTimeline` uses `min(peakHoursMax, safetyHoursMax)` as the effective ceiling. No recipe is ever placed on a prep day that exceeds its safety ceiling, even if peak_hours_max is higher.

**Failure:** Chef sets peak_hours_max=96 but safety_hours_max=72. System schedules prep 96h out. Food is unsafe at service time.

**Verification:**

1. For every PrepItem in a computed timeline, assert: `effectiveCeiling <= safetyHoursMax`
2. Assert the item's placement day (in hours before service) does not exceed `effectiveCeiling`

**What breaks if this fails:** Food safety violation. A chef preps something 4 days out when the USDA ceiling is 3 days. Liability.

---

### PT4: Timeline Computation Determinism

**Hypothesis:** `computePrepTimeline()` is a pure function. Same inputs produce identical outputs every time, regardless of wall clock, timezone, or invocation order.

**Failure:** Timeline shifts items between days depending on when you load the page. Chef prints prep list Monday morning, checks again Monday night, different schedule.

**Verification:**

1. Call `computePrepTimeline(fixedItems, fixedDate)` 100 times
2. Every call returns structurally identical output
3. No dependency on `new Date()` inside the computation (only `isToday`/`isPast` which are display flags, not scheduling)

**What breaks if this fails:** Chef cannot trust the timeline. Prints one version, opens another. Prep list is unreliable.

---

### PT5: Tenant Isolation on Peak Windows

**Hypothesis:** `updateRecipePeakWindow` and `getEventPrepTimeline` both scope all queries by `tenant_id`. Chef A cannot read or write Chef B's peak windows.

**Failure:** A crafted recipeId pointing to another tenant's recipe succeeds in updating peak windows.

**Verification:**

1. `updateRecipePeakWindow` includes `.eq('tenant_id', user.tenantId!)` on the update query
2. `getEventPrepTimeline` includes `.eq('tenant_id', user.tenantId!)` on event, menu, and recipe queries
3. `bulkSetPeakWindows` includes `.eq('tenant_id', user.tenantId!)` on every update

**What breaks if this fails:** Cross-tenant data write. Security violation. One chef overwrites another's recipe data.

---

### PT6: Reverse Timeline Math Correctness

**Hypothesis:** Items are placed on the correct calendar day relative to service date. A recipe with `effectiveCeiling=48h` and `peakHoursMin=24h` is placed 1 day before service (preferred day when 1 is in range). A recipe with `effectiveCeiling=4h` is placed on service day (day 0).

**Failure:** Items placed on wrong days. Braised short ribs (should be 2 days out) placed day-of. Pan sauce (must be day-of) placed 2 days out.

**Verification:**

1. effectiveCeiling=48h, peakHoursMin=0h: earliestDaysBefore=2, latestDaysBefore=0, optimal=1 (1 is in range)
2. effectiveCeiling=4h, peakHoursMin=0h: earliestDaysBefore=0, latestDaysBefore=0, optimal=0
3. effectiveCeiling=72h, peakHoursMin=48h: earliestDaysBefore=3, latestDaysBefore=2, optimal=2 (middle, but 1 not in range)
4. effectiveCeiling=168h, peakHoursMin=1h: earliestDaysBefore=7, latestDaysBefore=0, optimal=1 (1 is in range)

**What breaks if this fails:** The entire feature purpose - telling chefs when to prep - is wrong. This is the core algorithm.

---

### PT7: Grocery Deadline Derivation

**Hypothesis:** Grocery deadline is set to 1 day before the earliest prep day. If all items are day-of, no separate grocery deadline card appears.

**Failure:** Grocery deadline shows "same day as first prep" (too late) or doesn't appear when it should (ingredients not bought in time).

**Verification:**

1. Event with items on day-2: grocery deadline = day-3
2. Event with all items day-of: no grocery deadline card
3. Grocery deadline card renders with ShoppingCart icon and "Grocery deadline" label

**What breaks if this fails:** Chef doesn't buy groceries in time. Shows up to prep with no ingredients. April 16 dinner scenario repeats.

---

### PT8: Zero-Recipe Event Graceful Empty

**Hypothesis:** An event with no menu, no dishes, or no components renders the prep tab without crash, showing an appropriate empty state message.

**Failure:** Event detail page crashes (white screen, 500) when prep tab is active and event has no menu.

**Verification:**

1. Navigate to event detail with no menu: shows "Add a menu to see your prep timeline"
2. Navigate to event detail with menu but no components: shows "No components found"
3. Navigate to event detail with components but no peak windows: timeline renders with category defaults
4. No `null.map()`, no undefined property access, no crash

**What breaks if this fails:** Brand new events (which by definition have no menu yet) crash the event detail page. Every chef hits this on their first event.

---

### PT9: Symbol Key Global Availability

**Hypothesis:** The SymbolKeyTrigger is rendered in the chef layout (bottom-left corner on desktop) and is accessible from every chef portal page. Clicking it opens a dialog showing all symbols from SYMBOL_REGISTRY.

**Failure:** Symbol key only appears on certain pages. Chef sees an unfamiliar icon on the prep tab but has no way to look it up.

**Verification:**

1. SymbolKeyTrigger is in `app/(chef)/layout.tsx`
2. It renders on desktop (hidden on mobile via `hidden md:block`)
3. Clicking opens AccessibleDialog with all 4 categories (Timeline, Storage, Allergens, Dietary)
4. Every symbol in SYMBOL_REGISTRY renders with icon and label

**What breaks if this fails:** Developer mandate: "ChefFlow should have a key no matter what going forward about anything." If the key is missing, symbols are meaningless glyphs.

---

### PT10: Symbol Registry Parity

**Hypothesis:** Every `PrepSymbol` value used in `computePrepTimeline` has a corresponding entry in `SYMBOL_REGISTRY`. Every symbol rendered in the prep tab is documented in the key.

**Failure:** Prep tab shows a snowflake icon. Chef opens symbol key. Snowflake isn't listed. Chef has no idea what it means.

**Verification:**

1. `PrepSymbol` type: 'freezable', 'day_of', 'fresh', 'safety_warning', 'allergen'
2. SYMBOL_REGISTRY Timeline category: 'freezable', 'day_of', 'fresh', 'safety_warning', 'prep_time'
3. 'allergen' renders as red dots (not from registry) - verify allergen category exists in registry
4. No orphaned symbols in either direction

**What breaks if this fails:** Symbols become hieroglyphics. The whole point of the symbol system is instant recognition through a shared key.

---

### PT11: Prep Tab Renders Without Crash

**Hypothesis:** The `EventDetailPrepTab` component renders for every possible timeline state: null timeline, empty days array, days with zero items, days with 20+ items, items with empty allergenFlags arrays.

**Failure:** `.map()` on undefined, `.filter()` on null, division by zero in progress calculations.

**Verification:**

1. `timeline={null}` + `hasMenu={false}` -> "Add a menu" message
2. `timeline={null}` + `hasMenu={true}` -> "No components found" message
3. Timeline with `days=[]` -> no crash (unlikely but possible)
4. Timeline with day containing 0 items -> renders day header with "0/0 done"
5. Item with `allergenFlags=[]` -> no red dots rendered, no crash

**What breaks if this fails:** Any chef with an incomplete event setup hits a crash. This is the entry path for every new event.

---

### PT12: localStorage Checkbox Isolation

**Hypothesis:** Checkbox state is scoped by `cf-prep-{eventId}-{recipeId}-{componentName}`. Checking an item on Event A does not check it on Event B, even if they share the same recipe.

**Failure:** Chef checks "make vinaigrette" on Friday's dinner. Opens Saturday's dinner - vinaigrette already shows checked. Chef skips making it. No vinaigrette at Saturday's dinner.

**Verification:**

1. Key format includes eventId: `cf-prep-${eventId}-${recipeId}-${componentName}`
2. Same recipe on two different events has two different localStorage keys
3. Clearing one doesn't affect the other

**What breaks if this fails:** Cross-event contamination. Chef trusts the checklist, skips items, shows up missing components. Real production failure.

---

### PT13: Peak Window Validation Guards

**Hypothesis:** `updateRecipePeakWindow` rejects: (a) peakHoursMin > peakHoursMax, (b) negative values. The UI prevents submission and the server action returns an error.

**Failure:** Chef types "72" for latest and "24" for earliest (reversed). System saves it. Timeline computes with inverted window. Items placed incorrectly.

**Verification:**

1. peakHoursMin=72, peakHoursMax=24 -> returns `{ success: false, error: 'Earliest prep time must be greater than latest prep time.' }`
2. peakHoursMin=-5 -> returns `{ success: false, error: 'Peak hours cannot be negative.' }`
3. Valid values (min=24, max=72) -> returns `{ success: true }`

**What breaks if this fails:** Garbage data in the database produces garbage timelines. Chef follows bad schedule. Food quality suffers.

---

### PT14: Make-Ahead Fallback Chain

**Hypothesis:** Resolution order is: recipe-level peak fields > components.make_ahead_window_hours > CATEGORY_DEFAULTS. Each level only applies when the previous is null/absent.

**Failure:** Recipe has explicit peak_hours_max=72 but component has make_ahead_window_hours=24. System uses 24 (component) instead of 72 (recipe). Chef preps a day out instead of three days.

**Verification:**

1. Recipe with peak_hours_max=72, component with make_ahead_window_hours=24: uses 72
2. Recipe with peak_hours_max=null, component with make_ahead_window_hours=24: uses 24
3. Recipe with peak_hours_max=null, component with make_ahead_window_hours=null, category=sauce: uses 72 (sauce default)
4. All nulls: uses FALLBACK_DEFAULT (24h)

**What breaks if this fails:** Fallback chain is the intelligence of the system. Wrong precedence means the chef's explicit settings are ignored in favor of defaults.

---

### PT15: Frozen Extends Hours Logic

**Hypothesis:** When `freezable=true` and `frozen_extends_hours` is set, the system acknowledges the extended window but does NOT automatically extend the effective ceiling (that would require the chef to actually freeze it, which is a runtime decision, not a planning one).

**Failure:** System extends ceiling by frozen_extends_hours automatically. Chef sees "prep 10 days out" for a freezable item but plans to refrigerate. Food spoils.

**Verification:**

1. `effectiveCeiling` is computed from `min(peakHoursMax, safetyHoursMax)` only, never from frozen_extends_hours
2. frozen_extends_hours is stored and displayed but does not affect timeline placement
3. The snowflake symbol appears, informing the chef the option exists

**What breaks if this fails:** Automatic extension assumes the chef will freeze. If they don't (fridge instead), the timeline is a food safety lie.

---

### PT16: Allergen Flags Surface on Timeline

**Hypothesis:** When a recipe has linked ingredients with allergen flags (via recipe_ingredients -> ingredients.allergen_flags), those flags appear as red dots on the prep item row, with a title tooltip listing the allergens.

**Failure:** Recipe contains tree nuts. Prep timeline shows no allergen indicator. Chef preps for a guest with nut allergy. Medical emergency.

**Verification:**

1. `getEventPrepTimeline` queries recipe_ingredients -> ingredients for allergen_flags
2. Flags propagate through to PrepItem.allergenFlags
3. Prep tab renders red dots (`w-2 h-2 rounded-full bg-red-500`) for each flag
4. Title tooltip shows allergen names

**What breaks if this fails:** Allergen blindness on the prep timeline. The one place where the chef is making day-of decisions is missing critical safety data.

---

### PT17: Bulk Peak Window Idempotency

**Hypothesis:** Calling `bulkSetPeakWindows` with the same data twice produces the same result. No duplicate records, no incremented counters, no timestamp-based side effects beyond `updated_at`.

**Failure:** Double-click on a bulk save button creates duplicate entries or corrupts data.

**Verification:**

1. Call bulkSetPeakWindows with [{recipeId: X, peakHoursMin: 24, peakHoursMax: 72}] twice
2. Recipe X has peak_hours_min=24, peak_hours_max=72 after both calls
3. No errors, no duplicate rows

**What breaks if this fails:** Network retry creates bad state. Real-world: chef on slow mobile connection, button tapped twice.

---

### PT18: Past Day Visual Muting

**Hypothesis:** Days in the timeline that are in the past (before today) are visually muted (`opacity-60`, `border-stone-800`). Today is highlighted with blue border. Service day is highlighted with brand border.

**Failure:** All days look the same. Chef can't tell at a glance what's already passed and what needs attention today.

**Verification:**

1. Past day: `border-stone-800`, `opacity-60`
2. Today: `border-blue-700`, `bg-blue-950/20`
3. Service day: `border-brand-700`, `bg-brand-950/30`
4. Future day (not today, not service): `border-stone-700`

**What breaks if this fails:** Visual hierarchy is the UX. Without time-awareness, the timeline is a flat list instead of a "what needs doing NOW" signal.

---

### PT19: Service Day Always Present

**Hypothesis:** The service day (day 0) always appears in the timeline, even if no items are scheduled for it. It serves as the anchor point.

**Failure:** All items are 2+ days out. Service day card is missing. Chef sees prep days but not the actual event day. Disorienting.

**Verification:**

1. In `computePrepTimeline`: if `prepItems.length > 0 && !dayMap.has(0)`, day 0 is injected with empty items
2. Service day renders with "Service day" label and Calendar icon
3. Even with zero items on it, it renders as a card

**What breaks if this fails:** The anchor disappears. Chef sees "2 days before" and "1 day before" but not what they're relative to. Cognitive load.

---

### PT20: Component Without Recipe Handled

**Hypothesis:** A component with `recipe_id=null` (manual component, not linked to a recipe) does not crash the timeline. It uses the component's own name and falls through to FALLBACK_DEFAULT for peak windows.

**Failure:** `recipeMap.get(null)` throws or returns undefined. `.name` on undefined crashes. Component without recipe = crash.

**Verification:**

1. In `getEventPrepTimeline`, when `comp.recipe_id` is null: `recipe` is null, `recipeName` falls back to `comp.name`
2. `allergenMap[undefined]` returns undefined, defaults to `[]`
3. Category is null -> FALLBACK_DEFAULT applies
4. No crash, item appears in timeline as "untimed" or with default placement

**What breaks if this fails:** Many chefs add quick components ("garnish", "finishing salt") without linking recipes. Common path crashes the feature.

---

### PT21: Recipe Edit Peak Save Non-Blocking

**Hypothesis:** The `updateRecipePeakWindow` call in the recipe edit form is wrapped in `.catch(() => null)`. If it fails, the main recipe save still succeeds and the user navigates away without error.

**Failure:** Peak window save fails (DB timeout, constraint error). Entire recipe save fails. Chef loses all their changes.

**Verification:**

1. In `edit-recipe-client.tsx`: `updateRecipePeakWindow({...}).catch(() => null)` - confirmed `.catch` exists
2. Main recipe save (`updateRecipe`) is called before peak window save
3. Navigation (`router.push`) happens in the same try/catch but after both calls

**What breaks if this fails:** Peak windows are a new feature. If they break, they should never take down recipe editing - the core feature that's been working for months.

---

### PT22: Peak Window Cache Invalidation

**Hypothesis:** After saving peak windows, `revalidatePath('/recipes')` and `revalidatePath('/recipes/{id}')` are called. The event detail page that shows the prep timeline also revalidates when the event's menu/recipes change.

**Failure:** Chef sets peak window on recipe. Opens event prep tab. Sees old (default) values because cache is stale. Chef thinks their settings didn't save.

**Verification:**

1. `updateRecipePeakWindow` calls `revalidatePath('/recipes')` and `revalidatePath('/recipes/${input.recipeId}')` - confirmed
2. Event detail page fetches prep timeline on every render (not cached with unstable_cache) - confirmed via server action call
3. Recipe data in timeline is read fresh on each event page load

**What breaks if this fails:** Stale cache = stale timeline = wrong prep schedule. Zero Hallucination violation.

---

### PT23: Client Portal Timeline Absence

**Hypothesis:** Prep timeline data is NOT exposed to the client portal. Clients should never see internal prep logistics, ingredient costs, or chef operational details.

**Failure:** Client navigates to their event and sees "Prep 2 days before: braised short ribs (cost: $47)". Exposes operational internals and cost structure.

**Verification:**

1. `getEventPrepTimeline` uses `requireChef()` - clients cannot call it
2. No prep timeline component in `app/(client)/`
3. No prep-related data in client event detail page

**What breaks if this fails:** Privacy violation. Chef's operational playbook and cost structure exposed to clients. Pricing leverage lost.

---

### PT24: Symbol Key Accessible on Mobile

**Hypothesis:** The global SymbolKeyTrigger in the layout is `hidden md:block` (desktop only). But the prep tab has its OWN SymbolKeyTrigger in the section header that is always visible.

**Failure:** Chef on phone sees symbols on prep tab. No key button visible. Can't learn what the icons mean.

**Verification:**

1. Layout trigger: `hidden md:block` - not visible on mobile
2. Prep tab has inline SymbolKeyTrigger in the header area next to "Prep Timeline" heading
3. Mobile user can access the key from the prep tab itself

**What breaks if this fails:** Mobile is the primary use case for chefs (they're in the kitchen, phone in pocket). If the key is desktop-only, mobile chefs can't decode symbols.

---

### PT25: Prep Timeline Does Not Leak PII

**Hypothesis:** The prep timeline server action (`getEventPrepTimeline`) only returns recipe names, component names, dish names, prep times, and symbols. It does NOT return client names, client allergies, event budgets, or financial data.

**Failure:** Timeline response includes client dietary restrictions, event total cost, or guest names.

**Verification:**

1. `TimelineRecipeInput` type contains: recipeId, recipeName, componentName, dishName, courseName, category, peak windows, prep time, allergen flags, makeAheadWindowHours
2. No client PII fields in the type
3. `getEventPrepTimeline` queries recipes, menus, dishes, components, ingredients - never the clients table
4. allergenFlags come from INGREDIENT allergens (recipe composition), not CLIENT allergies

**What breaks if this fails:** Remy or another surface could theoretically expose timeline data. If it contains PII, that's a privacy breach.

---

## Cohesion Gaps Found (Defects to Fix)

### Gap 1: `untimedItems` Always Empty

In `computePrepTimeline`, the return always has `untimedItems: []` with the comment "all items get at least category defaults." This is technically true (FALLBACK_DEFAULT catches everything), but it means the "Not yet timed" section in the prep tab UI will NEVER render. Either:

- **Remove the untimed UI section** (dead code), or
- **Make it render for items using FALLBACK_DEFAULT** (so chefs see which items have no explicit or category-specific windows and are worth configuring)

**Recommendation:** Show items using FALLBACK_DEFAULT in the untimed section. A recipe in category "other" getting a generic 24h window is "untimed" in spirit - the chef should be nudged to set explicit values.

### Gap 2: Frozen Extends Hours Not Surfaced in Timeline UI

The `frozen_extends_hours` field is saved to the database and the `freezable` symbol shows on the timeline, but nowhere does the timeline tell the chef HOW MUCH time freezing adds. The snowflake icon says "freezable" but not "freezing adds 720 hours."

**Recommendation:** Add a tooltip or subtitle on freezable items: "Can be frozen (+Xd)" so the chef knows the option exists with concrete numbers.

### Gap 3: Recipe Detail View (Read-Only) Missing Peak Display

Peak windows are editable on the recipe edit form, but the recipe detail view (`/recipes/[id]`) likely doesn't display the saved peak window values. Chef edits, saves, goes to recipe detail - no confirmation of what they set.

**Recommendation:** Add a small peak window summary on the recipe detail view (read-only display of latest/earliest/storage/freezable).

### Gap 4: No Prep Timeline on Dashboard

The dashboard has widgets for revenue, events, schedule, etc. but no "upcoming prep" widget. A chef with 3 events this week has to open each event individually to see their prep timeline.

**Recommendation:** Future feature - aggregated prep view across all events for the next 7 days. Not P0 but high leverage.

### Gap 5: `bulkSetPeakWindows` Never Called

The server action exists but no UI calls it. It was built for a future "set peak windows on all sauces at once" workflow. Currently dead code.

**Recommendation:** Either remove it or build the bulk-edit surface. Dead exported server actions are potential attack surface.

### Gap 6: Event-Level Summary Stats Missing

The prep tab shows individual days and items but no roll-up: total prep hours, number of components, percentage with explicit peak windows. A chef can't glance at the tab and know "am I 80% configured or 10%?"

**Recommendation:** Add a small summary bar: "21 components, 14 timed, ~8.5h total prep, grocery shop by Wed"

---

## Integration Points (Cross-Feature Verification)

| Feature           | Integration Point                                              | Verified?                              |
| ----------------- | -------------------------------------------------------------- | -------------------------------------- |
| Event FSM         | Prep tab only shows on active events (not cancelled)           | Check event page conditional rendering |
| Menu system       | Timeline reads from menus -> dishes -> components chain        | Yes, via getEventPrepTimeline          |
| Recipe system     | Peak windows read from recipe fields, edit form writes them    | Yes                                    |
| Ingredient system | Allergen flags pulled from recipe_ingredients -> ingredients   | Yes                                    |
| Symbol key        | Global key in layout + inline key in prep tab                  | Yes                                    |
| Client portal     | No prep data exposure                                          | Yes, requireChef gate                  |
| Remy AI           | Remy does not read/write peak windows (no agent action exists) | Verify no remy action                  |
| Notifications     | No notifications fire on peak window changes                   | Correct, not needed                    |
| Offline/PWA       | localStorage checkboxes work offline                           | Yes, pure localStorage                 |

---

## Test Implementation Priority

1. **PT3** (Safety ceiling) - food safety, must be first
2. **PT5** (Tenant isolation) - security, must be immediate
3. **PT6** (Math correctness) - core algorithm
4. **PT2** (Category completeness) - structural integrity check
5. **PT8** (Zero-data graceful) - every new chef hits this
6. **PT13** (Input validation) - garbage in = garbage out
7. **PT1** (Persistence) - data roundtrip
8. **PT16** (Allergen flags) - safety
9. **PT12** (Checkbox isolation) - cross-event contamination
10. **PT25** (No PII leak) - privacy
