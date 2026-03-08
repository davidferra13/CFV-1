# Capacity Planning Feature

**Date:** 2026-03-08
**Branch:** feature/risk-gap-closure

## What It Does

Strategic planning tool that answers: "Can I take on more work?"

Analyzes a chef's available hours, current commitments, travel time, and burnout risk. Provides actionable recommendations and a scenario planner to test "what if" scenarios before committing to additional clients.

## Architecture

### No New Database Tables

Pulls exclusively from existing data:
- `events` table (commitments, time tracking fields)
- `recurring_services` table (weekly/recurring clients)
- `chef_calendar_entries` table (blocked time, vacations)
- `chef_preferences` table (timing defaults)

### Files

| File | Purpose |
|------|---------|
| `lib/analytics/capacity-planning.ts` | Pure calculation engine (no server deps) |
| `lib/analytics/capacity-actions.ts` | Server actions, data fetching |
| `app/(chef)/analytics/capacity/page.tsx` | Full capacity planning page |
| `components/analytics/capacity-charts.tsx` | Recharts chart components (client) |
| `components/dashboard/capacity-widget.tsx` | Mini dashboard widget |

### Integration Points

- **Nav:** Added to Intelligence section in `components/navigation/nav-config.tsx`
- **Dashboard:** Added as `capacity` widget in `lib/scheduling/types.ts` widget system
- **Dashboard page:** Fetches `getCapacitySnapshot()` in parallel with other data

## Key Metrics

- **Utilization %**: weekly hours used / available, color-coded (green <60%, yellow 60-80%, red >80%)
- **Burnout Risk**: low/moderate/high based on utilization, consecutive work days, rest day frequency
- **Additional Capacity**: how many more events or meal prep clients could fit

## Calculation Details

- **Admin overhead**: estimated at 18% of cooking/service time (shopping, planning, invoicing)
- **Default event hours**: 5h when no time tracking data exists
- **Default meal prep hours**: 3h per weekly client
- **Weekly hours available**: defaults to 40h
- **Burnout thresholds**: high at 85%+, moderate at 65%+

## Charts (Recharts)

1. **Utilization Gauge** - SVG half-circle gauge
2. **Time Breakdown Pie** - hours by category (cooking, prep, travel, shopping, admin)
3. **Weekly Trend Area** - 12-week utilization history
4. **Calendar Heatmap** - 90-day activity grid (GitHub-style)
5. **Commitments Bar** - horizontal bar showing recurring vs one-off vs travel vs admin
6. **Scenario Planner** - interactive sliders that recompute utilization in real-time

## Scenario Planner

Client-side only. Uses `simulateAdditionalLoad()` from the calculation engine to project:
- New utilization %
- Updated burnout risk
- Remaining capacity after additions
- Context-specific recommendations
