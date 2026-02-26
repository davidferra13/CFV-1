# Clientele Intelligence

**Implemented:** 2026-02-19
**Route:** `/insights`
**Nav position:** `standaloneTop` — between Activity and Network

---

## What It Is

A dedicated analytics page giving chefs a comprehensive statistical view of their clientele and business patterns. Separate from the existing `/analytics` page (which covers source attribution), this page surfaces patterns across **four domains**:

| Tab                  | Focus                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| **Clientele**        | Dining time preferences, occasions, service styles, guest counts, dietary restrictions          |
| **Seasons & Trends** | Monthly volume, day-of-week patterns, 18-month revenue trend                                    |
| **Client Base**      | Acquisition sources, client status, loyalty tiers, retention rate, lifetime value distribution  |
| **Operations**       | Phase time efficiency, AAR quality ratings over time, top forgotten items, financial benchmarks |

---

## Why It Was Built

Chefs accumulate rich data about their clients over time but had no way to surface patterns across it. The goal is to answer questions like:

- "When do my clients normally want to eat dinner?"
- "Which months are my busiest — and my slowest?"
- "What occasions do people most commonly celebrate with me?"
- "How often do clients come back? What percentage repeat?"
- "Which service style commands the highest event value?"
- "What do I keep forgetting to pack?"
- "Is my calm rating improving over time?"

---

## Architecture

### No Migration Required

All data needed was already present in the schema. No new tables, columns, or views were created.

**Key columns used:**

| Source                 | Columns                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events`               | `serve_time`, `occasion`, `service_style`, `guest_count`, `dietary_restrictions[]`, `event_date`, `quoted_price_cents`, `tip_amount_cents`, `time_*_minutes`, `status` |
| `clients`              | `referral_source`, `status`, `loyalty_tier`, `dietary_restrictions[]`, `total_events_count`, `last_event_date`, `lifetime_value_cents`                                 |
| `after_action_reviews` | `calm_rating`, `preparation_rating`, `execution_rating`, `forgotten_items[]`, `created_at`                                                                             |
| `ledger_entries`       | `entry_type`, `amount_cents`, `created_at`                                                                                                                             |

### No RPC / No DB-side Aggregation

All aggregation is performed in JavaScript after fetching minimally-scoped rows from Supabase. This matches the established pattern in `lib/partners/analytics.ts` and avoids the complexity of Postgres functions or views. The data volumes for a solo chef are small enough that client-side aggregation is fast and pragmatic.

### Tenant Isolation

Every query includes `.eq('tenant_id', user.tenantId!)`. No chef can see another chef's data.

---

## Files

| File                                       | Role                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `lib/analytics/insights-actions.ts`        | 14 `'use server'` actions — all data fetching and JS aggregation                                 |
| `components/analytics/insights-charts.tsx` | 18 Recharts chart components with `'use client'`                                                 |
| `components/analytics/insights-client.tsx` | Tab state management and layout (`'use client'`)                                                 |
| `app/(chef)/insights/page.tsx`             | Server component — `Promise.all` of 14 parallel fetches                                          |
| `components/navigation/nav-config.tsx`     | Modified — added `{ href: '/insights', label: 'Insights', icon: TrendingUp }` to `standaloneTop` |

---

## Server Actions (`lib/analytics/insights-actions.ts`)

| Function                           | Tab         | Data Source                                                        | What It Returns                                          |
| ---------------------------------- | ----------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `getDinnerTimeDistribution()`      | Clientele   | `events.serve_time`                                                | Hour buckets 11am–11pm with event count                  |
| `getOccasionStats()`               | Clientele   | `events.occasion, quoted_price_cents`                              | Top 12 occasions with count + avg revenue                |
| `getServiceStyleDistribution()`    | Clientele   | `events.service_style`                                             | Enum counts (plated, family style, etc.)                 |
| `getGuestCountDistribution()`      | Clientele   | `events.guest_count`                                               | Histogram in 7 buckets (1–2 through 21+)                 |
| `getDietaryRestrictionFrequency()` | Clientele   | `events.dietary_restrictions[]` + `clients.dietary_restrictions[]` | Top 15 restrictions by frequency                         |
| `getMonthlyEventVolume()`          | Seasons     | `events.event_date, status, quoted_price_cents`                    | 12 calendar months with event count + revenue            |
| `getDayOfWeekDistribution()`       | Seasons     | `events.event_date`                                                | 7-day breakdown Sun–Sat                                  |
| `getMonthlyRevenueTrend(18)`       | Seasons     | `ledger_entries.amount_cents, entry_type`                          | Rolling 18-month net revenue per period                  |
| `getClientAcquisitionStats()`      | Client Base | `clients.referral_source, status, loyalty_tier`                    | Three breakdowns: source, status, loyalty tier           |
| `getRetentionStats()`              | Client Base | `clients.total_events_count, last_event_date`                      | Repeat rate, dormant count, events-per-client histogram  |
| `getClientLTVDistribution()`       | Client Base | `clients.lifetime_value_cents`                                     | 6 revenue tier buckets                                   |
| `getPhaseTimeStats()`              | Operations  | `events.time_*_minutes, guest_count`                               | Avg minutes per phase + service-min-per-guest            |
| `getAARRatingTrends(12)`           | Operations  | `after_action_reviews.*`                                           | Monthly avg calm/prep/exec ratings + top forgotten items |
| `getFinancialIntelligenceStats()`  | Operations  | `events.occasion, service_style, tip_amount_cents`                 | Revenue by occasion, avg value by style, tip rate        |

---

## Charts (`components/analytics/insights-charts.tsx`)

All charts follow the `source-charts.tsx` pattern:

- `'use client'` directive
- Same `COLORS` palette
- `EmptyChart` fallback for zero-data states
- `ResponsiveContainer` wrapper

| Chart                       | Type                  | Key Behavior                                                          |
| --------------------------- | --------------------- | --------------------------------------------------------------------- |
| `DinnerTimeChart`           | `BarChart`            | Highlights 5–8pm in darker violet                                     |
| `OccasionChart`             | `BarChart` horizontal | Occasions sorted by count                                             |
| `ServiceStylePieChart`      | `PieChart`            | Percentage labels                                                     |
| `GuestCountHistogram`       | `BarChart`            | 7 party-size buckets                                                  |
| `DietaryFrequencyChart`     | `BarChart` horizontal | Top 15 with 120px label column                                        |
| `MonthlyVolumeChart`        | `ComposedChart`       | Dual Y-axis: event count (left) + revenue line (right)                |
| `DayOfWeekChart`            | `BarChart`            | Fri/Sat/Sun highlighted in darker cyan                                |
| `RevenueTrendChart`         | `AreaChart`           | Gradient fill, handles refunds as negative                            |
| `AcquisitionSourcePieChart` | `PieChart`            | Client referral sources                                               |
| `ClientStatusChart`         | `BarChart` horizontal | Color-coded per status                                                |
| `LoyaltyTierPieChart`       | `PieChart`            | Tier-specific colors (gold, silver, etc.)                             |
| `EventsPerClientHistogram`  | `BarChart`            | How many clients have 1, 2, 3… events                                 |
| `LTVDistributionChart`      | `BarChart`            | Revenue tier buckets                                                  |
| `PhaseTimeChart`            | `BarChart` horizontal | Color-coded per phase (yellow=shopping, purple=prep, etc.)            |
| `AARRatingTrendChart`       | `LineChart`           | 3 lines (calm=green, prep=purple, exec=amber), `connectNulls={false}` |
| `ForgottenItemsChart`       | `BarChart` horizontal | Red bars — most often forgotten                                       |
| `RevenueByOccasionChart`    | `BarChart` horizontal | Grouped: total revenue + avg per event                                |
| `StyleValueChart`           | `BarChart`            | Avg event value by service format                                     |

---

## Implementation Notes

### `serve_time` parsing

Supabase returns PostgreSQL `TIME` as a string `"HH:MM:SS"`. Parsed with `parseInt(serve_time.slice(0, 2), 10)`.

### `event_date` parsing

Dates returned as `"YYYY-MM-DD"`. Parsed as `new Date(dateStr + 'T00:00:00')` to avoid timezone shifts.

### `execution_rating` nullability

`execution_rating` on `after_action_reviews` is nullable (optional field). Handled with null checks before averaging; `connectNulls={false}` on the Recharts `Line` ensures gaps don't falsely bridge to adjacent months.

### Revenue trend sign

Ledger entries with `entry_type === 'refund'` are subtracted (negative) so refunds correctly reduce monthly revenue totals.

---

## Connections to Existing Systems

- **Event FSM** — stats filter by `status` (e.g., `completed`, `confirmed`) where appropriate
- **Ledger entries** — used for the revenue trend (immutable, append-only, source of truth for cash received)
- **After-action reviews** — used for quality trend and forgotten items analysis
- **Client financial summary** — `total_events_count` and `lifetime_value_cents` are maintained by DB triggers (no manual computation needed)
- **Loyalty** — `loyalty_tier` from `clients` table surfaces in the Client Base tab

---

## Extending This

To add a new statistic:

1. Add a server action to `lib/analytics/insights-actions.ts` (export a type + function)
2. Add a chart component to `components/analytics/insights-charts.tsx`
3. Add the prop to `InsightsClientProps` in `insights-client.tsx`
4. Place it in the appropriate tab panel
5. Add the fetch call to `Promise.all` in `app/(chef)/insights/page.tsx`
