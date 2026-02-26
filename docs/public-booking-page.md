# Public Booking Page — /book/[slug]

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements

---

## Summary

The public booking page at `/book/[chefSlug]` is a fully-implemented, no-auth public intake flow that allows prospective clients to view a chef's availability and submit a booking request or pay a deposit instantly. All components were found to be complete — no new code was required.

---

## File Map

| File                                          | Role                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `app/book/[chefSlug]/page.tsx`                | Server component — fetches chef public profile by `booking_slug`, renders layout + `BookingPageClient` |
| `app/book/[chefSlug]/booking-page-client.tsx` | Client wrapper — manages `selectedDate` state, gates calendar → form two-step flow                     |
| `app/book/[chefSlug]/availability/route.ts`   | API route — returns per-day availability for a month (`available` / `blocked` / `unavailable`)         |
| `app/book/[chefSlug]/thank-you/page.tsx`      | Confirmation page — dual-mode (inquiry vs. instant-book) messaging                                     |
| `components/booking/booking-calendar.tsx`     | Month grid — fetches availability per month, color-coded, click to select                              |
| `components/booking/booking-form.tsx`         | Full intake form — all required fields, dual-mode submit, live pricing                                 |

---

## Two-Step Flow

```
/book/[slug]
  │
  ├── Step 1: Date Selection
  │     BookingCalendar fetches /book/[slug]/availability?year=&month=
  │     Green = available, Gray = blocked/past, Light = insufficient notice
  │     Click available date → advances to Step 2
  │
  └── Step 2: Intake Form
        Fields: name, email, phone (opt), occasion, guest count, serve time,
                address, allergies/dietary, additional notes
        Mode A (inquiry_first): submitPublicInquiry() → /thank-you
        Mode B (instant_book): createInstantBookingCheckout() → Stripe Checkout
```

---

## Availability Logic (route.ts)

1. Resolves `booking_slug` → `chefs.id` + `booking_min_notice_days` (default 7)
2. Fetches events in `accepted | paid | confirmed | in_progress` states for the month → marks as `blocked`
3. Fetches `chef_availability_blocks` for the month → marks as `blocked`
4. Any date within `minNoticeDays` of today → marks as `unavailable`
5. All remaining dates → `available`
6. Response cached: `s-maxage=300, stale-while-revalidate=600` (5-min fresh, 10-min stale)

---

## Booking Modes

### Inquiry-First (`booking_model = 'inquiry_first'`)

- Form shows "Submit Request"
- On submit: `submitPublicInquiry()` server action creates inquiry record
- Redirects to `/book/[slug]/thank-you`
- Copy: "Request Received — expect a response within 24 hours"

### Instant-Book (`booking_model = 'instant_book'`)

- Live pricing summary shown as guest count changes
- Deposit types: `percent` (configurable %) or `fixed` (flat amount)
- Pricing type: `flat_rate` or `per_person`
- On submit: `createInstantBookingCheckout()` → redirects to Stripe Checkout
- On return: `/thank-you?mode=instant` → "Booking Confirmed!"

---

## Chef Booking Settings (pulled from `chefs` table)

| Field                         | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| `booking_enabled`             | Master on/off; page returns 404 if false     |
| `booking_slug`                | URL-safe identifier, used in the booking URL |
| `booking_headline`            | Hero headline on the public page             |
| `booking_bio_short`           | Short bio shown below headline               |
| `booking_model`               | `inquiry_first` \| `instant_book`            |
| `booking_base_price_cents`    | Base price for instant-book pricing          |
| `booking_pricing_type`        | `flat_rate` \| `per_person`                  |
| `booking_deposit_type`        | `percent` \| `fixed`                         |
| `booking_deposit_percent`     | Deposit % (if percent mode)                  |
| `booking_deposit_fixed_cents` | Fixed deposit amount (if fixed mode)         |
| `booking_min_notice_days`     | Minimum advance notice required              |

---

## AI Policy Compliance

- No ledger writes, no event FSM transitions triggered by the booking form
- `submitPublicInquiry()` creates an inquiry record — requires chef action to convert
- `createInstantBookingCheckout()` creates a Stripe session — payment confirmation (webhook) triggers ledger entry, not the form submission itself
- Chef remains in full control of converting inquiries to confirmed events
