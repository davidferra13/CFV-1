# Partner Service Attribution & Contribution System

## What Changed & Why

Chefs work at partner venues (malls, Airbnb estates, hotels, event spaces) repeatedly. The database already stored `referral_partner_id` and `partner_location_id` on the `events` table, but no UI exposed these columns. A chef with 50+ dinners at one location had no way to tag those events or share evidence of value delivered to that partner.

This feature closes the loop with four capabilities:

---

## 1. Per-Event Attribution (Event Form)

**Files changed:**
- `components/events/event-form.tsx`
- `app/(chef)/events/new/page.tsx`
- `app/(chef)/events/[id]/edit/page.tsx`
- `lib/events/actions.ts`

When creating or editing a **draft or proposed** event, a new "Partner Venue" section appears at the bottom of the form (only if partners exist). The existing `PartnerSelect` cascading dropdown (partner → location) is wired directly into the form state. The selected IDs are saved to `events.referral_partner_id` and `events.partner_location_id`.

The event detail page (`app/(chef)/events/[id]/page.tsx`) now shows a "Partner Venue" row with a link to the partner page, and optionally the specific location name.

---

## 2. Bulk Event Assignment (Partner Detail Page)

**Files changed/created:**
- `app/(chef)/partners/[id]/page.tsx`
- `components/partners/bulk-assign-events.tsx`
- `lib/partners/actions.ts` → `getEventsNotAssignedToPartner()`, `bulkAssignEventsToPartner()`

For historical events (50+ dinners that existed before this feature), chefs use the **"Assign Past Events"** panel on the partner detail page:

1. A searchable, scrollable list of all non-cancelled events **not yet assigned to this partner** appears
2. Multi-select with checkboxes; a "Reassigning" badge flags events already linked to a different partner
3. An optional location dropdown scopes the batch to a specific sub-location
4. On submit, `bulkAssignEventsToPartner()` updates `referral_partner_id` and `partner_location_id` in a single batch query — **no status restriction**, safe for completed events

This action only touches partner FK columns, never status or financial data.

---

## 3. Service History on Partner Detail Page

**Files changed:**
- `app/(chef)/partners/[id]/page.tsx`
- `lib/partners/actions.ts` → `getPartnerEvents()`

The partner detail page now shows a **Service History** section below the bulk-assign panel. Events are grouped by location:

- Each location gets its own table: date, occasion, guests, status, link
- Subtotals: event count, total guests, revenue from completed events
- Events with no specific location appear under "No specific location"
- Links from each row go directly to the full event detail page

---

## 4. Shareable Partner Contribution Report

**Files changed/created:**
- `supabase/migrations/20260301000003_partner_share_token.sql`
- `lib/partners/actions.ts` → `generatePartnerShareLink()`, `getPartnerContributionReport()`
- `components/partners/share-partner-report-button.tsx`
- `components/partners/partner-contribution-report.tsx`
- `app/(public)/partner-report/[token]/page.tsx`

The chef clicks **"Share with Partner"** on the partner detail page. This generates a UUID token stored in `referral_partners.share_token` (generated once, reused on subsequent clicks) and copies the public URL to clipboard:

```
https://cheflowhq.com/partner-report/<uuid-token>
```

The partner opens this URL with no login required. The page renders a branded report showing:

- Chef name and photo
- Aggregate stats: events served, guests hosted, catering value
- Per-location breakdown with event tables
- Chronological event history

The report uses the admin Supabase client (same pattern as `/share/[token]` for events) to bypass RLS.

---

## Database Changes

### Migration: `20260301000003_partner_share_token.sql`

```sql
ALTER TABLE referral_partners
  ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_partners_share_token
  ON referral_partners(share_token)
  WHERE share_token IS NOT NULL;
```

**No existing data affected.** Purely additive.

The columns `events.referral_partner_id` and `events.partner_location_id` already existed from the earlier partners migration — no changes needed there.

---

## New Functions in `lib/partners/actions.ts`

| Function | Auth | Purpose |
|---|---|---|
| `getPartnersWithLocations()` | Chef | Lightweight query for form dropdowns |
| `getPartnerEvents(partnerId)` | Chef | Full event history for a partner |
| `getEventsNotAssignedToPartner(partnerId)` | Chef | Events available for bulk assignment |
| `bulkAssignEventsToPartner(partnerId, locationId, eventIds[])` | Chef | Batch-tag events to partner (no status restriction) |
| `generatePartnerShareLink(partnerId)` | Chef | Generate/return public share URL |
| `getPartnerContributionReport(token)` | Public (admin client) | Fetch report data by token |

---

## Architecture Notes

- **Bulk assignment bypasses the `updateEvent` status restriction** intentionally — it only writes partner FK columns, not any event fields that affect the FSM or financials.
- **Share token is idempotent** — calling `generatePartnerShareLink` multiple times returns the same URL once a token exists.
- **Public report uses admin client** — same pattern as the existing event guest share page (`/share/[token]`). No unauthenticated data beyond what the token grants.
- The `PartnerContributionReport` component is shared between the public page and could be added to the chef's print report page in the future.
