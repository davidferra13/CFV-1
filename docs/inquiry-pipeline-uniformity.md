# Inquiry Pipeline Uniformity — Audit & Fixes

**Date:** 2026-02-19
**Branch:** fix/cron-get-post-mismatch

---

## Why This Exists

ChefFlow has two paths for creating a dinner inquiry. Rather than forcing them into one flow, this document records a targeted audit that verified both paths are well-behaved and fixed four specific gaps that broke uniformity in the client experience.

---

## The Two Paths

### Path A — Public Form

1. Client submits `/chef/[slug]/inquire`
2. `submitPublicInquiry()` runs without auth (admin client)
3. Creates: client record → inquiry (`status: new`) → draft event (linked via `inquiry_id` and `converted_to_event_id`)
4. Chef sees inquiry in `/inquiries` and the linked draft event immediately

### Path B — Manual (Chef-Logged)

1. Chef opens `/inquiries/new` and enters details
2. `createInquiry()` creates only an inquiry (`status: new`)
3. No event is created yet
4. Chef walks the inquiry through its pipeline (`new → awaiting_client → awaiting_chef → quoted → confirmed`) and then manually calls `convertInquiryToEvent()` to create the draft event

Both paths converge at the same draft event → the identical 8-state event FSM runs identically from there.

---

## Gaps Fixed

### 1. No acknowledgment email for public inquiry submissions

**File changed:** `lib/inquiries/public-actions.ts`
**Supporting changes:** `lib/email/templates/inquiry-received.tsx` (new), `lib/email/notifications.ts` (new dispatcher)

**Problem:** When a client submitted the public inquiry form, they received no email. The only feedback was the "thank you" page. This meant clients had no confirmation in their inbox, no record of what occasion and date they requested, and no reassurance that the chef received their message.

**Fix:** After the inquiry row is successfully inserted, `submitPublicInquiry()` now fires `sendInquiryReceivedEmail()` in a non-blocking `try/catch` block. The email:

- Acknowledges receipt with the chef's business name
- Shows the requested occasion and date
- Sets the expectation: "Your chef will send a formal proposal within 1–2 business days"
- Has no CTA button (client has no portal account yet at inquiry stage)

The email is fire-and-forget — a send failure is logged but never propagates to the client's form response.

---

### 2. Draft events were visible to clients

**File changed:** `lib/events/client-actions.ts` — `getClientEvents()` query

**Problem:** The Supabase query in `getClientEvents()` fetched all events belonging to the client without filtering by status. A client could see a draft event — one the chef hasn't even proposed yet — showing a "Draft" badge with no action buttons. This is confusing and incorrect: clients should only ever see an event once the chef has formally proposed it.

**Fix:** Added `.not('status', 'eq', 'draft')` to the query chain. Clients now only see events in `proposed`, `accepted`, `paid`, `confirmed`, `in_progress`, `completed`, or `cancelled` states.

---

### 3. Event reminder cron skipped paid events

**File changed:** `app/api/scheduled/lifecycle/route.ts` — section 3 (24-hour reminder)

**Problem:** The daily 3 AM lifecycle cron sends a reminder email to clients whose event is happening the next day. The status filter was `.in('status', ['confirmed', 'in_progress'])`. If a client has paid their deposit but the chef hasn't clicked "Confirm Event" before 3 AM the night before, the client would receive **no reminder at all** — even though their dinner is happening the next day.

**Fix:** Changed the filter to `.in('status', ['paid', 'confirmed', 'in_progress'])`. The `EventReminderEmail` template content is appropriate for all three states — it shows serve time, arrival time, location, guest count, and special requests, none of which require the event to be in `confirmed` state.

**Note:** This fix was documented prematurely — the code was not actually updated at the time of the original audit. The filter was corrected on 2026-02-19 as part of a second pass.

---

### 4. Public inquiry path set `location_city` to the full address string

**File changed:** `lib/inquiries/public-actions.ts` — draft event INSERT

**Problem:** The public inquiry form collects a single `address` field (full address string). The draft event INSERT was using `location_city: validated.address.trim()`, placing the full address in the city column. Path B (`convertInquiryToEvent`) correctly uses `location_city: 'TBD'` as a placeholder when city is unknown. The mismatch caused display issues in email templates and document generation that expect a short city name.

**Fix:** Changed to `location_city: 'TBD'` to match Path B. Both paths now produce structurally identical draft event records.

---

## Known Non-Fix: Hardcoded Chef Email

`lib/inquiries/public-actions.ts` contains:

```typescript
const DEFAULT_BOOKING_CHEF_EMAIL = 'davidferra13@gmail.com'
```

The `chef_slug` from the form data is not used to look up the chef — the hardcoded email is used instead. This works correctly for the current single-chef setup.

**Why it wasn't changed:** This is a single-tenant system for now. Changing this to a slug-based lookup would be the correct approach if a second chef were ever onboarded, but it would add complexity and risk without immediate benefit. It's recorded here as a known limitation for future multi-chef expansion.

---

## Verification Checklist

- [ ] Submit public inquiry form → client receives "Inquiry received" email within seconds
- [ ] Log in as client whose only event is a draft → `/my-events` shows empty (no draft visible)
- [ ] With a `paid`-status event whose `event_date` is tomorrow, invoke `GET /api/scheduled/lifecycle` with `Authorization: Bearer {CRON_SECRET}` → response JSON shows `eventReminders: 1`
- [ ] Full happy-path walkthrough: draft → proposed → accepted → paid → confirmed → completed → confirm all existing emails still fire at correct stages

---

## Files Changed

| File                                       | Type     | Description                                                                                                         |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `lib/email/templates/inquiry-received.tsx` | New      | Email template for inquiry acknowledgment                                                                           |
| `lib/email/notifications.ts`               | Modified | Added `sendInquiryReceivedEmail()` dispatcher                                                                       |
| `lib/inquiries/public-actions.ts`          | Modified | Calls acknowledgment email after inquiry insert; fetches `business_name` from chef row; sets `location_city: 'TBD'` |
| `lib/events/client-actions.ts`             | Modified | Filters draft events from `getClientEvents()`                                                                       |
| `app/api/scheduled/lifecycle/route.ts`     | Modified | Adds `'paid'` to event reminder status filter                                                                       |
