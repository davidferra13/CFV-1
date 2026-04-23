# Revenue Forecast Model

Updated: 2026-04-22

## What the live `/finance/forecast` page now uses

- Booked revenue: completed, paid, confirmed, and in-progress events already dated into the month.
- Weighted pipeline: draft, proposed, and accepted events scored with the existing event-stage weights in `lib/finance/forecast-calculator.ts`.
- Seasonal baseline: trailing completed-event revenue shaped by month-level seasonality from the same completed history.
- Seasonal fill: only the gap between visible revenue and the historical baseline is filled. The model does not stack a full baseline on top of already-booked revenue.
- Confidence ranges: widened or tightened from backtesting prior closed months with the same seasonal baseline model.

## Why this replaced the old route logic

The route had been rendering `lib/analytics/revenue-forecast.ts`, which only used a six-month average plus a simple trend bump. A stronger finance-specific model already existed in `lib/finance/revenue-forecast-actions.ts`, but the page was bypassing it.

The current route now uses the finance model directly so the page, pipeline math, and seasonal pattern all come from one place.

## What the system now persists

- Each finance forecast request now writes a durable `planning_runs` record plus a `planning_run_artifacts` snapshot when there is no fresh artifact to reuse.
- The canonical `/finance/forecast` path reuses those stored artifacts when they are still fresh instead of silently recalculating every page load.
- Stored artifacts now include:
  - source-aware evidence rows for events, financial summaries, and prior forecast snapshots
  - data-quality checks for source presence, history depth, financial coverage, visible revenue coverage, and reconciliation depth
  - closed-month actuals reconciliation whenever a prior month-open snapshot exists for that month

## Actuals reconciliation behavior

- Reconciliation uses the latest stored forecast snapshot whose `as_of_date` is on or before the first day of the reconciled month.
- That keeps calibration bounded to real month-open forecast-time artifacts instead of mixing in hindsight snapshots created after the month started.
- The page now exposes the resulting sample size, mean absolute error, and within-range rate alongside the live forecast output.

## Current limits

- Calibration still begins with the deterministic seasonal backtest from `lib/finance/forecast-calculator.ts`.
- Actuals reconciliation only becomes useful after stored forecast snapshots accumulate and later close into actual revenue.
- Historical pipeline state is now persisted at forecast time only from the canonical finance forecast path. Other forecast surfaces still need to converge onto the same artifact layer.
- Confidence still depends on completed-event history depth. New tenants with fewer than three closed months will show very limited confidence.
- Remy `finance.forecast` output still needs a follow-up pass if full parity with the page surface is required.
