# Guest Experience — Master Build Plan

**Date:** 2026-02-21
**Branch:** `feature/risk-gap-closure`

---

## Vision

Every dinner party is a growth engine. The guest experience transforms a one-night meal into a lasting relationship between chef, host, and every person at the table. Guests RSVP, share allergies, post excitement, see the menu, view photos, create keepsakes, and eventually become clients themselves. The host stops chasing RSVPs. The chef gets perfect data. Everyone wins.

---

## What Already Exists

| System                                                          | Status | Key Files                                               |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| RSVP system (share link, guest form, allergies, dietary, notes) | Built  | `lib/sharing/actions.ts`, `app/(public)/share/[token]/` |
| Guest pipeline (QR code → lead capture → convert to client)     | Built  | `lib/guest-leads/actions.ts`, `app/(public)/g/[code]/`  |
| Chef guest panel (RSVP intelligence, visibility controls)       | Built  | `components/sharing/chef-guest-panel.tsx`               |
| Event photo gallery (chef uploads)                              | Built  | `components/events/event-photo-gallery.tsx`             |
| Email/SMS infrastructure                                        | Built  | `lib/email/`, `lib/sms/`                                |
| Notification system (multi-channel)                             | Built  | `lib/notifications/`                                    |
| Public chef profile                                             | Built  | `app/(public)/chef/[slug]/`                             |

---

## Full Build List

### Phase 1: Easy Bridges (connect existing systems)

- [ ] **1.1 — Add `/guest-leads` to chef sidebar nav**
  - File: `components/navigation/nav-config.ts`
  - Add entry under marketing/growth section
  - Icon: Users or UserPlus from lucide-react

- [ ] **1.2 — Account creation nudge on guest lead thank-you screen**
  - File: `components/guest-leads/guest-lead-form.tsx`
  - After submit success, show "Create your free account" link → `/auth/client-signup`
  - Subtle, not aggressive

- [ ] **1.3 — "Book your own event" CTA on RSVP confirmation**
  - File: `components/sharing/rsvp-form.tsx`
  - After RSVP submit, show: "Loved the experience? Book your own private dinner" → link to chef profile
  - Only show if chef has a public booking_slug

- [ ] **1.4 — Host message template (copy-paste for group chat)**
  - File: `components/sharing/chef-guest-panel.tsx` or new component
  - Button: "Copy message for host"
  - Generates: "Hey! For [occasion] on [date], please RSVP here: [link]. Takes 30 seconds — just add your name, allergies, and whether you're coming. Can't wait!"
  - Chef can also copy this from event detail page

- [ ] **1.5 — Chef can create RSVP share links (not just client)**
  - Currently only clients create share links via `createEventShare()`
  - Add `chefCreateEventShare(eventId)` to `lib/sharing/actions.ts`
  - Chef creates link → gives to host → host forwards to guests
  - Removes friction: chef doesn't need to wait for client to do it

---

### Phase 2: Excitement Wall (pre-event social buzz)

- [ ] **2.1 — `guest_messages` table**
  - Migration: new table
  - Fields: id, tenant_id, event_id, guest_id (FK to event_guests), message, created_at
  - Public insert (via guest_token), chef/client read
  - RLS: chef reads own tenant, guests insert via token validation at app layer

- [ ] **2.2 — Message form on RSVP page**
  - File: update `app/(public)/share/[token]/page.tsx`
  - After RSVP, show: "Share your excitement!" textarea
  - Submit creates guest_message
  - Optional — guests can skip

- [ ] **2.3 — Message feed on RSVP page**
  - Show all guest messages for this event below the RSVP section
  - Newest first, with guest name and timestamp
  - Creates social buzz: "Sarah: Can't wait for the pasta course!"
  - Visibility controlled by chef (new toggle: `show_guest_messages`)

- [ ] **2.4 — Chef sees excitement feed**
  - Add to event detail page: "Guest Buzz" section
  - Shows all guest messages
  - Chef can moderate (delete inappropriate messages)

- [ ] **2.5 — Real-time guest list on RSVP page**
  - When `show_guest_list` is enabled, show who's attending with names
  - "12 of 15 guests confirmed" counter
  - Creates social proof and FOMO

---

### Phase 3: Guest Photo Sharing & Event Keepsakes

- [ ] **3.1 — Guest photo uploads**
  - New table: `guest_photos` (id, tenant_id, event_id, guest_id, photo_url, caption, created_at)
  - Supabase storage bucket: `guest-event-photos`
  - Guests can upload photos from the event (via share page)
  - RLS: public insert (with token validation), chef reads own

- [ ] **3.2 — Photo upload UI on share page (post-event)**
  - After event date has passed, the share page transforms:
  - "How was the evening? Share your photos!"
  - Multi-file upload with optional captions
  - Only accessible after event_date (not before — no spoilers)

- [ ] **3.3 — Combined photo gallery (chef + guest photos)**
  - Chef's professional shots + guest candid photos in one gallery
  - Displayed on the event recap page (see 4.1)
  - Chef can moderate/approve guest photos before they're public

- [ ] **3.4 — Chef shares photos back to guests**
  - Chef uploads professional photos → visible on share page
  - Guests see: "Your chef shared 12 photos from the evening"
  - Download button for each photo
  - Beautiful gallery layout

- [ ] **3.5 — Photo notification to guests**
  - When chef uploads photos post-event, guests who provided email get notified
  - "Your photos from [occasion] are ready! View them here: [link]"
  - Non-blocking, draft-and-approve

---

### Phase 4: Event Recap Page (Shareable Keepsake)

- [ ] **4.1 — `/share/[token]/recap` page**
  - Beautiful, shareable event keepsake
  - Shows: chef photo, event name, date, menu (what was actually served)
  - Photo gallery (chef + approved guest photos)
  - Guest list (who attended)
  - "Book your own event" CTA
  - Shareable on social media (with OpenGraph tags)

- [ ] **4.2 — Downloadable PDF keepsake**
  - Use jsPDF (already installed) to generate a beautiful one-pager
  - Menu card style: event name, date, full menu, chef name
  - Guests can download and keep as a memento
  - Physical gift: chef can print these for guests at the end of service

- [ ] **4.3 — Chef profile link on recap page**
  - "Dinner by [Chef Name]" with link to public profile
  - "Book your own event" prominent CTA
  - This is the key conversion point: memories → desire → booking

- [ ] **4.4 — Auto-generate recap after event completion**
  - When event transitions to `completed`, auto-create recap data
  - Chef gets prompted: "Your event recap is ready. Share it with guests?"
  - Draft-and-approve: chef reviews before guests can access

---

### Phase 5: Cross-Event Guest Connections & Groups

- [ ] **5.1 — Guest profiles (lightweight, optional)**
  - When a guest creates an account, they get a minimal profile
  - Preferences: cuisine likes/dislikes, dietary restrictions (persists across events)
  - Event history: "You've attended 3 events with [Chef Name]"
  - This data compounds — chef knows returning guests' preferences

- [ ] **5.2 — "We should do this again" group creation**
  - After an event, guests can create a "dinner group"
  - Group = list of emails/names who want to dine together again
  - Chef can see groups and target them for future events
  - "Your group from Sarah's Birthday is interested in booking"

- [ ] **5.3 — Recurring event interest**
  - On recap page: "Would you do this monthly?" poll
  - Options: Monthly / Quarterly / One more time / Not right now
  - Results visible to chef
  - Chef can create recurring events targeting interested groups

- [ ] **5.4 — Guest event history (for guests with accounts)**
  - Logged-in guests see: past events, menus, photos, upcoming RSVPs
  - "Your Private Dining History" — a personal record
  - Links to recap pages for each event
  - Encourages account creation for the keepsake value alone

---

### Phase 6: Analytics & Conversion Tracking

- [ ] **6.1 — QR scan tracking**
  - New table: `guest_lead_views` (id, tenant_id, event_id, guest_code, viewed_at, user_agent)
  - Track each time `/g/[code]` is loaded
  - Shows: "47 scans → 12 leads → 3 clients"

- [ ] **6.2 — RSVP completion rate**
  - Track: share link opens vs. completed RSVPs
  - "Sent to 20 guests, 15 RSVPed (75%)"
  - Help chef understand engagement

- [ ] **6.3 — Guest pipeline conversion funnel**
  - Dashboard: `/guest-leads/analytics`
  - Funnel visualization: Scans → Leads → Contacted → Converted
  - Per-event breakdown
  - Revenue attributed to guest pipeline (converted leads → their events → total revenue)

- [ ] **6.4 — Repeat guest tracking**
  - Identify guests who attend multiple events (by email)
  - "Sarah has attended 4 of your events — she might want to host her own"
  - Auto-surface high-engagement guests as warm leads

- [ ] **6.5 — Social sharing analytics**
  - Track when recap pages are shared (referrer data)
  - "Your recap was shared 8 times on Instagram"
  - Measures organic reach per event

---

### Phase 7: Communication Tools

- [ ] **7.1 — Batch post-event email to all guest leads**
  - Chef selects event → "Send thank-you to all leads"
  - Uses `draftGuestOutreachEmail()` template
  - Draft-and-approve: chef reviews email before bulk send
  - Tracks: sent, opened (if email service supports)

- [ ] **7.2 — Post-event email to RSVP guests**
  - After event completes, chef can email all guests who attended
  - "Thank you for joining [occasion]! View your photos and event recap here: [link]"
  - Includes recap page link + "book your own" CTA
  - Draft-and-approve

- [ ] **7.3 — SMS follow-up for guests with phone numbers**
  - Twilio infrastructure already exists
  - Short message: "Thanks for joining [occasion]! See your photos: [link]"
  - Chef-approved before sending
  - Rate-limited per phone number

- [ ] **7.4 — Guest testimonial collection**
  - After event, guests can leave a short testimonial
  - "How was your experience with [Chef Name]?"
  - Star rating + free text
  - Chef approves before displaying on public profile
  - Testimonials visible on `/chef/[slug]` profile page

- [ ] **7.5 — Automated RSVP reminders**
  - 48 hours before event: auto-email/SMS to guests who haven't RSVPed
  - "Reminder: [Host] is expecting you at [occasion] on [date]. RSVP here: [link]"
  - Chef can enable/disable per event
  - Takes pressure off the host completely

- [ ] **7.6 — Host auto-update on RSVP progress**
  - Daily or real-time email to host: "3 new RSVPs today! 12 of 18 confirmed."
  - Link to view full guest list
  - Keeps host informed without them having to check

---

### Phase 8: Advanced Growth Features

- [ ] **8.1 — Guest referral program**
  - Guests who refer new clients get a reward (discount on their own event, or host credit)
  - Track: which guest referred which client
  - "Sarah referred 3 new clients — award her a $50 credit"

- [ ] **8.2 — Gift card from guest pipeline**
  - After guest lead form, option: "Gift a private dinner to someone"
  - Links to existing gift card system (`/chef/[slug]/gift-cards`)
  - Impulse purchase at peak excitement

- [ ] **8.3 — Social media integration**
  - "Share this event on Instagram" button on recap page
  - Pre-formatted caption: "Amazing dinner by @ChefName! 🍽️"
  - Instagram-optimized photo share
  - Links back to chef profile

- [ ] **8.4 — Event countdown on RSVP page**
  - "3 days until [occasion]!" countdown timer
  - Builds excitement pre-event
  - Disappears after event date

---

## Build Priority (Recommended Order)

| Priority | Phase                     | Why                                                   |
| -------- | ------------------------- | ----------------------------------------------------- |
| 1        | Phase 1 (Bridges)         | Zero-risk, connects existing systems, immediate value |
| 2        | Phase 2 (Excitement Wall) | Highest engagement impact, makes RSVP page sticky     |
| 3        | Phase 4 (Event Recap)     | Keepsake value drives account creation + sharing      |
| 4        | Phase 3 (Photo Sharing)   | Emotional hook — photos are the memories              |
| 5        | Phase 7 (Communication)   | Automates chef's follow-up work                       |
| 6        | Phase 6 (Analytics)       | Proves ROI of the whole pipeline                      |
| 7        | Phase 5 (Groups)          | Network effect — but needs critical mass first        |
| 8        | Phase 8 (Growth)          | Polish layer — only valuable after core is humming    |

---

## The Complete Flywheel

```
Chef creates event
    ↓
Chef generates RSVP link → gives to host
    ↓
Host drops link in group chat (copy-paste template)
    ↓
Guests RSVP + allergies + "I'm so excited!" messages
    ↓
Other guests see excitement → FOMO → more RSVPs
    ↓
Chef gets perfect data: headcount, allergies, dietary
    ↓
Event happens → chef puts QR table card out
    ↓
During dinner: guests scan QR → express interest in booking
    ↓
After dinner: guests upload photos → social buzz
    ↓
Chef uploads pro photos → shares with guests
    ↓
Event recap page created → shareable keepsake
    ↓
Guests share recap on social media → organic reach
    ↓
Recap page has "Book your own event" CTA
    ↓
Guest leads convert to clients
    ↓
New clients host THEIR OWN events
    ↓
THEIR guests RSVP → excitement → photos → leads → clients
    ↓
FLYWHEEL SPINS FASTER WITH EVERY EVENT
```

---

## Database Impact Summary

| New Table            | Purpose                            |
| -------------------- | ---------------------------------- |
| `guest_messages`     | Excitement wall messages per event |
| `guest_photos`       | Guest-uploaded event photos        |
| `guest_lead_views`   | QR scan tracking                   |
| `dinner_groups`      | Cross-event guest groups           |
| `guest_testimonials` | Post-event reviews from guests     |

| Altered Table  | Change                                           |
| -------------- | ------------------------------------------------ |
| `event_shares` | Add `show_guest_messages` to visibility_settings |
| `event_guests` | Add `account_created` boolean for tracking       |
| `events`       | Add `recap_shared_at`, `recap_enabled`           |

All changes are **additive** — no drops, no deletes, no column renames.
