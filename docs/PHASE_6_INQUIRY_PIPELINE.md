# Phase 6 — Inquiry Pipeline Implementation

## What Changed

This phase adds the inquiry pipeline: the system that captures every potential dinner from every channel, tracks it through qualification, and converts it into a booked event. This is the front door of the business.

### Files Created

| File                                            | Purpose                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `lib/inquiries/actions.ts`                      | 8 server action functions for full inquiry CRUD and pipeline management |
| `components/inquiries/inquiry-status-badge.tsx` | Status + channel badge components                                       |
| `components/inquiries/inquiry-form.tsx`         | Quick capture form (client component)                                   |
| `components/inquiries/inquiry-transitions.tsx`  | Pipeline transition buttons (client component)                          |
| `app/(chef)/inquiries/page.tsx`                 | Pipeline view — tabs + filtered list                                    |
| `app/(chef)/inquiries/new/page.tsx`             | Quick capture page — log new inquiry fast                               |
| `app/(chef)/inquiries/[id]/page.tsx`            | Detail page — full inquiry view with transitions                        |

### Files Modified

| File                                 | Change                                              |
| ------------------------------------ | --------------------------------------------------- |
| `components/navigation/chef-nav.tsx` | Added "Inquiries" link between Dashboard and Events |
| `app/(chef)/dashboard/page.tsx`      | Added inquiry stats card + new inquiry alert banner |

---

## Schema Adaptation

The spec assumed certain column names that didn't match the actual `inquiries` table. Key adaptations:

| Spec Concept            | Actual DB Column                          | Notes                                                                 |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `client_name`           | `unknown_fields.client_name` (JSON)       | No name column on inquiries; linked via `client_id` or stored in JSON |
| `client_email`          | `unknown_fields.client_email` (JSON)      | Same pattern for unlinked leads                                       |
| `event_date`            | `confirmed_date`                          | All event facts use `confirmed_*` prefix                              |
| `guest_count`           | `confirmed_guest_count`                   |                                                                       |
| `location_*` (4 fields) | `confirmed_location` (single text)        | Schema uses one location field, not address/city/state/zip            |
| `budget_range` (text)   | `confirmed_budget_cents` (integer)        | Stored in cents, consistent with ledger model                         |
| `dietary_restrictions`  | `confirmed_dietary_restrictions` (text[]) |                                                                       |
| `service_style`         | `confirmed_service_expectations` (text)   | Free text, not enum — allows richer description                       |
| `raw_message`           | `source_message`                          |                                                                       |
| `notes`                 | `unknown_fields.notes` (JSON)             |                                                                       |
| `referral_source`       | `unknown_fields.referral_source` (JSON)   |                                                                       |

The `unknown_fields` JSON column is the escape hatch for data that doesn't have dedicated columns. This is by design — the inquiry schema is deliberately simpler than the event schema because inquiries capture rough facts that get refined during qualification.

---

## Server Actions (8 functions)

1. **`createInquiry(data)`** — Insert with auto-client-linking by email match. Stores unlinked lead info in `unknown_fields` JSON.

2. **`getInquiries(filters?)`** — Tenant-scoped list with optional status/channel/date filters. Joins clients for display names.

3. **`getInquiryById(id)`** — Single inquiry with full transition history from `inquiry_state_transitions`.

4. **`updateInquiry(id, data)`** — Updates confirmed facts and `unknown_fields`. Never touches status (that's `transitionInquiry`).

5. **`transitionInquiry(id, newStatus)`** — Validates transition in app code, then updates status. DB trigger enforces and auto-inserts audit trail.

6. **`convertInquiryToEvent(inquiryId)`** — The bridge function. Takes confirmed inquiry → creates draft event. Maps `confirmed_*` fields to event columns. Requires: client linked, date confirmed. Sets `inquiry_id` FK on event and `converted_to_event_id` on inquiry.

7. **`getInquiryStats()`** — Counts by status for dashboard summary.

8. **`deleteInquiry(id)`** — Hard delete, only for `new` or `declined` status.

### Transition Map (enforced in app + DB trigger)

```
new → awaiting_client | declined
awaiting_client → awaiting_chef | declined | expired
awaiting_chef → quoted | declined
quoted → confirmed | declined | expired
confirmed → (terminal — converts to event)
declined → (terminal)
expired → new (can be reopened)
```

---

## UI Design Decisions

### Pipeline View (Option B: Tabs + List)

Chose filtered list with status tabs over Kanban columns. Simpler to build, easier to scan on mobile, and follows the existing events page pattern exactly.

### Quick Capture Form

Only **channel** and **client name** are required. Everything else is optional. The form is organized into sections: Required → Contact Info → Event Details → Context. The chef can log an inquiry from a text message in under 10 seconds.

### Client Linking

The form offers an optional "Link to Existing Client" dropdown. When selected, it auto-fills name/email/phone. When not selected, the chef types a free-text name and the info goes to `unknown_fields`. Auto-linking by email happens server-side in `createInquiry`.

### Detail Page

Shows: contact info, confirmed facts (with missing facts highlighted in amber), pipeline management fields, transition buttons, internal notes, original message, and status history timeline.

### Dashboard Integration

- Amber alert banner when new inquiries exist: "You have 3 new inquiries that need a response"
- Inquiry stats card in the business context grid (changed from 2-col to 3-col layout)
- Active count = new + awaiting_client + awaiting_chef + quoted

---

## convertInquiryToEvent — Field Mapping

| Inquiry Field                    | Event Field            | Notes                                             |
| -------------------------------- | ---------------------- | ------------------------------------------------- |
| `client_id`                      | `client_id`            | Required — must be linked before conversion       |
| `confirmed_date`                 | `event_date`           | Required — must be confirmed before conversion    |
| `confirmed_guest_count`          | `guest_count`          | Defaults to 1 if not confirmed                    |
| `confirmed_location`             | `location_address`     | Single field → address; city/zip default to 'TBD' |
| `confirmed_occasion`             | `occasion`             | Direct map                                        |
| `confirmed_budget_cents`         | `quoted_price_cents`   | Budget becomes initial quote for draft            |
| `confirmed_dietary_restrictions` | `dietary_restrictions` | Direct map (string[])                             |
| `confirmed_service_expectations` | `special_requests`     | Free text → special requests                      |
| `confirmed_cannabis_preference`  | `cannabis_preference`  | String → boolean conversion                       |
| —                                | `serve_time`           | Defaults to 'TBD' (required on events)            |
| `id`                             | `inquiry_id`           | FK linking event back to source inquiry           |

The draft event will have 'TBD' values for location_city, location_zip, and serve_time. The chef edits these in the event detail page before proposing to the client.

---

## Verification

- `npx tsc --noEmit` → **0 errors**
- `npm run build` → **Clean build**, all 3 inquiry routes present:
  - `ƒ /inquiries` (1.33 kB)
  - `ƒ /inquiries/[id]` (3.67 kB)
  - `ƒ /inquiries/new` (4.91 kB)

---

## What This Phase Does NOT Build

- **Messaging/communication** — The inquiry tracks the LEAD. Drafting responses is a separate phase.
- **Public intake form** — That's a Public Layer feature. This is the chef's internal pipeline.
- **Automated follow-ups** — V1 is manual. The chef decides when to follow up.
- **Email notifications** — No email integration in V1.
- **Inquiry editing page** — The detail page shows data but editing confirmed facts requires a future edit form or inline editing. The `updateInquiry` server action is ready for this.
