# Inquiry Summary Feature

## What was built

A shared, beautiful visual summary of every inquiry — surfaced at the top of the chef's existing inquiry detail page and powering a brand-new client portal section (`/my-inquiries`).

Both parties now see the same structured snapshot of an inquiry: occasion, key facts, pipeline progress, preferences, linked quotes, and the original message.

---

## Why it was built

The chef's inquiry detail page is operationally dense — pipeline controls, AI composer, message log, notes, recipe linker, and more. Before this feature, there was no clean at-a-glance view of what the inquiry actually *is*.

Clients had no inquiry-facing portal at all. They could only see quotes, with no way to track where their request stood in the pipeline or revisit what they submitted.

---

## Files created or modified

### New files

| File | Purpose |
|------|---------|
| `components/inquiries/inquiry-summary.tsx` | Shared presentational component used by both views |
| `lib/inquiries/client-actions.ts` | Server actions for client portal inquiry access |
| `app/(client)/my-inquiries/page.tsx` | Client inquiry list (`/my-inquiries`) |
| `app/(client)/my-inquiries/[id]/page.tsx` | Client inquiry detail (`/my-inquiries/[id]`) |
| `supabase/migrations/20260302000002_client_inquiry_portal_index.sql` | Composite performance index |
| `docs/inquiry-summary.md` | This document |

### Modified files

| File | Change |
|------|--------|
| `app/(chef)/inquiries/[id]/page.tsx` | Added `InquirySummary` above the main content grid; removed now-duplicate standalone "Original Message" and "Status History" cards |
| `components/navigation/client-nav.tsx` | Added "My Inquiries" nav item with `ClipboardList` icon |
| `app/(client)/my-quotes/[id]/page.tsx` | Added "View Inquiry" cross-link in the Event Details card header |

---

## Component architecture — the `variant` prop pattern

`InquirySummary` accepts a `variant: 'chef' | 'client'` prop that gates what data is rendered:

| Field | Chef | Client |
|-------|------|--------|
| `channel` | shown | hidden (pass `null`) |
| `confirmed_budget_cents` | shown | hidden (pass `null`) |
| Pipeline steps | 5 steps including `awaiting_chef` | 4 simplified steps |
| Quote links | → `/quotes/[id]` | → `/my-quotes/[id]` |

Passing `null` for a field suppresses it in both variants — no runtime branching on undefined vs null.

---

## What the summary displays

1. **Hero card** — occasion title, status badge, channel badge (chef only), "Booked" indicator when converted to event, received/last-response timestamps
2. **Key facts grid** — date, guest count, location, budget (chef only), each with icon + "TBD" fallback
3. **Progress indicator** — horizontal stepper for active statuses; vertical transition history for terminal statuses (declined/expired)
4. **Preferences** — dietary restriction pills + service expectations prose (only rendered when data present)
5. **Linked quotes** — clickable mini-cards with quote status badge and total amount
6. **Original message** — the verbatim inquiry text in a styled blockquote

---

## Data access and security

### RLS policies (no new policies required)

The following policies were already established in Layer 2 (`20260215000002_layer_2_inquiry_messaging.sql`):

- `inquiries_client_select` — clients can SELECT rows where `client_id = get_current_client_id()`
- `inquiry_transitions_client_select` — clients can SELECT transitions for their own inquiries
- `quotes_client_can_view_own` — clients can SELECT quotes where `client_id = get_current_client_id()`

The new server actions also enforce ownership at the query level (`.eq('client_id', user.entityId)`) as the first line of defence.

### What clients cannot see

- `channel` — how the chef logged the source of the inquiry (internal)
- `confirmed_budget_cents` — the client's stated budget (redundant given quotes)
- `confirmed_cannabis_preference` — chef-operational field
- `unknown_fields` JSONB — stores internal lead data for unlinked contacts
- `internal_notes` on quotes — chef-only

### Unlinked inquiries

Inquiries created without a `client_id` (leads logged manually by chefs) are invisible to the client portal. The `.eq('client_id', user.entityId)` filter naturally excludes them. This is correct — there is no authenticated client to show them to.

---

## Performance index

`20260302000002_client_inquiry_portal_index.sql` adds:

```sql
CREATE INDEX IF NOT EXISTS idx_inquiries_client_status
  ON inquiries(client_id, status)
  WHERE client_id IS NOT NULL;
```

This covers the list query pattern (`WHERE client_id = $1 AND status IN (...)`). The partial index on `client_id IS NOT NULL` excludes unlinked leads, keeping the index small and focused.

---

## Navigation note — mobile bottom bar

Adding "My Inquiries" brings the bottom tab bar to 6 items. Each tab is narrower as a result but still functional. If the product grows and more items are added, the lowest-priority items should be moved behind the hamburger menu while the top 4–5 remain in the bottom bar.

---

## How to verify

1. **Chef view** — open any inquiry detail page (`/inquiries/[id]`). The beautiful summary cards appear above the Contact / Confirmed Facts grid.
2. **Client view** — sign in as a client who has submitted an inquiry. Navigate to `/my-inquiries`. Cards for each active inquiry appear. Click one to see the full summary.
3. **Conversion link** — for a confirmed inquiry, the "View Your Event →" button appears linking to `/my-events/[id]`.
4. **Quote cards** — if the inquiry has sent/accepted/rejected quotes, they appear as clickable cards in both views.
5. **Terminal status** — for a declined or expired inquiry (reachable directly by URL from client side), the progress section switches to a vertical transition history list.
6. **Migration** — run `supabase db push --linked` to apply `20260302000002_client_inquiry_portal_index.sql`.
