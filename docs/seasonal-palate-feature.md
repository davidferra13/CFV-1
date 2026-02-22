# Seasonal Palate Sidebar — Feature Doc

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`

## What Changed

Added a **Seasonal Palate** sidebar to the calendar page that shows curated seasonal produce, herbs, seafood, and specialty items organized by category. The sidebar fills the negative space on the right side of the calendar on wider screens.

## Why

Private chefs plan menus around what's in season. Having seasonal produce visible right next to the calendar — where they're looking at upcoming events — makes it easy to plan menus with peak ingredients. No more switching to a separate reference.

## Files

| File                                              | Action   | Purpose                                                              |
| ------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `lib/calendar/seasonal-produce.ts`                | Created  | Static seasonal data (6 periods, ~25 items each) + utility functions |
| `components/calendar/seasonal-palate-sidebar.tsx` | Created  | Server component rendering the sidebar                               |
| `app/(chef)/calendar/page.tsx`                    | Modified | Widened layout from `max-w-3xl` to `max-w-7xl`, added 2-column grid  |

## How It Works

1. Calendar page parses `?year=X&month=Y` from URL (existing behavior)
2. `month` prop flows to `SeasonalPaleteSidebar` alongside `AvailabilityCalendarClient`
3. `getSeasonalProduceGrouped(month)` maps the month to one of 6 culinary seasons
4. Sidebar renders items grouped by category with peak/available distinction
5. Month navigation (prev/next arrows) triggers a Next.js soft nav — sidebar re-renders automatically

## Seasonal Periods

| Months  | Label        | Key Items                                                          |
| ------- | ------------ | ------------------------------------------------------------------ |
| Jan-Feb | Deep Winter  | Citrus, root veg, Dungeness crab, black truffles                   |
| Mar-Apr | Early Spring | Ramps, asparagus, morels, fiddleheads, soft-shell crab             |
| May-Jun | Late Spring  | Berries, cherries, artichokes, wild salmon, elderflower            |
| Jul-Aug | Peak Summer  | Tomatoes, stone fruit, corn, Hatch chiles, chanterelles, lobster   |
| Sep-Oct | Fall Harvest | Squash, apples, porcini, wild duck, venison                        |
| Nov-Dec | Late Fall    | Cranberries, persimmons, Dungeness crab, chestnuts, black truffles |

## Layout

- **`xl` (1280px+):** 2-column grid — calendar gets `1fr`, sidebar gets fixed `340px`
- **Below `xl`:** Sidebar hidden, calendar gets full width (same as before)
- Sidebar is `sticky top-8` with independent scroll (`max-h-[calc(100vh-12rem)]`)

## Design Details

- Peak items: brand-colored pills (`bg-brand-50 text-brand-700`) with dot indicator
- Available (non-peak) items: neutral stone pills
- Chef tips visible on hover via `title` attribute (e.g., "Hatch chiles — New Mexico harvest Aug-Sep")
- Categories: Fruits & Vegetables, Fresh Herbs, Seasonal Seafood & Game, Specialty & Foraged

## Tier

Free tier — part of the core calendar. No gating needed.

## Future Ideas

- Region-specific produce (Pacific NW vs Southeast vs Northeast)
- "Add to menu" or "Add to shopping list" actions per ingredient
- Remy integration — suggest seasonal recipes based on upcoming events
