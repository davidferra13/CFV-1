# Intelligence Hub — 30 Deterministic Intelligence Engines

**Branch:** `feature/risk-gap-closure`
**Date:** 2026-03-06
**Status:** Implemented (server actions + UI + nav + deep integration)

## Philosophy

Every feature follows the core principle: **Formula > AI**. All 30 modules are pure deterministic computation on existing data. Zero Ollama dependency, zero cloud AI calls, instant results, 100% accurate.

## Architecture

```
lib/intelligence/
  index.ts                         — Central re-exports for all 30 engines

  # Tier 1 — Core Intelligence (10 engines)
  seasonal-demand.ts               — Seasonal demand forecasting
  rebooking-predictions.ts         — Client rebooking predictions
  cashflow-projections.ts          — Cash flow projections
  smart-scheduling.ts              — Smart scheduling suggestions
  inquiry-triage.ts                — Auto-triage incoming inquiries
  post-event-triggers.ts           — Post-event task generation
  price-anomaly.ts                 — Price anomaly detection
  dietary-trends.ts                — Cross-client dietary intelligence
  ingredient-consolidation.ts      — Ingredient consolidation across events
  network-referrals.ts             — Network effects / referral intelligence

  # Tier 2 — Operational Intelligence (5 engines)
  prep-time-estimator.ts           — Prep time estimation and phase analysis
  client-communication-cadence.ts  — Client response pattern tracking
  vendor-price-tracking.ts         — Vendor cost monitoring and alerts
  event-profitability.ts           — Per-event profit margin ranking
  quote-confidence.ts              — Quote acceptance prediction

  # Tier 3 — Strategic Growth Intelligence (5 engines)
  untapped-markets.ts              — Occasion/style/bracket gap analysis
  geographic-hotspots.ts           — Location performance and travel efficiency
  revenue-per-guest.ts             — Per-guest revenue optimization
  seasonal-menu-correlation.ts     — Dish-to-season performance mapping
  client-lifetime-journey.ts       — Client lifecycle and cohort analysis

  # Tier 4 — Predictive & Advanced Analytics (5 engines → 4 built, weather dropped)
  churn-prevention-triggers.ts     — Multi-signal churn detection
  capacity-ceiling.ts              — Capacity limits and bottleneck detection
  price-elasticity.ts              — Price sensitivity modeling
  referral-chain-mapping.ts        — Referral graph and chain analysis

components/intelligence/
  intelligence-hub.tsx             — Full hub page component (all 25 cards)

components/dashboard/
  intelligence-summary-card.tsx    — Dashboard widget (urgent alerts only)

app/(chef)/intelligence/
  page.tsx                         — Intelligence Hub page route
```

## Tier 1 — Core Intelligence (10 engines)

### 1. Seasonal Demand Forecasting

- **Data:** All completed/confirmed events
- **Output:** Monthly demand patterns, peak/slow seasons, next month forecast
- **Method:** Historical month-over-month aggregation normalized by years of data
- **Minimum data:** 3+ events

### 2. Client Rebooking Predictions

- **Data:** Clients with event history, loyalty tiers
- **Output:** Per-client rebooking score (0-100), predicted next booking date, overdue rebookers
- **Method:** Multi-factor scoring: repeat history (35pts), recency (30pts), regularity (20pts), loyalty (15pts)

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

## Tier 2 — Operational Intelligence (5 engines)

### 11. Prep Time Estimator

- **Data:** Completed events with time tracking (shopping, prep, service, travel, reset)
- **Output:** Per-event time estimate using similar events, phase averages, efficiency trend, fastest/slowest
- **Method:** Similar-event matching (guest count +/-30%, same occasion), sqrt scaling for guest extrapolation
- **Two functions:** `estimatePrepTime(guestCount, occasion?)` for specific estimates, `getPrepTimeIntelligence()` for overall analysis
- **Minimum data:** 2+ events with time data

### 12. Client Communication Cadence

- **Data:** Inquiries, quotes, client activity timestamps
- **Output:** Per-client response profiles, silent client alerts, pipeline risk count, chef response speed
- **Method:** Time-delta analysis between inquiry creation and quote send (chef speed), quote send and accept/reject (client speed)
- **Status classification:** active / slowing / silent / new based on days since last activity
- **Minimum data:** 1+ inquiry

### 13. Vendor Price Tracking

- **Data:** Expense records (last 12 months) with vendor names and categories
- **Output:** Vendor price trends, category spend analysis, price increase alerts, concentration risk alerts
- **Method:** 3-month vs 6-month average comparison for trend detection, vendor share of category spend for concentration
- **Alert triggers:** Price increase >15%, vendor >60% of category spend
- **Minimum data:** 5+ expense records

### 14. Event Profitability

- **Data:** Completed events (revenue from quoted_price_cents, expenses, time data)
- **Output:** Per-event profit margin ranking, effective hourly rate, top/bottom performers, breakdown by occasion and guest bracket
- **Method:** `profit = revenue - expenses`, `hourly_rate = profit / (total_minutes / 60)`
- **Minimum data:** 3+ completed events with pricing

### 15. Quote Intelligence

- **Data:** All quotes with outcomes (accepted/rejected/expired), inquiry occasions
- **Output:** Overall acceptance rate, time to decision, accepted vs rejected avg price, sweet spot range, pricing model comparison
- **Two functions:** `getQuoteConfidence(cents, guests, occasion?)` for specific quote scoring, `getQuoteIntelligence()` for overall analysis
- **Confidence factors:** Price position, historical acceptance rate, data volume
- **Minimum data:** 5+ quotes with outcomes

## Tier 3 — Strategic Growth Intelligence (5 engines)

### 16. Untapped Market Detection

- **Data:** Inquiries (occasion, guest count, conversion), events (occasion, service style, revenue), expenses
- **Output:** Underserved occasions, dormant service styles, untapped guest brackets, conversion rates by segment
- **Method:** Cross-reference inquiry occasions against event occasions to find gaps; service style recency analysis; bracket-level conversion tracking
- **Status classification:** untapped (inquiries but zero events), underserved (<30% conversion), strong (60%+ conversion)
- **Minimum data:** 3+ inquiries

### 17. Geographic Hotspot Mapping

- **Data:** Events with `location_text`, travel time, revenue, expenses
- **Output:** Location performance ranking, travel efficiency (revenue per travel minute), geographic concentration %, trend per location
- **Method:** Normalize locations (trim/lowercase), aggregate events per location, 6-month recency for trend
- **Key metric:** Revenue per travel minute — identifies most efficient locations
- **Minimum data:** 3+ events with location data

### 18. Revenue Per Guest Optimization

- **Data:** Completed events with `guest_count` and `quoted_price_cents`
- **Output:** Per-guest revenue by occasion, optimal guest range, sweet spot guest count, volume vs value insight
- **Method:** Guest bracket analysis with per-guest revenue, median calculation, half-split trend detection
- **Insight:** Compares small (<=8) vs large (15+) event economics to advise on volume vs value strategy
- **Minimum data:** 5+ events with guest counts

### 19. Seasonal Menu Correlation

- **Data:** Completed events with menus -> dishes, event dates (for season mapping)
- **Output:** Season-by-season dish performance, dish seasonality scores (highly_seasonal / moderate / year_round), current season recommendations
- **Method:** Map event months to seasons, track dish frequency per season, coefficient of variation for seasonality scoring
- **Menu diversity score:** 0-100 rating of how varied the menu is across seasons
- **Minimum data:** 5+ events with menus

### 20. Client Lifetime Journey

- **Data:** Clients, events, inquiries, expenses
- **Output:** Per-client lifecycle stage, cohort retention analysis, avg LTV, at-risk clients, revenue growth rate per client
- **Stages:** prospect -> first_timer -> returning -> loyal -> champion -> dormant
- **Risk levels:** none / low / medium / high based on overdue cadence
- **Cohort analysis:** Quarter-based acquisition cohorts with retention rate
- **Minimum data:** 3+ clients

## Tier 4 — Predictive & Advanced Analytics (4 engines)

### 21. Churn Prevention Triggers

- **Data:** Clients, events, quotes (rejections), inquiries (stale)
- **Output:** Multi-signal churn risk score (0-100), trigger breakdown, suggested prevention actions, churn rate %, revenue at risk
- **6 trigger types:** overdue (vs cadence), long_silence, declining_spend, declining_frequency, rejected_quote, no_response
- **Risk levels:** critical (60+), high (40+), moderate (20+), low (<20)
- **Actionable:** Each client gets a specific suggested action based on their trigger profile
- **Minimum data:** 3+ clients with events

### 22. Capacity Ceiling Detection

- **Data:** Events (last 12 months) with time tracking
- **Output:** Weekly/monthly load analysis, utilization %, theoretical max events/revenue, bottleneck alerts, headroom %
- **Bottleneck types:** time (events > 8hr avg), overlap (multi-event days), burnout_risk (5+ events/week), events (near peak capacity)
- **Method:** Historical peak as capacity proxy, 1.2x peak as theoretical max
- **Minimum data:** 5+ events in last 12 months

### 23. Price Elasticity Modeling

- **Data:** Quotes with outcomes and guest counts, expenses
- **Output:** Price bands with acceptance rates, per-occasion elasticity scores, revenue/profit maximizing price points, price increase headroom
- **Method:** Split quotes into price bands, compare acceptance rates across bands; half-split comparison for elasticity scoring
- **Insight generation:** Automatically classifies clients as price-insensitive (<20), moderate (20-60), or price-sensitive (60+)
- **Minimum data:** 10+ quotes with outcomes

### 24. Referral Chain Mapping

- **Data:** Clients with referral_source, inquiries, events
- **Output:** Referral graph (who referred whom), chain depth, source ROI, network effect score (0-100)
- **Method:** Name-matching in referral_source to build client-to-client graph, recursive depth calculation, chain revenue attribution
- **Key metrics:** Network effect score, % of clients from referrals, top referrer revenue generation
- **Minimum data:** 3+ clients with referral source data

### Dropped: Weather Impact Correlation

- **Reason:** Requires external weather API data not in the database. Violates Formula > AI principle (would need external data source). May be revisited if weather data becomes available.

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

All 25 modules work with existing tables — no migrations needed. They read from:

- `events` (dates, pricing, status, timing, dietary, guest count, occasion, location_text, service_style, menu_id)
- `clients` (dietary, loyalty, total_events_count, last_event_date, referral_source)
- `inquiries` (status, channel, budget, GOLDMINE scores, referral source, occasion, guest_count)
- `ledger_entries` (income tracking)
- `expenses` (cost tracking, vendor_name, category)
- `quotes` (pricing history, outcomes, guest_count_estimated)
- `after_action_reviews` (quality data)
- `client_satisfaction_surveys` (NPS)
- `client_reviews` (review completion)
- `menus` / `menu_items` / `ingredients` / `recipes` (ingredient consolidation, seasonal menu)
- `backup_chefs` (network)

## Cross-Engine Intelligence Systems (2026-03-06)

Beyond the 25 individual engines, three cross-engine systems synthesize and deliver intelligence:

### Business Health Summary (`lib/intelligence/business-health-summary.ts`)

Runs 13 key engines in parallel and synthesizes a unified health score (0-100) across four dimensions:

- **Revenue** (30% weight): Cash flow trend, profit margins, price elasticity headroom
- **Clients** (30% weight): Churn risk, lifecycle stages, rebooking pipeline
- **Operations** (20% weight): Capacity utilization, scheduling conflicts, vendor alerts
- **Growth** (20% weight): Demand forecast, pipeline urgency, pricing opportunities

Outputs: `BusinessHealthScore`, `BusinessAlert[]`, `topInsights[]`, and a condensed `remyContext` string.

### Proactive Alerts (`lib/intelligence/proactive-alerts.ts`)

Lightweight, fast queries (no heavy engine calls) for the most actionable items:

- Overdue payments (with days past due)
- Unanswered inquiries (>48h old)
- Upcoming events missing key info (menu, guest count, location)
- Stale clients (90+ days no booking)
- Completed events with no payment collected

Surfaced on the dashboard intelligence widget.

### Smart Quote Suggestions (`lib/intelligence/smart-quote-suggestions.ts`)

Real-time pricing suggestions when creating quotes, based on:

- Guest count similarity (40% weight)
- Occasion match (30% weight)
- Service style match (15% weight)
- Current season match (10% weight)

Returns weighted per-guest price, confidence level, historical range, and acceptance rate.

### Per-Entity Intelligence Contexts (2026-03-06)

Three targeted intelligence modules provide deep per-entity analysis:

#### Inquiry Conversion Context (`lib/intelligence/inquiry-conversion-context.ts`)

When viewing a specific inquiry, computes:

- **Conversion likelihood** (0-100%) based on similar historical inquiries
- **Pricing benchmark** (median per-guest, range) from converted events with similar profiles
- **Pipeline position** (rank among all open inquiries by value/recency)
- **Average days to convert** for similar inquiry types
- **Similarity scoring**: channel (20), guest count (30), occasion (25), budget (15)

#### Event Intelligence Context (`lib/intelligence/event-context.ts`)

When viewing a specific event, computes:

- **Profitability projection** — expected margin % from similar completed events
- **Price comparison** — how this event's per-guest price compares to your average (above/below %)
- **Post-event action checklist** — payment collection, AAR, feedback request, rebooking
- **Timing insights** — final prep window, client confirmation reminders

#### Client Intelligence Context (`lib/intelligence/client-intelligence-context.ts`)

When viewing a specific client, computes:

- **Churn risk** — 4-factor score (recency 0-40, interval deviation 0-30, frequency decline 0-20, value decline 0-10)
- **Rebooking prediction** — estimated days until next booking, seasonal pattern, preferred occasion
- **Revenue trajectory** — growing/stable/declining trend, events per year, avg event value

### List-Level Intelligence Summaries (2026-03-06)

Two lightweight engines provide aggregate intelligence at the list level:

#### Pipeline Summary (`lib/intelligence/pipeline-summary.ts`)

Aggregate pipeline intelligence for the inquiry list page:

- **Total pipeline value** and **expected conversion value** (pipeline x historical rate)
- **Historical conversion rate** from last 200 closed inquiries
- **Average days to convert** for similar inquiry types
- **Urgent count** — inquiries needing response (12+ hours unanswered)
- **Week-over-week trend** — new inquiry volume comparison

#### Events Financial Summary (`lib/intelligence/events-financial-summary.ts`)

Aggregate financial intelligence for the events list page:

- **Upcoming revenue** (next 30 days confirmed/paid events)
- **Month-to-date revenue** with average margin percent
- **Year-to-date revenue** with year-over-year growth comparison
- **Events per month** average from last 12 months

## Integration Points

Intelligence is wired into **14 surfaces**:

1. **Intelligence Hub** (`/intelligence`) — Full 25-engine dashboard with card-per-engine layout
2. **Remy AI (global)** — Business health summary injected into Remy's system prompt
3. **Remy AI (per-inquiry)** — Conversion likelihood, pricing benchmark, pipeline position
4. **Remy AI (per-event)** — Profitability projection, price comparison, insights
5. **Remy AI (per-client)** — Churn risk, rebooking prediction, seasonal patterns, revenue trend
6. **Chef Dashboard** — Intelligence section streams via Suspense: health scores, proactive alerts, key insights
7. **Quote Form** — Smart pricing hint with "Use" button to apply suggested price
8. **Quote List** — Acceptance rate insights, expiring quotes, pricing model comparison
9. **Event Form** — Prep time estimate bar with phase breakdown
10. **Inquiry List** — Pipeline summary bar: pipeline value, conversion rate, week trend, urgent count
11. **Inquiry Detail** — Conversion intelligence panel: likelihood %, pipeline rank, pricing benchmark
12. **Event List** — Financial summary bar: upcoming revenue, month revenue, YTD with growth, pace
13. **Event Detail** — Event intelligence panel: expected margin, price vs average, post-event actions
14. **Client Profile** — Relationship intelligence panel: churn risk, rebooking forecast, revenue trajectory
15. **Calendar** — Scheduling insights bar: burnout warnings, optimal spacing, best performance day
