# Inquiry Pipeline Terminology Cleanup

**Date:** 2026-03-09
**Branch:** feature/risk-gap-closure

## Problem

The inquiry pipeline used system/CRM language instead of chef language. Status labels like "Awaiting Client" and "Awaiting Chef" were ambiguous (whose perspective?). "Confirmed" collided with the event "Confirmed" status. "Convert to Event" was jargon. The nav submenu had phantom items ("Menu Drafting", "Sent to Client") that didn't map to any real status.

## Approach

Created a glossary (`docs/chefflow-glossary.md`) as the ground truth for what every term means, then audited the UI against it. Every place where the UI didn't match the glossary's definitions was noise. Fixed all UI labels (zero database changes).

## Changes

### Status Labels (inquiry-status-badge.tsx)

| DB Value          | Old Label       | New Label         | Why                                     |
| ----------------- | --------------- | ----------------- | --------------------------------------- |
| `new`             | New             | New               | Already clear                           |
| `awaiting_client` | Awaiting Client | Waiting for Reply | Chef's perspective: I'm waiting         |
| `awaiting_chef`   | Awaiting Chef   | Needs Response    | Action-oriented: I need to act          |
| `quoted`          | Quoted          | Quote Sent        | Past tense, clearer                     |
| `confirmed`       | Confirmed       | Ready to Book     | Avoids collision with event "Confirmed" |
| `declined`        | Declined        | Declined          | Already clear                           |
| `expired`         | Expired         | Expired           | Already clear                           |

### Transition Buttons (inquiry-transitions.tsx)

| Old Button           | New Button          | Why                           |
| -------------------- | ------------------- | ----------------------------- |
| Mark Awaiting Client | I've Responded      | First-person, action-oriented |
| Mark Confirmed       | Client Accepted     | Describes what happened       |
| Convert to Event     | Create Event        | Plain language                |
| Convert to Series    | Create Event Series | Plain language                |

### Help Text

All help text updated to match new labels. "Client confirmed!" changed to "Client accepted!" to avoid the "confirmed" collision.

### Page and Section Labels

| Where                   | Old                                                 | New                                                              |
| ----------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Page title              | Inquiry Pipeline                                    | Inquiries                                                        |
| Page subtitle           | Track every lead from first contact to booked event | Everyone who has reached out, from first contact to booked event |
| Priority group          | Active Pipeline                                     | Active                                                           |
| Detail page card        | Confirmed Facts                                     | Event Details                                                    |
| Detail page card        | Pipeline                                            | Follow-up                                                        |
| Detail page back button | Back to Pipeline                                    | Back to Inquiries                                                |
| Missing facts warning   | Missing confirmed facts                             | Missing event details                                            |
| Warning text            | before converting to an event                       | before creating the event                                        |
| Documents text          | converts to a confirmed event                       | becomes a booked event                                           |
| Unlinked values         | Not confirmed                                       | Not yet known                                                    |

### Summary Stepper (inquiry-summary.tsx)

Chef view: Received > Responded > They Replied > Quote Sent > Ready to Book
Client view: Received > In Review > Quote Sent > Ready to Book

### Nav Submenu (nav-config.tsx)

Old (phantom items that didn't map to statuses):

- Awaiting Response, Awaiting Client, Menu Drafting, Sent to Client, Log New Inquiry, Declined

New (maps directly to actual statuses via query params):

- New, Needs Response, Waiting for Reply, Quote Sent, Ready to Book, Log New Inquiry

### Other Changes

- "Lead" badge on inquiry cards removed. Now only shows "Returning" badge for linked clients.
- "Unknown Lead" fallback text changed to "Unknown Contact" everywhere.
- Bulk table "Lead" column header changed to "Name".
- "Convert to client" tooltip changed to "Save as client".
- Embed form "Target Investment (Estimate)" changed to "Budget".
- Post-conversion text "converted to an event" changed to "booked as an event".

## Files Changed

- `components/inquiries/inquiry-status-badge.tsx`
- `components/inquiries/inquiry-transitions.tsx`
- `components/inquiries/inquiry-summary.tsx`
- `components/inquiries/inquiries-filter-tabs.tsx`
- `components/inquiries/inquiries-bulk-table.tsx`
- `components/inquiries/kanban-board.tsx`
- `components/inquiries/kanban-card.tsx`
- `components/inquiries/quick-convert-button.tsx`
- `components/navigation/nav-config.tsx`
- `components/embed/embed-inquiry-form.tsx`
- `app/(chef)/inquiries/page.tsx`
- `app/(chef)/inquiries/[id]/page.tsx`
- `app/(chef)/inquiries/awaiting-client-reply/page.tsx`
- `app/(chef)/inquiries/awaiting-response/page.tsx`
- `app/(chef)/inquiries/declined/page.tsx`
- `app/(chef)/inquiries/menu-drafting/page.tsx`
- `app/(chef)/inquiries/sent-to-client/page.tsx`
- `lib/scheduling/actions.ts`
- `docs/chefflow-glossary.md` (new)

## No Database Changes

All changes are UI-only string replacements. The database enum values (`new`, `awaiting_client`, `awaiting_chef`, `quoted`, `confirmed`, `declined`, `expired`) are unchanged.
