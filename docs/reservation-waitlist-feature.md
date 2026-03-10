# Reservation Management & Walk-In Waitlist

**Date:** 2026-03-10
**Branch:** feature/risk-gap-closure
**Status:** Implemented

## What Changed

Two features added for the Restaurant archetype:

### Feature 1: Full Reservation Management

Expanded the existing read-only reservation system into a full CRUD workflow with status management.

**Server Actions** (`lib/guests/reservation-actions.ts`):

- `createReservation` - Create with guest lookup/creation (by phone/email) and optional confirmation email
- `updateReservation` - Edit reservation details
- `cancelReservation` - Cancel with optional reason appended to notes
- `seatReservation` - Mark as seated, assign table, update table status
- `completeReservation` - Mark completed, auto-record guest visit
- `markNoShow` - Mark no-show, auto-tag guest with "no-show" tag
- `getReservationsForDate` - All reservations for a date with guest details and tags/comps
- `getUpcomingReservations` - Next N days of active reservations
- `getAvailableTables` - Tables that fit party size and aren't reserved for the timeslot
- `confirmReservation` - Send confirmation email to guest

**Components**:

- `components/guests/reservation-manager.tsx` - Timeline view grouped by hour, status actions, table picker
- `components/guests/reservation-form-modal.tsx` - Guest autocomplete, table selector, confirmation email option

**Email Template** (`lib/email/templates/reservation-confirmation.tsx`):

- Formatted date, time, party size, optional table number
- Uses BaseLayout for chef branding

### Feature 2: Walk-In Waitlist

New queue management system for walk-in guests.

**Migration** (`supabase/migrations/20260331000030_waitlist_entries.sql`):

- `waitlist_entries` table with position, estimated wait, status tracking
- RLS policy scoped to chef_id
- Statuses: waiting, notified, seated, cancelled, no_show

**Server Actions** (`lib/guests/waitlist-actions.ts`):

- `addToWaitlist` - Add with auto-position and deterministic wait estimate
- `getWaitlist` - Current queue sorted by position
- `notifyGuest` - Mark as notified (table ready)
- `seatFromWaitlist` - Seat and update table status
- `removeFromWaitlist` - Remove with reason (cancelled/no_show)
- `estimateWaitTime` - Deterministic calculation based on historical turnover and queue length
- `getWaitlistStats` - Queue size, average wait, longest wait, today's seated count

**Component** (`components/guests/waitlist-panel.tsx`):

- Numbered queue with live wait time counters (auto-refresh every 30s)
- Stats bar: queue size, avg wait, longest wait, seated today
- Add walk-in form with estimated wait preview
- Notify/Seat/Remove actions per entry
- Table picker modal for seating

### Page Integration

`app/(chef)/guests/reservations/page.tsx` - Tabbed interface with "Reservations" and "Walk-In Waitlist" tabs. Replaces the previous read-only view.

## Architecture Notes

- Wait time estimation is fully deterministic (formula > AI): uses historical turnover data and party size multiplier
- All side effects (table status updates, visit recording, guest tagging) are non-blocking (try/catch, log failures)
- Guest creation during reservation is automatic if no match found by phone/email
- Table availability checks filter by capacity and existing reservations for the date
- Backward compatible: existing `ReservationForm` on guest detail page still works with updated action signatures
