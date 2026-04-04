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

## 2026-03-21 23:26 UTC - 0% pass rate - Run 05add9f6

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-03-24 21:10 UTC - 83% pass rate - Run e7adfcee

Passing: inquiry_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: client_parse (0%)

## 2026-03-25 03:00 UTC - 67% pass rate - Run 4201641f

Passing: allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%), client_parse (0%)

## 2026-03-25 08:20 UTC - 100% pass rate - Run b4952610

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: none - all modules passed

## 2026-03-25 14:22 UTC - 83% pass rate - Run 7ec42518

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-25 19:24 UTC - 80% pass rate - Run 3809616b

Passing: allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%), client_parse (0%)

## 2026-03-25 23:23 UTC - 100% pass rate - Run 15635867

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: none - all modules passed

## 2026-03-26 00:07 UTC - 80% pass rate - Run 3773e7ea

Passing: client_parse, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%), allergen_risk (0%)

## 2026-03-26 05:59 UTC - 83% pass rate - Run a2eb8752

Passing: inquiry_parse, client_parse, correspondence, menu_suggestions, quote_draft
Failing: allergen_risk (0%)

## 2026-03-26 12:00 UTC - 83% pass rate - Run da303dce

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-26 15:36 UTC - 83% pass rate - Run 349520a8

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-26 16:20 UTC - 83% pass rate - Run 96b991f7

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-26 17:26 UTC - 83% pass rate - Run 046f6b8d

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-26 17:52 UTC - 83% pass rate - Run b7ac5fa6

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-26 18:13 UTC - 83% pass rate - Run 8ae90a6c

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-26 18:43 UTC - 83% pass rate - Run 2c0100be

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-27 19:52 UTC - 100% pass rate - Run 1475975b

Passing: client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%)

## 2026-03-28 06:41 UTC - 100% pass rate - Run ae1b1bc0

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: none - all modules passed

## 2026-03-28 06:42 UTC - 100% pass rate - Run e2693145

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: none - all modules passed

## 2026-03-28 06:56 UTC - 100% pass rate - Run 2dbd046a

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: none - all modules passed

## 2026-03-30 01:32 UTC - 80% pass rate - Run 5250dcab

Passing: allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%), client_parse (0%)

## 2026-03-31 00:37 UTC - 100% pass rate - Run 582392fc

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: none - all modules passed

## 2026-03-31 16:16 UTC - 100% pass rate - Run 6fda7987

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: none - all modules passed

## 2026-04-03 21:49 UTC - 80% pass rate - Run 49c31bb0

Passing: allergen_risk, correspondence, menu_suggestions, quote_draft
Failing: inquiry_parse (0%), client_parse (0%)
