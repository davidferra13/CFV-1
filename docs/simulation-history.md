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

## 2026-04-06 03:27 UTC - 50% pass rate - Run 8aaad6ae

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-06 03:46 UTC - 50% pass rate - Run 19f1da35

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-06 04:21 UTC - 50% pass rate - Run 624bfd14

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-09 02:10 UTC - 50% pass rate - Run 85c92266

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-09 02:58 UTC - 50% pass rate - Run 40f7ba85

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-09 04:12 UTC - 50% pass rate - Run 05393b93

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-09 08:11 UTC - 50% pass rate - Run d54ea431

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-10 23:23 UTC - 50% pass rate - Run f2b9a4ff

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-11 03:49 UTC - 50% pass rate - Run 472682d9

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-11 11:28 UTC - 50% pass rate - Run df381a55

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-12 00:31 UTC - 50% pass rate - Run c79680a8

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-12 04:08 UTC - 50% pass rate - Run 64b3070c

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-12 04:11 UTC - 50% pass rate - Run c197b9f4

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-12 06:34 UTC - 50% pass rate - Run 252ec5e9

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-15 03:13 UTC - 50% pass rate - Run 1a408bd6

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-15 03:13 UTC - 50% pass rate - Run 3e316547

Passing: inquiry_parse, correspondence, quote_draft
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%)

## 2026-04-15 09:11 UTC - 40% pass rate - Run e77d7a44

Passing: inquiry_parse, correspondence
Failing: client_parse (0%), allergen_risk (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-15 09:11 UTC - 67% pass rate - Run 108733c5

Passing: inquiry_parse, client_parse, correspondence, quote_draft
Failing: allergen_risk (0%), menu_suggestions (0%)

## 2026-04-15 17:34 UTC - 67% pass rate - Run 771b4a9d

Passing: inquiry_parse, allergen_risk, correspondence, quote_draft
Failing: client_parse (0%), menu_suggestions (0%)

## 2026-04-16 03:26 UTC - 67% pass rate - Run 363b59bb

Passing: inquiry_parse, allergen_risk, correspondence, quote_draft
Failing: client_parse (0%), menu_suggestions (0%)

## 2026-04-16 03:28 UTC - 67% pass rate - Run 0e770ae9

Passing: inquiry_parse, allergen_risk, correspondence, quote_draft
Failing: client_parse (0%), menu_suggestions (0%)

## 2026-04-17 05:11 UTC - 67% pass rate - Run 9feda363

Passing: inquiry_parse, allergen_risk, correspondence, quote_draft
Failing: client_parse (0%), menu_suggestions (0%)

## 2026-04-17 08:11 UTC - 83% pass rate - Run c7e054b1

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, quote_draft
Failing: menu_suggestions (0%)

## 2026-04-18 04:31 UTC - 67% pass rate - Run d9ab7c18

Passing: inquiry_parse, allergen_risk, correspondence, quote_draft
Failing: client_parse (0%), menu_suggestions (0%)

## 2026-04-18 05:00 UTC - 83% pass rate - Run cc4920ef

Passing: inquiry_parse, client_parse, allergen_risk, correspondence, quote_draft
Failing: menu_suggestions (0%)

## 2026-04-19 00:24 UTC - 0% pass rate - Run 1005bcf8

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 01:56 UTC - 0% pass rate - Run 292558f4

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 02:01 UTC - 0% pass rate - Run 1406bc2a

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 02:21 UTC - 0% pass rate - Run d3ff5b59

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 02:50 UTC - 0% pass rate - Run f0f3affb

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 02:50 UTC - 0% pass rate - Run 24b7f56c

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 04:49 UTC - 0% pass rate - Run 4113e445

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 05:04 UTC - 0% pass rate - Run 7d38d809

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 05:30 UTC - 0% pass rate - Run 28695a9b

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 05:30 UTC - 0% pass rate - Run f0d46ec0

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 14:53 UTC - 0% pass rate - Run 4b805e42

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 15:09 UTC - 0% pass rate - Run eb7fc0e0

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 15:10 UTC - 0% pass rate - Run c4a5364b

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 20:52 UTC - 0% pass rate - Run c19c60e7

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 20:56 UTC - 0% pass rate - Run 69715ac8

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 21:09 UTC - 0% pass rate - Run 28e3b02c

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 21:10 UTC - 0% pass rate - Run 2eb36d13

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 21:55 UTC - 0% pass rate - Run bd7121c2

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 21:56 UTC - 0% pass rate - Run e896321d

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 23:00 UTC - 0% pass rate - Run cfc34e1e

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-19 23:01 UTC - 0% pass rate - Run de2a11d0

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-20 03:55 UTC - 0% pass rate - Run bd22b02e

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-20 03:57 UTC - 0% pass rate - Run 01dce572

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-20 22:42 UTC - 0% pass rate - Run 4f71cdbe

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-20 23:02 UTC - 0% pass rate - Run b2118d4c

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-20 23:03 UTC - 0% pass rate - Run 876c3d33

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 01:20 UTC - 0% pass rate - Run 32453eb0

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 01:20 UTC - 0% pass rate - Run 481cb88f

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 01:47 UTC - 0% pass rate - Run 24d51d58

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 01:49 UTC - 0% pass rate - Run 1e15dd4e

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 01:49 UTC - 0% pass rate - Run 5666e2ef

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 01:50 UTC - 0% pass rate - Run c8c01b42

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 01:59 UTC - 0% pass rate - Run 0839cfce

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 02:01 UTC - 0% pass rate - Run 19e3f478

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 02:10 UTC - 0% pass rate - Run bb83d145

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 08:01 UTC - 0% pass rate - Run 93e439c9

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-21 14:19 UTC - 0% pass rate - Run 7e689d64

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-22 06:55 UTC - 0% pass rate - Run fe7a6307

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-22 06:55 UTC - 0% pass rate - Run 48ad25b7

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-22 16:01 UTC - 0% pass rate - Run b9bbe8b1

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-22 16:02 UTC - 0% pass rate - Run 01c96793

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-22 21:31 UTC - 0% pass rate - Run b7ba5e61

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-22 21:32 UTC - 0% pass rate - Run 9d072c79

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 01:38 UTC - 0% pass rate - Run 6a1b22a1

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 01:39 UTC - 0% pass rate - Run e4accac8

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 01:47 UTC - 0% pass rate - Run 3ec00e18

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 01:48 UTC - 0% pass rate - Run e69c66a1

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 02:34 UTC - 0% pass rate - Run 31de037e

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 02:34 UTC - 0% pass rate - Run be8b679c

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 03:31 UTC - 0% pass rate - Run 41a672a3

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 03:32 UTC - 0% pass rate - Run 95d3d62d

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-23 15:48 UTC - 0% pass rate - Run f9c9fc62

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-24 19:28 UTC - 0% pass rate - Run 374aa828

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-24 19:28 UTC - 0% pass rate - Run 6e91f255

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-24 22:22 UTC - 0% pass rate - Run ed92baba

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-24 22:22 UTC - 0% pass rate - Run c7051887

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 05:33 UTC - 0% pass rate - Run 502a3731

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 05:33 UTC - 0% pass rate - Run 797dc7b5

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 07:36 UTC - 0% pass rate - Run 8f5dbbf8

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 07:36 UTC - 0% pass rate - Run e09cad7b

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 09:31 UTC - 0% pass rate - Run 8f3fd0da

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 09:32 UTC - 0% pass rate - Run 2d1daf94

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 10:43 UTC - 0% pass rate - Run 606e1dc4

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 10:43 UTC - 0% pass rate - Run b1b38633

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 16:44 UTC - 0% pass rate - Run e7345402

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-04-25 16:45 UTC - 0% pass rate - Run cc2d4977

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 18:27 UTC - 0% pass rate - Run 1cecb134

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 18:27 UTC - 0% pass rate - Run 79491739

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 18:27 UTC - 0% pass rate - Run aba14f4d

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 18:27 UTC - 0% pass rate - Run e8d73f61

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 19:27 UTC - 0% pass rate - Run 3c606b26

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 19:28 UTC - 0% pass rate - Run a261929d

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 19:51 UTC - 0% pass rate - Run 56e42077

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 19:51 UTC - 0% pass rate - Run 1d6ddf17

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 21:08 UTC - 0% pass rate - Run ecf74278

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 21:09 UTC - 0% pass rate - Run bcfbb9c3

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 21:27 UTC - 0% pass rate - Run ec06f25b

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 21:27 UTC - 0% pass rate - Run eeff0d1a

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 21:48 UTC - 0% pass rate - Run fa6534d6

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-01 21:48 UTC - 0% pass rate - Run ed399f00

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-02 15:08 UTC - 0% pass rate - Run 513725a9

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-02 15:09 UTC - 0% pass rate - Run f742b31f

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-02 15:24 UTC - 0% pass rate - Run 4f42f967

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)

## 2026-05-02 15:24 UTC - 0% pass rate - Run 3a88530e

Passing: none
Failing: inquiry_parse (0%), client_parse (0%), allergen_risk (0%), correspondence (0%), menu_suggestions (0%), quote_draft (0%)
