# Meal Prep Archetype Features

Three features added for the Meal Prep archetype: label printing from meal prep weeks, waste/yield tracking, and client meal history.

## Feature 1: Label Printing from Meal Prep Weeks

**What changed:** `generateLabelsFromMealPrepWeek()` in `lib/meal-prep/label-actions.ts` was a stub returning empty data. Now fully implemented.

**How it works:**

1. Accepts `programId` and `rotationWeek` (changed from single `_weekId` param)
2. Fetches the meal_prep_week for that program + rotation
3. Gets the program to find client info and dietary restrictions
4. If `menu_id` is set: fetches dishes from that menu, gets nutrition from `menu_nutrition`, gets reheating instructions from linked recipes
5. If `custom_dishes` JSONB has entries: uses those directly
6. Builds label data with: dish name, client name, prep date (today), use-by date (today + 5 default), reheating instructions, allergens, nutrition, serving numbers
7. Returns same format as `generateLabelsFromEvent()` for consistency

**Allergen fallback chain:** dish allergen_flags -> recipe allergens -> client dietary_restrictions

**Reheating instructions:** Extracted from recipe instructions (scans for reheat/warm/microwave/oven keywords). Falls back to generic instructions if none found.

## Feature 2: Waste & Yield Tracking

**Migration:** `20260331000010_meal_prep_batch_log.sql`

- New `meal_prep_batch_log` table with chef_id tenant scoping
- Tracks: batch date, dish name, planned/actual/waste portions, waste reason, costs, notes
- RLS policies for chef-only access

**Server actions:** `lib/meal-prep/waste-tracking-actions.ts`

- `logBatchResult()` - record a batch cooking result
- `getBatchHistory()` - list past batch logs with optional date range
- `getWasteSummary()` - aggregate stats: yield %, waste %, cost of waste, top waste reasons
- `getRecipeYieldHistory()` - per-recipe yield consistency over time

**Component:** `components/meal-prep/waste-tracker.tsx`

- Summary cards: yield %, waste %, cost of waste, batch count
- Log batch form: dish name, date, portions (planned/actual/waste), waste reason, costs, notes
- Batch history table with all logged entries

**Page:** `app/(chef)/meal-prep/waste/page.tsx`

- Pro-gated (operations module)
- Date range filter via URL search params
- Full waste dashboard with summary + log + history

## Feature 3: Client Meal History

**Server actions:** `lib/meal-prep/meal-history-actions.ts`

- `recordMealsServed()` - record meals served to a client for a given week
- `getClientMealHistory()` - all meals served to a client with dates, reactions, source
- `getDishRepeatCheck()` - check if dishes were served recently (for repeat prevention)
- `getMealFrequencyReport()` - which dishes served most/least, with reaction averages
- `recordMealsFromMealPrepWeek()` - auto-record from meal prep week when marked delivered

**Component:** `components/meal-prep/client-meal-history.tsx`

- Dish frequency section: top 10 dishes by frequency with reaction badges
- Search/filter by dish name
- Timeline grouped by date with dish names, frequency badges, reaction indicators
- Distinguishes meal prep auto-recorded entries from manual entries

**Data source:** Uses existing `served_dish_history` table (no new migration needed). Meal prep entries get notes indicating source.
