# What-If Menu Simulator

## What Changed

Added a "What If" menu simulator that lets chefs preview the impact of dish swaps before committing to them.

## Files Added

- `lib/menus/menu-simulator.ts` - Pure deterministic simulator engine
- `components/menus/menu-simulator-panel.tsx` - Client-side panel UI

## How It Works

The simulator takes a menu's current dishes and a proposed swap (remove one dish, add another) and calculates:

1. **Food cost delta** - How much more/less the menu will cost (scaled by guest count)
2. **Margin impact** - Old vs new margin percentage against menu revenue
3. **Allergen conflicts** - Uses the existing `checkDishAgainstAllergens` from `lib/menus/allergen-check.ts`
4. **Ingredient overlap** - Shared ingredients between the new dish and remaining dishes (helps avoid repetition)
5. **Prep time delta** - Change in prep time if both dishes have known prep times

## Design Decisions

- **Ephemeral state only**: Nothing is saved to the database until the chef clicks "Apply Swap". The panel maintains local React state only.
- **Formula over AI**: All calculations are pure math functions. No Ollama, no Gemini, no network calls.
- **Reuses existing allergen checking**: Imports `checkDishAgainstAllergens` from `allergen-check.ts` rather than reimplementing.
- **Cost per serving model**: Each dish has a `costPerServingCents` which gets multiplied by `guestCount` for total cost. This matches how `recipe_cost_summary` works in the existing system.
- **The `SimulatorDish` type is intentionally simple**: It takes pre-computed cost and ingredient data rather than querying the database. The caller (page or parent component) is responsible for fetching and shaping the data.

## Integration Points

The `MenuSimulatorPanel` component can be embedded in:

- The menu editor sidebar (alongside the cocktail browser panel pattern)
- A modal overlay from the menu detail page
- The menu engineering dashboard for cost optimization

The parent component provides `onApplySwap(removeDishId, addDish)` to handle the actual database mutation when the chef confirms.

## Tier

This is a **Pro** feature (menu engineering / optimization tools). Gating should be applied at the page level where the panel is rendered.

## 2026-03-20 21:35 UTC - 83% pass rate - Run e1e0a009

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-21 02:35 UTC - 0% pass rate - Run 197bbed6

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)
