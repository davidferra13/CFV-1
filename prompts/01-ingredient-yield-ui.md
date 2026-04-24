# BUILD: Ingredient Yield UI (Unblock Dead Lifecycle)

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 private chef operations platform. Read `CLAUDE.md` before doing anything.

## Problem

The entire ingredient lifecycle system is DEAD. The schema accepts `yield_pct` on recipe ingredients (`recipe_ingredients.yield_pct`) and `default_yield_pct` on master ingredients (`ingredients.default_yield_pct`). Server actions wire it through. But the **recipe ingredient editing UI has NO yield_pct input field**. Every ingredient treats yield as 100%, making shopping lists, cost projections, and lifecycle views all wrong.

Additionally, `suggestYieldByName()` exists in the codebase but the recipe form never calls it - chefs must know from memory that salmon has 45% fillet yield.

## What to Build

### Phase 1: Yield Input on Recipe Ingredient Form

1. Find the recipe ingredient editing UI (likely in `components/recipes/` or `components/culinary/`). Read it fully.
2. Add a `yield_pct` input field (0-100, default 100) to the recipe ingredient row/form.
3. When an ingredient is selected, call `suggestYieldByName()` to auto-populate a suggested yield. Chef can override.
4. Display yield as a helper hint: "Salmon fillet: ~45% yield (bones, skin, trim removed)"
5. Ensure the value saves through the existing server action path.

### Phase 2: Propagation Verification

6. Verify shopping list generation uses yield_pct to inflate buy quantities (e.g., need 2 lbs edible salmon at 45% yield = buy 4.44 lbs).
7. Verify cost projections use yield-adjusted quantities.
8. If either is broken, fix the math.

### Phase 3: Zero vs Not-Recorded

9. Find the lifecycle view (search for `COALESCE(purchased_qty, 0)`).
10. Distinguish "not purchased yet" (null) from "confirmed zero purchased" (0). Show "—" or "Not recorded" for null, "0" for explicit zero.

## Key Files to Read First

- `CLAUDE.md` (mandatory)
- `components/recipes/` - recipe form components
- `lib/documents/generate-grocery-list.ts` - shopping list generation
- Search for `suggestYieldByName` - auto-suggestion function
- Search for `yield_pct` across codebase - find all touchpoints
- Search for `recipe_ingredients` schema definition
- `memory/project_ingredient_lifecycle.md` - full context

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- Test your work with Playwright / screenshots
- This is a live production app - no destructive DB changes without approval
- Follow existing component patterns (read siblings before writing)
- yield_pct is a percentage (0-100), stored as numeric
