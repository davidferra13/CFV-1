# Feature 4: Referral Source Analytics

## What Changed

Added a dedicated analytics page that shows referral source performance -- which sources bring the most clients, highest-value events, and best conversion rates.

## Why

Chefs need visibility into which referral channels (Instagram, website, word-of-mouth referrals, Take a Chef, etc.) generate the best business outcomes. This page consolidates inquiry funnel data, client acquisition metrics, and named referrer tracking into a single actionable view.

## No Migration Required

All data already exists in the database:

- `inquiries.channel` (inquiry_channel enum) and `inquiries.referral_source` (free text) for source tracking
- `inquiries.converted_to_event_id` for funnel progression
- `events.status` and `events.quoted_price_cents` for revenue attribution
- `clients.referral_source` (referral_source enum) and `clients.referral_source_detail` for client-level tracking
- `clients.lifetime_value_cents` for LTV analysis

## Files Created

### 1. Server Actions — `lib/analytics/referral-analytics.ts`

Five server actions, all tenant-scoped via `requireChef()`:

| Function                           | Purpose                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getReferralFunnelData()`          | Queries inquiries with channel/referral_source, joins to events via converted_to_event_id, groups by unified source label, counts progression through inquiry -> quote -> accepted -> completed stages |
| `getClientAcquisitionBySource()`   | Groups clients by referral_source enum, counts clients and computes avg/total lifetime_value_cents per source                                                                                          |
| `getTopReferrers()`                | Finds clients where referral_source='referral' AND referral_source_detail IS NOT NULL, counts clients and events per named referrer                                                                    |
| `getReferralTimeSeries(months=12)` | Groups inquiries from last 12 months by month + unified source for trend visualization                                                                                                                 |
| `getReferralAnalytics()`           | Orchestrator calling all four in Promise.all()                                                                                                                                                         |

**Unified source label logic:** Prefers `referral_source` free text over `channel` enum when both are present, with human-readable label mapping.

**Exported types:** `ReferralSourceSummary`, `ClientAcquisitionBySource`, `TopReferrer`, `ReferralTimeSeries`, `ReferralAnalyticsData`

### 2. Dashboard Component — `components/analytics/referral-analytics-dashboard.tsx`

Client component receiving `ReferralAnalyticsData` as props. Five sections:

- **Summary Stats Row** — 4 cards: Total Sources, Overall Conversion %, Total Revenue, Best Source
- **Revenue Attribution Table** — Full table with Source, Inquiries, Quoted, Accepted, Completed, Revenue, Avg Value, Conv % (with color-coded Badge). Includes horizontal bar chart via Recharts.
- **Client Acquisition** — Table showing clients per referral source with avg LTV and total LTV
- **Top Referrers** — Ranked list of named referrers from referral_source_detail with client count, event count, and revenue
- **Time Series** — Line chart (Recharts) showing inquiry trends by source over last 12 months

Uses existing UI patterns: Card/CardHeader/CardTitle/CardContent, Badge (with valid variants: success/warning/error/default), Recharts (already in project).

### 3. Page — `app/(chef)/analytics/referral-sources/page.tsx`

Server component with:

- `requireChef()` auth gate
- `getReferralAnalytics()` data fetch with `.catch(() => null)` fallback
- Breadcrumb back to /analytics
- Empty state for error case

### 4. Navigation — `components/navigation/nav-config.tsx`

Added entry under Enhanced Analytics section:

```
{ href: '/analytics/referral-sources', label: 'Referral Sources', visibility: 'advanced' }
```

## How It Connects

- Follows the same pattern as `lib/partners/analytics.ts` (source distribution, conversion, revenue queries)
- Page pattern matches `app/(chef)/analytics/benchmarks/page.tsx` (breadcrumb, server data fetch, dashboard component)
- Chart components use Recharts consistently with `components/analytics/source-charts.tsx`
- All monetary values in cents, formatted to dollars in the UI layer
- Tenant-scoped queries match project architecture requirements
