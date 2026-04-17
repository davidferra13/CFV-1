# System Integrity Question Set: Prep Push Layer (BH1-BH15)

> Behavioral layer - how peak windows drive chef ACTION through dashboard nudges, proactive alerts, and scheduling prompts. The feature was built to "solve procrastination with math" but the math must reach the push surfaces.

**Scope:** `lib/scheduling/prep-prompts.ts`, `lib/ai/remy-proactive-alerts.ts`, `lib/scheduling/actions.ts`, `components/scheduling/prep-prompts-view.tsx`, `app/(chef)/dashboard/_sections/schedule-section.tsx`

**Depends on:** PT1-PT25 (core), PI1-PI20 (integration), RC1-RC20 (chaos)

---

## BH1: Hardcoded Recipe Names in Prep Prompts

**Question:** Line 83 of `prep-prompts.ts` says "pasta dough, ice cream base, vinaigrette, marinades" - are these real components from the event's menu?

**Answer:** No. Hardcoded text. Complete hallucination per Zero Hallucination Law 2 - displays fabricated data as if it came from the event.

**Fix:** `getAllPrepPrompts()` in `actions.ts` must fetch real component names per event and inject them into the prompt message. If no components exist, omit the prep prompt entirely.

**Severity:** CRITICAL - violates Zero Hallucination rule

---

## BH2: Fixed Day Thresholds vs Peak-Window-Derived Timing

**Question:** `getActivePrompts()` fires prep nudges at exactly 2 days before service. What if a component peaks at 72h (3 days) or 4h (same-day)?

**Answer:** The nudge fires at the wrong time. A 72h component should prompt at 3 days, not 2. A same-day component doesn't need a 2-day nudge.

**Fix:** Replace the hardcoded `days === 2` prep prompt with computed prep days from `computePrepTimeline()`. Each event's earliest prep day becomes its prompt trigger day.

**Severity:** HIGH - defeats the purpose of peak windows

---

## BH3: No Grocery Deadline in Prompts

**Question:** `computePrepTimeline()` returns `groceryDeadline` (a computed Date). Does the shopping nudge use it?

**Answer:** No. Shopping prompts use `prefs?.shop_day_before` boolean and fire at exactly 2 days or 1 day before service. The computed grocery deadline (which accounts for actual prep timing) is ignored.

**Fix:** If a computed grocery deadline exists, use it instead of the fixed 2-day/1-day thresholds for shopping prompts.

**Severity:** HIGH - grocery timing should match prep timing

---

## BH4: PrepPrompt Type Missing Component Data

**Question:** Can `PrepPrompt` carry actual component names to display in the nudge?

**Answer:** No. `PrepPrompt.message` is a plain string with no structured component data. The view renders it as text.

**Fix:** Add optional `components?: string[]` field to `PrepPrompt` type. When populated, the view can render real component names instead of a static sentence.

**Severity:** MEDIUM - type change enables real data flow

---

## BH5: Remy Alerts vs Prep Prompts Overlap

**Question:** `remy-proactive-alerts.ts` checks `prep_list_ready` and `grocery_list_ready` booleans. `prep-prompts.ts` also generates shopping/prep nudges. Can a chef see duplicate messages?

**Answer:** Yes. Both systems fire independently. A chef could see "Grocery list is ready" from prep-prompts AND "Event needs a grocery list" from Remy alerts simultaneously.

**Fix:** When prep timeline data exists, Remy's grocery/prep alerts should defer to the timeline-driven prompts. Add a check: if `computePrepTimeline()` already covers this event, skip the boolean-flag alert.

**Severity:** MEDIUM - confusing UX, not data-wrong

---

## BH6: Zero Events With Peak Windows = Silent System

**Question:** If no recipes have peak windows set, what does the prep prompt widget show?

**Answer:** Falls back to hardcoded "pasta dough, ice cream base" text (BH1) for events at 2 days out. For events at other thresholds, shows shopping/document prompts only.

**Fix:** When no peak windows exist, the 2-day prep prompt should either (a) list actual component names without timing claims, or (b) nudge the chef to set peak windows: "Set freshness windows on your recipes for smarter prep timing."

**Severity:** MEDIUM - zero peak windows = half the feature is invisible

---

## BH7: Multiple Events Same Week - Prompt Priority

**Question:** Chef has 3 events in 5 days. Each generates prep prompts. How are they prioritized?

**Answer:** Sort by urgency tier (overdue > actionable > upcoming), then by `daysUntilEvent`. This is correct. But with peak-window-driven prompts, two events could have components peaking on the same day - which component surfaces first?

**Fix:** Within same-urgency same-day prompts, sort by total prep time (longest first - start biggest job first). Already have `prepTimeMinutes` per component in the timeline.

**Severity:** LOW - edge case, current sort is reasonable

---

## BH8: Prompt Action URL Points to Event Page, Not Prep Tab

**Question:** Prep prompt action URLs go to `/events/${event.id}`. Does this land on the prep tab?

**Answer:** No. It lands on the default tab (overview). Chef must manually navigate to the Prep tab.

**Fix:** Change prep category action URLs to `/events/${event.id}?tab=prep` (or whatever deep-link mechanism the event detail page supports).

**Severity:** MEDIUM - one extra click per nudge reduces conversion

---

## BH9: No "Component X Peaks Today" Alert

**Question:** When a component is on the prep timeline for today, does the chef get a specific alert naming that component?

**Answer:** No. Day-0 prompts say "Today is [event]. View your day schedule." Generic. No component names, no peak window information.

**Fix:** On day-of, if timeline has items for today, list them: "Start [component names] today for [event] - peak quality window."

**Severity:** HIGH - the most actionable moment gets the least specific nudge

---

## BH10: Freezable Components Not Highlighted in Nudges

**Question:** A freezable component could be prepped early to reduce day-of load. Do prep prompts mention this?

**Answer:** No. Freezable status is only visible on the prep tab (snowflake icon). Dashboard nudges don't distinguish between "must do today" and "could freeze ahead."

**Fix:** When generating prep prompts for events 5+ days out, include a "freezable items" hint: "[N] components can be frozen ahead for [event]." Links to prep tab.

**Severity:** LOW - nice optimization, not a correctness issue

---

## BH11: `getAllPrepPrompts()` Fetches Events but Not Timelines

**Question:** `getAllPrepPrompts()` in `actions.ts` calls `fetchUpcomingSchedulingEvents()` and `getActivePrompts(events, prefs)`. Does it compute prep timelines?

**Answer:** No. It passes raw events to the pure prompt generator. No timeline computation happens. The prompt generator has zero access to peak window data.

**Fix:** `getAllPrepPrompts()` must also call `getEventPrepTimeline()` for each event that has menus, then pass timeline data alongside events to `getActivePrompts()`.

**Severity:** CRITICAL - this is the root cause of BH1-BH4

---

## BH12: Performance - Computing Timelines for All Upcoming Events

**Question:** `getAllPrepPrompts()` runs on every dashboard load. If it computes timelines for all upcoming events, is that expensive?

**Answer:** `getEventPrepTimeline()` does 5 DB queries per event (event, menus, dishes, components, recipes + allergens). With 10 upcoming events, that's 50+ queries on every dashboard load.

**Fix:** Only compute timelines for events within the prompt window (next 7 days). Events 7+ days out get generic prompts. Cache timeline results with `unstable_cache` tagged per event.

**Severity:** MEDIUM - performance concern, not correctness

---

## BH13: Prompt Deduplication Across Systems

**Question:** If prep-prompts generates a "Shop for [event]" nudge and Remy generates a "Missing grocery list" alert for the same event, does the chef see both?

**Answer:** Yes. No cross-system deduplication. Prep-prompts are ephemeral (computed per-load). Remy alerts are persisted in `remy_alerts` table with 24h dedup window. Different systems, different lifecycles.

**Fix:** Short-term: acceptable. Long-term: when prep-prompts are timeline-driven, Remy's `checkMissingGroceryList` should check if the event's computed grocery deadline hasn't passed yet before alerting.

**Severity:** LOW - duplicate is annoying not harmful

---

## BH14: Untimed Items Don't Generate Prompts

**Question:** Components in `timeline.untimedItems` (no peak windows, no category match) never appear in any prep prompt. The chef gets zero nudges for these.

**Answer:** Correct. Untimed items only appear in the passive prep tab under "Not yet timed." No push mechanism.

**Fix:** When untimed items exist, generate one prompt per event: "[N] components need peak windows for [event]. Set them to unlock smart prep timing." Links to recipe detail page.

**Severity:** MEDIUM - drives peak window adoption

---

## BH15: Client Portal Shows No Prep Progress

**Question:** The client can see their event. Can they see whether the chef has started prepping?

**Answer:** No. Client sees event status (confirmed, etc.) but zero prep visibility. The prep timeline is chef-only.

**Fix:** Out of scope for this layer. Client visibility is a separate feature. But note: when prep checkboxes pass 50%, the event could show a "Chef is prepping" indicator to the client. Future work.

**Severity:** LOW - not in V1 scope

---

## Implementation Priority

| ID   | Severity | Effort  | Fix                                                  |
| ---- | -------- | ------- | ---------------------------------------------------- |
| BH1  | CRITICAL | Medium  | Replace hardcoded text with real component names     |
| BH11 | CRITICAL | Medium  | Wire timeline computation into `getAllPrepPrompts()` |
| BH2  | HIGH     | Medium  | Replace fixed day thresholds with computed prep days |
| BH3  | HIGH     | Low     | Use computed grocery deadline for shopping prompts   |
| BH9  | HIGH     | Low     | Day-of prompts list today's components by name       |
| BH8  | MEDIUM   | Trivial | Add `?tab=prep` to action URLs                       |
| BH4  | MEDIUM   | Low     | Add `components` field to PrepPrompt type            |
| BH6  | MEDIUM   | Low     | Nudge to set peak windows when none exist            |
| BH14 | MEDIUM   | Low     | Prompt for untimed items                             |
| BH12 | MEDIUM   | Medium  | Limit timeline computation to 7-day window           |
| BH5  | MEDIUM   | Low     | Deduplicate Remy alerts when timeline covers event   |
| BH10 | LOW      | Low     | Freezable items hint in 5+ day prompts               |
| BH7  | LOW      | Trivial | Sort by prep time within same priority               |
| BH13 | LOW      | Low     | Cross-system dedup (long-term)                       |
| BH15 | LOW      | N/A     | Future work - client prep visibility                 |
