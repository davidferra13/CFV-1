# QR Circle Join

> **Status:** SPEC-READY
> **Priority:** P0
> **Origin:** "Picky Client" persona stress test, edge case: 20+ guests at dinner, all could have joined the circle instantly via QR code instead of exchanging business cards (2026-05-16)
> **Depends On:** None (dinner circles already built)

---

## Problem Statement

End of a 20-person dinner. Everyone's raving about the food. Three people ask the chef for a business card. The chef fumbles through a bag, finds two crumpled cards, apologizes to the third person, and says "I'll text you."

That third person never gets texted. Two business cards end up in a junk drawer. Zero new bookings from a room full of warm leads.

Meanwhile, every person at that dinner could have scanned a QR code on the chef's phone (or the host's phone) in 5 seconds and instantly joined the dinner circle or followed the chef. No business cards. No "I'll text you." No lost leads.

A QR code at a dinner IS the business card, the follow-up, the circle enrollment, and the lead capture all in one scan.

---

## Solution

### 1. Chef's Persistent QR Code (Digital Business Card)

Every chef gets a permanent QR code that lives in ChefFlow:

- Accessible from: chef's profile, ChefFlow home screen, lock screen widget (mobile)
- Scannable by anyone with a phone camera (no app needed)
- Links to: chef's public profile page (`/chef/[slug]`)
- From the profile, visitor can: view menus, see reviews, submit an inquiry, join the chef's public circle
- QR code regenerable if compromised (old code shows "this link has changed")
- Printable: generate a high-res QR for business cards, table tents, aprons, packaging

**The "do you have a card?" moment:**

- Chef opens ChefFlow, taps QR icon (prominent, one-tap access)
- Shows full-screen QR code
- Guest scans, lands on chef's profile
- Guest taps "Follow" or "Join Circle" (one tap, no account required, token-based)
- Guest captured as a lead with: name (if provided), phone/email (if provided), source: "QR scan at [Event Name]"

### 2. Event-Specific QR Code (Dinner Circle Join)

Each active event generates its own QR code:

- Scannable by guests at the dinner
- Links to: the dinner circle for THIS specific event
- Guest scans -> lands on circle join page -> enters name -> in the circle
- No app download. No account creation. No password. Token-based access.
- Guest can then: view the menu, submit dietary restrictions, see event updates, RSVP

**How it works at the table:**

- Chef or host shows the QR code on their phone
- Or: printed QR code on a table tent / menu card / place setting
- Or: QR code displayed on a screen/TV at the venue
- 20 guests scan in under 2 minutes. All in the circle. All captured.

### 3. Host Can Enroll Guests Too

The host (client) gets their own QR code for the dinner circle:

- Accessible in the client portal for their event
- Host can share the QR in advance (group chat, email) or show at the door
- Host-enrolled guests get the same circle access as chef-enrolled guests
- No duplication: if a guest is already in the circle, scanning again just opens their existing session

### 4. Post-Scan Experience

When a guest scans the QR code:

**At-event scan (dinner circle QR):**

1. Lands on circle join page: event name, chef name, date, occasion
2. "Join this dinner" button
3. Quick form: name (required), email or phone (optional but encouraged), dietary (optional)
4. In the circle. Can see: tonight's menu, event theme, who else is here (if enabled)
5. Post-dinner: circle persists. Guest gets post-event thank-you, photo gallery access, can rebook

**General scan (chef QR):**

1. Lands on chef's public profile
2. Can: view menus, read reviews, inquire, follow
3. "Follow [Chef]" -> enters email -> added to chef's general circle
4. Future: gets seasonal updates, event announcements, special offers (if chef sends them)

### 5. Lead Capture Intelligence

Every QR scan is a lead:

- Source tracked: "QR scan at [Event Name] on [Date]"
- If the guest later books, attribution flows back: "This booking originated from a QR scan at the Smith Anniversary Dinner"
- Chef dashboard widget: "15 QR scans at your last event. 3 submitted inquiries. 1 booked."
- Conversion funnel: scan -> circle join -> inquiry -> booking

### 6. QR Code Design

Not just a generic black-and-white square:

- Chef's branding: custom colors matching their profile theme
- Chef's name or logo in the center of the QR code
- ChefFlow branding subtle (small "Powered by ChefFlow" text, not dominant)
- High-res export for print materials
- Multiple formats: PNG (digital), SVG (print), PDF (table tent template)

### 7. Real-Time Guest Count

As guests scan and join the circle:

- Chef sees live count: "12 of 20 guests have joined the circle"
- Host sees the same count in their portal
- Late arrivals can scan anytime during the event
- No cutoff: circle stays open for post-event joins too

---

## Edge Cases

### A. Guest Doesn't Want to Join

Some people don't want to scan anything. That's fine.

- QR is optional. No pressure. No "you must join to eat."
- Chef/host can manually add a guest later if they provide contact info verbally
- Non-joined guests are simply not in the circle. They miss the digital experience but still eat the food.

### B. Guest Has No Phone

Rare but possible (children, elderly):

- Host or chef can add them manually: name + dietary (verbal collection)
- They're in the circle as a named guest without digital access
- Dietary info captured for the chef's planning

### C. Multiple Events at Same Venue

QR code on a table tent from last month's event is still sitting out:

- Event QR codes expire after the event (configurable: event day + 7 days)
- Expired QR shows: "This event has ended. Visit [Chef]'s profile to book your own dinner."
- Links to chef's persistent QR / profile page as fallback

### D. Privacy-Conscious Guests

Guest scans but doesn't want to share email or phone:

- Name-only is fine. They're in the circle with a name, no contact info.
- They can view the circle content but won't receive follow-up communications
- If they later want to be contacted, they can update their circle profile

### E. Corporate Events with NDAs

Some corporate dinners are confidential. No circle, no photos, no QR.

- Chef can disable QR for specific events
- "Private event" flag: no circle join, no post-event outreach to guests
- Chef still tracks the event internally, just without guest enrollment

---

## Files Likely Touched

- `lib/qr/generate-qr.ts` (new, QR code generation with branding)
- `lib/qr/chef-qr-actions.ts` (new, persistent chef QR management)
- `lib/qr/event-qr-actions.ts` (new, event-specific QR with expiry)
- `lib/dinner-circles/qr-join-actions.ts` (new, token-based circle join from QR scan)
- `app/(public)/join/[token]/page.tsx` (new, QR scan landing page for circle join)
- `app/(public)/chef/[slug]/follow/page.tsx` (new, chef follow page from QR)
- `components/qr/qr-display.tsx` (new, full-screen QR display for phone)
- `components/qr/qr-print-export.tsx` (new, high-res export for print)
- `components/qr/live-scan-counter.tsx` (new, real-time join count)
- `app/(chef)/qr/page.tsx` (new, QR management hub)
- `app/client/[token]/page.tsx` (add event QR for host to share)
- `lib/analytics/qr-attribution.ts` (new, scan -> circle -> inquiry -> booking funnel)
- `components/dashboard/qr-scan-widget.tsx` (new, post-event scan stats)
- Database: `qr_codes` table (chef_id, event_id, token, type, expires_at, scan_count, branding), `qr_scans` table (qr_id, scanned_at, guest_name, contact_info, source_event_id)

---

## Verification

- [ ] Chef can display persistent QR code in one tap from home screen
- [ ] QR scan opens chef public profile (no app required)
- [ ] Event-specific QR lands on circle join page with event details
- [ ] Guest joins circle with name only (email/phone optional)
- [ ] No account creation required for circle join
- [ ] Host can share event QR from client portal
- [ ] Live scan counter updates as guests join
- [ ] QR scans tracked with source event attribution
- [ ] Scan -> inquiry -> booking conversion funnel visible in dashboard
- [ ] Event QR expires after configurable window (default: event day + 7)
- [ ] Expired QR redirects to chef profile
- [ ] QR exportable as PNG/SVG/PDF for print
- [ ] Chef branding applied to QR design
- [ ] Chef can disable QR for private/NDA events
