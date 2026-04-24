# BUILD: Residency Chef Suite (Weekly Meal Board + Household Profiles)

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 private chef operations platform. Read `CLAUDE.md` before doing anything.

## Problem

ChefFlow handles one-off events well but has ZERO support for the residency chef model: a chef who works for a family 3-5 days/week, cooking multiple meals daily. Six verified specs exist for this but none are built. This prompt covers the two foundational pieces everything else depends on.

## What to Build

### Part A: Household Profiles

A residency chef needs to track dietary restrictions and allergies per individual household member (not just per client/event).

1. **Read the spec:** `docs/specs/household-profiles.md` (if it exists, read it fully)
2. **Schema:** household_members table linked to client_id
   - Fields: name, relationship (spouse, child, etc.), dietary_restrictions (JSONB array), allergies (JSONB array), age_group (adult/child/infant), notes
   - Follow existing migration patterns
3. **UI:** Add "Household" tab or section to the client detail page (`app/(chef)/clients/[id]/`)
   - Add/edit/remove household members
   - Each member shows dietary tags as badges
   - Summary view: "2 adults, 1 child. Allergies: tree nuts (Sarah), dairy (Max)"
4. **Integration:** When generating menus or shopping lists for events with this client, surface household dietary constraints as warnings/filters

### Part B: Weekly Meal Board

A persistent weekly calendar showing what the chef is cooking for a residency client.

1. **Read the spec:** `docs/specs/weekly-meal-board.md` (if it exists, read it fully)
2. **Schema:** weekly_meal_slots table
   - Fields: chef_id, client_id, week_start (date), day_of_week (0-6), meal_type (breakfast/lunch/dinner/snack), recipe_id (nullable), dish_name (text), notes, status (planned/cooked/skipped)
   - Follow existing migration patterns
3. **UI Route:** `/events/residency/[clientId]` or integrate into Dinner Circle view
   - Weekly calendar grid: 7 columns (days) x 3-4 rows (meal types)
   - Click cell to assign a recipe from chef's recipe book or type a dish name
   - Color coding: planned (blue), cooked (green), skipped (gray)
   - Week navigation: previous/next week arrows
   - "Copy week" button to duplicate a week's plan to the next week
4. **Household Integration:** Show household member dietary restrictions as a persistent banner above the meal board. Flag meals that conflict with household allergies.
5. **Shopping List Generation:** "Generate shopping list for this week" button that aggregates all planned meals' ingredients

### DO NOT BUILD (separate prompts later):

- Meal feedback (thumbs up/down)
- Ad-hoc schedule changes
- Weekly template cloning
- Curated viewer experience
  These depend on Part A and B being built first.

## Key Files to Read First

- `CLAUDE.md` (mandatory)
- `docs/specs/household-profiles.md` (if exists)
- `docs/specs/weekly-meal-board.md` (if exists)
- `app/(chef)/clients/[id]/` - client detail page (add household tab here)
- `database/schema/` - existing schema patterns
- `database/migrations/` - migration patterns, latest timestamp
- `components/hub/` - Dinner Circle components (potential integration point)
- `lib/documents/generate-grocery-list.ts` - shopping list generation patterns

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- Show migration SQL and get approval before creating files
- All monetary amounts in cents
- Tenant scoping on every query
- Test with Playwright / screenshots
- Allergies are SAFETY-CRITICAL - never silently drop allergy data
- Follow existing UI component patterns (read siblings first)
