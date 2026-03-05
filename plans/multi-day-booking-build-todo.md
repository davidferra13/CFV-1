# Multi-Day Booking + Recurring Revenue Build TODO

## Goal

Ship a production booking system that supports:

1. Multi-day services with per-day/per-meal schedules.
2. Recurring services with reusable patterns.
3. Dinner Circle loops that convert to repeat bookings.

## Execution Order

1. P0 foundations (schema + API contracts).
2. P1 booking UX (public + chef workflow).
3. P2 recurring revenue automation.
4. P3 Dinner Circle repeat-booking loops.
5. Hardening (tests, migration safety, analytics, rollout).

## P0: Data Model and Contracts

- [x] Add `event_series` table for a master booking spanning multiple days.
- [x] Add `event_service_sessions` table for each scheduled meal/service block.
- [x] Add FK from `events` to `event_series` and `event_service_sessions`.
- [x] Add explicit `service_mode` enum values: `one_off`, `recurring`, `multi_day`.
- [x] Add schedule payload column on `inquiries` (`schedule_request_jsonb`) for early capture.
- [x] Add indexes for chef/date/session conflict checks.
- [x] Add RLS policies for new tables (chef-scoped, admin/service support).

### Files

- [supabase/migrations/20260330000053_event_series_and_sessions.sql](C:/Users/david/Documents/CFv1/supabase/migrations/20260330000053_event_series_and_sessions.sql)
- [types/database.ts](C:/Users/david/Documents/CFv1/types/database.ts)

## P0: Booking Action Layer

- [x] Extend inquiry schema to accept full itinerary payload.
- [x] Extend instant-book schema to accept full itinerary payload.
- [x] Persist itinerary in inquiry even before event creation.
- [x] Create `createSeriesFromBookingRequest()` server action.
- [x] Split session materialization into idempotent function so retries are safe.

### Files

- [lib/inquiries/public-actions.ts](C:/Users/david/Documents/CFv1/lib/inquiries/public-actions.ts)
- [lib/booking/instant-book-actions.ts](C:/Users/david/Documents/CFv1/lib/booking/instant-book-actions.ts)
- [lib/booking/series-planning.ts](C:/Users/david/Documents/CFv1/lib/booking/series-planning.ts)
- [lib/inquiries/actions.ts](C:/Users/david/Documents/CFv1/lib/inquiries/actions.ts)
- [lib/events/actions.ts](C:/Users/david/Documents/CFv1/lib/events/actions.ts)

## P1: Public Booking UX (Core)

- [x] Add service mode selector option: `Multi-day Service`.
- [x] Replace single-date-only assumptions with start/end date picker for multi-day mode.
- [x] Add itinerary builder rows:
- Service date
- Meal slot (`breakfast`, `lunch`, `dinner`, `late_snack`, `dropoff`)
- Service type (`on_site`, `drop_off`, `prep_only`, `hybrid`)
- Guest count
- Preferred time window
- Notes
- [x] Add template buttons:
- `Retreat Weekend`
- `Family Vacation Week`
- `Breakfast + Dinner Rotation`
- [ ] Add upload/parse placeholder (`schedule file`) and store raw text notes in v1.
- [ ] Add pricing summary that can show:
- Base estimate
- Per-session estimate
- Deposit logic for multi-day bookings

### Files

- [components/booking/booking-form.tsx](C:/Users/david/Documents/CFv1/components/booking/booking-form.tsx)
- [app/book/[chefSlug]/booking-page-client.tsx](C:/Users/david/Documents/CFv1/app/book/[chefSlug]/booking-page-client.tsx)
- [app/book/[chefSlug]/page.tsx](C:/Users/david/Documents/CFv1/app/book/[chefSlug]/page.tsx)

## P1: Availability and Conflict Engine

- [x] Update availability API to evaluate ranges, not only one date.
- [x] Add session-level conflict detection against confirmed/paid/accepted events.
- [x] Return conflict detail messages for UI (which dates/slots are blocked).
- [x] Add min-notice checks per session date.

### Files

- [app/book/[chefSlug]/availability/route.ts](C:/Users/david/Documents/CFv1/app/book/[chefSlug]/availability/route.ts)
- [lib/availability/actions.ts](C:/Users/david/Documents/CFv1/lib/availability/actions.ts)
- [lib/availability/session-conflicts.ts](C:/Users/david/Documents/CFv1/lib/availability/session-conflicts.ts)
- [lib/availability/rules-actions.ts](C:/Users/david/Documents/CFv1/lib/availability/rules-actions.ts)

## P1: Chef Backoffice Workflow

- [ ] Add “Series” card on inquiry detail showing parsed itinerary.
- [x] Add “Convert to Series” action from inquiry.
- [ ] Show generated session list with quick edits before sending proposal.
- [ ] Allow bulk status transitions for all sessions in a series.
- [ ] Add combined invoice preview for master booking + session lines.

### Files

- [app/(chef)/inquiries/[id]/page.tsx](<C:/Users/david/Documents/CFv1/app/(chef)/inquiries/[id]/page.tsx>)
- [components/inquiries/inquiry-transitions.tsx](C:/Users/david/Documents/CFv1/components/inquiries/inquiry-transitions.tsx)
- [app/(chef)/events/new/wizard/page.tsx](<C:/Users/david/Documents/CFv1/app/(chef)/events/new/wizard/page.tsx>)
- [app/(chef)/events/[id]/schedule/page.tsx](<C:/Users/david/Documents/CFv1/app/(chef)/events/[id]/schedule/page.tsx>)

## P2: Recurring Revenue Layer

- [ ] Extend recurring service model to optionally generate session templates (meal slots + days).
- [ ] Add “repeat last itinerary” on client recurring page.
- [ ] Add automatic rebook reminders 14/30 days after completed series.
- [ ] Add recurring pricing defaults autopopulate for multi-day quotes.
- [ ] Add “package plans”:
- `3-day package`
- `5-day package`
- `weekly household rhythm`

### Files

- [app/(chef)/clients/[id]/recurring/recurring-service-form.tsx](<C:/Users/david/Documents/CFv1/app/(chef)/clients/[id]/recurring/recurring-service-form.tsx>)
- [lib/recurring/actions.ts](C:/Users/david/Documents/CFv1/lib/recurring/actions.ts)
- [lib/recurring/planning.ts](C:/Users/david/Documents/CFv1/lib/recurring/planning.ts)
- [components/quotes/quote-form.tsx](C:/Users/david/Documents/CFv1/components/quotes/quote-form.tsx)

## P2: Automation and Messaging

- [ ] Add automation trigger `series_completed`.
- [ ] Add templates for:
- `Rebook same format`
- `Suggest next 4-week plan`
- `Menu recommendation for upcoming block`
- [ ] Add follow-up tasks in queue when series is near completion.

### Files

- [lib/automations/engine.ts](C:/Users/david/Documents/CFv1/lib/automations/engine.ts)
- [app/(chef)/marketing/sequences/page.tsx](<C:/Users/david/Documents/CFv1/app/(chef)/marketing/sequences/page.tsx>)

## P3: Dinner Circle Conversion Loops

- [ ] Add “book this group for multiple dates” CTA in hub group event tab.
- [ ] Allow group host to propose 2-6 date bundles and meal cadence.
- [ ] Link hub group to event series (`hub_group_id` on series).
- [ ] Add “next dinner vote” poll that can prefill booking itinerary.
- [ ] Add one-click “repeat last group dinner cadence”.

### Files

- [app/(public)/hub/g/[groupToken]/hub-group-view.tsx](<C:/Users/david/Documents/CFv1/app/(public)/hub/g/[groupToken]/hub-group-view.tsx>)
- [lib/hub/group-actions.ts](C:/Users/david/Documents/CFv1/lib/hub/group-actions.ts)
- [supabase/migrations/new_hub_group_series_link.sql](C:/Users/david/Documents/CFv1/supabase/migrations/new_hub_group_series_link.sql)

## Hardening and QA

- [ ] Unit tests for new schema validation and session generation.
- [ ] Integration tests for:
- public booking multi-day submit
- instant-book multi-day checkout
- inquiry to series conversion
- [ ] Availability regression tests for range conflicts.
- [ ] Playwright flow:
- create 4-day itinerary
- confirm as chef
- send quote
- mark completed
- trigger rebook automation
- [ ] Add analytics metrics:
- series conversion rate
- avg sessions per series
- repeat booking in 60 days

### Files

- [tests/unit](C:/Users/david/Documents/CFv1/tests/unit)
- [tests/integration](C:/Users/david/Documents/CFv1/tests/integration)
- [tests/e2e](C:/Users/david/Documents/CFv1/tests/e2e)

## Rollout Plan

1. Feature flag `booking_multi_day_v1` off by default.
2. Run migrations in staging.
3. Seed 3 fixture scenarios (retreat, family week, mixed cadence).
4. Internal QA pass with real chef accounts.
5. Soft-launch to inquiry-first model only.
6. Enable instant-book support after payment edge-case testing.
7. Enable Dinner Circle group-series in final step.

## Definition of Done

- [ ] Client can submit a 4-day mixed meal schedule from public booking.
- [ ] Chef sees a structured itinerary, not only free-text notes.
- [ ] System creates a master series + child sessions with conflict validation.
- [ ] Payments/deposits behave correctly for series bookings.
- [ ] Rebook automation fires after series completion.
- [ ] Dinner Circle can convert group planning into repeat multi-date bookings.
