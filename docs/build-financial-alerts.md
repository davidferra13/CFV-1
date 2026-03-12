# Build: Financial Alerts (#37)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #37 Financial Alerts (build order #25)

## What Changed

Built a scheduled financial alert system with four check types, running daily at 8 AM UTC.

### New Files

1. **`lib/finance/financial-alerts.ts`** - Four deterministic check functions:
   - `checkOverduePayments()` - Reads `event_financial_summary` view for outstanding balances. Joins event date and client info. Escalation ladder: 7-day, 14-day, 21+ day (urgent). Only fires for past events.
   - `checkExpenseAnomalies()` - Computes 90-day category averages per chef. Flags any expense from the last 7 days that exceeds 3x the category average.
   - `checkBudgetVariance()` - Finds events where `estimated_food_cost_cents` exceeds `food_cost_budget_cents` by 20%+. Alerts with variance amount and percentage.
   - `checkDailySettlements()` - Aggregates ledger entries from the last 24 hours per tenant. Summarizes payment count, total received, refunds, and net.

2. **`app/api/scheduled/financial-alerts/route.ts`** - Daily cron (8 AM UTC):
   - Runs all four checks in parallel with `.catch()` isolation
   - Deduplicates: overdue per event+escalation (24h), anomaly per expense (24h), variance per event (7d), settlement per day
   - Records heartbeat for health monitoring

### Modified Files

- **`lib/notifications/types.ts`** - Added 3 notification actions: `expense_anomaly`, `budget_variance_warning`, `daily_settlement_summary`
- **`vercel.json`** - Added cron schedule `0 8 * * *`
- **`app/api/scheduled/monitor/route.ts`** - Added `financial-alerts` to health monitor

## Design Decisions

- **Escalation ladder for overdue** - 7d, 14d, 21d+ mirrors real collection workflows. Each level dedupes independently so the chef gets a fresh alert at each escalation.
- **3x threshold for anomalies** - Conservative enough to avoid alert fatigue but catches genuine outliers. Only compares against 90-day history with 5+ expense minimum.
- **20% budget variance** - Fires early enough to adjust before the event. Based on `food_cost_budget_cents` vs `estimated_food_cost_cents` which come from the menu cost computation system.
- **Settlement summary as digest** - Non-toast by default since it's informational, not actionable. Chefs who want it can enable toast in preferences.
- **Leverages `event_financial_summary` view** - Uses the existing database view for outstanding balances rather than recomputing from ledger entries.
