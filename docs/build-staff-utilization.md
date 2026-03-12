# Staff Utilization Report (#34)

Built: 2026-03-12

## What It Does

Shows per-staff utilization metrics: scheduled vs actual hours, utilization percentage, labor costs per event, no-show tracking, and performance ratings. Helps identify overworked and underutilized staff.

## Architecture

### Engine (`lib/staff/utilization-report.ts`)

`getStaffUtilizationReport(startDate, endDate)` aggregates data from:

- `staff_members` (roster)
- `event_staff_assignments` (scheduled/actual hours per event)
- `staff_clock_entries` (punch clock hours as fallback)
- `staff_performance_scores` (ratings, on-time rate)

Actual hours come from `event_staff_assignments.actual_hours` first, falling back to `staff_clock_entries.total_minutes` if no assignment hours recorded.

### Metrics per Staff

| Metric          | Source                                         |
| --------------- | ---------------------------------------------- |
| Scheduled hours | Sum of event_staff_assignments.scheduled_hours |
| Actual hours    | Sum of actual_hours (or clock entries)         |
| Utilization %   | actual / scheduled \* 100                      |
| Labor cost      | Sum of pay_amount_cents (or hours \* rate)     |
| Avg cost/event  | labor cost / completed events                  |
| Events assigned | Count of assignments in range                  |
| No-shows        | Count where status = 'no_show'                 |
| Rating          | From staff_performance_scores                  |

### Alerts

- Overworked: utilization > 110% (working more than scheduled)
- No-shows: any staff with no_show status in the period

## Files

| File                                                  | Purpose                      |
| ----------------------------------------------------- | ---------------------------- |
| `lib/staff/utilization-report.ts`                     | Server action + types        |
| `app/(chef)/staff/utilization/page.tsx`               | Server page with date range  |
| `app/(chef)/staff/utilization/utilization-client.tsx` | Client UI with table + cards |
| `components/navigation/nav-config.tsx`                | Added nav link under Staff   |

## No Migration Needed

Uses existing tables (staff_members, event_staff_assignments, staff_clock_entries, staff_performance_scores).
