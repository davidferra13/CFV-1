# Menu Engine: Comprehensive Technical Report

**Date:** 2026-03-19
**Branch:** feature/external-directory
**Scope:** Full architecture review, data flow analysis, security audit, performance profile, edge case catalog, and extensibility guide.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Purpose and Problem Statement](#2-purpose-and-problem-statement)
3. [Architecture Overview](#3-architecture-overview)
4. [Configuration System](#4-configuration-system)
5. [Feature Inventory](#5-feature-inventory-all-9-configurable-features)
6. [Data Flow Architecture](#6-data-flow-architecture)
7. [Database Schema Map](#7-database-schema-map)
8. [Upstream Data Sources](#8-upstream-data-sources)
9. [Performance Profile](#9-performance-profile)
10. [Feature Interdependencies](#10-feature-interdependencies)
11. [Security and Tenant Scoping Audit](#11-security-and-tenant-scoping-audit)
12. [Edge Case Catalog](#12-edge-case-catalog)
13. [Error Handling and Failure Isolation](#13-error-handling-and-failure-isolation)
14. [UI Rendering Pipeline](#14-ui-rendering-pipeline)
15. [Extensibility Guide](#15-extensibility-guide-adding-a-10th-feature)
16. [Non-Configurable Core Context](#16-non-configurable-core-context)
17. [File Inventory](#17-file-inventory)
18. [Known Limitations and Future Considerations](#18-known-limitations-and-future-considerations)

---

## 1. Executive Summary

The menu engine is ChefFlow's deterministic intelligence layer for the menu editor. It cross-references a menu under construction against 8 data domains (inventory, allergens, seasonality, prep history, vendor pricing, client preferences, menu performance, and event context) and surfaces actionable insights inline in the editor sidebar.

Key properties:

- **21 server actions** in `menu-intelligence-actions.ts`, all tenant-scoped via `requireChef()`
- **9 configurable features** toggled per-operator via a JSONB column on `chef_preferences`
- **Zero AI calls** (Formula > AI principle). Every computation is deterministic.
- **Parallel execution**. All sidebar data loads via `Promise.all` with per-feature gating.
- **Failure isolation**. Every feature-specific fetch has a `.catch()` fallback. One failing feature never breaks the sidebar.
- **Zero wasted queries**. Disabled features resolve to `Promise.resolve(null)` instead of calling the server.

---

## 2. Purpose and Problem Statement

### The Problem

ChefFlow had deep intelligence layers across multiple standalone pages:

- Seasonal produce data on the calendar page
- Prep time estimation on the analytics page
- Vendor pricing on the vendor management page
- Client preferences on the client detail page
- Event financial data on the event detail page

Chefs had to navigate away from the menu they were building to access any of this. Context-switching during menu construction broke flow, slowed decisions, and caused oversights (missed allergens, out-of-season ingredients, suboptimal vendor choices).

### The Solution

Surface all relevant intelligence into the menu editor sidebar, resolved through the menu's relationship chain (menu -> event -> client). Each data point is computed at load time, presented inline, and requires zero navigation away from the editor.

### Why Configurable

Not every operator needs every feature. A restaurant with fixed supply chains finds seasonal warnings irrelevant. A solo chef without inventory tracking gets nothing from stock alerts. The configurable system lets each operator disable irrelevant features, reducing both visual noise and server load.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ /settings/menu-engine (Settings Page)                           │
│   MenuEngineForm → updateChefPreferences()                      │
│   Saves to: chef_preferences.menu_engine_features (JSONB)       │
└─────────────────────────┬───────────────────────────────────────┘
                          │ reads
┌─────────────────────────▼───────────────────────────────────────┐
│ /culinary/menus/[id] (Menu Detail Page - Server Component)      │
│   Parallel fetch: getMenuById() + getMenuEngineFeatures()       │
│   Passes features to both sidebar components                    │
└────────┬────────────────────────────────────┬───────────────────┘
         │                                    │
┌────────▼──────────────┐   ┌────────────────▼────────────────────┐
│ MenuCostSidebar       │   │ MenuContextSidebar                  │
│ (Client Component)    │   │ (Client Component)                  │
│                       │   │                                     │
│ Always loads:         │   │ Always loads:                       │
│  - checkMenuMargins   │   │  - getMenuContextData (core)        │
│                       │   │                                     │
│ Conditional:          │   │ Conditional (8 features):           │
│  - vendor_hints       │   │  - stock_alerts                     │
│    → getMenuVendor    │   │  - allergen_validation              │
│      Hints            │   │  - scale_mismatch                   │
│                       │   │  - inquiry_link                     │
│                       │   │  - seasonal_warnings                │
│                       │   │  - menu_history                     │
│                       │   │  - client_taste                     │
│                       │   │  - prep_estimate                    │
└───────────────────────┘   └─────────────────────────────────────┘
```

### Layers

| Layer              | Role                                            | Files                                                                   |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| **Persistence**    | JSONB column on `chef_preferences`              | Migration `20260401000085`                                              |
| **Type System**    | Interface, keys, labels, defaults               | `lib/scheduling/types.ts`                                               |
| **Server Actions** | Read/write preferences, 10 intelligence actions | `lib/chef/actions.ts`, `lib/menus/menu-intelligence-actions.ts`         |
| **Settings UI**    | Toggle form with save                           | `components/settings/menu-engine-form.tsx`                              |
| **Sidebar UI**     | Conditional fetch + conditional render          | `components/culinary/menu-context-sidebar.tsx`, `menu-cost-sidebar.tsx` |
| **Page Wiring**    | Fetches features, passes as props               | `app/(chef)/culinary/menus/[id]/page.tsx`                               |

---

## 4. Configuration System

### Storage

`chef_preferences.menu_engine_features` is a JSONB column with a default value of all features enabled:

```json
{
  "seasonal_warnings": true,
  "prep_estimate": true,
  "client_taste": true,
  "menu_history": true,
  "vendor_hints": true,
  "allergen_validation": true,
  "stock_alerts": true,
  "scale_mismatch": true,
  "inquiry_link": true
}
```

### Partial Update Support

The Zod schema uses `.partial()`, allowing the client to send a subset:

```typescript
{
  menu_engine_features: {
    seasonal_warnings: false
  }
}
```

The server merges this with existing values:

```typescript
const current = getMenuEngineFeaturesFromUnknown(existing.menu_engine_features)
payload.menu_engine_features = { ...current, ...validated.menu_engine_features }
```

This means toggling one feature never resets the others.

### Type-Safe Normalization

`getMenuEngineFeaturesFromUnknown()` handles database JSON safely:

- Returns all-true defaults if value is null/undefined
- Iterates only known keys from `MENU_ENGINE_FEATURE_KEYS`
- Only assigns values that are strictly `boolean`
- Ignores unknown properties (forward-compatible with future schema changes)

### Lightweight Fetch

`getMenuEngineFeatures()` selects only the `menu_engine_features` column rather than loading the full preferences row. This keeps the menu detail page fast.

---

## 5. Feature Inventory (All 9 Configurable Features)

### 5.1 Seasonal Ingredient Warnings (`seasonal_warnings`)

| Aspect             | Detail                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Server Action**  | `getMenuSeasonalWarnings(menuId)`                                                                            |
| **Data Source**    | `lib/calendar/seasonal-produce.ts` (static, ~300 items, 6 seasons)                                           |
| **Chain**          | menu -> event (for event_date) -> dishes -> components -> recipe_ingredients -> ingredients                  |
| **Logic**          | Extracts event month, maps all seasonal items to valid months, flags menu ingredients that are out of season |
| **Dynamic Import** | Yes (`getSeasonalProduceGrouped` loaded at call time)                                                        |
| **Output**         | `SeasonalIngredientWarning[]` (ingredientName, dishName, eventMonth, seasonLabel, note)                      |
| **Rendering**      | Amber alert section with per-ingredient warnings                                                             |
| **Null When**      | No event, no event_date, no dishes, no ingredient matches                                                    |

### 5.2 Prep Time Estimate (`prep_estimate`)

| Aspect             | Detail                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------- |
| **Server Action**  | `getMenuPrepEstimate(menuId)`                                                               |
| **Upstream**       | `lib/intelligence/prep-time-estimator.ts` (`estimatePrepTime()`)                            |
| **Chain**          | menu -> event (for guest_count, occasion) -> estimatePrepTime()                             |
| **Logic**          | Finds similar completed events (+-30% guest count, matching occasion), applies sqrt scaling |
| **Dynamic Import** | Yes (`estimatePrepTime` loaded at call time)                                                |
| **Output**         | `MenuPrepEstimate` (totalMinutes, prepMinutes, serviceMinutes, confidence, basedOnEvents)   |
| **Confidence**     | high: 10+ events, medium: 5-9, low: 3-4                                                     |
| **Rendering**      | Hours display with prep/service breakdown and confidence badge                              |
| **Null When**      | No event, guest count < 1, fewer than 3 similar events                                      |

### 5.3 Client Taste Profile (`client_taste`)

| Aspect            | Detail                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Server Action** | `getMenuClientTaste(menuId)`                                                                                                         |
| **Tables**        | `client_preferences`, `clients`, `events`                                                                                            |
| **Chain**         | menu -> event -> client -> client_preferences (ordered by observed_at DESC)                                                          |
| **Logic**         | Categorizes preferences by rating (loved/liked -> loved[], disliked -> disliked[]), extracts cuisine preferences, counts past events |
| **Output**        | `MenuClientTasteSummary` (clientName, loved[], disliked[], cuisinePreferences[], pastEventCount)                                     |
| **Limits**        | 8 items max per category                                                                                                             |
| **Rendering**     | Client name header, cuisine badges, loved (emerald) and avoid (red) item badges                                                      |
| **Null When**     | No event, no client, no preferences recorded                                                                                         |

### 5.4 Menu Performance History (`menu_history`)

| Aspect            | Detail                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Server Action** | `getMenuPerformance(menuId)`                                                                                             |
| **Tables/Views**  | `events`, `clients`, `event_financial_summary`, `menu_cost_summary`                                                      |
| **Chain**         | menu -> events (completed/confirmed/paid/in_progress) -> event_financial_summary                                         |
| **Logic**         | Counts events using this menu, computes average margin from financial summary view, finds last usage                     |
| **Output**        | `MenuPerformanceHistory` (timesUsed, lastUsedDate, lastUsedClient, lastUsedEventId, avgMarginPercent, totalRevenueCents) |
| **Margin Calc**   | `((totalRevenue - totalCost) / totalRevenue) * 100`                                                                      |
| **Rendering**     | Times used count, margin percentage (color-coded), last used date/client, link to last event                             |
| **Null When**     | No events with qualifying status use this menu                                                                           |

### 5.5 Vendor Best-Price Hints (`vendor_hints`)

| Aspect            | Detail                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server Action** | `getMenuVendorHints(menuId)`                                                                                                                 |
| **Tables**        | `dishes`, `components`, `recipe_ingredients`, `ingredients`, `vendor_price_points`, `vendors`                                                |
| **Chain**         | menu -> dishes -> components -> recipe_ingredients -> ingredients; parallel: vendor_price_points (is_active=true, sorted by price_cents ASC) |
| **Logic**         | Compares each ingredient's `last_price_cents` against cheapest active vendor price point. Only surfaces when savings > 5%.                   |
| **Output**        | `MenuVendorHint[]` (top 10 by savingsCents, sorted descending)                                                                               |
| **Rendering**     | In MenuCostSidebar (not context sidebar). Shows ingredient name, savings %, vendor name, price comparison.                                   |
| **Empty When**    | No ingredients with prices, no vendor price points, no savings > 5%                                                                          |

### 5.6 Allergen Conflict Validation (`allergen_validation`)

| Aspect             | Detail                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Server Action**  | `validateMenuAllergens(menuId)`                                                                                                                                                            |
| **Tables**         | `menus`, `events`, `clients`, `dishes`, `components`, `recipe_ingredients`, `ingredients`                                                                                                  |
| **Dynamic Import** | `ALLERGEN_INGREDIENT_MAP` from `lib/menus/allergen-check`                                                                                                                                  |
| **Chain**          | menu -> event -> client (allergies + dietary_restrictions); menu -> dishes -> components -> recipe_ingredients -> ingredients                                                              |
| **Logic**          | Normalizes allergens to snake_case, matches against trigger ingredient names via ALLERGEN_INGREDIENT_MAP. Severity: critical for peanut/tree_nut/shellfish/fish/sesame; warning otherwise. |
| **Output**         | `{ warnings: MenuAllergenWarning[], clientName, allergies, restrictions }`                                                                                                                 |
| **Rendering**      | Red alert section with per-ingredient/per-allergen warnings, severity badges                                                                                                               |
| **Null When**      | No event, no client, no allergies/restrictions on client                                                                                                                                   |

### 5.7 Ingredient Stock Alerts (`stock_alerts`)

| Aspect            | Detail                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Server Action** | `getMenuIngredientStock(menuId)`                                                                                                                 |
| **Tables**        | `dishes`, `components`, `recipe_ingredients`, `ingredients`, `pantry_items`                                                                      |
| **Chain**         | menu -> dishes -> components (with recipes) -> recipe_ingredients -> ingredients; parallel: pantry_items                                         |
| **Logic**         | Aggregates needed quantities per ingredient from recipe_ingredients. Checks against pantry_items on_hand. Status: out (<=0), low (< needed), ok. |
| **Output**        | `MenuIngredientStock[]` sorted by status (out first, then low, then ok)                                                                          |
| **Rendering**     | Stock alerts section with needed vs. on-hand quantities, OUT/LOW badges, link to inventory                                                       |
| **Empty When**    | No dishes, no recipe-linked components, no pantry data                                                                                           |

### 5.8 Guest Count Scale Mismatch (`scale_mismatch`)

| Aspect            | Detail                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **Server Action** | `checkMenuScaleMismatch(menuId)`                                                                 |
| **Tables**        | `menus`, `events`                                                                                |
| **Chain**         | menu -> event                                                                                    |
| **Logic**         | Compares `menu.target_guest_count` against `event.guest_count`. Returns mismatch if they differ. |
| **Output**        | `{ menuGuestCount, eventGuestCount, eventName }` or null                                         |
| **Rendering**     | Amber alert banner at top of sidebar                                                             |
| **Null When**     | No event, no guest_count on event, counts match                                                  |

### 5.9 Inquiry Cross-Reference (`inquiry_link`)

| Aspect            | Detail                                                                      |
| ----------------- | --------------------------------------------------------------------------- |
| **Server Action** | `getMenuInquiryLink(menuId)`                                                |
| **Tables**        | `menus`, `inquiries`                                                        |
| **Chain**         | menu -> event -> inquiries (first matching by event_id)                     |
| **Logic**         | Looks up inquiry linked to the menu's event. Returns inquiry ID and status. |
| **Output**        | `{ inquiryId, inquiryStatus }` or null                                      |
| **Rendering**     | "Back to Inquiry" link with status badge                                    |
| **Null When**     | No event, no inquiry linked to event                                        |

---

## 6. Data Flow Architecture

### The Menu -> Event -> Client Chain

Most features resolve data through this chain:

```
menu.id
  └─ menu.event_id (nullable)
       └─ events.client_id (nullable)
            └─ clients.* (dietary, allergies, preferences)
```

**Features that need the full chain:** allergen_validation, client_taste, seasonal_warnings (needs event_date), prep_estimate (needs guest_count + occasion), scale_mismatch (needs event guest_count), inquiry_link (needs event_id -> inquiries)

**Features that only need the menu:** stock_alerts (menu -> dishes -> components -> ingredients), vendor_hints (same path + vendor_price_points)

**Features that reverse the chain:** menu_history (events -> menu_id = this menu)

### Query Fanout Per Feature

| Feature               | DB Queries | Tables Hit                                                                           |
| --------------------- | ---------- | ------------------------------------------------------------------------------------ |
| Core context (always) | 3-6        | menus, events, clients, menus (templates)                                            |
| seasonal_warnings     | 5-6        | menus, events, dishes, components, recipe_ingredients, ingredients + static import   |
| prep_estimate         | 2-3        | menus, events + external estimator (queries events internally)                       |
| client_taste          | 4-5        | menus, events, clients, client_preferences, events (count)                           |
| menu_history          | 3-4        | events, clients, event_financial_summary, menu_cost_summary                          |
| vendor_hints          | 5          | dishes, components, recipe_ingredients, ingredients, vendor_price_points             |
| allergen_validation   | 6-7        | menus, events, clients, dishes, components, recipe_ingredients, ingredients + import |
| stock_alerts          | 5          | dishes, components, recipe_ingredients, ingredients, pantry_items                    |
| scale_mismatch        | 2          | menus, events                                                                        |
| inquiry_link          | 2-3        | menus, inquiries                                                                     |

**Total with all features enabled:** ~35-45 DB queries across 9 parallel action calls.

**Total with all features disabled:** ~3-6 DB queries (core context only).

---

## 7. Database Schema Map

### Primary Tables

| Table                 | Role in Menu Engine              | Key Columns Used                                                                        |
| --------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| `menus`               | Root entity                      | id, tenant_id, event_id, target_guest_count, is_template, service_style, status         |
| `events`              | Links menu to client and date    | id, tenant_id, client_id, event_date, guest_count, occasion, quoted_price_cents, status |
| `clients`             | Dietary and preference data      | dietary_restrictions[], allergies[], dislikes[], favorite_cuisines[]                    |
| `dishes`              | Menu composition                 | id, tenant_id, menu_id, course_number, course_name, dietary_tags[]                      |
| `components`          | Building blocks within dishes    | id, tenant_id, dish_id, recipe_id, scale_factor, category                               |
| `recipes`             | Recipe Bible entries             | id, tenant_id, yield_quantity, yield_unit, category                                     |
| `recipe_ingredients`  | Ingredient quantities per recipe | recipe_id, ingredient_id, quantity, unit                                                |
| `ingredients`         | Master ingredient list           | id, tenant_id, name, last_price_cents, average_price_cents, allergen_flags[]            |
| `pantry_items`        | Inventory on-hand quantities     | tenant_id, ingredient_id, quantity, unit                                                |
| `vendor_price_points` | Vendor pricing per ingredient    | chef_id, vendor_id, ingredient_id, price_cents, is_active                               |
| `client_preferences`  | Client taste tracking            | client_id, tenant_id, item_type, item_name, rating, observed_at                         |
| `inquiries`           | Inquiry origin tracking          | id, tenant_id, event_id, status                                                         |
| `chef_preferences`    | Feature toggle storage           | chef_id, menu_engine_features (JSONB)                                                   |

### Views

| View                      | Used By                        | Computes                                                             |
| ------------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `event_financial_summary` | menu_history                   | profit_cents, profit_margin, food_cost_percentage, net_revenue_cents |
| `menu_cost_summary`       | checkMenuMargins, menu_history | total cost, cost per guest, food cost %                              |

### Computed Functions (DB-level)

| Function                      | Purpose                                             |
| ----------------------------- | --------------------------------------------------- |
| `compute_recipe_cost_cents()` | Sum of (quantity \* last_price_cents) per recipe    |
| `compute_menu_cost_cents()`   | Sum of component recipe costs for a menu            |
| `get_recipe_allergen_flags()` | Aggregates allergen_flags from recipe's ingredients |
| `get_dish_allergen_flags()`   | Walks component hierarchy for dish-level allergens  |

---

## 8. Upstream Data Sources

### 8.1 Seasonal Produce Data

**File:** `lib/calendar/seasonal-produce.ts`
**Type:** Pure static data module (no DB, no auth)
**Content:** ~300 items across 6 culinary seasons (Deep Winter, Early Spring, Late Spring, Peak Summer, Fall Harvest, Late Fall), categorized as produce, fresh_herb, protein, specialty.
**API:** `getSeasonalProduceGrouped(month: number)` returns items grouped by category for the matching season.
**Characteristics:** US-centric. Each item has peak flag and optional chef notes.

### 8.2 Prep Time Estimator

**File:** `lib/intelligence/prep-time-estimator.ts`
**Type:** Server action (queries `events` table)
**Algorithm:** Sqrt scaling model. Finds similar completed events (+-30% guest count, optional occasion match). Scales prep and service minutes by `sqrt(target / average)`. Shopping, travel, and reset are fixed overhead.
**Confidence thresholds:** 10+ similar events = high, 5-9 = medium, 3-4 = low, <3 = null (insufficient data).

### 8.3 Event Intelligence Context

**File:** `lib/intelligence/event-context.ts`
**Type:** Server action (queries `events`, `event_financial_summary`, `after_action_reviews`, `reviews`)
**Used by:** `QuoteEventContext` component (in quote form, not menu sidebar)
**Provides:** Profitability projection, price comparison vs. average, post-event action checklist, timing insights.
**Note:** This is consumed by the quote form's event profitability feature (feature #11 in cross-referencing phase 2), not by the menu engine sidebar.

### 8.4 Client Preference System

**File:** `lib/clients/preference-actions.ts`
**Table:** `client_preferences` (item_type, item_name, rating, observed_at)
**Ratings:** loved, liked, neutral, disliked
**Item types:** dish, ingredient, cuisine, technique
**Used by menu engine:** `getMenuClientTaste()` reads preferences, categorizes by rating, extracts cuisine preferences.

### 8.5 Vendor Comparison

**File:** `lib/vendors/deterministic-comparison.ts`
**Type:** Pure utility function (no DB)
**Used by:** Not directly used by menu engine sidebar. The menu engine's `getMenuVendorHints()` does its own comparison logic directly against `vendor_price_points` table.
**Algorithm:** Ranks vendors by value score (100 for cheapest, penalty-scaled for others). Calculates spread metrics.

---

## 9. Performance Profile

### All Features Enabled (Default)

| Phase                       | Queries    | Notes                                   |
| --------------------------- | ---------- | --------------------------------------- |
| Page-level fetch            | 2 parallel | `getMenuById` + `getMenuEngineFeatures` |
| Sidebar initialization      | 9 parallel | 1 core context + 8 feature actions      |
| Per-action internal queries | 2-7 each   | Chain resolution varies by feature      |
| **Total DB round-trips**    | **~35-45** | All parallelized within `Promise.all`   |

### All Features Disabled

| Phase                    | Queries    | Notes                                |
| ------------------------ | ---------- | ------------------------------------ |
| Page-level fetch         | 2 parallel | Same as above                        |
| Sidebar initialization   | 1          | Only `getMenuContextData` (core)     |
| Core context queries     | 3-6        | Menu -> event -> client -> templates |
| **Total DB round-trips** | **~5-8**   | 80%+ reduction                       |

### Selective Disabling Impact

Each disabled feature eliminates its entire query chain:

| Feature Disabled    | Queries Saved                      |
| ------------------- | ---------------------------------- |
| seasonal_warnings   | 5-6                                |
| allergen_validation | 6-7                                |
| vendor_hints        | 5                                  |
| stock_alerts        | 5                                  |
| client_taste        | 4-5                                |
| menu_history        | 3-4                                |
| prep_estimate       | 2-3 (+ internal estimator queries) |
| scale_mismatch      | 2                                  |
| inquiry_link        | 2-3                                |

### Latency Characteristics

- All feature fetches run in parallel via `Promise.all`, so wall-clock time is bounded by the slowest feature, not the sum.
- Dynamic imports (`seasonal-produce`, `prep-time-estimator`, `allergen-check`) add a small cold-start penalty on first load per server instance.
- The `getMenuEngineFeatures()` action is lightweight (single column select), adding minimal overhead to the page-level fetch.

---

## 10. Feature Interdependencies

### Shared Upstream Requirements

| Requirement                                   | Features That Need It                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `menu.event_id` exists                        | seasonal_warnings, prep_estimate, client_taste, scale_mismatch, inquiry_link, allergen_validation |
| `event.client_id` exists                      | client_taste, allergen_validation                                                                 |
| `event.event_date` exists                     | seasonal_warnings                                                                                 |
| `event.guest_count` exists                    | prep_estimate, scale_mismatch                                                                     |
| Menu has dishes with recipe-linked components | seasonal_warnings, allergen_validation, stock_alerts, vendor_hints                                |
| `client_preferences` records exist            | client_taste                                                                                      |
| `pantry_items` records exist                  | stock_alerts                                                                                      |
| `vendor_price_points` records exist           | vendor_hints                                                                                      |
| Completed events exist                        | prep_estimate, menu_history                                                                       |
| `ingredients.last_price_cents` populated      | vendor_hints                                                                                      |

### Independence Matrix

Features that work regardless of other features:

| Feature             | Independent? | Depends On                                                 |
| ------------------- | ------------ | ---------------------------------------------------------- |
| scale_mismatch      | Yes          | Only needs menu + event                                    |
| inquiry_link        | Yes          | Only needs menu -> event -> inquiries                      |
| menu_history        | Yes          | Only needs events referencing this menu                    |
| stock_alerts        | Yes          | Only needs menu -> dishes -> ingredients -> pantry         |
| vendor_hints        | Yes          | Only needs menu -> dishes -> ingredients -> vendor prices  |
| seasonal_warnings   | Yes          | Only needs menu -> event_date + dishes -> ingredients      |
| prep_estimate       | Yes          | Only needs menu -> event (guest_count, occasion)           |
| client_taste        | Yes          | Only needs menu -> event -> client -> client_preferences   |
| allergen_validation | Yes          | Only needs menu -> event -> client + dishes -> ingredients |

All 9 features are fully independent of each other. Disabling one never affects another.

### "No Data" vs. "Disabled"

When a feature shows nothing, it could mean:

1. **Disabled** - The feature toggle is off. No query was made.
2. **No upstream data** - The toggle is on, but required data doesn't exist (no event linked, no client preferences, etc.)

Both result in the section being hidden. The user cannot distinguish between these states in the current UI. This is intentional: the sidebar is context-aware, not error-aware. If a chef wants to know why a feature isn't showing, they check Settings > Menu Intelligence.

---

## 11. Security and Tenant Scoping Audit

### Server Action Scoping

Every exported server action in `menu-intelligence-actions.ts` calls `requireChef()` as its first line. The returned `user.tenantId!` is used to scope all primary queries.

### Per-Action Audit

| Action                    | Primary Query Scoped                                   | Secondary Queries Scoped                                         | Finding                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getMenuContextData`      | menus: yes                                             | events: no (by ID), clients: no (by ID), templates: yes          | OK (ID lookups are safe after tenant-scoped primary)                                                                                                                               |
| `getMenuIngredientStock`  | dishes: **no tenant_id filter**                        | components: no, pantry_items: yes                                | **NOTE:** dishes query uses only `menu_id` without `tenant_id`. Safe because dish can only exist under a tenant-owned menu, but adding explicit scoping would be defense-in-depth. |
| `validateMenuAllergens`   | menus: yes                                             | dishes: **no tenant_id filter**, components: no                  | Same as above for dishes.                                                                                                                                                          |
| `getRecipeUsage`          | menus: yes                                             | components: no, dishes: no, events: no, clients: no              | Menus are scoped. Upstream lookups (components -> dishes -> menus) are filtered when they reach the scoped menus query.                                                            |
| `checkMenuScaleMismatch`  | menus: yes                                             | events: no (by ID)                                               | OK                                                                                                                                                                                 |
| `getMenuInquiryLink`      | menus: yes, inquiries: yes                             | -                                                                | OK                                                                                                                                                                                 |
| `getMenuSeasonalWarnings` | menus: yes, dishes: yes                                | components: yes, recipe_ingredients: no (by recipe_id)           | OK                                                                                                                                                                                 |
| `getMenuPerformance`      | events: yes                                            | clients: no (by ID), financial_summary: no (by event_id)         | OK (event IDs are tenant-scoped)                                                                                                                                                   |
| `getMenuClientTaste`      | menus: yes, clients: yes, client_preferences: yes      | events: yes                                                      | OK                                                                                                                                                                                 |
| `getMenuPrepEstimate`     | menus: yes                                             | events: no (by ID)                                               | OK                                                                                                                                                                                 |
| `getMenuVendorHints`      | dishes: yes, components: yes, vendor_price_points: yes | recipe_ingredients: no (by recipe_id), ingredients: no (by ID)   | OK                                                                                                                                                                                 |
| `getAssemblySources`      | menus: yes                                             | dishes: yes, events: **no tenant_id**, clients: **no tenant_id** | **NOTE:** Events and clients queried by ID without tenant scoping. Safe because menu IDs are tenant-scoped, but explicit scoping recommended.                                      |

### Feature Toggle Security

- `getMenuEngineFeatures()` is scoped to `chef_id = user.entityId`
- `updateChefPreferences()` uses `chef_id = user.entityId` for both read and write
- Feature toggles cannot be read or modified across tenants
- The JSONB column is validated through Zod schema; unknown keys are ignored
- Boolean-only enforcement: `getMenuEngineFeaturesFromUnknown()` only assigns values that are strictly `typeof === 'boolean'`

### Recommendations

1. Add explicit `tenant_id` filter to `dishes` queries in `getMenuIngredientStock` and `validateMenuAllergens` for defense-in-depth.
2. Add explicit `tenant_id` filter to events/clients queries in `getAssemblySources`.
3. These are low-risk (RLS policies enforce tenant isolation at the database level), but explicit application-level scoping is best practice.

---

## 12. Edge Case Catalog

### Menu Without Event

| Feature             | Behavior                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| Core context        | Season defaults to current month; no client data; templates still shown  |
| seasonal_warnings   | Returns [] (no event_date to check against)                              |
| prep_estimate       | Uses `menu.target_guest_count`; no occasion. Returns null if count < 1   |
| client_taste        | Returns null (no client chain)                                           |
| scale_mismatch      | Returns null (no event to compare against)                               |
| inquiry_link        | Returns null (no event to trace)                                         |
| allergen_validation | Returns empty warnings (no client allergies to check)                    |
| stock_alerts        | Works normally (only needs dishes -> ingredients -> pantry)              |
| vendor_hints        | Works normally (only needs dishes -> ingredients -> vendor_price_points) |
| menu_history        | Works normally (queries events that reference this menu_id)              |

### Event Without Client

| Feature             | Behavior                                     |
| ------------------- | -------------------------------------------- |
| client_taste        | Returns null                                 |
| allergen_validation | Returns empty warnings (no client allergies) |
| All others          | Unaffected                                   |

### Menu With No Dishes/Components

| Feature             | Behavior                               |
| ------------------- | -------------------------------------- |
| seasonal_warnings   | Returns []                             |
| allergen_validation | Returns empty warnings                 |
| stock_alerts        | Returns []                             |
| vendor_hints        | Returns []                             |
| All others          | Unaffected (don't traverse dish chain) |

### No Historical Data

| Feature       | Behavior                                      |
| ------------- | --------------------------------------------- |
| prep_estimate | Returns null if < 3 similar completed events  |
| menu_history  | Returns null if no events use this menu       |
| client_taste  | Returns null if no client_preferences records |

### Missing Prices

| Feature                      | Behavior                                                  |
| ---------------------------- | --------------------------------------------------------- |
| vendor_hints                 | Skips ingredients where `last_price_cents` is null        |
| checkMenuMargins (always-on) | Flags "Missing prices" badge, foodCostPercent may be null |

### Unit Mismatches

`getMenuIngredientStock` does not perform unit conversion between recipe_ingredients and pantry_items. If a recipe calls for "2 oz" butter and pantry has "1 lb", the comparison is made on raw numbers. This is a known limitation; the chef is expected to use consistent units.

---

## 13. Error Handling and Failure Isolation

### Sidebar-Level Pattern

```typescript
const fetches: Promise<unknown>[] = [getMenuContextData(menuId)]

fetches.push(
  features.stock_alerts ? getMenuIngredientStock(menuId).catch(() => []) : Promise.resolve([])
)
```

Three layers of protection:

1. **Feature gate** - Disabled features never call the server
2. **Per-action `.catch()`** - Failed actions return empty/null, never throw
3. **Sidebar-level try/catch** - If core context fails, shows error state

### Failure Scenarios

| Scenario                                   | Impact                                                    |
| ------------------------------------------ | --------------------------------------------------------- |
| One feature action throws                  | That feature returns empty/null; all others unaffected    |
| Core context (`getMenuContextData`) throws | Sidebar shows "Could not load context" error              |
| `getMenuEngineFeatures()` throws           | Returns all-true defaults (full sidebar loads)            |
| Database connection fails                  | Sidebar shows error; menu editor still functional         |
| Dynamic import fails                       | Feature returns empty/null (caught in action's try/catch) |

### No Silent Failures Masquerading as Real Data

All feature actions return typed empty values (`[]` for arrays, `null` for objects). No feature ever returns fabricated data on failure. An empty section is hidden, not shown with zeros.

---

## 14. UI Rendering Pipeline

### Double Gate Pattern

Every feature-gated section uses a double gate:

```tsx
{
  features.allergen_validation && allergenWarnings.length > 0 && <div>...</div>
}
```

1. `features.allergen_validation` - Feature must be enabled
2. `allergenWarnings.length > 0` - Data must be non-empty

This prevents rendering empty sections even when the feature is enabled but no data exists.

### Section Rendering Order

1. Scale mismatch alert (amber banner, top position for visibility)
2. Allergen conflicts (red alert, high priority safety data)
3. Seasonal ingredient warnings (amber alert)
4. Prep time estimate
5. Client taste profile
6. Menu performance history
7. Inquiry link
8. Season + guest tier badges (always shown)
9. Client dietary info (always shown, safety data)
10. Stock alerts
11. Previously served menus (always shown)
12. Matching templates (always shown)

### Loading States

- **Initial load:** Skeleton pulse animation (3 placeholder bars)
- **Pending transition:** `isPending` flag managed by `useTransition`
- **Error state:** Red border with "Could not load context" message
- **Empty state:** "No additional context available" message with guidance

---

## 15. Extensibility Guide (Adding a 10th Feature)

The JSONB column design makes adding new features straightforward. No migration needed.

### Steps to Add a New Feature

**1. Add the key to the type system** (`lib/scheduling/types.ts`):

```typescript
// Add to MENU_ENGINE_FEATURE_KEYS array
export const MENU_ENGINE_FEATURE_KEYS = [
  ...existing,
  'new_feature_key',
] as const

// Add to MenuEngineFeatures interface
export interface MenuEngineFeatures {
  ...existing
  new_feature_key: boolean
}

// Add to DEFAULT_MENU_ENGINE_FEATURES
export const DEFAULT_MENU_ENGINE_FEATURES: MenuEngineFeatures = {
  ...existing,
  new_feature_key: true,
}

// Add to MENU_ENGINE_FEATURE_LABELS
export const MENU_ENGINE_FEATURE_LABELS = {
  ...existing,
  new_feature_key: {
    label: 'Human-Readable Name',
    description: 'What this feature does and why it matters.',
  },
}
```

**2. Add the Zod field** (`lib/chef/actions.ts`):

```typescript
const MenuEngineFeaturesSchema = z
  .object({
    ...existing,
    new_feature_key: z.boolean(),
  })
  .partial()
```

**3. Create the server action** (`lib/menus/menu-intelligence-actions.ts`):

```typescript
export async function getMenuNewFeature(menuId: string): Promise<NewFeatureType | null> {
  const user = await requireChef()
  // ... tenant-scoped queries
}
```

**4. Wire into MenuContextSidebar** (`components/culinary/menu-context-sidebar.tsx`):

```typescript
// Add state
const [newFeatureData, setNewFeatureData] = useState<NewFeatureType | null>(null)

// Add to Promise.all
fetches.push(
  features.new_feature_key
    ? getMenuNewFeature(menuId).catch(() => null)
    : Promise.resolve(null)
)

// Add rendering section
{features.new_feature_key && newFeatureData && (
  <div className="px-4 py-3">...</div>
)}
```

**5. No migration needed.** The JSONB column accepts unknown keys gracefully. `getMenuEngineFeaturesFromUnknown()` will return `true` (default) for any key present in `MENU_ENGINE_FEATURE_KEYS` but missing from the stored JSON.

**6. Update the settings form.** The form automatically picks up new keys from `MENU_ENGINE_FEATURE_KEYS` and renders a toggle for each.

---

## 16. Non-Configurable Core Context

These sections are always loaded and rendered regardless of feature toggles:

| Section                 | Data Source                                                   | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Season + guest tier     | Derived from event_date (month) and target_guest_count        | Fundamental context for menu planning                        |
| Client dietary info     | `clients.dietary_restrictions[]`, `clients.allergies[]`       | Core safety data; separate from allergen _validation_ engine |
| Previously served menus | `events` where client_id matches, ordered by date             | Prevents menu repetition for returning clients               |
| Matching templates      | `menus` where is_template=true, sorted by service style match | Starting point suggestions for menu building                 |

These are loaded by `getMenuContextData()`, which always runs.

---

## 17. File Inventory

### Core Implementation

| File                                           | Lines | Role                                                    |
| ---------------------------------------------- | ----- | ------------------------------------------------------- |
| `lib/menus/menu-intelligence-actions.ts`       | ~2541 | 21 server actions + 19 exported types                   |
| `components/culinary/menu-context-sidebar.tsx` | ~510  | Main intelligence sidebar with 9 feature-gated sections |
| `components/culinary/menu-cost-sidebar.tsx`    | ~179  | Cost display with vendor hints toggle                   |
| `app/(chef)/culinary/menus/[id]/page.tsx`      | ~79   | Menu detail page (fetches features, passes to sidebars) |

### Configuration System

| File                                       | Lines       | Role                                                 |
| ------------------------------------------ | ----------- | ---------------------------------------------------- |
| `lib/scheduling/types.ts`                  | (additions) | MenuEngineFeatures interface, keys, labels, defaults |
| `lib/chef/actions.ts`                      | (additions) | Zod schema, getMenuEngineFeatures(), merge logic     |
| `components/settings/menu-engine-form.tsx` | ~155        | Toggle form component                                |
| `app/(chef)/settings/menu-engine/page.tsx` | ~35         | Settings page                                        |
| `app/(chef)/settings/page.tsx`             | (edit)      | Added "Menu Intelligence" link                       |

### Database

| File                                                          | Role                            |
| ------------------------------------------------------------- | ------------------------------- |
| `database/migrations/20260401000085_menu_engine_features.sql` | Adds JSONB column with defaults |

### Upstream Dependencies

| File                                      | Used By                              |
| ----------------------------------------- | ------------------------------------ |
| `lib/calendar/seasonal-produce.ts`        | seasonal_warnings (dynamic import)   |
| `lib/intelligence/prep-time-estimator.ts` | prep_estimate (dynamic import)       |
| `lib/menus/allergen-check.ts`             | allergen_validation (dynamic import) |
| `lib/clients/preference-actions.ts`       | client_taste (queried directly)      |

### Documentation

| File                                       | Content                       |
| ------------------------------------------ | ----------------------------- |
| `docs/cross-referencing-enhancements.md`   | Phase 1 features (1-5)        |
| `docs/cross-referencing-phase2.md`         | Phase 2 features (6-12)       |
| `docs/configurable-menu-engine.md`         | Configuration system overview |
| `docs/menu-engine-comprehensive-report.md` | This document                 |

---

## 18. Known Limitations and Future Considerations

### Current Limitations

1. **Unit mismatch in stock alerts.** `getMenuIngredientStock` compares raw quantities without unit conversion. "2 oz" vs. "1 lb" pantry entry will show incorrect status.

2. **US-centric seasonal data.** The 6-season, ~300 item produce database in `seasonal-produce.ts` is US-focused. Operators in other regions may find seasonal warnings inaccurate.

3. **No "disabled" indicator in sidebar.** When a feature is toggled off, its section simply doesn't appear. There's no visual indicator that features exist but are disabled. This is intentional (reduce noise) but means new operators may not discover the settings page.

4. **Tenant scoping gaps.** Some intermediate queries (dishes, events, clients) lack explicit `tenant_id` filters when queried by ID after a tenant-scoped parent query. Database RLS provides protection, but application-level defense-in-depth is recommended.

5. **No per-menu feature override.** Features are toggled globally per chef. There's no way to enable seasonal_warnings for one menu but not another. The JSONB-per-chef design doesn't support menu-level granularity.

6. **Dynamic imports add cold-start latency.** First invocation of seasonal_warnings, prep_estimate, and allergen_validation on a fresh server instance pays an import cost. Subsequent calls are cached.

### Future Considerations

1. **Feature usage analytics.** Track which features operators actually use vs. which they disable. This informs product decisions about feature investment.

2. **Suggested configuration.** Based on the chef's data (no inventory data? auto-suggest disabling stock_alerts), the system could recommend a feature configuration during onboarding.

3. **Feature-specific settings.** Some features could have sub-settings (e.g., seasonal_warnings: threshold for "out of season" severity; vendor_hints: minimum savings % to surface). The JSONB column supports nested objects.

4. **Batch feature check.** Instead of 8 separate server actions, a single `getMenuIntelligence(menuId, enabledFeatures[])` action could batch all queries in one round-trip. This would reduce HTTP overhead but increase coupling.

5. **Real-time updates.** Currently, the sidebar loads once on page mount. SSE realtime subscriptions could update stock alerts or vendor prices live as inventory changes.
