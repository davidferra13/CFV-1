# Chef Archetypes — Persona-Based Navigation Presets

**Date:** 2026-02-24
**Feature:** Archetype system for chef portal navigation

## What This Does

When a chef first logs into ChefFlow, they're asked "What type of chef are you?" and shown 6 archetype cards. Selecting one applies a curated navigation preset — the right quick-access buttons, the right collapsible groups, and the right mobile tabs for their workflow.

**Nothing is locked out.** Every feature remains accessible. The archetype just sets smart defaults so the sidebar isn't overwhelming on day one.

## The 6 Archetypes

| Archetype       | Target User                   | Key Focus Areas                          |
| --------------- | ----------------------------- | ---------------------------------------- |
| Private Chef    | Solo, in-home dining          | Pipeline, Events, Clients, Culinary      |
| Caterer         | Event-based, runs a team      | Pipeline, Events, Staff, Tasks, Stations |
| Meal Prep Chef  | Weekly prep, subscriptions    | Pipeline, Tasks, Culinary, Clients       |
| Restaurant      | Fixed location, daily service | Staff, Tasks, Stations, Guests, Culinary |
| Food Truck      | Mobile, high-volume           | Tasks, Stations, Culinary, Travel        |
| Bakery / Pastry | Order-driven, production      | Pipeline, Tasks, Culinary, Clients       |

## How It Works

### Onboarding Flow

1. Chef logs in for the first time
2. Layout checks `chef_preferences.archetype` column
3. If NULL → shows full-screen archetype selector (instead of the normal portal)
4. Chef picks their type → `selectArchetype()` writes to `chef_preferences`:
   - `archetype` — the selected ID
   - `enabled_modules` — which nav groups to show
   - `primary_nav_hrefs` — which quick-access buttons to show
5. Page refreshes → normal portal loads with their curated nav

### Settings Access

- **Settings > Navigation** now has an "Archetype Picker" section at the top
- Chefs can switch archetypes anytime (immediately re-applies all presets)
- "Save Current Layout as My Default" — saves their custom setup
- "Restore My Saved Default" — gets back to their saved custom setup

### Admins

- Admins skip the archetype selector (they see everything)
- Admins can still use the Settings picker to test different layouts

## Data Model

### chef_preferences table (existing — 2 new columns)

| Column                   | Type             | Description                                       |
| ------------------------ | ---------------- | ------------------------------------------------- |
| `archetype`              | text (nullable)  | Selected archetype ID. NULL = not yet selected.   |
| `saved_custom_nav_hrefs` | jsonb (nullable) | Chef's saved custom nav layout (hrefs + modules). |

**Constraint:** `archetype` must be one of: `private-chef`, `caterer`, `meal-prep`, `restaurant`, `food-truck`, `bakery`

## Key Files

| What                   | Where                                                   |
| ---------------------- | ------------------------------------------------------- |
| Archetype definitions  | `lib/archetypes/presets.ts`                             |
| Server actions         | `lib/archetypes/actions.ts`                             |
| Onboarding selector UI | `components/onboarding/archetype-selector.tsx`          |
| Settings picker UI     | `components/settings/archetype-picker.tsx`              |
| Migration              | `supabase/migrations/20260306000010_chef_archetype.sql` |
| Layout gate            | `app/(chef)/layout.tsx` (archetype check)               |
| Settings page          | `app/(chef)/settings/navigation/page.tsx`               |

## What Each Archetype Controls

Each archetype sets three things:

1. **`enabledModules`** — which collapsible nav groups are visible
2. **`primaryNavHrefs`** — which quick-access buttons appear at the top
3. **`mobileTabHrefs`** — which 5 items appear in the mobile bottom bar (future use)

All three are saved to `chef_preferences` and take effect immediately via cache revalidation.
