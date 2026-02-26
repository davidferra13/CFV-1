# Build 11: Analytics Reporting + Export

## What Was Built

A suite of analytics pages under `/analytics/` that surfaces revenue trends, client lifetime value, demand patterns, pipeline forecasting, year-over-year comparisons, and stage conversion funnels. The centrepiece is a Custom Report Builder where chefs can configure entity, metric, grouping, date range, and chart type to generate ad hoc reports rendered with Recharts.

## Files Created / Modified

| File                                               | Role                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `app/(chef)/analytics/reports/page.tsx`            | Custom Report Builder page                                                   |
| `components/analytics/report-builder.tsx`          | Interactive config UI + chart output for custom reports                      |
| `lib/analytics/custom-report.ts`                   | `runCustomReport(config)` — builds dynamic Supabase query from config object |
| `app/(chef)/analytics/benchmarks/page.tsx`         | Benchmark dashboard comparing chef metrics to platform averages              |
| `app/(chef)/analytics/client-ltv/page.tsx`         | Client lifetime value breakdown page                                         |
| `app/(chef)/analytics/demand/page.tsx`             | Demand heatmap page (day-of-week × month grid)                               |
| `app/(chef)/analytics/pipeline/page.tsx`           | Pipeline forecast page                                                       |
| `components/analytics/yoy-cards.tsx`               | Year-over-year comparison cards with trend arrows                            |
| `components/analytics/stage-conversion-funnel.tsx` | Funnel chart: inquiry → quote → accepted → paid                              |
| `lib/analytics/year-over-year.ts`                  | Server action computing YoY deltas for key metrics                           |
| `lib/analytics/stage-conversion.ts`                | Server action computing conversion rates across FSM stages                   |
| `lib/analytics/revenue-forecast.ts`                | Server action projecting forward revenue from pipeline data                  |

## How It Works

- `ReportBuilder` exposes five config controls: entity (`events` / `clients` / `expenses`), metric (`revenue` / `count` / `avg`), groupBy (`month` / `client` / `event_type`), date range (`last_30d` / `90d` / `6m` / `1y` / `custom`), and chart type (`bar` / `line` / `pie`). On "Run Report", it calls `runCustomReport(config)` and pipes the result into a Recharts chart.
- `runCustomReport` in `lib/analytics/custom-report.ts` builds a Supabase query dynamically: selects the correct table based on entity, applies a `created_at` range filter based on date range, groups and aggregates based on metric + groupBy. Returns `{ labels: string[], values: number[] }`.
- `YoYCards` calls `getYearOverYearMetrics()` which computes total revenue, event count, new client count, and average event value for the current calendar year and the prior year, returning deltas and percentage changes. Cards show a green up-arrow or red down-arrow with the percentage delta.
- `StageConversionFunnel` calls `getStageConversion()` which counts how many inquiries entered each FSM stage (`proposed` → `accepted` → `paid` → `confirmed`) within a rolling 90-day window. The funnel chart shows absolute counts and the drop-off rate at each stage.
- The demand heatmap groups completed events by day-of-week and month to reveal peak booking periods. The pipeline forecast extrapolates confirmed + in-progress event revenue to project end-of-quarter totals.
- All server actions are tenant-scoped to the current chef via `requireChef()`.

## How to Test

1. Navigate to `Analytics → Reports` as a chef with at least a few completed events.
2. Configure a report: entity = Events, metric = Revenue, groupBy = Month, date range = Last 6 months, chart = Bar. Click "Run Report" — confirm a bar chart renders with monthly revenue bars.
3. Switch chart type to Line — confirm the same data renders as a line chart without re-querying.
4. Navigate to `Analytics → Benchmarks` — confirm YoY cards render with up/down trend arrows.
5. Navigate to `Analytics → Pipeline` — confirm the stage conversion funnel shows counts at each stage.
6. Navigate to `Analytics → Demand` — confirm the heatmap grid renders with darker cells on peak days/months.
7. Verify all pages return no data (empty state) rather than errors for a brand-new chef with zero events.
