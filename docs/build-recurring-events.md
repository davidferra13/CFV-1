# Recurring Events - Build Notes

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap item:** #2

## What was built

Recurring event series that let chefs set up repeating service schedules (weekly, biweekly, monthly) and auto-generate draft events for each occurrence.

### Database

- **Migration:** `20260401000004_event_series_recurrence_rule.sql`
- **Change:** Added `recurrence_rule JSONB` column to existing `event_series` table
- Additive only, no existing data modified

### Recurrence Engine

- **File:** `lib/booking/recurrence-engine.ts`
- Pure deterministic logic (Formula > AI)
- `RecurrenceRuleSchema` (Zod): frequency, days_of_week, day_of_month, meal_slot, start/end time
- `generateRecurrenceDates()`: expands a rule into concrete dates within a range
- `describeRecurrence()`: human-readable summary ("Weekly on Mon, Wed")
- Handles edge cases: months shorter than target day, biweekly week tracking, max 200 dates

### Server Actions

- **File:** `lib/booking/recurring-actions.ts`
- `createRecurringSeries()`: creates series record + service sessions + draft events in one operation
  - Activity logging (non-blocking)
  - State transitions for each generated event
  - Session-to-event linking
- `previewRecurrence()`: shows how many events a rule would generate before committing

### UI Components

- **Recurrence Picker:** `components/events/recurrence-picker.tsx`
  - Day-of-week toggle buttons for weekly/biweekly
  - Day-of-month input for monthly
  - Meal slot and time selection
  - Live preview badge showing event count
  - Toggle to enable/disable recurrence

- **Recurring Series Form:** `components/events/recurring-series-form.tsx`
  - Full form: client, title, dates, recurrence, location, pricing, notes
  - Uses the recurrence picker
  - Toast feedback on success/failure
  - Redirects to events list on success

- **New Recurring Series Page:** `app/(chef)/events/new/recurring/page.tsx`
  - Linked from the new event page ("Recurring client? Create a series")

## How it connects

- Builds on existing `event_series` table (service_mode='recurring')
- Builds on existing `event_service_sessions` table
- Generated events link back to series via `event_series_id` and `source_session_id`
- Events appear in the regular events list, calendar, and all existing event flows
- Each generated event starts as 'draft' with proper state transitions logged

## Architecture decisions

- **Formula > AI**: The recurrence engine is pure math/logic. No LLM calls.
- **Separate form**: Recurring series has its own creation flow (not shoehorned into the single-event form) because the data model is fundamentally different (series + sessions + events).
- **Per-session pricing**: The form collects price-per-session and calculates total for the series.
- **Draft events**: All generated events start as drafts so the chef can review and customize each one.
