# Lead Funnel Improvements — Implementation Summary

**Date:** 2026-02-23
**Branch:** `feature/risk-gap-closure`

## What Changed

Seven features built to improve lead capture, response speed, and conversion tracking.

---

### 1. Response Time SLA + Urgency Badges

**Files:**

- `lib/analytics/response-time-actions.ts` — computes per-inquiry urgency (overdue/urgent/ok/responded) based on first outbound message timing
- `components/dashboard/response-time-widget.tsx` — dashboard widget showing count of inquiries awaiting response + avg response time

**How it works:**

- For each open inquiry, checks if any outbound message exists
- Computes hours waiting since inquiry creation
- Urgency levels: `overdue` (24h+), `urgent` (4h+), `ok` (<4h), `responded`
- Dashboard widget shows red/amber/green based on urgency counts

**Integration:**

- Dashboard: appears above holiday outreach panel when inquiries need attention
- Inquiry list: urgency badges on each inquiry row (e.g., "No reply 28h")

---

### 2. Conversion Funnel Analytics Page

**Files:**

- `app/(chef)/analytics/funnel/page.tsx` — full funnel analytics page

**What it shows:**

- Inquiry → Quote → Booking → Completed funnel visualization (using existing `ConversionFunnel` component)
- KPI cards: avg response time, overall conversion rate, ghost rate, avg lead time
- Channel performance comparison (website vs. referral vs. TakeAChef vs. Yhangry)
- Decline reason breakdown with progress bars
- Lead time distribution buckets

**Data sources:** All from existing `lib/analytics/pipeline-analytics.ts` functions that were already built but not wired to a page.

---

### 3. Auto-Follow-Up Draft Cadence

**Files:**

- `lib/inquiries/follow-up-actions.ts` — finds stale inquiries (awaiting_client/quoted with no outbound in N days)
- `components/inquiries/pending-follow-ups-widget.tsx` — dashboard widget listing stale inquiries needing a nudge

**How it works:**

- Queries inquiries in `awaiting_client` or `quoted` status
- Checks last outbound message per inquiry
- If no outbound in 3+ days, marks as stale
- Dashboard widget shows these with "Xd quiet" badge

**Note:** Does NOT auto-send anything. Surfaces stale inquiries for the chef to decide on. Matches AI_POLICY.md (AI assists, never owns).

---

### 4. Inquiry Completeness Score

**Files:**

- `lib/leads/completeness.ts` — pure function computing 0–100% based on filled fields
- `components/inquiries/completeness-ring.tsx` — small SVG progress ring

**Scoring breakdown (100 points total):**
| Field | Weight |
|-------|--------|
| Event date | 20 |
| Budget | 20 |
| Guest count | 15 |
| Client linked | 15 |
| Occasion | 10 |
| Location | 10 |
| Dietary info | 10 |

**Integration:** Shows as a small ring on each inquiry card in the list view.

---

### 5. Quick Response Templates — Enhanced

**Discovery:** A full template system already existed at `lib/messages/actions.ts` + `components/messages/template-manager.tsx` + `app/(chef)/settings/templates/page.tsx`.

**Enhancement (migration 20260303000021):**

- Added `subject` column for email subject lines
- Added `merge_tags` TEXT[] column for tracking which tags a template uses

---

### 6. Source Attribution / UTM Tracking

**Files:**

- Migration `20260303000021`: adds `utm_source`, `utm_medium`, `utm_campaign` to inquiries table
- `public/embed/chefflow-widget.js`: accepts `data-source`, `data-medium`, `data-campaign` attributes
- `app/api/embed/inquiry/route.ts`: stores UTM fields when creating inquiry

**How it works:**

- Embed widget passes UTM params via iframe URL query string
- API route stores them on the inquiry record
- Funnel analytics page shows channel performance (uses channel column; UTM gives finer-grained attribution)

**Usage example:**

```html
<script
  src="https://app.cheflowhq.com/embed/chefflow-widget.js"
  data-chef-id="..."
  data-source="homepage"
  data-campaign="summer-2026"
></script>
```

---

### 7. SMS/WhatsApp Channel Infrastructure

**Files:**

- `lib/sms/twilio-client.ts` — Twilio REST API client (no SDK dependency, just fetch)
- `lib/sms/actions.ts` — server actions for sending SMS/WhatsApp + logging to messages table
- `app/api/webhooks/twilio/route.ts` — inbound webhook for receiving SMS/WhatsApp

**Requirements to activate:**

- `TWILIO_ACCOUNT_SID` — Twilio account SID
- `TWILIO_AUTH_TOKEN` — Twilio auth token
- `TWILIO_PHONE_NUMBER` — SMS sender number
- `TWILIO_WHATSAPP_NUMBER` — WhatsApp sender (format: `whatsapp:+1234567890`)

**Webhook URL:** Configure in Twilio console → `https://app.cheflowhq.com/api/webhooks/twilio`

**How it works:**

- Outbound: sends via Twilio REST API, logs to `messages` table with `channel: 'sms'` or `channel: 'whatsapp'`
- Inbound: Twilio POSTs to webhook, matched to client by phone number, stored in messages table
- Integrates with existing unified inbox — SMS/WhatsApp messages appear alongside Gmail

---

### 8. Inquiry List UX Revamp (Overwhelm Fix)

**File:** `app/(chef)/inquiries/page.tsx` — completely rewritten

**Problem:** Gmail sync dumps 50+ inquiries at once, showing them all in a flat list with equal visual weight.

**Solution — Smart Priority Grouping (when viewing "All"):**

1. **Needs Your Response** (red section) — inquiries with status `new` or `awaiting_chef` that have NO outbound message. These are the ones only the chef can action.

2. **Follow-Up Due** (amber section) — inquiries in `awaiting_client` or `quoted` where client hasn't responded in 3+ days. Time to nudge.

3. **Active Pipeline** (green section) — everything else that's open and on track.

4. **Closed** (collapsed) — declined/expired/confirmed, hidden behind a `<details>` toggle so they don't clutter the view.

**Additional improvements:**

- Each inquiry row now shows completeness ring (how many fields filled)
- Urgency badges show "No reply 28h" or "Waiting 6h" per inquiry
- "Funnel Analytics" button in header links to the new analytics page
- Filtered views (specific status tabs) still show flat lists

---

## Database Changes

**Migration:** `supabase/migrations/20260303000021_response_templates_and_utm.sql`

```sql
-- UTM fields on inquiries
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
CREATE INDEX IF NOT EXISTS idx_inquiries_utm_source ON inquiries(utm_source) WHERE utm_source IS NOT NULL;

-- Response template enhancements
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
ALTER TABLE response_templates ADD COLUMN IF NOT EXISTS merge_tags TEXT[] NOT NULL DEFAULT '{}';
```

All changes are **additive** — no drops, no renames, no destructive ops.

---

## What's NOT Done (Future)

- **Auto-draft follow-up emails:** The stale inquiry detection is built, but the AI `draftFollowUpForInquiry()` function isn't wired to a scheduled job yet. Currently surfaces as a dashboard widget only.
- **Response A/B testing:** Would need separate infrastructure for subject line variants + tracking.
- **SMS/WhatsApp activation:** Infrastructure is ready, needs Twilio account credentials in `.env.local`.
- **Inquiry search:** Full-text search across client name, occasion, notes. Could use Postgres `tsvector` or a simple ILIKE filter.
