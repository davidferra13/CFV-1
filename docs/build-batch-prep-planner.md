# Batch Prep Planner (#48)

Built: 2026-03-12

## What It Does

Cross-event component overlap detection. When a chef has multiple events in a date range, the system finds shared recipe components (same recipe or same component name) and highlights batch opportunities: prep once, split across events, save time.

Two views:

1. **Batch Opportunities** - Cards showing each shared component, which events use it, quantity totals, and estimated time saved by batching
2. **Prep Schedule** - Day-by-day Gantt-style view with prep/cook time bars, suggested prep days based on make-ahead windows

## Architecture

### Engine (`lib/culinary/batch-prep-engine.ts`)

Two main functions, both server actions with `requireChef()`:

- `findBatchOpportunities(startDate, endDate)` - Queries events -> menus -> dishes -> components. Groups by `recipe_id` or normalized component name. Returns opportunities where same component appears in 2+ events.
- `generateUnifiedPrepSchedule(startDate, endDate)` - Uses batch detection to build day-by-day prep schedule. Suggests prep day: make-ahead window before earliest event, or 1 day before.

### Grouping Logic

Components are grouped by:

1. `recipe:${recipe_id}` if the component has a linked recipe
2. `name:${normalized_name}` (lowercase, trimmed) if no recipe link

This catches both explicit recipe sharing and implicit name matching (e.g., two menus both have a "Chicken Stock" component).

### Time Savings Formula

`estimatedTimeSavedMinutes = (N-1) * prepMinutes`

The idea: prep once for N events instead of N separate preps. Cook time isn't saved (still need to cook the batch), but prep time is.

### Suggested Prep Day

- If make-ahead with a window: earliest event date minus window hours (capped at 72h)
- Otherwise: 1 day before earliest event

## Files

| File                                                              | Purpose                                            |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| `lib/culinary/batch-prep-engine.ts`                               | Detection engine + types                           |
| `app/(chef)/culinary/prep/batch-planner/page.tsx`                 | Server page, fetches data                          |
| `app/(chef)/culinary/prep/batch-planner/batch-planner-client.tsx` | Client UI with date range, opportunities, schedule |
| `components/navigation/nav-config.tsx`                            | Added nav link under Prep Workspace                |

## UI

- Date range picker with presets (7d, 14d, 21d, 30d) and custom dates
- Summary cards: events analyzed, batch opportunities, time saved, make-ahead count
- Toggle between Opportunities view and Schedule view
- Opportunities expand to show per-event details (occasion, date, guest count, quantity)
- Schedule shows color-coded prep/cook bars per task, batched/make-ahead badges

## No Migration Needed

Uses existing tables: events, menus, dishes, components, recipes. Pure read-only analysis.
