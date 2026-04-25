# Open Booking Follow-Through

## What Changed

- Added `open_bookings` and `open_booking_inquiries` migration tables for parent booking tokens, escalation timestamps, linked chef inquiries, Dinner Circle tokens, proposal URLs, referral partner attribution, UTM fields, guest-count ranges, and parsed budget cents.
- Updated `/api/book` to create a parent booking before fan-out, redirect clients with `booking_token`, capture attribution, parse budget strings, preserve guest-count buckets, and link each chef inquiry back to the parent booking.
- Added `/book/status/[bookingToken]` as a public token-scoped status page with submitted event details, response progression, no-response actions, no-match state, proposal links, and planning-space links.
- Added booking confirmation, 48-hour follow-up, and 7-day no-match email templates plus notification dispatchers.
- Added `/api/cron/booking-escalation` to detect chef responses, create the Dinner Circle for the responding inquiry, attach proposal links, send 48-hour no-response emails, and close stale requests after 7 days.

## Why

Open booking submissions previously had no client-visible follow-through. Clients now get a status link immediately, can see what was submitted, and receive clear next steps if no chef responds.

## Verification

- `node --test --import tsx tests/unit/open-booking.route.test.ts tests/unit/open-booking-intake-parity.test.ts tests/unit/open-booking-followthrough.test.ts`
- `node --import tsx -e "await import('./app/(public)/book/status/[bookingToken]/page.tsx'); await import('./app/api/cron/booking-escalation/route.ts'); await import('./lib/email/templates/booking-confirmation.tsx')"`
- Playwright screenshots:
  - `test-screenshots/open-booking-form-1440.png`
  - `test-screenshots/open-booking-status-invalid-token-1440.png`

## Migration Note

The migration was written but not applied. Back up the database before applying `database/migrations/20260424000001_open_booking_followthrough.sql`.
