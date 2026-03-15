# Revenue Forecasting (Feature 3.10)

## What Changed

Built revenue forecasting with booked + pipeline projections across 5 files.

## Files Created

### Server Actions

- `lib/finance/revenue-forecast-actions.ts` - Two server actions:
  - `getRevenueForecast(months?)` - Returns current month actual/projected, monthly forecast with booked/pipeline/historical breakdown, quarterly aggregation, pipeline value by stage with probability weights, seasonal patterns, and data confidence indicator.
  - `getRevenueComparison(year1, year2)` - Year-over-year monthly revenue comparison with growth percentages.

### Pure Functions

- `lib/finance/forecast-calculator.ts` - Deterministic pipeline math (no AI):
  - `weightByStage(revenueCents, status)` - Applies probability weight per FSM stage
  - `calculateSeasonalIndex(monthlyData)` - 12-month seasonal multipliers from historical data
  - `projectNextMonths(historicalData, months)` - Trailing average with seasonal adjustment
  - `STAGE_WEIGHTS` - draft: 10%, proposed: 25%, accepted: 50%, paid: 75%, confirmed: 90%, in_progress: 95%

### Components

- `components/finance/revenue-forecast.tsx` - Full forecast page with:
  - CSS-only bar chart (booked solid, pipeline striped, historical dotted line)
  - Summary cards (actual, projected, pipeline weighted)
  - Pipeline breakdown by stage with color-coded probability
  - Seasonal pattern mini-chart
  - Quarterly outlook
  - Confidence indicator based on months of data available
  - Adjustable forecast window (3/6/12 months)

- `components/finance/yoy-comparison.tsx` - Year comparison panel:
  - Dual horizontal bars per month (year1 vs year2)
  - Growth percentage per month
  - YTD totals and overall growth

- `components/dashboard/forecast-widget.tsx` - Dashboard widget:
  - "Projected revenue next 30 days: $X,XXX"
  - Pipeline value summary (weighted + total, event count)
  - Trend arrow vs same period last year
  - Current month earned amount

## Architecture Notes

- All amounts in cents (integers)
- Formula > AI: zero LLM dependency, all deterministic math
- Server actions use `requireChef()` + `user.tenantId!` for tenant scoping
- Financial data from `event_financial_summary` view + `events` table
- 8-state FSM respected: draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled
- CSS-only charts (no chart library dependency for the new components)
- Error states show clear messages, never substitute zeros
- Dashboard widget accepts pre-fetched props (server component compatible)
