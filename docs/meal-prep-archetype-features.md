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

---

## Feature 4: Container Inventory Management (2026-03-10)

Full lifecycle tracking for meal prep containers.

### Database

- `container_inventory` table: tracks container types (6 types), materials (4 options), stock levels, costs
- `container_transactions` table: logs every purchase, deploy, return, retire, and lost event
- Both tables use `chef_id` tenant scoping with RLS

### Server Actions (`lib/meal-prep/container-actions.ts`)

- `addContainerType()`: create a new container type with initial stock
- `updateContainerType()`: update container properties, auto-recalculates availability
- `getContainerInventory()`: list all container types with current counts
- `recordTransaction()`: log a transaction and update inventory counts
- `getContainerHistory()`: transaction log with joined container and client names
- `getContainersByClient()`: net deployed containers per client
- `getLowStockAlerts()`: container types where available < 20% of total

### UI (`components/meal-prep/container-dashboard.tsx`)

- Summary cards, per-type cards with availability bar, quick actions, transaction log

### Page: `/meal-prep/containers` (added to nav)

## Feature 5: Client Preference Questionnaire (2026-03-10)

Structured onboarding form for meal prep clients.

### Database

- `client_meal_prep_preferences` table: comprehensive preferences per chef-client pair

### Server Actions (`lib/meal-prep/preference-questionnaire-actions.ts`)

- `saveClientMealPrepPreferences()`: upserts all preference fields
- `getClientMealPrepPreferences()`: retrieves saved preferences
- `generatePreferenceLink()`: creates a shareable link

### UI (`components/meal-prep/preference-form.tsx`)

- Multi-section form: Dietary, Household, Meal Preferences, Delivery, Budget & Notes
- Toggle chips for multi-select, radio buttons for single select

## Feature 6: Nutritional Tracking (2026-03-10)

Recipe-level nutritional data with weekly macro balancing. All math is deterministic (Formula > AI).

### Database

- `recipe_nutrition` table: per-recipe macro data

### Server Actions (`lib/meal-prep/nutrition-actions.ts`)

- `setRecipeNutrition()`: manual entry per recipe
- `getRecipeNutrition()`: retrieve nutrition for one recipe
- `getWeeklyNutritionSummary()`: aggregates macros across a rotation week
- `checkMacroBalance()`: deterministic check against calorie/protein targets

### UI (`components/meal-prep/nutrition-summary.tsx`)

- Weekly totals with daily averages, macro balance progress bars, per-meal breakdown

### Migration

- File: `supabase/migrations/20260331000009_meal_prep_containers_preferences_nutrition.sql`
- Additive only: 3 new tables, no changes to existing tables
