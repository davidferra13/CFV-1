# Phase 7 — Quotes & Pricing Pipeline

## What Changed

Phase 7 adds the formal quoting system that bridges the inquiry pipeline (Phase 6) to the event lifecycle. Before this, pricing lived in the chef's head, text messages, and spreadsheets. Now there's a structured pipeline: draft → sent → accepted/rejected/expired.

## Files Created

### Server Actions
- **`lib/quotes/actions.ts`** — 8 chef-side server actions:
  - `createQuote` — Create with Zod validation, tenant/client ownership checks
  - `getQuotes` — List with filters (status, client, inquiry, event)
  - `getQuoteById` — Full quote with transition history
  - `updateQuote` — Draft-only updates
  - `transitionQuote` — State machine with timestamps + snapshot freezing on accept
  - `getClientPricingHistory` — Accepted quotes for a client, ordered by date
  - `getQuotesForInquiry` — All quotes linked to an inquiry
  - `deleteQuote` — Draft-only deletion

- **`lib/quotes/client-actions.ts`** — 4 client-side server actions:
  - `getClientQuotes` — Quotes in sent/accepted/rejected status for current client
  - `getClientQuoteById` — Single quote with inquiry join
  - `acceptQuote` — Freezes pricing snapshot, transitions linked inquiry to confirmed, updates linked event pricing. Uses admin client for cross-entity writes.
  - `rejectQuote` — Sets rejected_at and optional reason

### UI Components
- **`components/quotes/quote-status-badge.tsx`** — `QuoteStatusBadge` + `PricingModelBadge` (follows event/inquiry badge pattern)
- **`components/quotes/quote-form.tsx`** — Full pricing form with:
  - Client pricing history intelligence panel (shows last 3 accepted quotes)
  - Per-person auto-calculation (price × guests = total)
  - Deposit configuration
  - Validity dates
  - Separate pricing notes (client-visible) and internal notes (chef-only)
  - Pre-fill support from inquiry data (client, guest count, budget)
- **`components/quotes/quote-transitions.tsx`** — State machine action buttons per status

### Chef Portal Pages
- **`app/(chef)/quotes/page.tsx`** — Pipeline list view with status filter tabs
- **`app/(chef)/quotes/new/page.tsx`** — Create quote with pre-fill from inquiry params + pricing history
- **`app/(chef)/quotes/[id]/page.tsx`** — Full detail: pricing, deposit, linked resources, transitions, status history
- **`app/(chef)/quotes/[id]/edit/page.tsx`** — Edit draft quotes only

### Client Portal Pages
- **`app/(client)/my-quotes/page.tsx`** — Grouped view: "Action Needed" (pending) + "Previous Quotes" (resolved)
- **`app/(client)/my-quotes/[id]/page.tsx`** — Quote detail with pricing summary, event details from inquiry, pricing notes
- **`app/(client)/my-quotes/[id]/quote-response-buttons.tsx`** — Accept/reject with confirmation modals, rejection reason field

## Files Modified

### `lib/inquiries/actions.ts` — `convertInquiryToEvent()`
Updated to check for accepted quote pricing before creating the event:
- Queries for the most recently accepted quote on the inquiry
- Accepted quote's `total_quoted_cents`, `deposit_amount_cents`, and `pricing_model` override the inquiry's `confirmed_budget_cents`
- After event creation, links the accepted quote to the new event via `event_id`
- Falls back gracefully to inquiry budget if no accepted quote exists

### `app/(chef)/inquiries/[id]/page.tsx`
Added quotes section to inquiry detail page:
- Shows all quotes linked to the inquiry with status badges
- "Create Quote" button pre-fills the quote form with inquiry context
- Parallel data fetch with `Promise.all([getInquiryById, getQuotesForInquiry])`

### `components/navigation/chef-nav.tsx`
Added "Quotes" link between Inquiries and Events: `Dashboard → Inquiries → Quotes → Events → Clients → Menus → Financials`

### `components/navigation/client-nav.tsx`
Added "My Quotes" link after My Events: `My Events → My Quotes`

## Key Design Decisions

### Pricing Snapshot Freezing
When a quote is accepted, a `pricing_snapshot` JSON blob is saved with all pricing fields + a `frozen_at` timestamp. This preserves the agreed-upon pricing even if quote fields are later modified by DB triggers or migrations.

### Admin Client for Cross-Entity Writes
`acceptQuote` in client-actions uses `createServerClient({ admin: true })` for two downstream effects that cross RLS boundaries:
1. Transitioning the chef's inquiry from `quoted` → `confirmed`
2. Updating the event's pricing fields

This is the same pattern used in `acceptEventProposal`.

### Pricing Intelligence
The "new quote" form shows the client's pricing history (last 3 accepted quotes) to help the chef set competitive and consistent pricing. This eliminates the "scroll through old texts" problem identified in the spec.

### Quote → Inquiry → Event Flow
The full pipeline is now: `Inquiry (qualified) → Quote (accepted) → Event (draft)`. When `convertInquiryToEvent` runs, it checks for accepted quote pricing first, then falls back to the inquiry's confirmed budget. The quote is then linked to the created event.

## Verification
- `npx tsc --noEmit` — 0 errors
- `npm run build` — Clean build, all routes compiled successfully
- New routes visible: `/quotes`, `/quotes/[id]`, `/quotes/[id]/edit`, `/quotes/new`, `/my-quotes`, `/my-quotes/[id]`

## What's NOT Included (Non-Goals)
- Email/SMS notifications when quotes are sent or accepted
- PDF quote generation or download
- Automatic quote expiration (would need a cron/edge function)
- Quote versioning (create a new quote instead of versioning)
- Line item breakdown (quotes are a single total for V1)
