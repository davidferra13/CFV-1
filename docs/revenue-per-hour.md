# Revenue Per Hour Analysis

**Date:** 2026-03-08
**Branch:** feature/risk-gap-closure
**Status:** Implemented

## What This Solves

Private chefs consistently undercharge because they only think about cooking time. A chef who charges $250 for a 3-hour dinner thinks they're earning $83/hr. But when you add 2 hours of shopping, 1 hour of prep, 45 minutes of driving each way, and 30 minutes of cleanup, they're actually earning about $36/hr for 7 hours of total work.

This feature calculates the REAL effective hourly rate by dividing event revenue by ALL hours worked across all activity categories.

## Architecture

No new database tables. This feature computes everything from existing data:

- **Time data:** `events` table columns (`time_shopping_minutes`, `time_prep_minutes`, `time_travel_minutes`, `time_service_minutes`, `time_reset_minutes`) populated by the Ops tab timer
- **Revenue data:** `event_financial_summary` view (total_paid_cents + tip_amount_cents)
- **Existing patterns:** Reuses `requireChef()`, tenant scoping, `formatCurrency()`

## Files Created

| File | Purpose |
|------|---------|
| `lib/finance/revenue-per-hour-actions.ts` | Server actions: `getRevenuePerHour()`, `getEventRevenuePerHour()`, `getRevenuePerHourBenchmark()` |
| `components/finance/revenue-per-hour-card.tsx` | Dashboard card with big number, trend badge, mini breakdown bar |
| `components/finance/revenue-per-hour-charts.tsx` | Recharts pie chart (hours breakdown) and line chart (monthly trend) |
| `components/finance/revenue-per-hour-analysis.tsx` | Full analysis page client component with date range selector, sortable table |
| `app/(chef)/finance/revenue-per-hour/page.tsx` | Full analysis page |

## Files Modified

| File | Change |
|------|--------|
| `app/(chef)/finance/page.tsx` | Added "Revenue Per Hour" section link |
| `app/(chef)/finance/overview/page.tsx` | Added RevenuePerHourCard to overview |
| `app/(chef)/events/[id]/financial/page.tsx` | Added per-event RPH comparison card |

## Server Actions

### `getRevenuePerHour(dateRange)`
- Fetches all completed events with time tracking data in the date range
- Joins with `event_financial_summary` for revenue
- Returns: total revenue, total hours, effective rate, cooking-only rate, hours breakdown, per-event list, monthly trend
- Events without time data are excluded and counted separately

### `getEventRevenuePerHour(eventId)`
- Single event breakdown with comparison to overall average
- Returns: revenue, hours by category, effective rate, cooking-only rate, comparison percentage

### `getRevenuePerHourBenchmark()`
- Compares current 30-day rate vs previous 30-day rate
- Identifies best and worst events by rate

## UI Components

### Dashboard Card (finance overview)
- Big number: effective hourly rate
- Trend badge: percentage change vs last month
- Mini stacked bar: visual breakdown of time categories
- Insight text comparing cooking-only rate to effective rate

### Full Analysis Page (/finance/revenue-per-hour)
- Date range selector (30d, 90d, year, all time)
- Four summary cards: total revenue, total hours, effective rate, cooking-only rate
- Warning for events excluded due to missing time data
- Pie chart: where time goes
- Line chart: monthly trend
- Insight callout with travel reduction suggestion
- Sortable per-event table with links to event detail

### Event Financial Page
- Revenue Per Hour card below existing financial summary
- Shows effective rate, cooking-only rate, comparison to average
- Link to full analysis

## Activity Categories Mapping

| UI Label | DB Column | Time Tracking Key |
|----------|-----------|-------------------|
| Shopping | time_shopping_minutes | shopping |
| Prep | time_prep_minutes | prep |
| Driving | time_travel_minutes | driving |
| Cooking | time_service_minutes | cooking |
| Cleanup | time_reset_minutes | cleanup |

## All Amounts in Cents

Revenue and rates are stored and computed in cents (integers). `formatCurrency()` handles display conversion.
