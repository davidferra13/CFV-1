# Guest Experience — Wiring & Consent Round

**Date:** 2026-02-21
**Branch:** feature/scheduling-improvements

---

## What Changed

This round wired all the guest experience components together and refined the photo consent flow per chef feedback.

### 1. Photo Consent — Simplified

**Problem:** The original consent checkbox felt legal, formal, and uncomfortable. The chef wanted something super casual — just a simple check, no creepy language.

**Before:**

> "I'm okay with photos of the food and event being shared on the chef's website or social media. No faces or personal photos without separate permission."

**After:**

> "Cool to share food pics from the event"

- Simple inline checkbox, no special background/border styling
- Guests can always change their answer by updating their RSVP
- Chef sees consent status via `PhotoConsentSummary` panel on event detail page
- Clear green light when all attending guests have consented

**File:** `components/sharing/rsvp-form.tsx`

### 2. Event Countdown on Share Page

Live countdown timer showing days/hours/minutes/seconds until dinner. Auto-hides once the event has passed. Only shows for non-completed events.

**Component:** `components/sharing/event-countdown.tsx` (already existed)
**Wired into:** `app/(public)/share/[token]/page.tsx` — between the header and event details card

### 3. RSVP Tracker on Event Detail Page

Shows the chef a clear breakdown of RSVP responses:

- Attending / Maybe / Declined / No Reply counts
- Progress bar showing response rate
- "Copy RSVP Reminder" button generates a ready-to-paste group chat message

**Component:** `components/events/rsvp-tracker-panel.tsx`
**Wired into:** `app/(chef)/events/[id]/page.tsx` — inside the Guests & RSVPs card, side-by-side with photo consent summary

### 4. Photo Consent Summary on Event Detail Page

Shows the chef who has/hasn't consented to food photo sharing:

- Progress bar with percentage
- Green "You're clear to post!" message when everyone has consented
- Expandable list of who hasn't consented yet

**Component:** `components/events/photo-consent-summary.tsx`
**Wired into:** `app/(chef)/events/[id]/page.tsx` — side-by-side with RSVP tracker

### 5. Testimonial Form on Recap Page

Guests can leave a star rating (1-5) and written review directly on the recap page:

- Linked to their guest token if they RSVPed
- Deduplicates by guest name per event (updates existing if submitted again)
- Creates a notification for the chef
- Chef can approve/feature testimonials from the chef dashboard

**Component:** `components/sharing/testimonial-form.tsx` (new)
**Server actions:** `lib/testimonials/actions.ts` (already existed)
**Wired into:** `app/(public)/share/[token]/recap/page.tsx` — before the chef booking CTA

### 6. Share Recap Button on Event Detail Page

For completed events with an active share link, the chef sees a "View Recap Page" button that opens the public recap URL in a new tab. This gives the chef a quick way to preview and share the recap with guests.

**Wired into:** `app/(chef)/events/[id]/page.tsx` — after the Guests & RSVPs card, only for completed events

---

## File Summary

| File                                        | Change                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| `components/sharing/rsvp-form.tsx`          | Simplified photo consent checkbox wording                       |
| `components/sharing/testimonial-form.tsx`   | **New** — star rating + review form                             |
| `app/(public)/share/[token]/page.tsx`       | Added EventCountdown import + rendering                         |
| `app/(public)/share/[token]/recap/page.tsx` | Added TestimonialForm import + rendering                        |
| `app/(chef)/events/[id]/page.tsx`           | Added PhotoConsentSummary, RSVPTrackerPanel, Share Recap button |

---

## Design Decisions

1. **Consent is casual, not legal.** The checkbox is just a simple inline check — no background, no border, no scary language. The chef's exact words: "very simple and not annoying or weird and gross."

2. **Guests can always change consent.** By updating their RSVP, the consent checkbox is editable. No "forever" lock-in.

3. **RSVP tracker + consent are side-by-side.** On desktop they sit in a 2-column grid inside the Guests card, giving the chef a quick glance at both response rates and consent status.

4. **Recap page is the post-event hub.** It now has: menu, photos, guest messages, testimonial form, and chef booking CTA — everything a guest might want after a great dinner.
