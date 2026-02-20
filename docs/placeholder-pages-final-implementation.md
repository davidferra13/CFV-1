# Placeholder Pages — Final Implementation Pass

**Branch:** `feature/packing-list-system`
**Status:** Complete — all identified placeholder pages replaced, DB fully migrated, 0 TypeScript errors

---

## Overview

This document covers the final round of placeholder-to-real-page conversions. A prior pass (documented in `docs/remaining-placeholders-implementation.md`) handled clients, partners, leads, and basic finance. This document covers:

- **Finance sub-pages** — 40 pages across invoices, expenses, payments, payouts, and reporting
- **Culinary sub-pages** — 18 pages across recipes, components, menus, prep, ingredients, and costing
- **Clients loyalty/referrals** — 1 remaining stub

All pages are async server components using `requireChef()` for auth and tenant-scoped data actions. No `"use client"` — all data fetching happens server-side.

---

## Finance Sub-Pages

### Finance Invoices (6 pages)

All invoice pages use `getEvents()` and filter by FSM status.

| Page | File | Filter |
|---|---|---|
| `/finance/invoices/draft` | `finance/invoices/draft/page.tsx` | `status in ['draft', 'proposed']` |
| `/finance/invoices/sent` | `finance/invoices/sent/page.tsx` | `status === 'accepted'` |
| `/finance/invoices/paid` | `finance/invoices/paid/page.tsx` | `status in ['paid', 'confirmed', 'in_progress', 'completed']` |
| `/finance/invoices/overdue` | `finance/invoices/overdue/page.tsx` | `event_date < now && !terminal` — `differenceInDays` for days overdue |
| `/finance/invoices/refunded` | `finance/invoices/refunded/page.tsx` | Parallel: `getEvents()` + `getLedgerEntries({ entryType: 'refund' })`; cross-joined via `Map<eventId, totalRefunded>` |
| `/finance/invoices/cancelled` | `finance/invoices/cancelled/page.tsx` | `status === 'cancelled'`; rows styled with `opacity-75` and `line-through` |

### Finance Expenses (8 pages)

All pages use `getExpenses()`. Multi-category pages fetch all and filter client-side because the action only accepts a single `category` value.

| Page | Categories |
|---|---|
| `/finance/expenses` (hub) | All — computes per-section totals |
| `/finance/expenses/food-ingredients` | `groceries`, `alcohol`, `specialty_items` |
| `/finance/expenses/labor` | `labor` |
| `/finance/expenses/marketing` | `marketing` |
| `/finance/expenses/miscellaneous` | `insurance_licenses`, `professional_services`, `education`, `utilities`, `other` |
| `/finance/expenses/rentals-equipment` | `equipment`, `supplies`, `venue_rental`, `uniforms` |
| `/finance/expenses/software` | `subscriptions` |
| `/finance/expenses/travel` | `gas_mileage`, `vehicle` — includes `mileage_miles` column |

### Finance Payments (5 pages)

| Page | Data source |
|---|---|
| `/finance/payments` (hub) | Parallel fetch of all entry types; net received KPI |
| `/finance/payments/deposits` | `getLedgerEntries({ entryType: 'deposit' })` |
| `/finance/payments/installments` | Parallel: `installment` + `final_payment` entries merged |
| `/finance/payments/refunds` | `getLedgerEntries({ entryType: 'refund' })` |
| `/finance/payments/failed` | `getEvents()` filtered to `status === 'accepted'`; split past-due vs upcoming |

Note: There is no `payment_failed` status in the event FSM and no Stripe-specific failed-charge table exposed via actions. "Failed payments" is approximated as events stuck in `accepted` state (payment pending/stalled), with a note to check the Stripe dashboard for actual declined card data.

### Finance Payouts (4 pages)

| Page | Notes |
|---|---|
| `/finance/payouts` (hub) | Summary stats + 3 view cards |
| `/finance/payouts/manual-payments` | All inbound ledger entries; info banner about offline tracking |
| `/finance/payouts/reconciliation` | Builds `Map<eventId, total>` from all inbound entries; compares to `quoted_price_cents`; 3 buckets: reconciled / partial / unrecorded |
| `/finance/payouts/stripe-payouts` | Same entries + Stripe dashboard note |

### Finance Reporting (8 pages)

| Page | Data |
|---|---|
| `/finance/reporting` (hub) | 7 report cards |
| `/finance/reporting/revenue-by-month` | 12-month rolling buckets using `subMonths` + `startOfMonth` |
| `/finance/reporting/revenue-by-event` | `getEvents()` sorted by `quoted_price_cents` desc |
| `/finance/reporting/revenue-by-client` | Events grouped by `client.id`; per-client revenue map |
| `/finance/reporting/profit-by-event` | Parallel `getEvents()` + `getExpenses()`; `Map<eventId, expenseTotal>`; profit + margin % |
| `/finance/reporting/expense-by-category` | `EXPENSE_CATEGORY_GROUPS` for section grouping; % of total |
| `/finance/reporting/tax-summary` | `getExpenses({ start_date: yearStart, is_business: true })`; `getTenantFinancialSummary()` for gross revenue; CPA disclaimer included |
| `/finance/reporting/year-to-date-summary` | `startOfYear(new Date())`; parallel: summary + YTD entries + YTD expenses + events |

**Important:** `getTenantFinancialSummary()` returns `{ totalRevenueCents, totalRefundsCents, totalTipsCents, netRevenueCents }`. There is no `grossRevenueCents` field — use `totalRevenueCents`.

---

## Culinary Sub-Pages

### Recipe Sub-Pages (3 pages)

| Page | Notes |
|---|---|
| `/culinary/recipes/tags` | `getRecipes()` → `Map<tag, recipe[]>` from `dietary_tags`; tag cloud + grouped lists |
| `/culinary/recipes/dietary-flags` | Recipes with `dietary_tags.length > 0`; `DIETARY_COLORS` map; tag frequency counts |
| `/culinary/recipes/seasonal-notes` | Filters `(r as any).notes \|\| (r as any).adaptations`; explains seasonal notes live in existing fields |

### Component Sub-Pages (5 pages)

Component categories in the DB: `sauce, protein, starch, vegetable, fruit, dessert, garnish, bread, cheese, condiment, beverage, other`. There is no `stocks` or `ferments` category — those pages use keyword matching on ingredient/component names.

| Page | Notes |
|---|---|
| `/culinary/components/sauces` | `getAllComponents()` filtered to `category === 'sauce'` |
| `/culinary/components/stocks` | Name-based filter via `STOCK_KEYWORDS = ['stock', 'broth', 'fond', 'jus', 'fumet', ...]`; searches both recipes and components |
| `/culinary/components/ferments` | `FERMENT_KEYWORDS = ['ferment', 'pickle', 'kimchi', 'lacto', 'miso', ...]`; name-matched from both recipes and components |
| `/culinary/components/garnishes` | `getAllComponents()` filtered to `category === 'garnish'` |
| `/culinary/components/shared-elements` | Components with `recipe_id !== null`; `Map<recipeId, usageCount>` for cross-menu reuse count |

### Menu Sub-Pages (3 pages)

| Page | Notes |
|---|---|
| `/culinary/menus/templates` | `getMenus()` filtered to `is_template === true`; card grid |
| `/culinary/menus/scaling` | `getMenus()` filtered to `target_guest_count != null`; sorted by guest count desc |
| `/culinary/menus/substitutions` | `getRecipes()` filtered to `(r as any).adaptations`; card layout with `line-clamp-3` |

### Prep Sub-Pages (2 pages)

| Page | Notes |
|---|---|
| `/culinary/prep/timeline` | `getAllComponents({ is_make_ahead: true })`; grouped by menu; sorted by `make_ahead_window_hours` desc; hours → days+hours display |
| `/culinary/prep/shopping` | `getRecipes()` + `getIngredients()`; shows ingredients with `usage_count > 0`; grouped by category; info banner links to per-event Grocery List document |

### Ingredients Sub-Pages (2 pages)

| Page | Notes |
|---|---|
| `/culinary/ingredients/vendor-notes` | `getIngredients()` filtered to `preferred_vendor !== null`; grouped by vendor name |
| `/culinary/ingredients/seasonal-availability` | `getIngredients()`; no dedicated seasonal field in DB — uses keyword heuristics per ingredient name (northern hemisphere); explains limitation; year-round/unclassified bucket |

### Costing Sub-Pages (3 pages)

| Page | Notes |
|---|---|
| `/culinary/costing/recipe` | `getRecipes({ sort: 'name' })`; sorted by `total_cost_cents` desc; inline cost bar via `costBar()` helper; `has_all_prices` badge (Full / Partial) |
| `/culinary/costing/menu` | Parallel: `getMenus()` + `getAllComponents()` + `getRecipes()`; recipe cost lookup map; cost-per-guest when `target_guest_count` set |
| `/culinary/costing/food-cost` | Parallel: `getRecipes()` + `getExpenses({})` + `getTenantFinancialSummary()`; food cost % = food expenses ÷ gross revenue; benchmark colors (green ≤28%, amber ≤35%, red >35%); top-5 recipes by cost + category breakdown |

---

## Clients Loyalty — Referrals (1 page)

### `/clients/loyalty/referrals`
**File:** `app/(chef)/clients/loyalty/referrals/page.tsx`
**Data:** `getClients()` + `getEvents()`

**Implementation:**
- Filters clients to `referral_source === 'referral'`
- Groups referred clients by `referral_source_detail` (the referrer's name) to build a "top referrers" leaderboard
- Source breakdown across all clients using the `referral_source` enum: `take_a_chef`, `instagram`, `referral`, `website`, `phone`, `email`, `other`
- Revenue from referral clients (events in paid/confirmed/in_progress/completed states)
- Referral clients without a named referrer shown in a separate chip group

**Schema note:** `clients.referral_source` is a DB enum. `clients.referral_source_detail` is a free-text field for the referrer's name/detail. Both exist in Layer 1 foundation schema.

---

## Key Technical Decisions

### getExpenses multi-category
`getExpenses({ category })` accepts a single category. Pages grouping multiple categories (food-ingredients, miscellaneous, rentals-equipment, travel) call `getExpenses({})` and filter client-side.

### No "failed payments" table
The event FSM has no `payment_failed` status. The failed payments page shows events stuck in `accepted` state as a proxy for stalled payments, with a note to check the Stripe dashboard for actual decline data.

### No seasonal field on ingredients
The DB has no `seasonal_availability` field on ingredients. The seasonal page uses a keyword heuristic on ingredient names and includes a clear explanation of the limitation.

### Component categories
The `components` table has a fixed category enum: `sauce, protein, starch, vegetable, fruit, dessert, garnish, bread, cheese, condiment, beverage, other`. Pages targeting "stocks" and "ferments" use keyword matching on names since those categories don't exist in the schema.

### Write tool requires file read
The Write tool enforces that every file must be read in the current session before writing. Parallel batch reads sometimes fail to register all files — if a Write call fails with "File has not been read yet", re-read the specific file individually before retrying.

---

## Data Action Reference

| Action | Module | Used by |
|---|---|---|
| `getEvents()` | `lib/events/actions` | Invoice pages, payment/reporting pages, referrals |
| `getLedgerEntries({ entryType, startDate, endDate })` | `lib/ledger/compute` | Payment, payout, reporting pages |
| `getExpenses({ category?, is_business?, start_date?, end_date? })` | `lib/expenses/actions` | All expense and costing pages |
| `getTenantFinancialSummary()` | `lib/events/actions` | Reporting hub, YTD, food cost % |
| `getRecipes({ sort?, category? })` | `lib/recipes/actions` | All culinary recipe/costing pages |
| `getIngredients()` | `lib/recipes/actions` | Shopping, vendor-notes, seasonal-availability |
| `getMenus({ statusFilter? })` | `lib/menus/actions` | Menu sub-pages, menu cost |
| `getAllComponents({ is_make_ahead? })` | `lib/menus/actions` | Component sub-pages, prep timeline, menu cost |
| `getClients()` | `lib/clients/actions` | Referrals |
