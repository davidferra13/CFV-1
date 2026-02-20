# Calls & Meetings System

## What Changed and Why

ChefFlow previously had no first-class concept of a scheduled call or meeting. Phone was treated as a "channel label" inside the inquiry/messaging system — useful for logging that a conversation happened, but with no ability to schedule a future call, prepare for it, or record what was discussed.

As a private chef, calls happen constantly: qualifying new leads, following up on inquiries, walking through proposals, coordinating pre-event logistics with clients, and talking to vendors, suppliers, and partner chefs. Each type of call benefits from preparation and outcomes tracking. This feature makes calls a proper entity in the system.

---

## What Was Built

### Database

**New table: `scheduled_calls`**
Migration: `supabase/migrations/20260303000001_calls_meetings_system.sql`

The table stores:
- **Who**: `client_id` (nullable, FK to clients) + `contact_name`, `contact_phone`, `contact_company` for non-client calls
- **What kind**: `call_type` enum (discovery, follow_up, proposal_walkthrough, pre_event_logistics, vendor_supplier, partner, general)
- **When**: `scheduled_at`, `duration_minutes`, `timezone`
- **Context links**: `inquiry_id`, `event_id` (both nullable) — lets you link a call to its business context
- **Status FSM**: scheduled → confirmed → completed | no_show | cancelled
- **Prep agenda**: `agenda_items` JSONB array of `{id, item, completed, source}` — source tracks whether an item was auto-populated or manually added
- **Outcome**: `outcome_summary`, `call_notes`, `next_action`, `next_action_due_at`, `actual_duration_minutes`
- **Reminder idempotency**: `reminder_24h_sent_at`, `reminder_1h_sent_at` — prevents duplicate emails
- **Client notifications**: `notify_client` flag + `client_notified_at`

RLS policy restricts all access to the owning chef's tenant.

---

### Server Actions

**File: `lib/calls/actions.ts`**

| Function | Description |
|---|---|
| `createCall(input)` | Schedule a new call. Auto-seeds agenda from linked inquiry/event. |
| `updateCall(id, input)` | Edit scheduling details, contact, prep notes. |
| `getCall(id)` | Fetch single call with joined client/inquiry/event. |
| `getCalls(filter?)` | List calls with optional status/type/date/client filters. |
| `getUpcomingCalls(limit)` | Fetch next N upcoming calls (for dashboard widget). |
| `updateCallStatus(id, status)` | FSM-enforced status transition. |
| `logCallOutcome(id, outcome)` | Log post-call summary, notes, next action. Marks completed. |
| `cancelCall(id)` | Shortcut for `updateCallStatus(id, 'cancelled')`. |
| `addAgendaItem(callId, text)` | Add a manual agenda item. |
| `toggleAgendaItem(callId, itemId)` | Check/uncheck a prep item. |
| `removeAgendaItem(callId, itemId)` | Remove an agenda item. |

All actions use `requireChef()` for auth + tenant scoping, Zod for input validation, and `logChefActivity()` for audit trail.

---

### Agenda Auto-Population

When a call is linked to an **inquiry** at creation time, the system reads:
- `confirmed_occasion`, `guest_count_adults`, `guest_count_kids`
- `budget_min` / `budget_max`
- `dietary_restrictions`
- `unknown_blocking_questions`

…and seeds `agenda_items` with `source: 'inquiry'` entries for each.

When linked to an **event**:
- Event date, guest count, current status

These items are stored as a snapshot at call creation — they are not live-linked to the source record, so they won't change if the inquiry is updated. The chef can add, remove, or reorder items freely.

---

### Call Status FSM

```
scheduled ──► confirmed ──► completed
    │               │
    └───────────────┴──► no_show
    │
    └──► cancelled
```

- `completed` and `no_show` are terminal — no further transitions
- `cancelled` is terminal — reachable from any non-terminal state
- Attempting an invalid transition throws an error

---

### Pages

| Route | Description |
|---|---|
| `/calls` | List view: upcoming + past, status filter tabs |
| `/calls/new` | Schedule a new call (accepts `?client_id`, `?inquiry_id`, `?event_id` query params for pre-population) |
| `/calls/[id]` | Call detail: meta, status actions, prep panel, outcome form |
| `/calls/[id]/edit` | Edit scheduling details for active calls |

---

### Components

| File | Purpose |
|---|---|
| `components/calls/call-card.tsx` | Compact list-view card with status, type badge, contact, time |
| `components/calls/call-form.tsx` | Scheduling form for create + edit |
| `components/calls/call-prep-panel.tsx` | Interactive agenda checklist + prep notes |
| `components/calls/call-outcome-form.tsx` | Post-call form: summary, notes, next action, actual duration |
| `components/calls/call-status-actions.tsx` | Confirm / cancel buttons (client) |
| `components/calls/call-type-badge.tsx` | Colored label for call type |
| `components/calls/upcoming-calls-widget.tsx` | Dashboard widget showing next 3–5 calls |

---

### Email Reminders

**Template: `lib/email/templates/call-reminder.tsx`**

Two modes:
1. **Chef reminder** (`isChefReminder: true`): "You have a call in X hours"
2. **Client notification** (`isChefReminder: false`): "Your chef has scheduled a call"

The `CallReminderEmail` component accepts `hoursUntil` to vary the subject line between the 24h and 1h reminders.

**Cron: `app/api/scheduled/call-reminders/route.ts`** (GET + POST)

Runs every 30 minutes via Vercel Cron. Two independent passes:
1. **24h window**: Finds calls scheduled between 23h and 25h from now with no `reminder_24h_sent_at`. Sends email, marks sent.
2. **1h window**: Finds calls scheduled between 45min and 75min from now with no `reminder_1h_sent_at`. Sends email, marks sent.

Each pass is idempotent — the `reminder_*_sent_at` columns prevent resending.

**Vercel Cron schedule** added to `vercel.json`:
```json
{ "path": "/api/scheduled/call-reminders", "schedule": "*/30 * * * *" }
```

---

### Dashboard Widget

`UpcomingCallsWidget` is added to the dashboard (`app/(chef)/dashboard/page.tsx`) and appears whenever there are upcoming calls. It shows the next 5 calls with date, time, contact, type, and agenda progress, and links directly to each call detail page and to `/calls/new`.

---

### Navigation

`Calls & Meetings` added to the **Pipeline** group in `components/navigation/nav-config.tsx` with children:
- All Calls
- Upcoming
- Completed
- Schedule a Call

---

## Connecting to the System

- **Inquiries**: From any inquiry page, link `/calls/new?inquiry_id=<id>` to pre-populate the form and auto-seed the agenda.
- **Events**: From any event page, link `/calls/new?event_id=<id>` to do the same for event context.
- **Clients**: From a client page, link `/calls/new?client_id=<id>&client_name=<name>` to pre-fill the contact.
- **Activity log**: All call lifecycle events (created, confirmed, completed, etc.) are recorded in `chef_activity_log`.
- **Reminders**: Fires automatically via cron — no manual action required.

---

## How to Apply the Migration

> **Back up your database before applying if you have production data.**

```bash
supabase db push --linked
```

This creates the `scheduled_calls` table, enables RLS, adds indexes, and wires the auto-update trigger. No existing data is modified.

After pushing, regenerate types:
```bash
supabase gen types typescript --linked > types/database.ts
```

---

## Verification Checklist

1. **Migration applied**: `scheduled_calls` table appears in Supabase dashboard
2. **Create call**: Navigate to `/calls/new`, fill out the form, submit → redirects to call detail page
3. **Agenda auto-population**: Create a call with an inquiry or event linked → verify agenda items are pre-seeded
4. **Prep checklist**: On call detail, check off agenda items → state persists on refresh
5. **Status transitions**: Click "Mark confirmed" → status updates; click "Mark complete & save" → outcome form saves
6. **Dashboard widget**: After creating a call, open `/dashboard` → widget appears with the call
7. **Reminder cron**: Call `GET /api/scheduled/call-reminders` with `Authorization: Bearer <CRON_SECRET>` → returns `{ processed_24h, processed_1h, sent, errors }`
8. **Client notification**: Create a call with `notify_client: true` and a client who has an email → check Resend logs
9. **Navigation**: Verify "Calls & Meetings" appears under Pipeline in the left nav
