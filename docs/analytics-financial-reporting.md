# Analytics & Financial Reporting — Implementation Notes

**Date:** 2026-02-20
**Branch:** fix/grade-improvements

---

## What Was Built

This implementation adds three distinct reporting and analytics surfaces to ChefFlow V1:

1. Revenue Forecast (finance section)
2. Custom Report Builder (analytics section)
3. Year-End Tax Package (finance/tax section)

---

## Files Created

### Server Actions / Data Layer

#### `lib/analytics/revenue-forecast.ts`

- `'use server'` action — requires `requireChef()` auth
- Queries last 12 months of `completed` events, groups by `MMM yyyy` month key
- Calculates 6-month average monthly revenue
- Detects trend (up/down/flat) by comparing last 3 months vs prior 3 months using a 5% threshold
- Projects 3 months forward using a trend-adjusted moving average (±5% compound factor)
- Returns `RevenueForecast` with `historical[]`, `forecast[]`, `trend`, `avgMonthlyRevenueCents`, `projectedAnnualCents`

#### `lib/analytics/custom-report.ts`

- `'use server'` action — requires `requireChef()` auth
- Accepts a `ReportConfig` (entity, metric, chartType, groupBy, dateRange)
- Supports `events` and `expenses` as data sources
- For events: groups by month / status / occasion; computes revenue, count, or average
- For expenses: uses `expense_date` (correct column name) and `category`; groups by month or category
- Returns `ReportDataPoint[]` suitable for any chart type

#### `lib/finance/tax-package.ts`

- `'use server'` action — requires `requireChef()` auth
- Accepts a `taxYear: number` (caller passes `currentYear - 1`)
- Queries `events` (status=completed) and `expenses` for the full calendar year
- Maps expense categories to IRS Schedule C line items using `IRS_CATEGORY_MAP`
- Computes estimated quarterly tax payments at 25% effective rate
- Returns `TaxPackage` with revenue, expense breakdown, and quarterly estimates

---

### UI Pages

#### `app/(chef)/finance/forecast/page.tsx`

- Route: `/finance/forecast`
- Server component — loads `getRevenueForecast()` at render time
- Shows 3 stat cards: avg monthly revenue, projected annual, trend indicator (TrendingUp/Down/Minus icon)
- Renders `<ForecastChart>` (client component) and a 3-month projection grid

#### `app/(chef)/analytics/reports/page.tsx`

- Route: `/analytics/reports`
- Server component — renders the `<CustomReportBuilder>` client component
- Minimal shell page; all interactivity is in the builder component

#### `app/(chef)/finance/tax/year-end/page.tsx`

- Route: `/finance/tax/year-end`
- Server component — loads `getYearEndTaxPackage(currentYear - 1)`
- Shows gross revenue summary, Schedule C expense breakdown with IRS line codes, quarterly estimates
- Renders `<TaxPackageExport>` (client component) for text-file download

---

### UI Components

#### `components/finance/forecast-chart.tsx`

- `'use client'` — uses Recharts `ComposedChart`
- Renders `Bar` for historical actual revenue and `Line` (dashed) for projected months
- Merges historical and forecast data arrays into a single `chartData` array with `actual` and `projected` keys
- `connectNulls={false}` on the Line ensures the projection line only appears in forecast months

#### `components/analytics/report-builder.tsx`

- `'use client'` — uses `useTransition` to call the server action without blocking
- 5-control configuration panel: entity, metric, groupBy, dateRange, chartType
- Dynamically renders bar, line, pie, or table based on `config.chartType`
- PieLabel uses `PieLabelRenderProps` from recharts (typed correctly)
- Tooltip formatters handle `number | undefined` to satisfy recharts types
- Error toast via `sonner` on server action failure

#### `components/finance/tax-package-export.tsx`

- `'use client'` — button that generates a plain-text `.txt` file client-side
- Constructs a structured text report (revenue, expenses by category, net income, quarterly estimates)
- Uses `URL.createObjectURL` + programmatic `<a>` click for download
- No server round-trip required for export

---

## Key Design Decisions

### Column Name Fix

The `expenses` table uses `expense_date` (not `date`) as confirmed by `types/database.ts`. The custom report action uses `expense_date` for both the filter and the month grouping key.

### `actual: 0` in Forecast Array

`MonthlyRevenue` requires `actual: number` as a non-optional field. Forecast months are pushed with `actual: 0` (not `null`) so the type is satisfied. The chart distinguishes forecast from historical by which months have a non-null `projected` value.

### Recharts Tooltip Formatter Types

Recharts v2 types require the formatter to accept `number | undefined`. All three Tooltip instances use `(v: number | undefined) => v != null ? [...] : ['-', '']` to satisfy the type checker cleanly.

### No Migrations Required

This implementation is purely read-only. It queries existing `events` and `expenses` tables. No schema changes, no new tables.

### Tax Year Offset

The year-end tax page shows `currentYear - 1` (previous year) because IRS tax filing is for the prior calendar year, and all events for that year will be in `completed` state.

### 25% Tax Rate Disclaimer

The quarterly estimates use a hardcoded 25% effective rate as a planning heuristic. The UI includes a disclaimer badge and a note to consult a tax professional.

---

## Routes Summary

| Route                   | File                                       |
| ----------------------- | ------------------------------------------ |
| `/finance/forecast`     | `app/(chef)/finance/forecast/page.tsx`     |
| `/analytics/reports`    | `app/(chef)/analytics/reports/page.tsx`    |
| `/finance/tax/year-end` | `app/(chef)/finance/tax/year-end/page.tsx` |

---

## TypeScript Health

All 9 new files pass `npx tsc --noEmit --skipLibCheck` with zero errors. The 11 pre-existing errors in `referral-tree.ts`, `template-sharing.ts`, `snapshot.ts`, and `webhooks/deliver.ts` are unrelated to this work and were present before this implementation.
