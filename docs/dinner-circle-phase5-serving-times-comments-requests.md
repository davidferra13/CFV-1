# Dinner Circle Phase 5: Serving Times, Comments, and Meal Requests

## What changed

### 1. Default Meal Times (Chef-Configurable)

The chef can set default serving times per meal type for the entire residency:

- **Settings modal** accessible from edit mode ("Meal Times" button)
- Stored as JSONB on `hub_groups.default_meal_times` (e.g. `{"breakfast": "08:00", "lunch": "12:30", "dinner": "19:00", "snack": null}`)
- Individual meals can override via `hub_meal_board.serving_time`
- Times displayed in both the weekly grid and Today's hero card
- Formatted as 12-hour time (e.g. "7:00 PM")

### 2. Per-Meal Comment Thread

Lightweight discussion per meal entry, for questions and coordination:

- **Comment trigger** button (speech bubble icon with count) on each meal slot
- **Full-screen thread** modal: scrollable message list + input field
- Any circle member can comment; membership verified server-side
- Optimistic sends with rollback on failure
- Auto-scrolls to newest comment on open and on send

### 3. Meal Requests from Family

Family members can request specific dishes:

- **Collapsible panel** below the dietary dashboard showing all requests
- **"+ Request a dish"** button for any member to submit
- Each request shows: title, optional notes, who requested it, when, and status
- **Chef actions**: "Plan it" (marks planned) or "Decline" for pending requests
- System message posted to group chat when a request is submitted
- Pending count badge on the collapsed panel header

## Database (Migration 20260401000135)

- `hub_meal_board.serving_time` - TIME column, overrides group default
- `hub_groups.default_meal_times` - JSONB column for group-wide defaults
- `hub_meal_comments` table - per-meal comment thread
- `hub_meal_requests` table - family dish requests with status lifecycle

## Server Actions Added

- `getDefaultMealTimes(groupId)` / `updateDefaultMealTimes(...)` - CRUD for group meal times
- `getMealComments(mealEntryId)` / `addMealComment(...)` - comment CRUD
- `getMealRequests(...)` / `createMealRequest(...)` / `resolveMealRequest(...)` - request lifecycle

## Files Changed

- `lib/hub/types.ts` - added `serving_time` to MealBoardEntry, new types: MealComment, MealRequest, MealRequestStatus, DefaultMealTimes
- `lib/hub/meal-board-actions.ts` - added `servingTime` to upsert schema, 6 new server actions
- `components/hub/meal-comments.tsx` - new (thread modal + trigger button)
- `components/hub/meal-requests.tsx` - new (collapsible panel + form)
- `components/hub/meal-time-settings.tsx` - new (settings modal)
- `components/hub/weekly-meal-board.tsx` - integrated all 3 features + serving time display
- `components/hub/todays-meals-card.tsx` - added serving time display with 12h formatting

## Design Decisions

- **Comment threads are per-meal, not global**: keeps context tight. "Can we do the salmon at 7:30 instead?" belongs on the salmon entry, not in the general chat.
- **Requests are visible to everyone**: transparency builds trust. The family sees what was requested and whether it was planned or declined. No hidden requests.
- **Meal times are group-level defaults**: set once for the residency, override per-meal when needed. The billionaire's schedule is consistent; the chef doesn't want to set times on every single meal.
- **No notification spam from comments**: comments are pull-based (open the thread to see them). This prevents the family group chat from being overwhelmed by meal-level discussions.
