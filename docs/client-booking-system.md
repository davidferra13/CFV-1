# Client-Facing Booking System

**Date:** 2026-03-09
**Branch:** `feature/risk-gap-closure`

## What Changed

Added a Calendly-style multi-step booking experience to the existing `/book/[chefSlug]` page. Chefs who configure **event types** (bookable services) get the new multi-step flow. Chefs without event types keep the existing two-step flow (calendar + form).

## New Database Tables

Migration: `supabase/migrations/20260330000100_client_booking_system.sql`

| Table                        | Purpose                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `booking_event_types`        | Bookable services (Tasting, Dinner Party, Cooking Class, etc.) with duration, pricing, guest ranges, buffers, notice periods |
| `booking_availability_rules` | Weekly recurring availability (day of week + time window)                                                                    |
| `booking_date_overrides`     | Specific date blocks or extra availability windows                                                                           |
| `booking_daily_caps`         | Max events per day/week limits                                                                                               |

All tables have RLS policies scoped to chef ownership.

## New Multi-Step Booking Flow

When a chef has active event types, clients see:

1. **Select Service** - cards showing each event type with name, description, duration, price, guest range
2. **Pick Date** - calendar grid with availability color coding (green = available, gray = blocked)
3. **Pick Time** - time slots computed from availability rules, existing events, buffers, and daily caps (grouped by morning/afternoon/evening)
4. **Your Details** - form: name, email, phone, guest count, occasion, address, dietary notes, message
5. **Confirm** - full summary + optional deposit payment via Stripe (instant-book mode)
6. **Success** - confirmation message

Progress indicator shows step completion. Each step has a Back button.

## Backward Compatibility

Chefs without event types still see the existing `BookingPageClient` (calendar + form). No breaking changes.

## New Files

### Server Actions

- `lib/booking/event-types-actions.ts` - CRUD for event types (chef-side) + public read
- `lib/booking/availability-actions.ts` - Availability rules, date overrides, daily caps (chef-side) + public time slot computation

### API Routes

- `app/book/[chefSlug]/availability/slots/route.ts` - Public API for time slots (resolves slug, returns computed slots)

### Components

- `components/booking/booking-flow.tsx` - Multi-step flow orchestrator
- `components/booking/service-selector.tsx` - Step 1: service card grid
- `components/booking/date-picker.tsx` - Step 2: calendar with availability
- `components/booking/time-slots.tsx` - Step 3: time slot grid (morning/afternoon/evening groups)
- `components/booking/booking-details-form.tsx` - Step 4: contact + event details form
- `components/booking/booking-confirmation.tsx` - Step 5: summary + submit/pay

### Layout

- `app/book/layout.tsx` - Minimal layout (no auth, no nav)

### Modified Files

- `app/book/[chefSlug]/page.tsx` - Now conditionally renders new flow or legacy flow

## Time Slot Computation Logic

`getAvailableSlots()` considers:

1. Event type duration and buffer times
2. Minimum notice hours
3. Date overrides (full-day blocks or custom windows)
4. Manual availability blocks (`chef_availability_blocks`)
5. Weekly availability rules
6. Daily event caps
7. Existing event overlap (with buffer awareness)

Slots are generated at 30-minute intervals within the available window.

## Cache Strategy

- Chef profile + event types: `unstable_cache` with 300s TTL, tag `chef-booking-profile`
- Availability API: `Cache-Control: public, s-maxage=300`
- Time slots API: `Cache-Control: public, s-maxage=60`

All caches busted by `revalidateTag('chef-booking-profile')` on settings changes.

## Future Work

- Chef settings UI for managing event types (create/edit/delete)
- Chef settings UI for weekly availability rules
- Chef settings UI for date overrides and daily caps
- Integration with chef_scheduling_rules for blocked days of week
