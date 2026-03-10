# Meal Prep Batch Features

Two new features for the Meal Prep archetype, focused on weekly batch cooking workflows.

## Feature 1: Batch Shopping Consolidation

**Purpose:** Aggregate ingredients across ALL clients' meal plans for one weekly shopping trip.

### How It Works

1. Chef selects a week using the week picker
2. System finds all active meal prep programs
3. For each program, gets the current rotation week's menu/dishes
4. For dishes linked to recipes, fetches all recipe ingredients
5. Aggregates: same ingredient + same unit = summed quantities
6. Shows per-client breakdown for cost allocation

### Files

- **Server actions:** `lib/meal-prep/batch-shopping-actions.ts`
  - `getBatchShoppingList(weekStartDate)` - Fetch and aggregate
  - `createBatchShoppingList(weekStartDate)` - Save as real shopping list
  - `allocateCostToClients(shoppingListId)` - Split costs proportionally
- **Page:** `app/(chef)/meal-prep/shopping/page.tsx`
- **Client component:** `app/(chef)/meal-prep/shopping/batch-shopping-client.tsx`

### Data Flow

```
meal_prep_programs (active)
  -> meal_prep_weeks (current rotation)
    -> menus -> dishes -> recipes -> recipe_ingredients -> ingredients
      -> aggregate by name+unit -> BatchShoppingItem[]
```

Saves to existing `shopping_lists` table for full shopping mode support (checkboxes, price entry, expense conversion).

---

## Feature 2: Cooking Day Execution Workflow

**Purpose:** Assembly-line task breakdown for batch cooking day.

### How It Works

1. System collects all dishes across all active programs for the week
2. Groups by recipe/dish type (batch similar items together)
3. Generates tasks across 5 phases: Prep, Cook, Portion, Label, Pack
4. Scales time estimates based on total portions
5. Orders proteins first (longest cook times)

### 5 Phases

1. **Prep** - Wash, chop, marinate, season (all raw prep)
2. **Cook** - Proteins first (longest), then grains, then vegetables
3. **Portion** - Divide into containers per client
4. **Label** - Print and apply labels (single task after all portioning)
5. **Pack** - Organize by client for delivery (one task per client)

### Files

- **Server actions:** `lib/meal-prep/cooking-day-actions.ts`
  - `generateCookingDayPlan(weekStartDate)` - Create task breakdown
  - `getCookingDayPlan(weekStartDate)` - Retrieve saved plan
  - `toggleCookingTask(weekStartDate, taskKey)` - Mark task complete
  - `getCookingDayProgress(weekStartDate)` - Progress stats
- **Checklist component:** `components/meal-prep/cooking-day-checklist.tsx`
  - Mobile-friendly full-screen checklist
  - Progress bar with time remaining estimate
  - Tasks grouped by phase with phase completion indicators
  - Expandable client lists per task
- **Page:** `app/(chef)/meal-prep/cooking-day/page.tsx`
- **Client component:** `app/(chef)/meal-prep/cooking-day/cooking-day-client.tsx`

### Task Dependencies

Each dish generates prep -> cook -> portion tasks with explicit `dependsOn` references. Labeling depends on all portioning completing. Packing depends on labeling.

### Storage

Plans are stored as JSONB in the `shopping_lists` table with a `__cooking_day_plan__` name prefix. Completion state is embedded in the plan JSON (each task has a `completed` boolean). This avoids needing a new migration since `dop_task_completions` requires `event_id NOT NULL` which doesn't apply to weekly cooking plans.

---

## Navigation

Both features are accessible from the main Meal Prep page (`/meal-prep`) via "Batch Shopping" and "Cooking Day" buttons in the header. Both require Pro tier (`operations` module).

## Design Principles

- **Formula > AI**: All task generation is deterministic. No Ollama dependency.
- **Reuses existing tables**: Shopping lists and JSONB storage, no new migrations needed.
- **Mobile-friendly**: Checklist designed for kitchen use on phones.
- **Tenant-scoped**: All queries filter by `tenant_id` / `chef_id`.
