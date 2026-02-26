# Source Analytics Dashboard

## Overview

The analytics dashboard provides visual insights into where inquiries come from, how they convert, and which sources (channels and partners) generate the most revenue. Built with Recharts for client-side chart rendering with server-side data fetching.

---

## Analytics Queries (`lib/partners/analytics.ts`)

### `getSourceDistribution(dateRange?)`

Counts inquiries grouped by `channel`. Returns `{ source, count }[]` for bar/pie charts.

- Filters by `created_at` within the date range
- Groups by channel enum values

### `getConversionRatesBySource(dateRange?)`

Funnel analysis by channel: how many inquiries from each source reach each stage.

- Counts total inquiries per channel
- Counts inquiries that were converted to events (have a linked event)
- Counts events that reached `completed` status
- Returns `{ source, inquiries, converted, completed }[]`

### `getRevenueBySource(dateRange?)`

Revenue attribution by inquiry channel.

- Joins inquiries → events → ledger computation
- Sums revenue from completed events
- Returns `{ source, revenue }[]` (amounts in cents)

### `getSourceTrends(months?)`

Monthly time series of inquiry volume by channel.

- Groups by month + channel
- Returns `{ month, [channel]: count }[]`
- Default 6 months lookback

### `getPartnerLeaderboard(dateRange?)`

Partners ranked by performance metrics.

- Total referrals (inquiry count)
- Converted events (event count)
- Revenue from completed events
- Conversion rate
- Returns `{ id, name, type, referrals, events, revenue, conversionRate }[]`

### `getTopSourcesThisMonth()`

Lightweight query for dashboard card — top 3 sources this month with counts.

---

## Dashboard Page (`app/(chef)/analytics/page.tsx`)

### Layout

Server component that fetches all analytics data in parallel, then passes to client components for chart rendering.

### Sections

1. **Source Distribution** — Horizontal bar chart showing inquiry count by channel
2. **Conversion Funnel** — Grouped bar chart: inquiries vs. converted vs. completed by source
3. **Revenue by Source** — Bar chart of revenue generated per channel
4. **Trends Over Time** — Multi-line chart showing monthly inquiry volume per source
5. **Partner Leaderboard** — Sortable table: partner name, type, referrals, events, revenue, conversion rate

### Date Range

Currently uses default ranges (current month for distribution, 6 months for trends). Date range picker can be added as a future enhancement.

---

## Chart Components (`components/analytics/`)

| Component                 | Chart Type             | Library  |
| ------------------------- | ---------------------- | -------- |
| `SourceDistributionChart` | Horizontal BarChart    | Recharts |
| `ConversionFunnelChart`   | Grouped BarChart       | Recharts |
| `RevenueBySourceChart`    | BarChart               | Recharts |
| `SourceTrendsChart`       | LineChart (multi-line) | Recharts |
| `SourcePieChart`          | PieChart               | Recharts |

All chart components are `'use client'` and receive pre-fetched data as props.

The `AnalyticsClient` wrapper (`components/analytics/analytics-client.tsx`) renders the four main charts in a responsive 2-column grid.

---

## Design Decisions

1. **Server-side data, client-side charts** — Data is fetched in the server component for security and performance. Only the rendered charts are client-side (Recharts requires DOM access).

2. **Channel-based, not partner-based primary view** — The main charts slice by `channel` (the inquiry's communication method). Partner-specific analytics live in the Partner Leaderboard table and on individual partner detail pages.

3. **Revenue uses ledger data** — Revenue figures come from completed events' ledger computations, maintaining the ledger-first principle.

4. **Recharts chosen for simplicity** — Lightweight, React-native, works well with Next.js SSR pattern. Installed via `npm install recharts`.

---

## Navigation

Analytics is accessible at `/analytics` with a `BarChart3` icon in the Operations nav group.
