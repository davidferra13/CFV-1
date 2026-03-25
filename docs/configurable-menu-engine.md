# Configurable Menu Engine

**Date:** 2026-03-19
**Branch:** feature/external-directory

## Problem

Not all operators need every menu intelligence feature. A restaurant that doesn't prioritize seasonality finds seasonal ingredient warnings irrelevant and distracting. Forcing all features on every user creates unnecessary friction.

## Solution

A per-operator toggle system stored in `chef_preferences.menu_engine_features` (JSONB column) that allows each chef to selectively enable or disable intelligence features in the menu editor sidebar.

### Feature Keys

| Key                   | Feature                      | Default |
| --------------------- | ---------------------------- | ------- |
| `seasonal_warnings`   | Seasonal ingredient warnings | Enabled |
| `prep_estimate`       | Prep time estimate           | Enabled |
| `client_taste`        | Client taste profile         | Enabled |
| `menu_history`        | Menu performance history     | Enabled |
| `vendor_hints`        | Vendor best-price hints      | Enabled |
| `allergen_validation` | Allergen conflict validation | Enabled |
| `stock_alerts`        | Ingredient stock alerts      | Enabled |
| `scale_mismatch`      | Guest count scale mismatch   | Enabled |
| `inquiry_link`        | Inquiry cross-reference      | Enabled |

All features default to **enabled**. Operators opt _out_ of features they don't need.

### How It Works

1. **Settings page** at `/settings/menu-engine` shows all 9 features with toggle switches, labels, and descriptions.
2. **Saving** calls `updateChefPreferences({ menu_engine_features: {...} })` which merges partial updates with existing values.
3. **Menu detail page** calls `getMenuEngineFeatures()` (lightweight, fetches only the JSONB column) and passes the config to both sidebars.
4. **MenuContextSidebar** skips both the server action call AND the render for disabled features. Zero wasted queries.
5. **MenuCostSidebar** respects `vendor_hints` toggle specifically.

### Core Context (Always Shown)

These sections are always displayed regardless of feature toggles because they're either core safety data or fundamental context:

- Season + guest tier badges
- Client dietary info (allergies, restrictions)
- Previously served menus
- Matching templates

## Files Changed

| File                                                          | Change                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `database/migrations/20260401000085_menu_engine_features.sql` | Adds `menu_engine_features` JSONB column with defaults                          |
| `lib/scheduling/types.ts`                                     | `MenuEngineFeatures` interface, `DEFAULT_MENU_ENGINE_FEATURES`, feature labels  |
| `lib/chef/actions.ts`                                         | Zod schema, `getMenuEngineFeatures()`, merge logic in `updateChefPreferences()` |
| `components/settings/menu-engine-form.tsx`                    | Toggle form with enable/disable all, per-feature switches                       |
| `app/(chef)/settings/menu-engine/page.tsx`                    | Settings page                                                                   |
| `app/(chef)/settings/page.tsx`                                | Added "Menu Intelligence" link in Business Defaults section                     |
| `components/culinary/menu-context-sidebar.tsx`                | Accepts `features` prop, conditional fetch and render                           |
| `components/culinary/menu-cost-sidebar.tsx`                   | Accepts `vendorHintsEnabled` prop                                               |
| `app/(chef)/culinary/menus/[id]/page.tsx`                     | Fetches engine features, passes to both sidebars                                |

## Architecture Notes

- JSONB column with all-true default: new operators get full intelligence out of the box
- Partial update support: sending `{ seasonal_warnings: false }` only changes that key, preserving all others
- `getMenuEngineFeatures()` is a lightweight dedicated action (fetches one column) rather than loading full preferences
- Disabled features skip the server action call entirely, not just the render. This saves network and DB round-trips.
- The `features` prop defaults to all-enabled, so existing code that doesn't pass features works unchanged.
