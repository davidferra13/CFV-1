# System Integrity Question Set: Prep Timeline Integration Layer

**Scope:** Cross-system integration between recipe peak windows, prep block engine, shopping lists, notifications, client signals, Remy AI, and public profiles.

**Prerequisite:** All PT1-PT25 questions from `system-integrity-question-set-prep-timeline.md` must pass first.

**Principle:** The prep timeline feature is only as good as its connections to the rest of ChefFlow. An isolated feature that doesn't feed into auto-scheduling, notifications, shopping lists, or the client experience is a toy, not a tool.

---

## Coverage Map

| Q    | Title                                         | Domain        | Severity | Who Benefits           |
| ---- | --------------------------------------------- | ------------- | -------- | ---------------------- |
| PI1  | Prep Block Engine Uses Peak Windows           | Scheduling    | P0       | All chefs              |
| PI2  | Auto-Place Blocks at Confirmation             | Lifecycle     | P0       | All chefs              |
| PI3  | Recipe Detail Shows Peak Windows              | UI            | P1       | All chefs              |
| PI4  | Shopping Window Respects Grocery Deadline     | Dashboard     | P1       | All chefs              |
| PI5  | Scheduling Gaps Detect Peak Window Violations | Dashboard     | P1       | All chefs              |
| PI6  | Sub-Recipe Peak Window Cascade                | Logic         | P2       | Chefs w/ complex menus |
| PI7  | Remy Uses Deterministic Timeline              | AI            | P2       | All chefs              |
| PI8  | Prep Deadline Notifications                   | Notifications | P1       | All chefs              |
| PI9  | Client Quality Confidence Signal              | Client Portal | P2       | All clients            |
| PI10 | Protein Category Too Coarse                   | Food Safety   | P0       | All chefs              |
| PI11 | Peak Windows Survive Recipe Duplication       | Data          | P1       | All chefs              |
| PI12 | Component is_make_ahead Parity                | Logic         | P1       | All chefs              |
| PI13 | Calendar View Shows Peak-Derived Blocks       | UI            | P1       | All chefs              |
| PI14 | Menu Approval Triggers Timeline Preview       | Lifecycle     | P2       | All chefs              |
| PI15 | Public Profile Prep Quality Signal            | Public        | P2       | All users              |
| PI16 | Print/Export Prep Timeline                    | Utility       | P2       | All chefs              |
| PI17 | Staff Assignment on Prep Items                | Multi-User    | P2       | Chefs with staff       |
| PI18 | Multi-Event Week Prep Collision Detection     | Scheduling    | P1       | Busy chefs             |
| PI19 | Peak Window Inheritance on Recipe Variation   | Data          | P2       | All chefs              |
| PI20 | Prep Timeline in Offline/PWA Mode             | Resilience    | P2       | All chefs              |

---

## Question Definitions

### PI1: Prep Block Engine Uses Peak Windows (BUILT - this session)

**Hypothesis:** When `suggestComponentBlocks()` processes a component with no `prep_day_offset` and no `make_ahead_window_hours`, it falls back to the recipe's `peak_hours_max` and `safety_hours_max` to compute the optimal prep day.

**Failure:** Component has a recipe with peak_hours_max=72 (3 days). Prep block engine ignores it. Auto-scheduled block goes on day-of. Chef preps too late for peak quality.

**Verification:**

1. `MenuComponent` interface has `recipe_peak_hours_min`, `recipe_peak_hours_max`, `recipe_safety_hours_max` fields
2. `fetchMenuComponents` pulls these from the recipes table
3. `suggestComponentBlocks` has a third fallback branch using these fields
4. The optimal day calculation matches `computePrepTimeline` logic (prefer 1 day before when in range)

**Status:** BUILT in this session. Needs runtime verification.

---

### PI2: Auto-Place Blocks at Confirmation Uses Peak Windows

**Hypothesis:** When an event transitions to `confirmed` and `autoPlacePrepBlocks()` fires, the generated blocks include peak-window-derived dates for components that have recipes with peak windows set.

**Failure:** Event confirmed. Chef has recipes with peak windows. Auto-placed blocks ignore peak data and only use `make_ahead_window_hours`. Chef gets generic scheduling instead of quality-optimized scheduling.

**Verification:**

1. `autoPlacePrepBlocks` calls `fetchMenuComponents` which now pulls peak fields
2. Peak fields flow through to `suggestComponentBlocks`
3. Blocks are placed on peak-optimal days
4. End-to-end: set peak window on recipe -> create event with that recipe -> confirm event -> verify auto-placed block date

---

### PI3: Recipe Detail Shows Peak Windows (BUILT - this session)

**Hypothesis:** The recipe detail view (`/recipes/[id]`) displays peak window, storage method, and freezable status in the Details grid when these values are set.

**Failure:** Chef sets peak window on recipe edit. Goes to recipe detail to verify. Sees prep time and cook time but not peak window. No confirmation of what they saved.

**Verification:**

1. Peak window shows as "Xh - Xd" format
2. Storage method shows when not default (fridge)
3. Freezable shows with snowflake icon and extends hours
4. Fields only appear when values are set (no empty rows)

**Status:** BUILT in this session.

---

### PI4: Shopping Window Respects Grocery Deadline

**Hypothesis:** The dashboard `ShoppingWindowWidget` should surface events whose grocery deadline (derived from peak windows) is approaching, not just events within 3 days of service.

**Failure:** Event is in 7 days. Recipes have 4-day peak windows. Grocery deadline is in 2 days. Shopping window widget doesn't show it because the event is 7 days out.

**Current state:** Shopping window uses a fixed 3-day lookahead from event date. NOT yet integrated with peak-derived grocery deadlines.

**Fix required:** Enhance `ShoppingWindowWidget` to compute grocery deadline from peak windows, or at minimum use the earliest prep day minus 1.

---

### PI5: Scheduling Gaps Detect Peak Window Violations

**Hypothesis:** The `scheduling_gaps` dashboard widget should flag events where peak-window-optimal prep blocks are missing, not just events missing generic required blocks.

**Failure:** Event has 5 recipes with peak windows. No component prep blocks exist. Gap detection only checks for the generic "Main Prep Session" and doesn't know that specific components need specific days.

**Current state:** Gap detection checks for REQUIRED_BLOCK_TYPES (grocery_run, prep_session, packing, equipment_prep, admin). It does NOT check for component-specific blocks against peak windows.

**Fix required:** Enhance `detectGaps` to count peak-window-derived component blocks as expected and flag missing ones.

---

### PI6: Sub-Recipe Peak Window Cascade

**Hypothesis:** When computing a prep timeline, if Recipe A uses Recipe B as a sub-recipe, and Recipe B has a peak window of 72h, the timeline should schedule Recipe B's prep based on its OWN peak window (not Recipe A's).

**Failure:** Beef Wellington (sub-recipes: Duxelles, Puff Pastry, Beef Stock). Beef Stock peaks at 72h but inherits the parent's 4h window. Stock is prepped day-of instead of 3 days out.

**Current state:** `getEventPrepTimeline` processes components -> recipes. Sub-recipes are NOT traversed. Only top-level recipe peak windows are used.

**Fix required:** Walk `recipe_sub_recipes` in `getEventPrepTimeline` and include child recipes in the timeline with their own peak windows.

---

### PI7: Remy Uses Deterministic Timeline

**Hypothesis:** When a chef asks Remy "when should I start prepping for Saturday's dinner?", Remy should use the deterministic `computePrepTimeline` engine rather than generating a free-form AI timeline.

**Current state:** Remy has a `prep.timeline` task that uses Ollama to generate a timeline. The deterministic engine exists but Remy doesn't call it.

**Fix required:** Add a deterministic fallback in `lib/ai/prep-timeline-actions.ts` that calls `getEventPrepTimeline` first, then formats the result for Remy. Only fall back to AI generation when peak window data is insufficient.

---

### PI8: Prep Deadline Notifications

**Hypothesis:** The notification system sends reminders when a prep deadline is approaching, similar to event reminders (7d, 2d, 1d).

**Failure:** Chef sets peak windows on all recipes. Grocery deadline is tomorrow. No notification. Chef forgets. Repeats the April 16 dinner scenario.

**Current state:** Notification system has deadline infrastructure (event_reminder_7d/2d/1d) but NO prep deadline notification types.

**Fix required:**

1. Add notification actions: `prep_grocery_deadline_1d`, `prep_deadline_today`
2. Trigger via a cron or event-driven check comparing `computePrepTimeline` grocery deadline against current date
3. Tier: `alert` (Push + Email)

---

### PI9: Client Quality Confidence Signal

**Hypothesis:** When a chef uses peak windows and the prep timeline, clients see a subtle quality signal in their event journey, reinforcing confidence without exposing operational details.

**Failure:** Chef invests significant effort in quality-optimized prep scheduling. Client sees zero evidence of this. No differentiation from a chef who preps everything last minute.

**Current state:** Client event detail shows nothing about prep quality.

**Fix required (minimal):** Add a step or indicator to the `EventJourneyStepper` between "Confirmed" and "Event Day" that says something like "Your chef is preparing your menu for peak quality" when prep blocks exist. No operational details, no timing, no recipes. Just a confidence signal.

---

### PI10: Protein Category Too Coarse (FOOD SAFETY)

**Hypothesis:** The `protein` category default (peak: 0-1h, safety: 2h, room_temp) is correct for seared/grilled proteins but dangerously wrong for braised proteins (braised short ribs peak at 24-48h, safety: 72h, fridge).

**Failure:** Chef categorizes braised short ribs as "protein." Category default says 0-1h peak at room temp. Timeline schedules it day-of. Chef follows the timeline. Short ribs are freshly braised, not peak quality (braised proteins improve overnight).

**Current state:** One `protein` category covers grilled steak (0-1h), braised short ribs (24-48h), cured salmon (72h+), and raw tartare (0h). These have wildly different peak windows.

**Impact:** This is a food quality failure (not safety for braised, but safety for room_temp designation). A braised protein stored at room_temp for 2h is fine, but the category default pushes chefs AWAY from the optimal 24-48h fridge window.

**Mitigation (no schema change needed):** The category default is a FALLBACK. When a chef sets explicit peak windows on a recipe, the defaults don't matter. But for chefs who rely on defaults, the `protein` category is misleading.

**Options:**

1. Split `protein` into subcategories in defaults (not in enum - too disruptive)
2. Make the `protein` default more conservative: peak 0-48h, safety 72h, fridge. Covers braised AND seared. May over-schedule seared items 1 day early (low harm).
3. Add a warning when category is `protein` and no explicit peak windows are set: "Protein timing varies widely. Set explicit peak windows for best results."

**Recommendation:** Option 2 (conservative default) + Option 3 (nudge) for maximum safety across all chefs.

---

### PI11: Peak Windows Survive Recipe Duplication

**Hypothesis:** When a chef duplicates a recipe (the "copy" feature in `RecipeDetailClient`), the new recipe inherits the original's peak window values.

**Failure:** Chef spends time setting peak windows on 50 recipes. Duplicates a recipe to create a variation. Peak windows are lost. Has to re-enter everything.

**Current state:** The `handleDuplicate` function in `recipe-detail-client.tsx` calls `createRecipe` with specific fields. Peak window fields are NOT included.

**Fix required:** Add peak window fields to the duplication payload.

---

### PI12: Component is_make_ahead Parity

**Hypothesis:** The prep block engine only processes components where `is_make_ahead = true`. But the prep timeline processes ALL components. This means items that aren't marked as make-ahead still appear in the timeline but won't get auto-scheduled blocks.

**Current state:** Two systems, two filters:

- `getEventPrepTimeline`: processes all components (including day-of)
- `fetchMenuComponents`: filters to `is_make_ahead = true` only

**Question:** When a recipe has peak_hours_min > 0 (must be prepped ahead), but the component isn't marked `is_make_ahead`, which system is right?

**Recommendation:** If a recipe's peak window says it must be prepped ahead (peak_hours_min > 0), the component should be treated as make-ahead regardless of the `is_make_ahead` flag. The peak window is a stronger signal than a manual checkbox.

---

### PI13: Calendar View Shows Peak-Derived Blocks

**Hypothesis:** After `autoPlacePrepBlocks` creates peak-window-derived blocks, they appear correctly on the calendar views (`/calendar/week`, `/calendar/year`) with appropriate labels.

**Failure:** Blocks are created in the database but the calendar view doesn't display them, or displays them without the component name / quality context.

**Verification:**

1. Navigate to calendar week view after event confirmation
2. Peak-derived prep blocks appear on the correct dates
3. Block labels include component name and "Peak quality" reason
4. Calendar correctly shows prep blocks across multi-event weeks

---

### PI14: Menu Approval Triggers Timeline Preview

**Hypothesis:** When a menu is approved (locking the recipe composition), a timeline preview should be computable and shown to the chef, even before the event is confirmed.

**Current state:** Timeline is only computed on the event detail page. Menu approval doesn't trigger any timeline computation.

**Fix required (low effort):** After menu approval, compute and cache the prep timeline. Show a "Prep preview" section on the event detail page for events in `accepted` or `paid` status, not just `confirmed`.

---

### PI15: Public Profile Prep Quality Signal

**Hypothesis:** Chefs who invest in peak window configuration could display a quality signal on their public profile, differentiating them from chefs who don't.

**Current state:** Public profiles show credentials, reviews, dietary trust, portfolio. No prep quality signals.

**Fix (minimal):** If a chef has >50% of recipes with explicit peak windows, show a "Quality-optimized prep" badge on their public profile. This benefits ALL users: chefs get marketing value, clients get confidence.

---

### PI16: Print/Export Prep Timeline

**Hypothesis:** Chefs in kitchens need to print the prep timeline or view it offline. The prep tab should have a print-friendly layout or export option.

**Current state:** No print/export functionality on the prep tab.

**Fix:** Add a print button that opens a print-optimized view (CSS `@media print`), or a "Copy as text" button that generates a plain-text timeline for pasting into Notes/Messages.

---

### PI17: Staff Assignment on Prep Items

**Hypothesis:** For chefs with staff, prep items should be assignable to specific staff members, turning the timeline into a delegation tool.

**Current state:** Staff members exist (`staff_members` table) but prep items have no assignment mechanism.

**Fix required:** Add optional `assigned_to` field on prep blocks. When auto-placing blocks, keep them unassigned. Chef assigns via drag-drop or dropdown.

---

### PI18: Multi-Event Week Prep Collision Detection

**Hypothesis:** When a chef has multiple events in one week, the system should detect prep day collisions (two events both needing major prep on Tuesday) and warn the chef.

**Failure:** Three events on Friday, Saturday, Sunday. All have components peaking at day-1. Tuesday through Thursday are packed. Chef doesn't realize until Tuesday morning that they have 12 hours of prep across 3 events.

**Current state:** The `multi_event_days` dashboard widget exists but only flags overlapping EVENT days, not overlapping PREP days.

**Fix required:** Enhance or create a widget that aggregates prep blocks across all upcoming events and flags days with >8h of scheduled prep.

---

### PI19: Peak Window Inheritance on Recipe Variation

**Hypothesis:** When a recipe has a `family_id` (variation group), creating a new variation should inherit peak windows from the parent recipe.

**Current state:** Recipe variations share a `family_id` but peak windows are per-recipe with no inheritance.

**Fix (low priority):** When creating a variation, copy peak window fields from the parent. Chef can then override per-variation.

---

### PI20: Prep Timeline in Offline/PWA Mode

**Hypothesis:** The prep timeline (including localStorage checkboxes) works fully offline in PWA mode. Chef in kitchen with spotty WiFi can view and check off prep items.

**Current state:** localStorage checkboxes work offline. But the timeline DATA requires a server call (`getEventPrepTimeline`). If the page was loaded while online, it works. If the chef tries to load it offline, it fails.

**Fix (PWA enhancement):** Cache the timeline response in IndexedDB/localStorage when online. Serve cached version when offline. Checkboxes already work offline.

---

## Cohesion Gaps Fixed This Session

| Gap | What                                      | Fix                                                       | Status |
| --- | ----------------------------------------- | --------------------------------------------------------- | ------ |
| 1   | `untimedItems` always empty               | Items using FALLBACK_DEFAULT now populate untimed section | BUILT  |
| 2   | `frozen_extends_hours` not surfaced       | Snowflake tooltip shows "+Xd" for freezable items         | BUILT  |
| 3   | Recipe detail missing peak display        | Peak window, storage, freezable shown in Details grid     | BUILT  |
| 4   | Dashboard prep widget (deferred)          | Aggregated prep view across events for next 7 days        | SPEC   |
| 5   | `bulkSetPeakWindows` dead code            | Removed unused exported server action                     | BUILT  |
| 6   | No event-level summary stats              | Summary bar: components, total prep, shop-by date         | BUILT  |
| 7   | Prep block engine ignores peak windows    | Engine now falls back to recipe peak windows              | BUILT  |
| 8   | `fetchMenuComponents` missing peak fields | Query now pulls peak_hours_min/max, safety_hours_max      | BUILT  |
| 9   | Recipe duplication drops peak windows     | Identified but not yet fixed (PI11)                       | SPEC   |
| 10  | Protein category too coarse               | Identified, needs default adjustment (PI10)               | SPEC   |

---

## Implementation Priority (What to Build Next)

**Immediate (high leverage, low effort):**

1. **PI10** - Fix protein category default (conservative: 0-48h fridge) + nudge when no explicit windows
2. **PI11** - Add peak fields to recipe duplication
3. **PI12** - Auto-set `is_make_ahead` when recipe peak says prep-ahead

**Near-term (medium effort, high value for ALL users):** 4. **PI4** - Shopping window widget respects grocery deadline 5. **PI8** - Prep deadline notifications (grocery + prep deadlines) 6. **PI9** - Client quality confidence signal in journey stepper 7. **PI18** - Multi-event prep collision detection

**Future (larger scope):** 8. **PI6** - Sub-recipe peak window cascade 9. **PI7** - Remy deterministic timeline 10. **PI15** - Public profile quality badge
