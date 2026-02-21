# Build: Push Dinner Campaigns

**Branch:** `feature/scheduling-improvements`
**Date:** 2026-02-21

---

## What Was Built

Push Dinners is an outbound marketing feature that inverts ChefFlow's existing reactive model.
Instead of waiting for clients to find the chef, the chef creates a themed dinner concept
(Halloween, Valentine's Day, etc.), invites selected clients with AI-personalised messages,
and makes the dinner bookable via a public link.

The key design principle is **chef-controlled invasiveness**: the chef decides exactly how
loud the push is — a quiet portal banner clients see when they log in, a personal email
that they approved one-by-one, or a shareable link they distribute themselves via Instagram
or text. The client's booking experience is intentionally lightweight — "Count me in" style,
not a full inquiry form.

---

## Files Created

### Database

| File                                                           | Purpose                                                                                                                                                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260320000011_push_dinner_campaigns.sql` | Extends marketing_campaigns + campaign_recipients with push-dinner fields. Adds push_dinner to campaign_type enum and campaign_response to inquiry_channel enum. Adds delivery_modes column. |

### Server Actions

| File                                      | Purpose                                                                                                                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/campaigns/push-dinner-actions.ts`    | CRUD for campaigns and recipients. Draft approval workflow. `launchCampaign()` sends all approved email drafts via Resend. `getPushDinnerStats()` for analytics.                                                                               |
| `lib/campaigns/targeting-actions.ts`      | Client segment queries: by occasion, VIP, dormant, seasonal, all, handpick search. `getOpenDateSuggestions()` returns free Fri/Sat/Sun in next 90 days ("fill my schedule").                                                                   |
| `lib/campaigns/public-booking-actions.ts` | Unauthenticated actions for the public `/book/[token]` page. `getCampaignByToken()` returns dinner info with no auth. `submitCampaignBooking()` creates client + inquiry + draft event, increments seats_booked, sends ack email non-blocking. |
| `lib/ai/campaign-outreach.ts`             | **Two AI paths**: `draftCampaignConcept()` → Gemini (public marketing copy, no PII). `draftPersonalizedOutreach()` → Ollama (private data: client name, past events, dietary prefs). `generateAllDrafts()` batches all recipients.             |

### UI Components

| File                                           | Purpose                                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `components/campaigns/push-dinner-builder.tsx` | 5-step wizard: The Dinner → Menu → Who to Invite → Review Drafts → Launch                                               |
| `components/campaigns/draft-review-card.tsx`   | Per-client draft card with approve / edit inline / skip controls                                                        |
| `components/public/campaign-booking-form.tsx`  | "Count me in" public booking form: guest count stepper, name, email. Optional dietary/note fields collapsed by default. |

### Pages

| File                                                                | Purpose                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `app/(chef)/marketing/push-dinners/page.tsx`                        | Campaign list with seat capacity bars and status badges        |
| `app/(chef)/marketing/push-dinners/new/page.tsx`                    | Renders the builder wizard                                     |
| `app/(chef)/marketing/push-dinners/[id]/page.tsx`                   | Campaign detail: stats, seat bar, booking link, recipient list |
| `app/(chef)/marketing/push-dinners/[id]/campaign-detail-client.tsx` | Client component: copy link and open booking page buttons      |
| `app/book/[token]/page.tsx`                                         | Public booking page — no auth, accessible via shareable link   |

### Modified Files

| File                                   | Change                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/marketing/constants.ts`           | Added `push_dinner: 'Push Dinner'` to `CAMPAIGN_TYPE_LABELS`                                                                                                                         |
| `components/navigation/nav-config.tsx` | Added Push Dinners as first child of Email Campaigns nav group                                                                                                                       |
| `middleware.ts`                        | Added `/book` to `skipAuthPaths` so the public booking page is accessible without auth                                                                                               |
| `lib/goals/actions.ts`                 | Fixed pre-existing build error: removed `export` from `computeCategoryProgress` (a non-async function that cannot be exported from a `'use server'` file and wasn't used externally) |

---

## Architecture Decisions

### AI Routing (Private vs Public)

- **Campaign concept copy** (dinner description, hook, CTA) → **Gemini**. This is marketing copy — no client PII, no private data. Fast and high quality.
- **Personalised outreach drafts** → **Ollama** (local only). Each draft references the client's name, past event history, dietary restrictions, and vibe notes — all private data categories. If Ollama is offline, the chef sees a clear warning and can write drafts manually. Data never leaves the machine.

### Delivery Modes (The Non-Invasive Design)

The chef picks one or more delivery modes at launch:

| Mode            | What happens                                                               | Feel                     |
| --------------- | -------------------------------------------------------------------------- | ------------------------ |
| `email`         | Sends each approved personal draft to the client's inbox via Resend        | Direct, personal         |
| `portal_banner` | (Stored on campaign, future: shows banner on client's ChefFlow portal)     | Quiet, non-invasive      |
| `link_only`     | Chef gets the link + QR code to share manually (Instagram story, DM, text) | Organic, chef-controlled |

The chef can combine modes: personal email to loyal regulars, shareable link on Instagram for new leads.

### Public Booking Flow

URL: `/book/[token]` — no login required.

The booking form is deliberately minimal:

1. Guest count (big stepper — the fun part)
2. Name + email
3. "Count me in" button

Optional dietary/note fields are collapsed by default. No payment, no account creation, no heavy form. Chef follows up to confirm. The confirmation email goes out immediately (non-blocking).

On submission, `submitCampaignBooking()` creates:

- Client record (idempotent by email)
- Inquiry (channel: `campaign_response`)
- Draft event
- Increments `seats_booked` on the campaign

### Seat Capacity

Each push dinner has `seats_available` (defaults to `guest_count_max`). When a public booking brings `seats_booked` up to `seats_available`, the booking form is replaced with "Fully booked." No overbooking possible.

### "Fill My Schedule" Integration

On Step 3 (Who to Invite), the chef can expand an "Open weekends near this date" panel. `getOpenDateSuggestions()` returns free Friday/Saturday/Sunday dates in the next 90 days. Clicking a date updates the campaign's proposed date — making it easy to build a campaign around an available slot rather than a slot around a campaign.

---

## Migration Notes

**Timestamp:** `20260320000011` (strictly after the previous highest `20260320000010`).

The migration is fully additive:

- `ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS ...` (11 new columns)
- `ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS ...` (7 new columns)
- `ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'push_dinner'`
- `ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'campaign_response'`
- 3 new indexes (token lookup, pending drafts, seat capacity)

No existing data is touched. Safe to apply to production with live data.

**Apply the migration:**

```bash
# Backup first (always, per CLAUDE.md)
supabase db dump --linked > backup-$(date +%Y%m%d).sql

# Apply
supabase db push --linked
```

---

## How to Test

1. **Full happy path:**
   - Go to Marketing → Push Dinners → New Push Dinner
   - Step 1: Select Halloween, pick Oct 31, $150/person, 12 guests → AI Draft Concept
   - Step 3: "Past clients who booked this occasion" → select clients → Next
   - Step 4: Generate All Drafts (requires Ollama running) → Approve All
   - Step 5: Select "Personal email" + "Shareable link" → Launch
   - Open the booking URL in incognito → fill "Count me in" form
   - Verify new inquiry appears in chef's inbox with channel `campaign_response`

2. **Ollama offline path:**
   - Stop Ollama → go to Step 4 → click Generate All Drafts
   - Should show amber warning, not crash
   - Chef can write drafts manually → approve → launch

3. **Seat limit:**
   - Set seats_available = 2 → book 2 times via public link
   - Third booking attempt should show "This dinner is fully booked."

4. **Unsubscribed client filter:**
   - Set a client's `marketing_unsubscribed = true` in DB
   - They should not appear in any segment in Step 3

5. **Delivery mode: link only:**
   - Select only "Shareable link only" → Launch
   - Campaign status should update without sending any emails
   - Booking link should be active and bookable

---

## What's Not Built Yet (v2)

- **Portal banner delivery**: The `portal_banner` delivery mode is wired into the campaign data model and shown in the builder UI, but the actual client portal banner component is not built yet. The client portal needs a section that queries active push dinner campaigns for that client and renders a fun "Chef has a dinner coming up" card.
- **SMS outreach**: The notification system supports SMS (Twilio), but campaign-specific SMS templates are not built.
- **Recurring templates**: Automatic "remind me to push this every Halloween" yearly recurrence.
- **Open/click tracking**: The `opened_at` and `clicked_at` columns exist in `campaign_recipients` but are not wired to tracking pixels.
- **Revenue attribution**: The existing `getCampaignRevenueAttribution()` in `lib/marketing/actions.ts` will automatically attribute revenue for push dinner bookings within 30 days of campaign send.
