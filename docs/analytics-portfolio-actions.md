# Analytics & Portfolio Server Actions

**Date:** 2026-02-20
**Branch:** `feature/scheduling-improvements`

---

## Summary

Added 6 new server action files providing analytics benchmarking, demand forecasting, client lifetime value analysis, pipeline revenue forecasting, and chef portfolio/highlight management.

All files follow the established codebase patterns:
- `'use server'` directive
- `requireChef()` for auth + role enforcement
- `createServerClient()` for Supabase queries
- `(supabase as any)` for new table queries not yet in generated types
- Tenant scoping via `.eq('chef_id', user.tenantId!)` (new tables) or `.eq('tenant_id', user.tenantId!)` (existing tables)
- Zod validation on inputs
- `revalidatePath()` after mutations
- snake_case DB columns mapped to camelCase in return types
- All monetary values in cents (integers)

---

## Files Created

### 1. `lib/analytics/benchmark-actions.ts`
**New table dependency:** `benchmark_snapshots`
- `computeBenchmarkSnapshot()` — Computes 5 key metrics from events/expenses/inquiries and upserts a daily snapshot:
  - `avg_event_value_cents`: mean quoted_price_cents of completed events
  - `avg_food_cost_pct`: total food expenses / total revenue * 100
  - `booking_conversion_rate`: completed events / total inquiries * 100
  - `client_return_rate`: clients with 2+ completed events / total clients * 100
  - `revenue_per_hour_cents`: total revenue / total tracked hours (falls back to 4h/event estimate)
- `getBenchmarkHistory(months?)` — Returns snapshots for last N months (default 6)
- `getConversionFunnel()` — Current-month counts: inquiries -> quotes -> accepted -> paid -> completed

### 2. `lib/analytics/demand-forecast-actions.ts`
**New table dependency:** `demand_forecasts`
- `generateDemandForecast(year)` — For each of 12 months, averages historical same-month inquiry counts. Confidence: 1 year = 0.3, 2 years = 0.6, 3+ years = 0.85. Upserts into demand_forecasts.
- `getSeasonalHeatmap(year?)` — Returns 12-month predicted vs actual inquiry counts for heatmap visualization. Defaults to current year.

### 3. `lib/analytics/client-ltv-actions.ts`
**No new tables** — uses existing `clients`, `events`, `expenses`
- `computeCLV(clientId)` — Total revenue from completed events minus associated business expenses
- `getTopClientsByLTV(limit?)` — Top clients ranked by lifetime value (default 10). Single-query approach: fetches all clients, events, and expenses, then aggregates in memory.
- `getRetentionCohort()` — Groups clients by first-event quarter, shows how many returned for 2nd, 3rd, 4th, and 5th+ events.

### 4. `lib/analytics/pipeline-forecast-actions.ts`
**No new tables** — uses existing `events`, `inquiries`
- `getPipelineRevenueForecast()` — Weighted forecast from active pipeline: proposed (25%), accepted (50%), paid (90%), confirmed (95%). Returns per-stage breakdown and total weighted forecast.
- `getFunnelMetrics(startDate?, endDate?)` — Full funnel: inquiry -> quote -> accepted -> paid -> completed with conversion rates at each stage. Defaults to current calendar year.

### 5. `lib/portfolio/actions.ts`
**New table dependency:** `portfolio_items`
- `addPortfolioItem(input)` — Insert with auto-incrementing display_order
- `reorderPortfolio(itemIds)` — Batch update display_order from array index
- `removePortfolioItem(itemId)` — Delete with chef_id ownership check
- `getPortfolio()` — All items ordered by display_order

### 6. `lib/portfolio/highlight-actions.ts`
**New table dependency:** `profile_highlights`
- `createHighlight(input)` — Insert with auto-incrementing display_order. Category enum: events, behind_scenes, testimonials, press. Items stored as JSONB.
- `updateHighlight(id, updates)` — Partial update (only provided fields)
- `deleteHighlight(id)` — Delete with chef_id ownership check
- `getHighlights()` — All highlights ordered by display_order

---

## New Tables Required (migrations needed)

These server actions reference 4 new tables that need corresponding migrations:

| Table | Key Columns | Unique Constraint |
|---|---|---|
| `benchmark_snapshots` | chef_id FK, snapshot_date DATE, avg_event_value_cents INT, avg_food_cost_pct NUMERIC(5,2), booking_conversion_rate NUMERIC(5,2), client_return_rate NUMERIC(5,2), revenue_per_hour_cents INT | `(chef_id, snapshot_date)` |
| `demand_forecasts` | chef_id FK, month INT, year INT, predicted_inquiry_count INT, actual_inquiry_count INT, confidence NUMERIC(3,2) | `(chef_id, month, year)` |
| `portfolio_items` | chef_id FK, photo_url TEXT, caption TEXT, dish_name TEXT, event_type TEXT, display_order INT, is_featured BOOLEAN | none |
| `profile_highlights` | chef_id FK, title TEXT, category TEXT (enum), items JSONB, display_order INT | none |

All tables should include standard `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`, `created_at TIMESTAMPTZ DEFAULT now()`, and RLS policies scoped to chef ownership.

---

## Architecture Notes

- **Files 3 and 4** (client-ltv, pipeline-forecast) operate purely on existing tables and need no migration.
- **Files 1 and 2** (benchmark, demand-forecast) use upsert with `onConflict` on their unique constraints.
- **Files 5 and 6** (portfolio, highlights) use max+1 pattern for display_order to enable drag-and-drop reordering.
- All new table queries use `(supabase as any)` since the tables are not yet in `types/database.ts`.
