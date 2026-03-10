# Peak Hour Analytics

Dedicated dashboard for the Restaurant archetype that surfaces hourly sales patterns, staffing gaps, and weekly trends.

## Route

`/commerce/analytics/peak-hours`

Requires Chef auth + Pro (commerce module).

## Server Actions (`lib/commerce/peak-hour-actions.ts`)

| Action                      | Purpose                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `getHourlyBreakdown(date)`  | Sales count, revenue, avg ticket, covers per hour for a single date                    |
| `getWeeklyHourlyAverage()`  | Average sales per hour across the last 7 days                                          |
| `getPeakHours(days?)`       | Identifies peak hours (1.5x+ average) over configurable lookback (default 30 days)     |
| `getHourlyCoverCount(date)` | Guest covers per hour for a single date                                                |
| `getStaffingVsVolume(date)` | Compares staff clocked in per hour vs order volume, generates staffing recommendations |
| `getWeeklyHeatmap()`        | 7-day x 24-hour grid of order counts for pattern spotting                              |

All computations are deterministic. No Ollama or AI dependency. All monetary values in cents.

## UI (`components/commerce/peak-hour-dashboard.tsx`)

- **Date picker** to select a specific day
- **Hourly bar chart** with CSS bars (no chart library), peak hours highlighted, average line overlay
- **Detail table** with Hour, Orders, Revenue, Avg Ticket, Covers columns (peak hours flagged)
- **Weekly heatmap** showing 7-day x 18-hour grid (6am-11pm) with color intensity
- **Staffing vs. volume** table with actionable recommendations when orders/staff ratio is high
- **7-day averages** table for trend context

Uses `startTransition` with `try/catch` and rollback on failure per Zero Hallucination rules.

## Staffing Recommendations

Generated deterministically when orders-per-staff exceeds 15/hr. The system suggests adding staff based on a target of 12 orders per staff member per hour. Also flags hours where orders exist but no staff are clocked in.

## Data Sources

- `sales` table (orders, revenue, guest count)
- `staff_clock_entries` table (shift clock-in/out times)
- Both scoped by `tenant_id` from session
