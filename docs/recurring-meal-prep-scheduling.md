# Feature 1.15: Recurring Meal Prep Scheduling

## What Changed

Added recurring schedule management for weekly, biweekly, and monthly meal prep clients. Chefs can create recurring schedules tied to clients, then generate draft events in bulk from those schedules.

## Files Added

| File                                                         | Purpose                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `supabase/migrations/20260401000015_recurring_schedules.sql` | Database table with RLS, frequency CHECK constraint, tenant-client-active index |
| `lib/scheduling/recurring-actions.ts`                        | Server actions: CRUD, event generation, upcoming events query                   |
| `components/scheduling/recurring-schedule-form.tsx`          | Form for creating/editing recurring schedules                                   |
| `components/scheduling/recurring-schedules-list.tsx`         | Table view with generate, edit, toggle, delete actions                          |
| `components/dashboard/recurring-prep-widget.tsx`             | Dashboard widget showing this week's recurring preps                            |

## Architecture Decisions

- **Formula over AI:** All date math uses `date-fns` (addWeeks, addMonths, nextDay). Zero AI involvement.
- **Soft delete:** Deactivating a schedule sets `is_active = false` rather than deleting the row. This preserves history.
- **Draft events:** Generated events start in `draft` status so the chef reviews and confirms. No auto-confirmed events.
- **Client address fallback:** When generating events, uses client's stored address. Falls back to "TBD" if none exists.
- **Serve time fallback:** Uses the schedule's preferred_time, defaults to "18:00" if not set.
- **Optimistic updates:** All list mutations use optimistic UI with try/catch rollback per Zero Hallucination rules.
- **Error states:** Loading errors show error messages, never fake zeros or empty states.

## How It Works

1. Chef creates a recurring schedule: picks a client, frequency (weekly/biweekly/monthly), day of week, time, optional menu
2. Schedule calculates and stores `next_occurrence` using pure date math
3. Chef clicks "Generate Events" to create the next 4 draft events
4. `last_generated_date` and `next_occurrence` update after generation
5. Dashboard widget shows upcoming recurring preps for the next 7 days

## Tier Assignment

This is a **Pro** feature (recurring scheduling is beyond the free irreducible core). Gating should be added when the feature is wired into the UI/nav.
