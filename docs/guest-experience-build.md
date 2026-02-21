# Guest Experience — Full Build Documentation

## Problem Solved

Chef cooks for 50 people but only has a relationship with 1 (the host). The other 49 guests leave with zero connection to the chef — lost revenue, single point of failure, invisible chef brand.

## Solution: 7-Phase Guest Experience Pipeline

### Phase 1: Easy Bridges

**What:** Navigation, account nudges, host message template

**Files changed:**

- `components/navigation/nav-config.tsx` — Added Guest Pipeline + Guest Insights nav entries
- `components/guest-leads/guest-lead-form.tsx` — Added "Create your free account" CTA on thank-you screen
- `components/sharing/rsvp-form.tsx` — Added "Book Your Own Event" CTA for attending guests
- `components/sharing/host-message-template.tsx` — NEW: Copy-paste group chat message for hosts
- `lib/sharing/actions.ts` — Extended `getEventShareByToken` with `chefProfileUrl` + `display_name`
- `app/(public)/share/[token]/page.tsx` — Passed new props to RSVPForm
- `app/(chef)/events/[id]/page.tsx` — Added HostMessageTemplate + chef display name fetch

**Why:** Every touchpoint becomes a conversion opportunity. Host gets a frictionless group chat message that drives RSVPs.

### Quick RSVP Mode

**What:** Two-step RSVP form — status + name is all you need, dietary details are expandable/optional

**Files changed:**

- `components/sharing/rsvp-form.tsx` — Restructured into quick mode (status + name + email always visible) with expandable "Add allergies, dietary needs, or a note" section

**Why:** "Some people don't care about allergies, just let me press RSVP." The dashed expand button appears for people who WANT to add details. Zero friction for everyone else.

### Phase 2: Excitement Wall

**What:** Social message board on the share page — guests post excitement messages visible to all guests

**Files created:**

- `lib/guest-messages/actions.ts` — 7 server actions: `postGuestMessage` (public), `getEventMessages` (public), `getEventMessagesForChef`, `toggleMessageVisibility`, `toggleMessagePin`, `deleteGuestMessage`, `getExcitementWallStats`
- `components/sharing/excitement-wall.tsx` — Guest-facing message wall with post form, emoji selector, time-ago display
- `components/events/guest-messages-panel.tsx` — Chef moderation panel: pin, hide, delete messages

**Migration:** `20260322000029_guest_excitement_wall.sql`

- `guest_messages` table with RLS (public read visible, public insert, chef full CRUD)
- Rate limit: 10 messages per guest per event (server-side)
- 500 char limit per message

**Wired into:**

- `app/(public)/share/[token]/page.tsx` — Excitement wall between RSVP and photo gallery
- `app/(chef)/events/[id]/page.tsx` — Guest Messages Panel for chef moderation

### Phase 3: Guest Photo Sharing

**What:** Guests upload photos from the share page. Chef moderates. Combined gallery visible to all guests.

**Files created:**

- `lib/guest-photos/actions.ts` — 5 server actions: `uploadGuestPhoto` (public, FormData), `getEventGuestPhotos` (public), `getGuestPhotosForChef`, `toggleGuestPhotoVisibility`, `deleteGuestPhoto`
- `components/sharing/guest-photo-gallery.tsx` — Guest-facing upload form + photo grid with lightbox

**Migration:** Same `20260322000029` — `guest_photos` table with RLS, storage path references

**Limits:**

- 10MB per photo
- 20 photos per guest per event
- Stored in Supabase `guest-photos` bucket

**Wired into:**

- `app/(public)/share/[token]/page.tsx` — Photo gallery after excitement wall

### Phase 4: Event Recap Page

**What:** `/share/[token]/recap` — a shareable keepsake page guests can revisit. Shows menu, photos, guest messages, chef booking CTA.

**Files created:**

- `app/(public)/share/[token]/recap/page.tsx` — Server-rendered recap with OpenGraph metadata
- `components/sharing/recap-photo-grid.tsx` — Client photo grid with lightbox for recap

**Content displayed:**

- Event occasion + date + chef name (hero)
- Menu served (centered, elegant)
- Guest photos with lightbox
- Pinned + recent guest messages as testimonial-style quotes
- Chef booking CTA (if booking_slug exists)

### Phase 5: Cross-Event Guest Connections

**What:** Analytics showing repeat guests and dinner groups (pairs who attend together)

**Files created:**

- `lib/guest-analytics/actions.ts` — 3 server actions: `getRepeatGuests`, `getGuestFrequencyStats`, `getDinnerGroups`
- `app/(chef)/guest-analytics/page.tsx` — Dashboard with stats, repeat guest list, dinner groups

**Key insights:**

- Repeat guests grouped by email (or name if no email)
- Dinner groups = pairs of guests who co-attend 2+ events
- Stats: unique guests, repeat count, avg events per repeat

**Wired into:**

- `components/navigation/nav-config.tsx` — "Guest Insights" under Pipeline (advanced)

### Phase 6: Analytics & Conversion Tracking

Covered by Phase 5's guest analytics. The guest pipeline stats (new/contacted/converted/archived) were built in the initial guest pipeline feature.

### Phase 7: Communication Tools

**What:** Post-event email drafts for guest outreach (thank you + testimonial request)

**Files created:**

- `lib/guest-comms/actions.ts` — 3 server actions: `getGuestEmailList`, `draftPostEventEmail`, `draftTestimonialRequest`
- `components/events/post-event-outreach-panel.tsx` — Draft generator with preview, copy email, copy recipients

**Email types:**

1. **Thank You Email** — Thanks guests, links to recap page, includes chef booking CTA
2. **Testimonial Request** — Warm ask with prompts (highlight, food description, would you recommend?)

**Design:** Chef reviews draft → copies to their email → sends manually. AI policy compliant — no automated sending.

**Wired into:**

- `app/(chef)/events/[id]/page.tsx` — PostEventOutreachPanel for completed events

## Architecture Notes

### Public vs Authenticated

- Guest-facing components use `createServerClient({ admin: true })` to bypass RLS
- Chef-facing components use `requireChef()` + tenant-scoped queries
- All guest submissions validated server-side with Zod or manual checks

### Non-Blocking Side Effects

- Notification on guest lead submit is wrapped in try/catch (non-blocking)
- Photo upload failures clean up storage before throwing

### Data Flow

```
Event → Share Link → Guest RSVP (quick or detailed)
                   → Guest Messages (excitement wall)
                   → Guest Photos (upload + gallery)
                   → Account Creation CTA
                   → Chef Booking CTA

Event (completed) → Recap Page (shareable keepsake)
                   → Post-Event Email (thank you / testimonial)
                   → Guest Lead Pipeline (QR code → landing page → lead → client)

Cross-Event → Repeat Guest Analytics
            → Dinner Group Detection
            → Guest Insights Dashboard
```

## Migration Summary

- `20260322000024_guest_lead_pipeline.sql` — events.guest_code, guest_leads table
- `20260322000029_guest_excitement_wall.sql` — guest_messages + guest_photos tables

## New Pages

| Route                     | Type   | Description                                   |
| ------------------------- | ------ | --------------------------------------------- |
| `/g/[code]`               | Public | Guest lead landing page (QR code target)      |
| `/share/[token]`          | Public | Event share page (RSVP + wall + photos)       |
| `/share/[token]/recap`    | Public | Event recap keepsake                          |
| `/guest-leads`            | Chef   | Guest pipeline dashboard                      |
| `/guest-analytics`        | Chef   | Guest insights (repeat guests, dinner groups) |
| `/events/[id]/guest-card` | Chef   | Printable table card with QR code             |
