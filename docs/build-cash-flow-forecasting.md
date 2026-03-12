# Build: Cash Flow Forecasting Enhancement (#5)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #5 Cash Flow Forecasting (build order #24)

## What Changed

Enhanced the existing cash flow forecast system with running cash position tracking and low-cash warnings.

### What Already Existed

- `lib/finance/cash-flow-actions.ts` - 30/60/90 day cash flow forecast with confirmed vs projected income
- `components/finance/cash-flow-chart.tsx` - Interactive chart with period selector (30/60/90 days)
- `app/(chef)/finance/cash-flow/page.tsx` - Cash flow forecast page
- `lib/analytics/revenue-forecast.ts` - Historical revenue trend with 3-month projections
- `app/(chef)/finance/forecast/page.tsx` - Revenue forecast page

### What Was Added

**`lib/finance/cash-flow-actions.ts`** (enhanced):

- `runningBalanceCents` - Cumulative cash position per period. Shows how cash accumulates or depletes over time instead of just per-period net.
- `warningPeriod` - Identifies the first period where running cash drops below $500, giving chefs advance notice of cash crunches.

**`components/finance/cash-flow-chart.tsx`** (enhanced):

- **Cash Position line** - Blue dashed line showing cumulative running balance across all periods
- **$500 reference line** - Red dashed horizontal line marking the warning threshold
- **Warning banner** - Red alert card that appears when cash is projected to drop below $500, showing the period and projected balance

## Design Decisions

- **$500 warning threshold** - Chosen as a reasonable minimum cash reserve for a private chef business. Covers emergency grocery runs, gas, and small expenses.
- **Per-period net AND running balance** - Both are shown because per-period net shows weekly health while running balance shows trajectory.
- **No new migration** - Pure computation enhancement on existing data.
- **Non-breaking** - Chart gracefully handles missing `runningBalanceCents` (defaults to 0) for backwards compatibility.

## Architecture

The cash flow system uses three data sources:

1. **Events** - Confirmed (paid/confirmed/in_progress) and projected (proposed/accepted)
2. **Recurring invoices** - Active schedules by next_send_date
3. **Expenses** - Logged expenses by date

Running balance is cumulative sum of period nets. Warning triggers when any period's running balance drops below the threshold.
