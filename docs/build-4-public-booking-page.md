# Build 4: Public Booking Page + Self-Service Inquiry

## What Was Built

A public-facing booking page at `/book/[chefSlug]` that lets prospective clients discover a chef's availability and submit an inquiry or instant-book request — no account required. Chefs configure their slug, headline, bio, pricing, deposit terms, and booking model (inquiry-first vs. instant-book) from their Settings page. The shareable URL format is `cheflowhq.com/book/[their-slug]`.

## Files Created / Modified

| File | Role |
|---|---|
| `app/book/[chefSlug]/page.tsx` | Server page — fetches chef profile and booking settings, passes to client component |
| `app/book/[chefSlug]/booking-page-client.tsx` | Client component — renders calendar, then booking form after date selection |
| `app/book/[chefSlug]/thank-you/page.tsx` | Confirmation page shown after successful submission |
| `app/book/[chefSlug]/availability/route.ts` | JSON API endpoint returning blocked/unavailable dates |
| `components/booking/booking-calendar.tsx` | Date picker grid — highlights available vs. blocked dates |
| `components/booking/booking-form.tsx` | Multi-step form — guest count, event type, contact info, message |
| `components/settings/booking-page-settings.tsx` | Settings UI embedded in chef's Settings → Booking Page tab |
| `lib/booking/booking-settings-actions.ts` | Server actions: `getBookingSettings`, `upsertBookingSettings` |
| `lib/booking/instant-book-actions.ts` | Server action that writes the inquiry/instant-book record |

## How It Works

- The server page at `/book/[chefSlug]` performs a public Supabase query (no auth) to resolve the slug to a chef profile and load their booking settings. If the chef has disabled their booking page, a 404 is shown.
- The availability API route (`/book/[chefSlug]/availability`) returns a JSON array of blocked ISO date strings derived from confirmed/in-progress/completed events for that chef, used by the calendar to grey out unavailable dates.
- `BookingCalendar` renders a month grid. Selecting an available date reveals the `BookingForm` below it.
- `BookingForm` is multi-step: date/time details → event specifics → contact info → review & submit. On submit it calls `createInstantBookInquiry` or `createInquiry` depending on the chef's configured booking model.
- In Settings, `BookingPageSettings` lets the chef toggle the page on/off, set their slug (validated for uniqueness), write a headline and bio, choose inquiry-first vs. instant-book, set a base price and deposit percentage, and preview their shareable URL.

## How to Test

1. Navigate to `Settings → Booking Page` as a chef. Enable the booking page, set a unique slug (e.g., `chef-david`), save.
2. Open a private/incognito window and visit `/book/chef-david`. Verify the chef's headline, bio, and calendar load without logging in.
3. Click an available date — confirm the booking form slides in below the calendar.
4. Complete the form and submit. Confirm redirect to `/book/chef-david/thank-you`.
5. Return to the chef dashboard and verify the new inquiry appears in the Inquiries list.
6. Visit `/book/chef-david/availability` directly — confirm a JSON array of blocked dates is returned.
