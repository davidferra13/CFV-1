# Seasonal Palette Simplification

**Date:** 2026-02-17

## What Changed

The seasonal palette feature was over-engineered with pretentious naming and unnecessary complexity. This update strips it back to what a private chef actually needs: a quick reference for what's available each season.

## Problems Fixed

1. **Editable season name** — removed. The 4 seasons (Winter, Spring, Summer, Autumn) are fixed. No reason to ask a chef to type "Winter."
2. **Editable date ranges** — removed from the form. The default date ranges are locked per season.
3. **Custom season creation** — removed. Just the 4 standard seasons.
4. **"Sensory Anchor" / "The Vibe"** — renamed to **Season Notes**. Plain English.
5. **"Micro-Windows"** — renamed to **Seasonal Ingredients**. Each ingredient simplified: removed the redundant "name" field (was separate from "ingredient") and removed the "urgency" dropdown.
6. **"Proven Wins" / "Break-glass-in-case-of-emergency dishes"** — renamed to **Go-To Dishes**.
7. **No opt-out** — added a "Turn Off" button on the list page and made `getActivePalette()` purely opt-in (no auto-detection from date ranges). Chef must explicitly set a season as active.

## Files Changed

| File | Change |
|---|---|
| `lib/seasonal/types.ts` | Made `name` and `urgency` optional on `MicroWindow` for backward compatibility |
| `lib/seasonal/actions.ts` | Added `deactivateAllSeasons()`, removed auto-detect from `getActivePalette()`, relaxed validation for simplified fields |
| `components/settings/seasonal-palette-form.tsx` | Removed season name/date/active inputs, renamed all sections, simplified ingredient entry |
| `components/settings/seasonal-palette-list.tsx` | Removed custom season creation, added opt-in/opt-out status bar with "Turn Off" button, cleaned up labels |
| `components/seasonal/seasonal-banner.tsx` | Removed "The Vibe:" label, removed urgency-based red styling, uses `ingredient` for dedup |
| `components/seasonal/seasonal-sidebar.tsx` | Renamed "Peak Ingredients" → "What's In Season", "Best Dishes" → "Go-To Dishes", cleaned up empty states |
| `app/(chef)/settings/repertoire/page.tsx` | Updated page description to plain English |
| `app/(chef)/settings/repertoire/[id]/page.tsx` | Updated page description to plain English |

## Before → After Labels

| Before | After |
|---|---|
| Sensory Anchor | Season Notes |
| The Vibe | *(removed — just shows the notes)* |
| Micro-Windows | Seasonal Ingredients |
| Peak Ingredients | What's In Season |
| Proven Wins | Go-To Dishes |
| Best Dishes | Go-To Dishes |
| "Break-glass-in-case-of-emergency dishes" | "Reliable dishes that work great in [season]" |
| "Define your creative thesis for each season" | "Keep track of what's available each season so you can plan menus without guessing" |
| "Define the culinary and operational reality" | "Add your notes, seasonal ingredients, and go-to dishes" |

## Opt-In / Opt-Out

- **To enable:** Click "Set Active" on any season card
- **To disable:** Click "Turn Off" on the status bar at the top of the list page
- When disabled, no seasonal info appears on Calendar or Recipes pages
- `getActivePalette()` now only returns a palette with an explicit `is_active=true` flag — no auto-detection from date ranges

## Backward Compatibility

- Database schema unchanged — no migration needed
- Old data with `name` and `urgency` fields on ingredients still works (fields made optional in TypeScript)
- The `sensory_anchor` database column stores what the UI now calls "Season Notes"
- The `micro_windows` database column stores what the UI now calls "Seasonal Ingredients"
- The `proven_wins` database column stores what the UI now calls "Go-To Dishes"

## Purpose Reminder

The seasonal palette exists so that when you're slammed with summer dinners and suddenly get an inquiry for a winter dinner party, you can pull up your Winter palette and immediately see what's available instead of closing your eyes and trying to remember. That's it.
