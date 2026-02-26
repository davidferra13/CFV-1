# Inline Client Creation from Inquiry

## What Changed

- `lib/clients/actions.ts` — added `addClientFromInquiry()` server action
- `components/inquiries/inquiry-add-client-button.tsx` — new client component
- `app/(chef)/inquiries/[id]/page.tsx` — wired button into "Linked Client" row

## Problem Solved

When an inquiry arrives from an unknown contact (client_id = null), the chef had to
manually navigate to Clients → New to create a record, then come back and manually link it.

## Solution

When `inquiry.client` is null, the "Linked Client" row now shows:

- "Not linked to a client record" (existing text)
- "+ Add as Client" button below it

Clicking "+ Add as Client" reveals an inline form (no page navigation) pre-filled with:

- Full name (from inquiry source_message display name)
- Email
- Phone

On submit:

1. `addClientFromInquiry()` creates the client record in the `clients` table
2. Updates the inquiry's `client_id` to link it
3. If a client with that email already exists in the tenant, links the inquiry to them instead
4. `router.refresh()` updates the page without a full reload

## Server Action: `addClientFromInquiry`

- `requireChef()` auth
- Tenant-scoped insert
- Idempotent: duplicate email → link existing client instead
- Returns `{ success: true, clientId }` or `{ success: false, error }`
- Revalidates `/inquiries/[id]`, `/clients`, `/inquiries`

## Files Modified

- `lib/clients/actions.ts`
- `components/inquiries/inquiry-add-client-button.tsx` (new)
- `app/(chef)/inquiries/[id]/page.tsx`
