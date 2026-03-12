# Build: Analytics Drill-Down (#16)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #16 Analytics Drill-Down & Custom Date Ranges (build order #26)

## What Changed

Added date range picker with presets and custom ranges, drill-through links from stat cards to detail pages, CSV export for key data tables, and period comparison toggle.

### What Already Existed

- `components/analytics/analytics-hub-client.tsx` - 1149-line hub with 9 tabs, 40+ metrics, recharts
- `app/(chef)/analytics/page.tsx` - Server page fetching all analytics in parallel via Promise.allSettled
- 12 specialist drill-down pages (benchmarks, client-ltv, funnel, demand, pipeline, etc.)
- 30+ analytics action files covering client, pipeline, revenue, operations, marketing, social, culinary
- All data-fetching already parameterized with `start`/`end` dates

### New Files

1. **`components/analytics/date-range-picker.tsx`** - Client-side date range selector:
   - 6 presets: Last 30/90/180/365 days, YTD, Previous year
   - Custom date range inputs
   - "vs previous period" comparison toggle
   - URL-param-based (server component re-fetches with new dates)
   - `getComparisonRange()` utility for computing previous period dates

2. **`lib/analytics/export.ts`** - Client-side CSV export utilities:
   - `downloadCsv()` - Generic CSV generation + download
   - `exportRevenueByType()` - Revenue by event type
   - `exportRevenueByDay()` - Revenue by day of week
   - `exportClientList()` - Client revenue ranking
   - `exportFunnel()` - Inquiry funnel stages

### Modified Files

3. **`app/(chef)/analytics/page.tsx`** (enhanced):
   - Now reads `start`, `end`, `compare` from URL searchParams
   - Validates date format (YYYY-MM-DD), falls back to 12-month default
   - Added `DateRangePicker` component in header (Suspense-wrapped)
   - Page re-renders with new date range when picker changes URL

4. **`components/analytics/analytics-hub-client.tsx`** (enhanced):
   - `StatCard` now accepts optional `href` prop for drill-through navigation
   - Cards with hrefs show a chevron icon on hover, cursor pointer, background highlight
   - Added `ExportButton` component for CSV download triggers
   - Added drill-through links to 12 stat cards across Overview, Pipeline, and Clients tabs:
     - Revenue This Month -> /finance/reporting
     - Events This Month -> /events
     - NPS Score -> /analytics/benchmarks
     - Events YTD -> /events
     - Capacity -> /analytics/capacity
     - Inquiry->Booking -> /analytics/funnel
     - Repeat Booking -> /analytics/client-ltv
     - Quote Acceptance -> /analytics/pipeline
     - Ghost Rate -> /analytics/pipeline
     - Lead Time -> /analytics/funnel
     - Active Clients -> /clients
     - At-Risk Clients -> /clients
   - Added CSV export buttons to Revenue by Day of Week, Revenue by Event Type, and Inquiry Funnel charts

## Design Decisions

- **URL-param-based dates**: Enables sharing links with specific date ranges. Server component re-fetches all data with new dates automatically.
- **Presets first**: Most chefs won't use custom ranges. Presets cover 95% of use cases with one click.
- **Drill links on StatCard**: Minimal change, maximum impact. Every stat card can now optionally be a link to its detail page.
- **Client-side CSV**: No server action needed. Data is already on the client from the hub props. Downloads happen instantly.
- **Comparison toggle**: Adds `compare=1` to URL. Foundation for future period-over-period rendering (comparison data available server-side via `getComparisonRange()`).
