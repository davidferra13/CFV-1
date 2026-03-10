# Staff Punch Clock System

Per-staff clock-in/clock-out time tracking for the Restaurant archetype.

## What it does

- Individual clock-in/clock-out per staff member with duplicate prevention
- Live elapsed-time display (updates every 30 seconds)
- Daily timesheet with all entries, including break time deductions
- Manager corrections: edit notes on entries, void (soft-delete) entries
- Weekly hours summary with overtime flagging (over 40 hours)
- Estimated pay calculation based on staff hourly rates

## Architecture

Built on the existing `staff_clock_entries` table (migration `20260312000002`). Added two columns via migration `20260331000014`:

- `role_override TEXT` - optional per-shift role (e.g., a sous chef working as a server)
- `voided BOOLEAN DEFAULT false` - soft delete for manager corrections

Also added composite index `(chef_id, clock_in_at)` for efficient date-range queries.

## Files

| File                                                              | Purpose                                                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `lib/staff/punch-clock-actions.ts`                                | Server actions (clock in/out, timesheet queries, edit/void, weekly summary) |
| `components/staff/punch-clock-panel.tsx`                          | Client component with live timers, timesheet, edit/void controls            |
| `app/(chef)/staff/time-clock/page.tsx`                            | Time clock page (server component, fetches initial data)                    |
| `app/(chef)/staff/time-clock/weekly/page.tsx`                     | Weekly hours summary with overtime flags                                    |
| `supabase/migrations/20260331000014_punch_clock_enhancements.sql` | Adds role_override, voided columns + index                                  |

## Related existing infrastructure

The punch clock actions layer sits alongside (not replacing) the existing clock infrastructure:

- `lib/staff/clock-actions.ts` - Event-scoped clock in/out with GPS
- `lib/staff/time-tracking-actions.ts` - Break management, shift queries, approval, payroll preview
- `components/staff/clock-panel.tsx` - Event-day clock panel
- `components/staff/time-clock.tsx` - Staff time clock with break support
- `app/(chef)/staff/clock/page.tsx` - Existing clock page

## Server actions

| Action                               | Description                              |
| ------------------------------------ | ---------------------------------------- |
| `punchClockIn(staffMemberId, role?)` | Clock in with duplicate prevention       |
| `punchClockOut(staffMemberId)`       | Clock out, compute duration              |
| `getActiveClocks(date?)`             | Who is currently clocked in              |
| `getTimesheetForDate(date)`          | All entries for a date                   |
| `getTimesheetForRange(start, end)`   | Date range query                         |
| `editPunchEntry(entryId, updates)`   | Manager corrections (notes, times, role) |
| `deletePunchEntry(entryId)`          | Soft delete (voided = true)              |
| `getWeeklyHoursSummary(weekStart)`   | Per-staff weekly totals with OT flags    |

All actions use `requireChef()` for auth and derive `tenant_id` from the session.
