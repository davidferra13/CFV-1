# Day-Of Timeline — Refinements

**Date:** 2026-02-19
**Branch:** fix/cron-get-post-mismatch

**Files changed:**

- `lib/scheduling/timeline.ts`

---

## What Was Already Built

The full scheduling engine was already complete before this session:

| Layer | File | Status |
| --- | --- | --- |
| Timeline generator | `lib/scheduling/timeline.ts` | Built |
| DOP engine | `lib/scheduling/dop.ts` | Built |
| Prep prompts | `lib/scheduling/prep-prompts.ts` | Built |
| Types | `lib/scheduling/types.ts` | Built |
| Server actions | `lib/scheduling/actions.ts` | Built |
| TimelineView component | `components/scheduling/timeline-view.tsx` | Built |
| DOPView component | `components/scheduling/dop-view.tsx` | Built |
| Event schedule page | `app/(chef)/events/[id]/schedule/page.tsx` | Built |
| Calendar / week / agenda views | `components/scheduling/` | Built |
| Dashboard integration (today's schedule) | `app/(chef)/dashboard/page.tsx` | Built |
| Schedule link from event detail header | `app/(chef)/events/[id]/page.tsx` line 171 | Already present |

---

## Changes Made in This Session

### 1. Automatic 15-min Travel Buffer

**What changed:** Added `TRAVEL_BUFFER_MINUTES = 15` constant. Departure time now calculated as:

```text
depart = arrival - travel_time - 15 min buffer
```

Previously it was just `arrival - travel_time`, meaning the chef was expected to arrive with zero slack on top of the estimated drive.

**Why:** The spec is explicit — "15 minutes on top of estimated drive time. Always. Non-negotiable." This buffer accounts for traffic variance, parking, and unloading time. The chef should not have to manually bake this in when setting travel time.

**Effect:** If a chef sets `travel_time_minutes = 45`, the departure slot now appears 60 minutes before arrival (45 + 15), not 45. Wake time, prep start, and shopping blocks all shift back accordingly since they chain from departure.

**Route total updated too:** `buildRoute` now adds `TRAVEL_BUFFER_MINUTES` to the client leg so the displayed "Total estimated drive time" matches what the timeline actually allocates.

**Departure description now reads:** `45 min drive + 15 min buffer → client location`

---

### 2. Removed Duplicate Same-Timestamp Items

**What changed:**

- Removed the separate `finish_prep` milestone. Its meaning was merged into the `packing` block label: `"Prep complete — start packing"`.
- In the day-of shopping flow (`!shop_day_before`), removed the separate `start_prep` item. It appeared at the same timestamp as `home_from_shopping`. The `home_from_shopping` item now carries the prep-start meaning: label `"Home from shopping — start prep"` with prep duration in the description.
- In the shop-day-before flow, `start_prep` is kept as a standalone item — it is genuinely distinct there (chef is already home, just starting the morning).

**Why:** Two items at the same timestamp sort adjacently and look like a bug. Each case had one item that was fully implied by the other:

```text
BEFORE (day-of shopping flow):
  14:00  Home from shopping         [shopping]  "Start prep immediately."
  14:00  Start prep                 [prep]      "2.5 hours of prep work."

AFTER:
  14:00  Home from shopping — start prep   [shopping]  "All ingredients in the house. 2.5 hours of prep ahead."
```

```text
BEFORE (packing):
  16:30  Start packing car   [packing]
  16:30  Finish all prep     [milestone]

AFTER:
  16:30  Prep complete — start packing   [packing]
```

---

### 3. Stale Comment Cleanup

Updated the JSDoc header comment on `generateTimeline` to remove `FINISH PREP` as a named step (it no longer exists as a separate item) and renumbered the inline step comments to match actual step count.

---

### 4. Route Plan Now Respects `shop_day_before`

**What changed:** `buildRoute` previously added all default store stops to the route regardless of the `shop_day_before` preference. If shopping was done the day before, those stops were still showing on the day-of route plan.

**Fix:** Store stops are now only included when `!shop_day_before`. When `shop_day_before` is true, the day-of route shows HOME → CLIENT only, which is correct — the chef isn't going to any stores that day.

---

## What Remains — Known Gaps (Not Blocking)

These items are in the spec but require deeper data or significant new infrastructure:

| Gap | Reason Not Built Yet |
| --- | --- |
| PREP NOW vs PREP AFTER SHOPPING split | Requires prep list tasks tagged with a phase. Without that data, any split is a guess. |
| Live "now" indicator | `TimelineView` is a server component; NOW marker is static at render time. Needs client component with `setInterval`. |
| Timeline recalculation when behind | Recovery path has no underlying mechanism. Significant real-time feature. |
| Historical actuals / learning | Requires tracking estimated vs actual duration per event. No data model yet. |
| Timeline state machine (generated/active/adjusted/closed) | Spec describes formal states; not in DB or code. |

None of these block current use. The core engine is fully functional.
