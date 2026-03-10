# Bakery: Daily Production Sheet + Display Case Management

## Overview

Two bakery features for managing daily baking operations and retail display tracking.

## Feature 1: Daily Production Sheet

**Route:** `/bakery/production`

**What it does:** Generates a daily "What to Bake Today" list by pulling from three sources:

1. **Par Stock** - items always produced daily (e.g., "50 baguettes every morning")
2. **Custom Orders** - bakery orders (cakes, pastries) with a pickup date matching the selected day
3. **Batch Production** - planned batch runs (future integration point)

**How it works:**

- On first load for a given date, the system queries par stock items and bakery_orders due that day
- It creates entries in the `bakery_production_log` table so progress is persisted
- Subsequent loads for the same date return the existing log (no duplicates)
- Each item can be marked: Pending, In Progress, Done (with actual quantity), or Skipped
- A progress bar shows overall completion percentage

**Key files:**

- Server actions: `lib/bakery/daily-production-actions.ts`
- UI component: `components/bakery/daily-production-sheet.tsx`
- Page: `app/(chef)/bakery/production/page.tsx`

**Par Stock management:**

- Add/remove items that should be produced every day
- Each item has a name, daily quantity, and priority (lower = bake first)
- Soft-deleted (is_active flag) so history is preserved

## Feature 2: Display Case Management

**Route:** `/bakery/display-case`

**What it does:** Real-time tracking of retail display case inventory with freshness monitoring.

**Key concepts:**

- **Par Level** - minimum quantity to keep on display. Items below par show yellow "LOW STOCK" warnings
- **Freshness** - computed from baked_at timestamp + shelf_life_hours
  - Green (fresh): less than 75% of shelf life elapsed
  - Yellow (getting stale): 75-100% of shelf life elapsed
  - Red (stale): past shelf life
- **Quick sell** - single tap "-1" button for fast counter operations
- **Restock** - add batch quantity from kitchen, automatically updates baked_at timestamp

**Summary bar shows:**

- Total products, total items on display, low stock count, stale count, total case value (in dollars, stored as cents)

**Auto-refresh:** Display case data refreshes every 60 seconds to stay current during busy service.

**Key files:**

- Server actions: `lib/bakery/display-case-actions.ts`
- UI component: `components/bakery/display-case.tsx`
- Page: `app/(chef)/bakery/display-case/page.tsx`

## Database Tables

**Migration:** `supabase/migrations/20260331000019_display_case_and_par_stock.sql`

### display_case_items

Tracks products in the retail display case.

| Column           | Type        | Notes                                             |
| ---------------- | ----------- | ------------------------------------------------- |
| id               | uuid        | PK                                                |
| tenant_id        | uuid        | FK to chefs(id), RLS enforced                     |
| product_name     | text        | Required                                          |
| category         | text        | bread, pastry, cake, cookie, savory, drink, other |
| current_quantity | integer     | What is on display right now                      |
| par_level        | integer     | Minimum to keep stocked                           |
| price_cents      | integer     | Price in cents                                    |
| baked_at         | timestamptz | When current batch was made                       |
| shelf_life_hours | integer     | How long it stays fresh                           |
| allergens        | text[]      | Array of allergen labels                          |
| is_active        | boolean     | Soft delete flag                                  |
| last_restocked   | timestamptz | When stock was last added                         |

### bakery_par_stock

Daily production standards (always-bake items).

| Column       | Type    | Notes                          |
| ------------ | ------- | ------------------------------ |
| id           | uuid    | PK                             |
| tenant_id    | uuid    | FK to chefs(id), RLS enforced  |
| product_name | text    | What to produce                |
| quantity     | integer | How many to make daily         |
| priority     | integer | 1=first, 100=last              |
| recipe_id    | uuid    | Optional link to recipes table |
| notes        | text    | Optional notes                 |
| is_active    | boolean | Soft delete flag               |

### bakery_production_log

Tracks daily production progress (one row per item per day).

| Column           | Type        | Notes                               |
| ---------------- | ----------- | ----------------------------------- |
| id               | uuid        | PK                                  |
| tenant_id        | uuid        | FK to chefs(id), RLS enforced       |
| production_date  | date        | Which day this is for               |
| source_type      | text        | par_stock, custom_order, or batch   |
| source_id        | uuid        | FK to source record                 |
| product_name     | text        | Denormalized for display            |
| planned_quantity | integer     | How many planned                    |
| actual_quantity  | integer     | How many actually produced          |
| status           | text        | pending, in_progress, done, skipped |
| completed_at     | timestamptz | When marked done                    |
| assigned_to      | text        | Optional staff assignment           |

## Design Decisions

- **All amounts in cents** per project convention
- **Freshness is deterministic** (formula, not AI) per "Formula > AI" rule
- **Soft deletes** on par stock and display items to preserve history
- **tenant_id from session** per security rules (never from request body)
- **No em dashes** anywhere in the code or UI copy
- **startTransition with try/catch and rollback** on all mutations per Zero Hallucination rules
- **Auto-refresh on display case** because bakery staff need current data during service
- **Print styles** on production sheet for kitchen printouts
