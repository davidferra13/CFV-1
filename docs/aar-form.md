# After Action Review Form — Implementation Note

## Status: Already Implemented

During implementation review, it was confirmed that the After Action Review system was already fully built. No new code was required.

## What Exists

### Database
The `after_action_reviews` table (from Layer 3 migrations) has all required fields:
- `calm_rating`, `preparation_rating` (1–5 integer scales)
- `could_have_done_earlier`, `what_went_well`, `what_went_wrong`, `would_do_differently` (text fields)
- `forgotten_items[]` (text array — pre-populated from non-negotiables checklist)
- `menu_performance_notes`, `client_behavior_notes`, `site_notes`, `general_notes` (text fields)

A DB trigger sets `events.aar_filed = true` automatically on INSERT into `after_action_reviews`.

### `lib/aar/actions.ts`
Full server action suite: `createAAR()`, `getAARByEventId()`, `getAAR()`, `updateAAR()`, `getEventsWithoutAAR()`, `getRecentAARs()`, `getAARStats()`, `getForgottenItemsFrequency()`.

### `app/(chef)/events/[id]/aar/page.tsx`
AAR page that fetches event context, existing AAR, and non-negotiables checklist items. Routes to `/events/[id]/aar`.

### `components/aar/aar-form.tsx`
Full AAR form with:
- Section 1: Ratings (calm 1-5, preparation 1-5)
- Section 2: Forgotten items checklist (pre-populated from event's non-negotiables)
- Section 3: Reflection text fields (could_have_done_earlier, what_went_well, what_went_wrong)
- Section 4: Menu performance notes
- Section 5: Client behavior notes
- Section 6: Site notes
- Submit button → calls `createAAR()` or `updateAAR()`

### Event Detail Page Integration
The closure status card on the event detail page shows the AAR filing status and links to `/events/[id]/aar` when not yet filed.

## How It Connects

The AAR gate is enforced by `events.aar_filed`. The event closure checklist checks this flag. Without filing an AAR, the "AAR Filed" checkbox shows red.

The AAR form operates in two modes:
- **New**: `createAAR()` — inserts a new record, triggers `aar_filed = true`
- **Edit**: `updateAAR()` — updates the existing record (identified by `getAARByEventId()`)
