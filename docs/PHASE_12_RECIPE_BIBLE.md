# Phase 12 — Recipe Bible Implementation

## What Changed

Phase 12 adds the Recipe Bible: the full system for managing, browsing, creating, and linking recipes. This is the mechanism by which 10 years of muscle-memory cooking gets recorded into a structured, costable, reusable recipe library.

## Files Created

### Server Actions
- **`lib/recipes/actions.ts`** — 15+ server actions for recipe and ingredient management:
  - `createRecipe`, `getRecipes`, `getRecipeById`, `updateRecipe`, `deleteRecipe`
  - `addIngredientToRecipe`, `updateRecipeIngredient`, `removeIngredientFromRecipe`
  - `getIngredients`, `createIngredient`, `updateIngredient`
  - `linkRecipeToComponent`, `unlinkRecipeFromComponent`
  - `getRecipesForEvent`, `getUnrecordedComponentsForEvent`
  - `searchRecipes` (lightweight search for link modals)
  - All follow established patterns: `requireChef()`, tenant scoping, Zod validation, `revalidatePath`

### Recipe Pages
- **`app/(chef)/recipes/page.tsx`** — Recipe Library (server component)
- **`app/(chef)/recipes/recipes-client.tsx`** — Library client: search, category filter, sort (A-Z/Newest/Most Used), recipe grid with category badges, ingredient counts, usage counts, cost estimates
- **`app/(chef)/recipes/new/page.tsx`** — Create Recipe (server component)
- **`app/(chef)/recipes/new/create-recipe-client.tsx`** — Dual-mode creation:
  - **Smart Import**: Paste natural language text, AI parses structured recipe with ingredients, review and save
  - **Manual Entry**: Form with name, category, method, yield, times, dietary tags, and ingredient rows
  - Supports pre-fill from component (when created from post-event capture or menu link)
- **`app/(chef)/recipes/[id]/page.tsx`** — Recipe Detail (server component)
- **`app/(chef)/recipes/[id]/recipe-detail-client.tsx`** — Full detail view with:
  - Ingredients list with pricing data
  - Method (concise, outcome-oriented)
  - Details (yield, prep/cook time, dietary tags, notes)
  - Cost summary from `recipe_cost_summary` view (total cost, cost per portion, price data completeness)
  - Event history (which dinners used this recipe, linked through components)
  - Actions: Edit, Duplicate, Delete
- **`app/(chef)/recipes/[id]/edit/page.tsx`** — Edit Recipe (server component)
- **`app/(chef)/recipes/[id]/edit/edit-recipe-client.tsx`** — Edit form with existing + new ingredient management
- **`app/(chef)/recipes/ingredients/page.tsx`** — Ingredient Library (server component)
- **`app/(chef)/recipes/ingredients/ingredients-client.tsx`** — Searchable, filterable ingredient table with inline editing

### Components
- **`components/recipes/recipe-capture-prompt.tsx`** — Post-event recipe capture prompt:
  - Shows unrecorded components after completed events
  - "Quick Capture" inline text area with AI parsing
  - "Record Recipe" link to full creation form
  - Auto-links created recipes to their source component
  - Updates in-place as recipes are captured

## Files Modified

### Event Detail Page
- **`app/(chef)/events/[id]/page.tsx`** — Added recipe capture section:
  - Imports `getUnrecordedComponentsForEvent` and `isAIConfigured`
  - Imports `RecipeCapturePrompt` component
  - Fetches unrecorded components in parallel with other data
  - Renders recipe capture prompt for completed/in_progress events with menus

### Menu Detail
- **`app/(chef)/menus/[id]/page.tsx`** — Fetches recipe names for linked components, passes `recipeMap` to client
- **`app/(chef)/menus/[id]/menu-detail-client.tsx`** — Added per-component recipe status:
  - Shows "Recipe" link (green) for components with linked recipes
  - Shows "No recipe" + "Link Recipe" + "Create" for components without
  - Inline recipe search modal for linking existing recipes
  - "Unlink" option for removing recipe links

### Pre-existing Fixes
- **`lib/chef/actions.ts`** — Fixed type errors for `chef_preferences` table (not in generated types, pending migration). Used `any` assertion helper until types are regenerated.
- **`lib/scheduling/actions.ts`** — Fixed type errors for `travel_time_minutes` column (not in events table types). Refactored to use `mapEventToScheduling` helper with `any` assertion.

## How It Connects

### Data Flow: Component → Recipe Linking
```
menus → dishes → components (recipe_id FK) → recipes → recipe_ingredients → ingredients
```

Components are the bridge between menus and recipes. When a component has `recipe_id` set, that recipe (and its cost data) travels with the component across any future menu.

### Recipe Growth Mechanism
The Recipe Bible builds primarily through **post-event capture**:
1. Chef completes a dinner
2. Event detail page shows unrecorded components
3. Chef types a quick description or clicks through to full form
4. AI parses the text into structured recipe with ingredients
5. Recipe is created AND linked to the component
6. After 20 dinners = 60-100 recipes, without ever "sitting down to write a cookbook"

### Cost Data Integration
- `recipe_cost_summary` view computes total cost and cost-per-portion from ingredient prices
- `ingredient_usage_summary` view tracks how many recipes use each ingredient
- Cost estimates improve over time as receipt extraction (Phase 11) fills in ingredient prices
- UI shows "Complete" or "Estimated" badge based on `has_all_prices` flag

### Find-or-Create Pattern
Ingredients use case-insensitive find-or-create: when adding "heavy cream" to a recipe, the system searches existing ingredients first. This prevents duplicates and ensures cost data accumulates on a single record.

### Smart Import Reuse
The recipe creation page reuses `parseRecipeFromText()` from Phase 8's Smart Import. The post-event Quick Capture also uses it for inline parsing.

## Architecture Decisions

1. **Server actions, not API routes** — Consistent with all existing patterns. Every function uses `requireChef()` and tenant scoping.
2. **Views for computed data** — `recipe_cost_summary` and `ingredient_usage_summary` are database views that compute aggregates. The server actions read from these views rather than computing costs in application code.
3. **Inline recipe search on menus** — Rather than a full modal dialog, the "Link Recipe" search is an inline dropdown within the component list. This keeps the interaction lightweight.
4. **Pre-fill from context** — Recipe creation supports URL params (`component`, `componentName`, `componentCategory`) so creating a recipe from a component prompt pre-fills the form and auto-links on save.

## Build Status
- TypeScript: 0 errors in recipe code
- Next.js build: Clean compilation, all recipe pages render
- Pre-existing type errors in `lib/chef/actions.ts` and `lib/scheduling/actions.ts` resolved with type assertion helpers

## Checklist
- [x] `lib/recipes/actions.ts` exists with 15+ functions
- [x] Recipe CRUD works (create, read, update, delete)
- [x] Ingredient management works (find-or-create, add to recipe, remove)
- [x] `linkRecipeToComponent` and `unlinkRecipeFromComponent` work
- [x] `getUnrecordedComponentsForEvent` identifies components missing recipes
- [x] Recipe library page with search and category filtering
- [x] Recipe creation with both manual and Smart Import modes
- [x] Recipe detail shows ingredients, method, cost summary, event history
- [x] Post-event recipe capture prompt appears on event detail for completed events
- [x] Menu component view shows recipe link status
- [x] "Link Recipe" search works on menu components
- [x] Navigation includes Recipes link (already present from prior phase)
- [x] 0 type errors, clean build
