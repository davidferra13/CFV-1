# System Integrity Question Set: Prep Timeline Real-World Chaos Layer

**Scope:** What breaks when real chefs use this in real kitchens. Edge cases, state mutations, timezone bugs, scaling failures, recovery paths, and cross-user impact.

**Prerequisite:** PT1-PT25 (core) and PI1-PI20 (integration) must pass first.

**Principle:** A feature that works in demos breaks in production. This layer tests the messy reality: chefs with phones in wet hands, events that change, menus that shift, timezones that lie, and workflows that loop.

---

## Coverage Map

| Q    | Title                                     | Domain       | Severity | Who Benefits     |
| ---- | ----------------------------------------- | ------------ | -------- | ---------------- |
| RC1  | Timezone-Blind Service DateTime           | Logic/Data   | P0       | All chefs        |
| RC2  | Event Date Change Invalidates Timeline    | State        | P0       | All chefs        |
| RC3  | Menu Change After Prep Started            | State        | P0       | All chefs        |
| RC4  | Duplicate Recipe in Same Menu             | Edge Case    | P1       | All chefs        |
| RC5  | Cancelled Event Checkbox Cleanup          | State/UX     | P2       | All chefs        |
| RC6  | Checkbox Undo Path                        | UX           | P1       | All chefs        |
| RC7  | 50+ Component Timeline Render Performance | Performance  | P1       | Busy chefs       |
| RC8  | Same-Day Multiple Events Prep Merge       | Scheduling   | P0       | Busy chefs       |
| RC9  | Past Event Timeline Still Useful          | UX           | P2       | All chefs        |
| RC10 | Service Time Null Defaults to 6pm         | Data         | P1       | All chefs        |
| RC11 | Peak Window 0/0 Edge Case                 | Logic        | P1       | All chefs        |
| RC12 | Safety Ceiling Lower Than Peak Min        | Validation   | P0       | All chefs        |
| RC13 | Category Change Resets Defaults           | State        | P1       | All chefs        |
| RC14 | Prep Tab on Draft Events                  | UX/Scope     | P1       | All chefs        |
| RC15 | Staff Shared Device Checkbox Collision    | Multi-User   | P1       | Chefs with staff |
| RC16 | April 16 Scenario Regression Test         | System       | P0       | All chefs        |
| RC17 | Peak Window Without Prep Time             | Data         | P1       | All chefs        |
| RC18 | Seasonal Peak Variation                   | Food Science | P2       | All chefs        |
| RC19 | Color-Blind Symbol Accessibility          | A11y         | P1       | All users        |
| RC20 | Mobile Tap Target Size                    | UX/Mobile    | P1       | All chefs        |

---

## Question Definitions

### RC1: Timezone-Blind Service DateTime (BUG FOUND)

**Hypothesis:** The service datetime computation in `getEventPrepTimeline` should respect the chef's configured timezone, not the server's system timezone.

**Bug:** `getEventPrepTimeline` does:

```ts
const eventDate = new Date(event.event_date)
const [h, m] = timeStr.split(':').map(Number)
eventDate.setHours(h, m, 0, 0)
```

`new Date(event.event_date)` creates a date in the SERVER's timezone. `setHours` applies in the server's timezone. If the server runs in UTC but the chef is in EST, a 6pm EST event becomes 6pm UTC = 1pm EST. The timeline is shifted by 5 hours.

**Impact:** Timeline places items on wrong days at timezone boundaries. A 7pm EST event on Friday becomes Saturday 12am UTC. Prep that should be Thursday gets placed on Friday.

**Current state:** The `AppContextProvider` has the chef's timezone from their DB profile. But `getEventPrepTimeline` is a server action - it doesn't access React context. It uses bare `new Date()`.

**Fix required:** Pass the chef's timezone to the timeline computation, or normalize event dates to the chef's timezone before computing day boundaries. The `event_date` column is a DATE (no timezone), so `new Date('2026-04-18')` is interpreted as midnight UTC, which is 8pm the PREVIOUS day in EST. This is a real bug.

**Who benefits:** Every chef not in UTC. Which is all of them.

---

### RC2: Event Date Change Invalidates Timeline

**Hypothesis:** When a chef changes the event date or serve time after viewing the prep timeline, the timeline automatically recalculates on next view.

**Failure:** Chef views prep timeline for Friday dinner. Changes event to Saturday. Opens prep tab again. Timeline still shows Friday's schedule because of cache or stale state.

**Current state:** `getEventPrepTimeline` is a server action called on page render. Changing event_date triggers `revalidatePath`. Timeline SHOULD recalculate on next page load.

**Verification:**

1. View prep tab for event on Day X
2. Change event date to Day Y
3. View prep tab again
4. All day cards shift to be relative to Day Y

**Risk:** If a separate cache layer (unstable_cache, ISR) caches the timeline response, it could serve stale data.

---

### RC3: Menu Change After Prep Started

**Hypothesis:** When a chef modifies the menu (adds/removes dishes or components) after some prep items are already checked off in localStorage, the timeline updates correctly. Checked items for removed components become orphans. New items appear unchecked.

**Failure scenarios:**

- Chef checks off "make vinaigrette." Removes vinaigrette from menu. Checked state persists forever in localStorage (memory leak).
- Chef adds a new dish. Prep tab shows it unchecked. But the day layout shifts because new items have different peak windows. Old checked items are now on different days.

**Current state:** localStorage keys include eventId + recipeId + componentName. If a component is removed, its checkbox key orphans. There's no cleanup mechanism.

**Impact:** Low (orphaned keys are tiny), but disorienting if the chef sees a "3/5 done" counter that will never reach 5/5 because 2 items were removed.

**Fix (minimal):** On prep tab mount, reconcile localStorage keys against current timeline items. Remove keys for items that no longer exist.

---

### RC4: Duplicate Recipe in Same Menu

**Hypothesis:** If the same recipe appears as a component in two different dishes (e.g., "Lemon Vinaigrette" on both the salad course and the fish course), both instances appear in the timeline with independent checkboxes.

**Current state:** The checkbox key is `cf-prep-{eventId}-{recipeId}-{componentName}`. If both components have the same recipe AND the same component name, they share a key and checking one checks both. But if component names differ ("Salad Dressing" vs "Fish Drizzle"), they're independent.

**Risk:** When both use the exact same recipe with the same component name (common in copy-paste menu building), the chef checks off one and the other disappears. They prep only one batch. Not enough for both courses.

**Fix:** Use component ID (unique per component) in the key instead of recipeId + componentName. Change `checkKey` to `cf-prep-{eventId}-{componentId}`.

---

### RC5: Cancelled Event Checkbox Cleanup

**Hypothesis:** When an event is cancelled, the prep tab checklist data in localStorage should eventually be cleaned up (or at least not interfere with future events).

**Current state:** localStorage keys include the eventId. Cancelled event's keys persist forever. No harm, but accumulates over time.

**Impact:** Low. But on a chef's phone with 200+ events over a year, thousands of orphaned localStorage entries accumulate.

**Fix (minimal):** On prep tab mount, if event status is cancelled, skip loading checkboxes. Optionally, clear the event's keys.

---

### RC6: Checkbox Undo Path

**Hypothesis:** A chef who accidentally marks all items as done can undo by unchecking each one. There's no "clear all" or "undo" button.

**Failure:** Chef's phone in wet hands. Accidentally taps everything. All items show done. Chef has to manually uncheck 21 items one by one. Or worse, chef doesn't notice and skips actual prep.

**Current state:** Individual toggle only. No batch operations.

**Fix:** Add a "Clear all" button (with confirmation) that removes all localStorage keys for the current event. Low effort, high recovery value for ALL chefs.

---

### RC7: 50+ Component Timeline Render Performance

**Hypothesis:** The prep timeline renders responsively when an event has 50+ components across multiple days.

**Current state:** The April 16 stress test has 21 components. A large catering event could have 50-100. Each component renders a `PrepItemRow` with symbol icons, allergen dots, and a checkbox.

**Verification:**

1. Create an event with 50+ components (or simulate via the timeline function)
2. Measure render time of `EventDetailPrepTab`
3. Test scroll performance on mobile
4. Test localStorage scan performance (iterating all keys)

**Risk:** `localStorage` scan on mount iterates ALL keys. A device with 10,000+ localStorage entries (from months of use) could lag.

**Fix (if needed):** Store checked items as a JSON set per event (`cf-prep-{eventId} = ["id1","id2"]`) instead of individual keys. One read instead of scanning all.

---

### RC8: Same-Day Multiple Events Prep Merge

**Hypothesis:** When a chef has two events on the same day and both have peak-window-derived prep days on the same earlier day, they can see the combined prep load.

**Failure:** Friday dinner (3 components prep on Wednesday) and Saturday lunch (2 components also prep on Wednesday). Chef opens Friday's prep tab, sees 3 items. Opens Saturday's, sees 2 items. Doesn't realize Wednesday has 5 items total across both events. Gets overwhelmed day-of.

**Current state:** Prep timelines are per-event only. No cross-event view.

**This is PI18 from the integration layer but elevated here because it's a real production failure mode.** A chef with 3+ events per week WILL hit this.

**Fix required:** Aggregate prep view on dashboard showing "Your prep today" across all events. The `scheduling_gaps` widget already detects missing blocks per event; it should also flag overloaded prep days.

---

### RC9: Past Event Timeline Still Useful

**Hypothesis:** The prep timeline for a completed event should remain viewable as a reference (post-event review, AAR, recipe refinement), but with past-day muting and no active checkboxes.

**Current state:** `getEventPrepTimeline` runs for any event status. Past events render the timeline with all days showing as "past" (muted). Checkboxes still work (localStorage).

**Question:** Should past event checkboxes be read-only? Or should they persist as a record of what the chef actually prepped?

**Recommendation:** Keep checkboxes interactive (chef might want to update after the fact for their own records). But add a subtle "This event has passed" indicator at the top of the prep tab for completed/cancelled events.

---

### RC10: Service Time Null Defaults to 6pm

**Hypothesis:** When neither `serve_time` nor `event_time` is set, `getEventPrepTimeline` defaults to 6pm. This assumption affects timeline placement.

**Failure:** Chef creates event for a brunch (10am). Forgets to set serve_time. System assumes 6pm. Prep timeline is off by 8 hours. Items that should be "prep this morning" show as "prep tonight."

**Current state:** `eventDate.setHours(18, 0, 0, 0)` when no time string.

**Impact:** For day-level scheduling (items with peak windows in 24h+ increments), 8 hours doesn't change the calendar day. But for items with <8h peak windows (salads at 4h, proteins at 1h), the timing is wrong.

**Mitigation:** Show a warning on the prep tab when no serve time is set: "No service time set. Timeline assumes 6pm. Set a serve time in event details for accuracy."

---

### RC11: Peak Window 0/0 Edge Case

**Hypothesis:** If a chef sets both `peak_hours_min=0` and `peak_hours_max=0`, the recipe must be made AT the moment of service. The timeline should place it on service day with a "day_of" symbol.

**Verification:**

1. effectiveCeiling = min(0, safetyHoursMax) = 0
2. earliestDaysBefore = floor(0/24) = 0
3. latestDaysBefore = floor(0/24) = 0
4. optimalDay = 0 (service day)
5. Symbols: effectiveCeiling < 4 -> 'day_of' symbol added

**Result:** Correct behavior. The algorithm handles 0/0 correctly. PASSES.

---

### RC12: Safety Ceiling Lower Than Peak Min (VALIDATION GAP)

**Hypothesis:** If safety_hours_max < peak_hours_min, the recipe has no valid prep window (it expires before it peaks). The system should reject this or warn.

**Example:** Chef sets peak_hours_min=48 (peaks at 2 days), safety_hours_max=24 (expires at 1 day). The recipe literally cannot reach peak quality before it expires.

**Current state:** `updateRecipePeakWindow` validates that min <= max for peak fields, but does NOT validate that safety_hours_max >= peak_hours_min.

**Impact:** The effective ceiling becomes min(peak_hours_max, 24) = 24h. The item is placed on day 1. But `peak_hours_min=48` means it shouldn't be prepped later than 2 days before. The algorithm places it at 1 day (within ceiling range), which is BEFORE it peaks. Chef preps day before, food hasn't peaked yet at service.

**Fix required:** Add validation: if `safety_hours_max < peak_hours_min`, return an error: "Safety ceiling (Xh) is shorter than earliest peak time (Yh). This recipe cannot reach peak quality within its safety window."

---

### RC13: Category Change Resets Defaults

**Hypothesis:** When a chef changes a recipe's category (e.g., from "sauce" to "protein"), the category default placeholder values in the peak window section update to reflect the new category.

**Current state:** `categoryDefaults` is computed from the current category state in the edit form. Changing the category dropdown SHOULD recompute defaults immediately (since it's derived state via `useMemo` or direct computation).

**Verification:**

1. Open recipe edit for a sauce (category default: 1-72h)
2. Change category to "protein"
3. Peak window placeholders update to 0-48h (new protein default)
4. If chef had no explicit values, the save still uses explicit null (not the old default)

**Risk:** If the category change triggers a re-render but `categoryDefaults` is stale (closure over old category), placeholders show wrong values.

---

### RC14: Prep Tab on Draft Events

**Hypothesis:** The prep tab should be useful even for draft events (planning phase). Chef is building a menu and wants to see the prep timeline preview.

**Current state:** `getEventPrepTimeline` runs regardless of event status. The prep tab renders for all statuses.

**Question:** Is this correct? A draft event's menu might be incomplete. Showing a partial timeline could be misleading, or it could be useful for planning.

**Recommendation:** Show the timeline with a note: "Draft menu. Timeline will update as you add dishes." This is useful for ALL chefs during the planning phase. Don't gate behind status.

---

### RC15: Staff Shared Device Checkbox Collision

**Hypothesis:** When a chef and a staff member use the same device (shared kitchen tablet), their checkbox states collide because localStorage is per-device, not per-user.

**Failure:** Chef checks "make stock" at 8am. Staff member opens the same event at 10am, sees stock already checked. Assumes it's done. Nobody makes stock.

**Current state:** localStorage keys have no user/session identifier. Just event + item.

**Impact:** Only affects shared devices (common in professional kitchens with a wall-mounted tablet).

**Fix:** Add user ID to the localStorage key: `cf-prep-{userId}-{eventId}-{componentId}`. Or accept the current behavior as a feature (shared checklist is intentional for team prep).

---

### RC16: April 16 Scenario Regression Test

**Hypothesis:** Given the exact April 16 dinner data (6 guests, 21 components, $125/head, service at 6:30pm with 1.5hr drive), the system produces a timeline that PREVENTS the real disaster (groceries at 1pm day-of, prep done at 5:20pm).

**Setup:** Stress test data from `memory/project_dinner_stress_test_april16.md`

**Expected output:**

1. Components with braised/slow-cook peak windows (short ribs: 24-48h) placed on day-2 or day-3
2. Sauces (vinaigrettes, pan sauces) placed on day-1 or day-of depending on type
3. Grocery deadline at least 1 day before earliest prep
4. Service day items clearly marked "day_of" with flame symbol
5. Total prep time shown in summary so chef can see "I need 8 hours of prep"

**Verification:** Feed the 21 components through `computePrepTimeline` with a service datetime of April 16 6:30pm. Verify no component that should be prepped ahead is placed on day-of.

---

### RC17: Peak Window Without Prep Time

**Hypothesis:** A recipe can have peak windows set but `prep_time_minutes = null`. The timeline should still place it on the correct day, with prep time showing a fallback (e.g., "30min" default).

**Current state:** `getEventPrepTimeline` uses `recipe?.prep_time_minutes ?? 30` as fallback. Timeline items with no prep time get 30 min.

**Risk:** The summary bar at the top of the prep tab shows total prep time. If many items use the 30-min fallback, the total is misleading ("4h 30min total" when the real total is unknown).

**Fix (minimal):** When summing prep time, distinguish estimated vs actual. Or show "~4h 30min" with the tilde indicating some times are estimated.

---

### RC18: Seasonal Peak Variation

**Hypothesis:** Some recipes have peak windows that vary by season. Chocolate ganache at room temp: 4h in summer, 8h in winter. The system currently has one fixed window per recipe.

**Current state:** No seasonal awareness. One set of peak window fields per recipe.

**Impact:** Low for V1. A chef in Phoenix in August sets ganache to 4h. In December, the timeline is overly conservative (still 4h when 8h is fine). No harm, just unnecessary urgency.

**Recommendation:** Not a V1 problem. Document as a future enhancement: per-season peak window overrides.

---

### RC19: Color-Blind Symbol Accessibility

**Hypothesis:** The symbol system is usable by color-blind chefs. Red allergen dots, green fresh leaves, blue freeze icons, and amber safety warnings must be distinguishable without relying solely on color.

**Current state:**

- Allergen dots: red circles (no shape distinction, just color)
- Freezable: snowflake icon (shape-identifiable)
- Day-of: flame icon (shape-identifiable)
- Fresh: leaf icon (shape-identifiable, but same shape as dietary vegetarian)
- Safety warning: triangle icon (shape-identifiable)

**Gap:** Allergen dots are pure color (red circles). A color-blind chef cannot distinguish them from other dots. The leaf icon is used for BOTH "fresh/short window" (emerald) and "vegetarian" (green) - same shape, similar colors. Impossible to distinguish for deuteranopia.

**Fix:**

1. Allergen dots: use distinct shapes per allergen type (triangle for nuts, diamond for dairy, circle for gluten) instead of all circles
2. Fresh vs vegetarian: use a different icon for one of them (e.g., Timer for "short window" instead of Leaf)

---

### RC20: Mobile Tap Target Size

**Hypothesis:** The checkbox tap target on `PrepItemRow` is large enough for use with wet hands in a kitchen (minimum 44x44px per WCAG).

**Current state:** Checkbox is `w-5 h-5` = 20x20px (1.25rem). The clickable button wrapping it has the same dimensions. Well below the 44px minimum.

**Impact:** Chef in kitchen, hands wet, tapping frantically. Misses the tiny checkbox. Taps 3 times. Toggles on-off-on. Frustrating.

**Fix:** Increase the button to `w-8 h-8` (32px) minimum, ideally `w-11 h-11` (44px). Keep the visual checkbox at `w-5 h-5` but expand the clickable area. Can use `p-2` on the button to pad the hit area without changing visual size.

---

## Bugs Found (Fix Immediately)

### Bug 1: RC1 - Timezone-Blind Service DateTime

`getEventPrepTimeline` builds the service datetime using bare `new Date()` which operates in the server's system timezone. The event's `event_date` is a DATE column (no timezone). When the server parses `'2026-04-18'` as a Date, it creates midnight UTC, which in EST is 8pm April 17. Setting hours to 18:30 gives 6:30pm April 17 UTC = 1:30pm April 17 EST.

**The timeline could be computing for the wrong calendar day.**

This affects every chef in a timezone different from the server. Since the app is self-hosted (localhost), the server timezone matches the developer's machine (EST). For now this is OK. But if the server ever moves to a cloud host in UTC, every timeline breaks.

**Recommended fix:** Use `date-fns-tz` to construct the service datetime in the chef's timezone:

```ts
import { zonedTimeToUtc } from 'date-fns-tz'
const serviceInTz = zonedTimeToUtc(`${event.event_date} ${timeStr}`, chefTimezone)
```

### Bug 2: RC12 - Safety < Peak Min Not Validated

Add to `updateRecipePeakWindow`:

```ts
if (
  input.safetyHoursMax != null &&
  input.peakHoursMin != null &&
  input.safetyHoursMax < input.peakHoursMin
) {
  return {
    success: false,
    error:
      'Safety ceiling is shorter than earliest peak time. Recipe cannot reach peak quality within safety window.',
  }
}
```

### Bug 3: RC4 - Duplicate Recipe Key Collision

Change `checkKey` to use a component-level unique identifier. Since the prep tab receives items from the timeline (which uses recipeId from the component, not a unique component ID), the fix requires either:

- Passing component IDs through the timeline, or
- Using `${recipeId}-${componentName}-${dishName}` to disambiguate

---

## Summary of All Three Layers

| Layer     | Questions | Focus                                               | Bugs Found                    |
| --------- | --------- | --------------------------------------------------- | ----------------------------- |
| PT1-PT25  | 25        | Core algorithm, data integrity, UI safety           | 0 (gaps only)                 |
| PI1-PI20  | 20        | Cross-system integration, notifications, scheduling | Protein default wrong (fixed) |
| RC1-RC20  | 20        | Real-world chaos, timezone, state mutations, a11y   | 3 bugs (RC1, RC4, RC12)       |
| **Total** | **65**    |                                                     | **4 bugs total**              |

---

## Priority Fixes (Ranked by Blast Radius)

1. **RC12** - Add safety < peakMin validation (prevents impossible windows) - 5 min fix, all chefs
2. **RC1** - Timezone-aware service datetime (prevents wrong-day placement) - 30 min fix, all chefs
3. **RC4** - Checkbox key collision (prevents missing prep items) - 10 min fix, all chefs
4. **RC20** - Mobile tap target (prevents kitchen frustration) - 5 min fix, all chefs
5. **RC6** - Checkbox clear-all button (prevents accidental completion) - 15 min fix, all chefs
6. **RC3** - Orphan checkbox cleanup (prevents misleading counters) - 10 min fix, all chefs
