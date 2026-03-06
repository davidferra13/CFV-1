# Intelligence Hub — 10 Deterministic Intelligence Engines

**Branch:** `feature/risk-gap-closure`
**Date:** 2026-03-06
**Status:** Implemented (server actions + UI + nav)

## Philosophy

Every feature follows the core principle: **Formula > AI**. All 10 modules are pure deterministic computation on existing data. Zero Ollama dependency, zero cloud AI calls, instant results, 100% accurate.

## Architecture

```
lib/intelligence/
  index.ts                    — Central re-exports
  seasonal-demand.ts          — Seasonal demand forecasting
  rebooking-predictions.ts    — Client rebooking predictions
  cashflow-projections.ts     — Cash flow projections
  smart-scheduling.ts         — Smart scheduling suggestions
  inquiry-triage.ts           — Auto-triage incoming inquiries
  post-event-triggers.ts      — Post-event task generation
  price-anomaly.ts            — Price anomaly detection
  dietary-trends.ts           — Cross-client dietary intelligence
  ingredient-consolidation.ts — Ingredient consolidation across events
  network-referrals.ts        — Network effects / referral intelligence

components/intelligence/
  intelligence-hub.tsx        — Full hub page component (all 10 cards)

components/dashboard/
  intelligence-summary-card.tsx — Dashboard widget (urgent alerts only)

app/(chef)/intelligence/
  page.tsx                    — Intelligence Hub page route
```

## The 10 Engines

### 1. Seasonal Demand Forecasting

- **Data:** All completed/confirmed events
- **Output:** Monthly demand patterns, peak/slow seasons, next month forecast
- **Method:** Historical month-over-month aggregation normalized by years of data
- **Minimum data:** 3+ events

### 2. Client Rebooking Predictions

- **Data:** Clients with event history, loyalty tiers
- **Output:** Per-client rebooking score (0-100), predicted next booking date, overdue rebookers
- **Method:** Multi-factor scoring: repeat history (35pts), recency (30pts), regularity (20pts), loyalty (15pts)
- **Key metric:** Coefficient of variation for booking interval regularity

### 3. Cash Flow Projections

- **Data:** Ledger entries (income) + expenses table, last 12 months
- **Output:** Monthly income/expenses/net, 3-month projection, gross margin, trend
- **Method:** 6-month weighted average with trend-adjusted projection

### 4. Smart Scheduling

- **Data:** Events with timing data, AARs, upcoming confirmed events
- **Output:** Optimal spacing days, day-of-week stats, burnout warnings, double-booking alerts
- **Method:** Phase time analysis for spacing, calendar density analysis, trend detection

### 5. Inquiry Triage

- **Data:** Open inquiries, GOLDMINE scores, client history, calendar conflicts
- **Output:** Priority-ranked inquiry list (0-100 score), suggested actions per inquiry
- **Method:** Multi-factor: time urgency (30pts), budget (20pts), lead score (15pts), repeat client (15pts), referral (10pts), status (10pts)

### 6. Post-Event Triggers

- **Data:** Completed events (last 30 days), AARs, surveys, reviews, expenses
- **Output:** Task list with due dates, overdue count, completion rate
- **Method:** Rule-based timing: thank-you (1d), AAR (1d), receipts (2d), feedback (3d), review (7d), rebooking (14d)

### 7. Price Anomaly Detection

- **Data:** Completed events with pricing, expenses, recent quotes
- **Output:** Outlier alerts, pricing benchmarks, margin by occasion, quote trend
- **Method:** Standard deviation analysis for outliers, food cost % thresholds, occasion margin comparison

### 8. Cross-Client Dietary Intelligence

- **Data:** Client dietary restrictions, event dietary data (time-series)
- **Output:** Restriction frequency, trends (growing/stable/declining), common combos, specialization opportunities
- **Method:** 3-month vs 6-month comparison for trend detection, pair analysis for combos

### 9. Ingredient Consolidation

- **Data:** Upcoming events (14 days) -> menus -> dishes -> recipes -> ingredients
- **Output:** Consolidated shopping list across events, shared ingredient count, savings opportunities
- **Method:** Recipe-to-event traversal, ingredient deduplication, proximity analysis for batch shopping

### 10. Network Intelligence

- **Data:** Inquiries with referral source, client NPS/loyalty, backup chefs
- **Output:** Referral source ROI, client referral candidates, backup chef suggestions
- **Method:** Source conversion rate + revenue attribution, NPS-based referral likelihood scoring

## Tier Assignment

- **Slug:** `intelligence-hub`
- **Tier:** Pro
- **Category:** analytics
- **Gating:** `<UpgradeGate>` on the page, `requirePro('intelligence-hub')` can be added to actions if needed

## Nav Location

Analytics > Intelligence Hub (icon: Compass)

## Dashboard Widget

`<IntelligenceSummaryCard>` — shows urgent inquiry count, overdue post-event tasks, and scheduling warnings. Links to full hub.

## Data Requirements

All 10 modules work with existing tables — no migrations needed. They read from:

- `events` (dates, pricing, status, timing, dietary, guest count, occasion)
- `clients` (dietary, loyalty, total_events_count, last_event_date)
- `inquiries` (status, channel, budget, GOLDMINE scores, referral source)
- `ledger_entries` (income tracking)
- `expenses` (cost tracking)
- `quotes` (pricing history)
- `after_action_reviews` (quality data)
- `client_satisfaction_surveys` (NPS)
- `client_reviews` (review completion)
- `menus` / `dishes` / `ingredients` / `recipes` (ingredient consolidation)
- `backup_chefs` (network)
