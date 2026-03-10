# Staff Shift Scheduling (Feature U8)

## Overview

Weekly schedule builder for staff. Assign shifts to team members across a 7-day grid, manage availability preferences, handle shift swap requests, and track labor costs in real time.

## Database Tables

All tables are tenant-scoped with RLS policies.

### `shift_templates`

Reusable shift patterns (e.g. "Morning", "Evening", "Split Day"). Stores start/end times, break duration, and display color. Templates populate the shift form when creating new shifts.

### `scheduled_shifts`

Individual shift assignments linking a staff member to a specific date and time range. Supports roles (cook, server, prep, dishwasher, manager, driver) and statuses (scheduled, confirmed, swap_requested, covered, cancelled).

### `staff_availability`

Weekly availability preferences per staff member. Each record maps a staff member + day of week (0=Sunday through 6=Saturday) to available/unavailable with optional preferred time ranges.

### `shift_swap_requests`

Swap/coverage requests. A staff member requests to swap a shift, another staff member claims it, and the manager approves or denies. Status flow: open -> claimed -> approved/denied.

## Server Actions

Located at `lib/scheduling/shift-actions.ts`. All actions use `requireChef()` and derive `tenantId` from the authenticated session.

### Template CRUD

- `getShiftTemplates()`, `createShiftTemplate()`, `updateShiftTemplate()`, `deleteShiftTemplate()`

### Shift Management

- `createShift()`, `updateShift()`, `deleteShift()`
- `getWeeklySchedule(weekStart)` - all shifts for a 7-day window, grouped by date and staff
- `getStaffSchedule(staffMemberId, weekStart)` - one person's week view
- `publishWeek(weekStart)` - marks all "scheduled" shifts as "confirmed" for the week
- `copyWeekSchedule(fromWeek, toWeek)` - duplicates an entire week's shifts to another week
- `autoFillWeek(weekStart)` - generates shifts deterministically based on staff availability and templates. Skips unavailable days, uses preferred times when set, avoids duplicating existing shifts.

### Availability

- `setAvailability()` - upserts a single day's availability for a staff member
- `getAvailability(staffMemberId)` - one person's 7-day availability
- `getAllAvailability()` - full team availability matrix

### Swap Requests

- `requestSwap(shiftId, reason)` - creates a swap request and marks the shift as swap_requested
- `claimSwap(swapId, coveringStaffId)` - another staff member volunteers to cover
- `approveSwap(swapId)` - manager approves; transfers shift to covering staff
- `denySwap(swapId)` - manager denies; restores shift to scheduled status
- `getOpenSwaps()` - lists all open and claimed swap requests

### Labor Cost (Formula, not AI)

- `getWeeklyLaborCost(weekStart)` - total cost in cents, total hours, and per-staff breakdown. Calculated as (end - start - break) \* hourly_rate_cents for each non-cancelled shift.
- `getLaborCostByDay(weekStart)` - daily cost breakdown for the 7-day window.

## UI Components

### `components/scheduling/weekly-schedule.tsx`

7-column grid (Mon-Sun) with rows per staff member. Shift blocks colored by role. Click empty cells to add shifts (template picker or custom times). Click existing shifts to edit/delete. Unavailable cells show gray striped background. Week navigation, Copy Week, Auto-Fill, and Publish buttons. Labor cost summary bar at bottom showing daily and weekly totals.

### `components/scheduling/shift-swap-board.tsx`

List of open swap requests. "I Can Cover This" button per swap with staff member selector. Manager approve/deny controls for claimed swaps. All state changes have optimistic updates with rollback on failure.

### `components/scheduling/availability-editor.tsx`

7-day grid per staff member with toggle buttons for available/unavailable. Preferred time range inputs for available days. Team overview table showing all staff availability at a glance.

## Pages

- `/scheduling/shifts` - weekly schedule builder (main page)
- `/scheduling/availability` - availability management
- `/scheduling/swaps` - swap request board

All pages are linked with breadcrumb navigation and cross-links.

## Migration

File: `supabase/migrations/20260331000022_staff_shift_scheduling.sql`

Additive only. Creates 4 new tables with indexes, RLS policies, and updated_at triggers.

## Design Decisions

- **Formula over AI**: Labor cost is pure math (hours \* rate). No Ollama dependency.
- **Deterministic auto-fill**: Uses availability preferences and templates, not AI generation.
- **tenant_id from session**: All actions derive tenant scope from `requireChef()`, never from request body.
- **Optimistic UI with rollback**: Every mutation has try/catch with state rollback and user-visible error feedback.
- **Staff table uses chef_id**: The `staff_members` table uses `chef_id` while scheduling tables use `tenant_id`. Both reference `chefs(id)`. Actions handle this correctly.
