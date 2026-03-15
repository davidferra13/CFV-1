# Capacity Planning System

## What Changed

Added a time-block-based capacity planning system for private chefs. Unlike standard service businesses, private chefs need significant buffer time for prep, travel, shopping, and cleanup. This system accounts for all of that.

## New Files

| File                                                            | Purpose                                              |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| `supabase/migrations/20260401000010_chef_capacity_planning.sql` | Creates `chef_capacity_settings` table with RLS      |
| `lib/scheduling/capacity-planning-actions.ts`                   | 7 server actions for capacity management             |
| `components/scheduling/capacity-settings-form.tsx`              | Settings form with blocked days, time blocks, limits |
| `components/scheduling/capacity-calendar.tsx`                   | Monthly calendar with day detail drill-down          |

## Database

New table: `chef_capacity_settings` (one row per chef, UNIQUE on tenant_id)

- Event count limits (daily, weekly)
- Default time blocks: prep hours, travel minutes, shopping hours, cleanup hours
- Buffer between events
- Blocked days (recurring, by day name)
- Full RLS scoped to tenant

## Server Actions

1. `getCapacityPlanningSettings()` - Get or create defaults
2. `updateCapacityPlanningSettings(data)` - Save changes
3. `getDateAvailability(date)` - Single day: events, time blocks, conflicts, remaining capacity
4. `getWeekAvailability(weekStart)` - 7-day view
5. `getMonthCapacity(year, month)` - Calendar month: event counts and status per day
6. `checkBookingConflict(date, time, duration)` - Would a new event conflict? Checks daily/weekly limits, blocked days, and time block overlaps
7. `getCapacityUtilization(dateRange)` - Utilization percentage over a date range

## How Time Blocks Work

For each event, the system generates blocks based on the chef's settings:

```
Shopping -> Prep -> Travel -> Service -> Cleanup -> Buffer
```

When multiple events exist on the same day, the system detects overlaps between their blocks and reports conflicts. The booking conflict checker uses this to determine whether a new event can fit.

## Relationship to Existing Capacity System

The existing `capacity-actions.ts` stores basic weekly/monthly limits on the `chefs` table. This new system is a dedicated table with richer time-block modeling. They can coexist; the new system is the more complete one.

## UI Components

- **CapacitySettingsForm**: All settings in one form with validation, blocked-day toggle chips, and a summary showing total time per event
- **CapacityCalendar**: Monthly grid color-coded by status (green/yellow/red/gray). Click any day to see time blocks, committed hours, remaining capacity, and any conflicts
