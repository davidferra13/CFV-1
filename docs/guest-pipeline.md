# Guest-to-Client Pipeline

**Date:** 2026-02-21
**Branch:** `feature/scheduling-improvements`
**Status:** Complete — awaiting migration push

---

## Problem

A private chef cooks for 50 people over two months but typically interacts with only one — the host. The other 49 guests experience the food firsthand, love it, and leave with zero connection to the chef. This creates:

- **Single point of failure** — lose the host, lose the entire network
- **Invisible chef problem** — guests can't find or contact the chef
- **No recurring diversification** — revenue depends on one relationship
- **Untapped word-of-mouth** — warm leads walk away uncontacted

## Solution

Every event gets a QR code. Guests scan it at the table, land on a branded page, and express interest in booking their own event. The chef sees every lead in a dashboard and can convert them to full clients with one click.

---

## What Was Built

### Database (Migration `20260322000024`)

| Change       | Table         | Description                                                      |
| ------------ | ------------- | ---------------------------------------------------------------- |
| ADD COLUMN   | `events`      | `guest_code TEXT UNIQUE` — auto-generated 12-char hex per event  |
| CREATE TABLE | `guest_leads` | Captures name, email, phone, message, status, FK to event + chef |
| RLS          | `guest_leads` | Chef reads/updates own; public insert for guest submissions      |
| Indexes      | `guest_leads` | tenant_id, event_id, status, email — all covered                 |

**Guest lead statuses:** `new → contacted → converted | archived`

### Server Actions (`lib/guest-leads/actions.ts`)

| Action                              | Auth   | Description                                                     |
| ----------------------------------- | ------ | --------------------------------------------------------------- |
| `getChefByGuestCode(code)`          | Public | Resolves guest_code → chef public info                          |
| `submitGuestLead(input)`            | Public | Creates guest_lead record, deduplicates by email per event      |
| `getGuestLeads(filters?)`           | Chef   | Lists all leads, newest first, filterable by status             |
| `getGuestLeadStats()`               | Chef   | Aggregate counts by status                                      |
| `updateGuestLeadStatus(id, status)` | Chef   | Move lead through pipeline                                      |
| `convertLeadToClient(id)`           | Chef   | Creates client record (or links existing), marks lead converted |
| `getEventGuestCode(eventId)`        | Chef   | Returns guest_code for an event                                 |
| `getEventGuestLeadCount(eventId)`   | Chef   | Count of leads from a specific event                            |
| `draftGuestOutreachEmail(eventId)`  | Chef   | Generates a post-event thank-you email draft for chef review    |

### Public Guest Landing Page (`/g/[code]`)

- **No auth required** — guests scan the QR and see the page immediately
- Shows chef's photo, name, tagline
- Simple form: name, email, phone (optional), message (optional)
- Submit → thank you screen with checkmark animation
- Deduplication: same email + same event = update, not duplicate
- Privacy notice: "Your information is only shared with [Chef Name]"
- Mobile-first, responsive, branded with chef's portal colors

### QR Code Panel (Event Detail Page)

- **Component:** `components/events/guest-code-panel.tsx`
- Displays QR code (via free QR API — URL only, no PII sent)
- Copy link button
- Link to printable table card
- Shows lead count with link to dashboard
- Visible on all non-cancelled events

### Printable Table Card (`/events/[id]/guest-card`)

- **Print-optimized** 4"x6" card layout
- Chef photo + name + tagline
- QR code prominent center
- CTA: "Enjoying tonight? Scan below to book your own private dining experience."
- Print button (calls `window.print()`)
- Ready for immediate physical deployment

### Guest Leads Dashboard (`/guest-leads`)

- **Stats row:** Total, New, Contacted, Converted
- **Filter tabs:** All | New | Contacted | Converted | Archived
- **Per-lead actions:**
  - New → Convert to Client / Mark Contacted / Archive
  - Contacted → Convert to Client / Archive
  - Converted → View Client link
  - Archived → Restore
- **Convert to Client:** Creates client record (idempotent by email), marks lead converted, links FK

### Notifications

- When a guest submits interest → chef gets an in-app notification (non-blocking)
- Category: `lead`
- Action URL: `/guest-leads`

### Post-Event Email Draft

- `draftGuestOutreachEmail(eventId)` generates a warm "thank you for being a guest" email
- Includes soft CTA to book their own event
- Links to chef's public profile if `booking_slug` exists
- **Draft-and-approve model** — chef reviews before sending, never auto-sends

---

## File Inventory

| File                                                         | Type             | Purpose                             |
| ------------------------------------------------------------ | ---------------- | ----------------------------------- |
| `supabase/migrations/20260322000024_guest_lead_pipeline.sql` | Migration        | Schema + RLS                        |
| `lib/guest-leads/actions.ts`                                 | Server Actions   | All guest lead business logic       |
| `app/(public)/g/[code]/page.tsx`                             | Page             | Public guest landing page           |
| `components/guest-leads/guest-lead-form.tsx`                 | Client Component | Form with submit + thank you states |
| `components/events/guest-code-panel.tsx`                     | Client Component | QR panel on event detail page       |
| `app/(chef)/guest-leads/page.tsx`                            | Page             | Chef's guest leads dashboard        |
| `components/guest-leads/guest-leads-list.tsx`                | Client Component | Interactive leads list with actions |
| `app/(chef)/events/[id]/guest-card/page.tsx`                 | Page             | Printable table card                |
| `components/guest-leads/printable-card.tsx`                  | Client Component | Print-optimized 4x6 card            |
| `docs/guest-pipeline.md`                                     | Docs             | This document                       |

---

## Deployment Checklist

1. Review migration SQL (no destructive changes — fully additive)
2. Back up database: `supabase db dump --linked > backup-$(date +%Y%m%d).sql`
3. Apply migration: `supabase db push --linked`
4. Regenerate types: `npm run supabase:types`
5. Add `/guest-leads` to chef nav (optional — accessible via event detail panel link)
6. Deploy Next.js

---

## How It Works (End to End)

```
Chef creates event → guest_code auto-generated
        ↓
Chef opens event detail → sees Guest Pipeline card with QR
        ↓
Chef prints table card → places at dinner table
        ↓
Guest scans QR → lands on /g/[code] → sees chef's branded page
        ↓
Guest fills out form → guest_lead created → chef notified
        ↓
Chef opens /guest-leads → sees new lead
        ↓
Chef clicks "Convert to Client" → client record created
        ↓
Chef can now book events, send proposals, build relationship
```

## Architecture Compliance

- **Tenant scoping:** Every query scoped by `tenant_id`
- **Role checks:** Chef actions use `requireChef()`
- **Non-blocking side effects:** Notification wrapped in try/catch
- **No direct financial writes:** Feature doesn't touch ledger
- **AI Policy:** No AI involvement — all human-driven
- **Privacy:** Host identity never revealed to guests; guest info only shared with their chef
- **Immutability:** No modifications to existing immutable tables
