# Public Inquiry Pipeline — Reflection

## What Changed

Replaced the disconnected generic contact form with a proper per-chef inquiry form that auto-creates client, inquiry, and draft event records on every public submission.

## Why

Previously, when someone submitted an inquiry from the public-facing chef profile page:

- The form (`/contact`) stored data in `contact_submissions` — a dead-end table with no connection to the inquiry pipeline
- No client record was created
- No inquiry appeared in the chef's pipeline
- No draft event was started
- The chef saw zero actionable data from public inquiries

This meant the chef had to manually re-enter all information from contact submissions into the inquiry system — defeating the purpose of having a pipeline.

## What Was Built

### New Public Inquiry Form (`/chef/[slug]/inquire`)

A dedicated inquiry page scoped to each chef via their slug URL. Collects:

**Required:** Full name, email, event date, city/location

**Optional:** Phone, guest count, occasion, budget, additional details

### Auto-Creation Pipeline (`submitPublicInquiry`)

On a single form submission, three linked records are created atomically:

1. **Client** — via existing `createClientFromLead()` (idempotent; reuses existing client if email matches)
2. **Inquiry** — status: `new`, channel: `website`, linked to client via `client_id`
3. **Draft Event** — status: `draft`, linked to inquiry via `inquiry_id`, uses `TBD` placeholders for missing required fields

All three records are scoped to the correct tenant (chef) and cross-linked for traceability.

### Updated Chef Profile CTA

The "Get in Touch" button on `/chef/[slug]` now links to `/chef/[slug]/inquire` instead of the generic `/contact` page.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `lib/inquiries/public-actions.ts` | New | Server action: slug lookup, client creation, inquiry creation, event creation |
| `app/(public)/chef/[slug]/inquire/page.tsx` | New | Public inquiry form page with chef branding |
| `components/public/public-inquiry-form.tsx` | Replaced stub | Full form component with validation and success states |
| `app/(public)/chef/[slug]/page.tsx` | Modified | CTA link updated from `/contact` to `/chef/[slug]/inquire` |

## Reused Code

- `createClientFromLead()` from `lib/clients/actions.ts` — already handles idempotent client creation with admin client (no auth), email dedup per tenant
- `getPublicChefProfile()` from `lib/profile/actions.ts` — slug-to-chef resolution with admin client
- `createServerClient({ admin: true })` — no-auth Supabase client for public operations

## Architecture Notes

- **No schema changes** — all required tables and fields already exist
- **No auth required** — entire flow uses admin Supabase client, bypassing RLS
- **Tenant scoping** — chef slug resolves to chef.id (= tenant_id), all records scoped correctly
- **Idempotent client creation** — same email on same tenant returns existing client, no duplicates
- **Graceful degradation** — if event creation fails, inquiry + client still persist (chef sees the inquiry regardless)
- **Event state transition logged** — initial `null → draft` transition recorded with metadata tracing back to the inquiry

## How It Connects to the System

```
Public visitor → /chef/[slug]/inquire
    ↓
submitPublicInquiry()
    ↓
┌─────────────────────────────────┐
│ 1. createClientFromLead()       │ → clients table (idempotent)
│ 2. Insert inquiry               │ → inquiries table (status: 'new', channel: 'website')
│ 3. Insert draft event           │ → events table (status: 'draft')
│ 4. Log event state transition   │ → event_state_transitions (null → draft)
│ 5. Link inquiry → event         │ → inquiries.converted_to_event_id
└─────────────────────────────────┘
    ↓
Chef opens dashboard → sees new client, new inquiry, new draft event — all linked
```

From here, the chef can:
- Review and enrich the client record
- Advance the inquiry through the pipeline (new → awaiting_client → ...)
- Update the draft event with confirmed details (serve time, full address, pricing)
- Continue normal event lifecycle (draft → proposed → accepted → ...)
