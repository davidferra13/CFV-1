# T2.3: Guided Event Creation Wizard

## What Changed

### New Files

| File | Purpose |
|---|---|
| `app/(chef)/events/new/wizard/page.tsx` | Server Component — fetches client list and renders the wizard |
| `components/events/event-creation-wizard.tsx` | Client Component — the full 5-step wizard UI |
| `docs/event-creation-wizard.md` | This document |

### Modified Files

| File | Change |
|---|---|
| `app/(chef)/events/new/page.tsx` | Added "Try the event wizard →" link at the top |
| `lib/clients/actions.ts` | Added `createClientDirect` server action |

---

## Why

The existing `EventForm` at `/events/new` is a comprehensive power-user form. New chefs or occasional users benefit from a guided, sequential experience that asks one concept at a time. The wizard reduces cognitive load by breaking event creation into 5 focused steps instead of one long form.

---

## How It Works

### Step Flow

```
Step 1: Client Selection
  └─ Search/select existing client from dropdown
  └─ OR toggle to "Add new client" inline mini-form (name + email)

Step 2: Event Basics
  └─ Occasion (select from 9 preset options)
  └─ Event Date
  └─ Serve Time
  └─ Guest Count

Step 3: Location
  └─ Street Address (optional)
  └─ City (required)
  └─ State (2-letter, auto-uppercased)
  └─ ZIP Code
  └─ Kitchen Notes (optional textarea)

Step 4: Pricing
  └─ Quoted Price (required, > $0)
  └─ Deposit Amount (optional)
  └─ Notes for Client (optional)
  └─ Pricing hint: "$X–$Y typical for N guests" (guest_count × $50–$150)

Step 5: Review & Create
  └─ Summary card showing all entered data
  └─ "Create Event" button — calls createEvent server action
  └─ On success: redirect to /events/[newEventId]
  └─ On error: inline error message
```

### Validation

Each step validates before advancing:
- Step 1: client must be selected OR new client name+email must be entered
- Step 2: occasion and event_date are required
- Step 3: city is required
- Step 4: quoted price must be > $0

Errors are shown inline beneath each field. The "Continue" button does not advance if validation fails.

### New Client Inline Creation

When the chef selects "Add new client instead" on Step 1:
1. A mini-form collects Full Name and Email
2. On wizard submit (Step 5), `createClientDirect` is called first
3. The returned `clientId` is then passed to `createEvent`
4. The new client is a "shadow client" — no auth account yet
5. The chef can later send an invitation from the Clients page

`createClientDirect` is idempotent in spirit (it checks for duplicate email first and returns an error rather than creating a duplicate).

### Data Flow

```
Wizard state (client-side)
  └─ Step 5 submit
       ├─ if useNewClient → createClientDirect({ full_name, email })
       │    └─ returns clientId
       └─ createEvent({ client_id, event_date, serve_time, guest_count,
                         location_*, occasion, quoted_price_cents, ... })
            └─ returns { success: true, event: { id } }
                 └─ router.push(`/events/${event.id}`)
```

### Amount Conversion

- All dollar inputs are entered as human-readable numbers (e.g. `1500` for $1,500)
- Converted to cents before calling `createEvent`: `Math.round(dollars * 100)`
- This matches the ledger-first, cents-only contract of the rest of the system

---

## Architecture Notes

- The wizard is a `'use client'` component — all step state lives in React `useState`
- The server actions (`createEvent`, `createClientDirect`) are imported directly and called with `await` inside the submit handler
- No new API routes were created
- The existing `EventForm` is untouched — the wizard is an additive parallel path
- The wizard uses raw `<input>`, `<select>`, and `<textarea>` elements styled to match the existing design system (same Tailwind classes as `Input` component) to avoid importing client components that could cause issues with the 'use client' boundary

---

## Connecting to the System

- `createEvent` in `lib/events/actions.ts` — unchanged, wizard calls it with the same signature
- `getClients` in `lib/clients/actions.ts` — unchanged, wizard page calls it at load time
- `createClientDirect` in `lib/clients/actions.ts` — new action, mirrors `addClientFromInquiry` pattern
- After creation, the event is in `draft` status (FSM default), same as the existing form
- The event state machine, ledger, and all downstream processes are unaffected
