# Inquiry-Quote Status Sync

> Date: 2026-03-15
> Migration: `20260330000088_inquiry_quote_status_sync.sql`
> Status: Complete (end-to-end)

## What Changed

This system ensures that when a client accepts or rejects a quote, the linked inquiry's status stays in sync automatically at the database level. No manual chef intervention required.

## Problem Solved

Before this migration, a chef could send a quote to a client, but the inquiry would remain stuck in whatever manual status it was at (e.g., "new" or "awaiting_client"). When the client accepted the quote, only the quote status changed. The chef had to manually advance the inquiry through `awaiting_client -> awaiting_chef -> quoted -> confirmed`. If any step was skipped, the DB trigger would reject the transition.

This created two problems:

1. Inquiries showed stale status even after a quote was accepted
2. Chefs who skipped manual pipeline steps couldn't get their inquiry to "confirmed"

## Architecture

### Database Layer (single atomic transaction)

**`validate_inquiry_transition()`** - Trigger function on `inquiry_state_transitions` (BEFORE INSERT). Enforces the inquiry state machine, now including skip paths:

- `new -> quoted` (direct, when quote sent without manual pipeline steps)
- `awaiting_client -> quoted` (skip `awaiting_chef` when quote sent early)

**`respond_to_quote_atomic()`** - RPC function called by client portal. On acceptance:

1. Locks the quote row + advisory lock on the workflow
2. Checks for duplicate acceptances
3. Syncs event pricing fields (if event-linked)
4. Updates quote status to `accepted`
5. If inquiry is in `new`, `awaiting_client`, or `awaiting_chef`: advances to `quoted`, then to `confirmed`
6. Inserts transition records with `source: 'quote_client_acceptance'` metadata

On rejection: updates quote to `rejected`. Does NOT touch the inquiry (chef decides next step).

### App Layer

**`lib/quotes/client-actions.ts`** - `acceptQuote()` and `rejectQuote()` call the RPC. Both invalidate inquiry cache paths when the quote has a linked inquiry.

**`lib/inquiries/actions.ts`** - `VALID_TRANSITIONS` map aligned with DB validator. Includes skip paths for programmatic transitions.

**`lib/activity/entity-timeline.ts`** - Timeline entries from auto-sync transitions show "Client" as the actor and descriptive summaries ("Client accepted quote (auto-confirmed)") instead of generic "Teammate" / "Status changed".

**`components/inquiries/inquiry-transitions.tsx`** - Help text at `quoted` status explains that client acceptance auto-confirms the inquiry.

### Concurrency Safety

- `SELECT ... FOR UPDATE` on quote row prevents concurrent modifications
- `pg_advisory_xact_lock` serializes acceptance across quotes for the same event/inquiry
- Duplicate acceptance check prevents two quotes being accepted for one workflow
- All locks release automatically on transaction commit/rollback

## Test Coverage

`tests/integration/inquiry-quote-status-sync.integration.test.ts` covers 5 scenarios:

1. Accept quote on `new` inquiry: verifies `new -> quoted -> confirmed` transitions
2. Validator allows `new -> quoted` but rejects `new -> confirmed`
3. Reject quote does NOT change inquiry status
4. `awaiting_client -> quoted` skip path is allowed
5. Transition metadata carries `quote_client_acceptance` source

## Files Modified

| File                                                               | Change                               |
| ------------------------------------------------------------------ | ------------------------------------ |
| `supabase/migrations/20260330000088_inquiry_quote_status_sync.sql` | DB functions (validator + RPC)       |
| `lib/inquiries/actions.ts`                                         | VALID_TRANSITIONS aligned with DB    |
| `lib/quotes/client-actions.ts`                                     | Inquiry cache invalidation on reject |
| `lib/activity/entity-timeline.ts`                                  | Auto-sync timeline labels            |
| `components/inquiries/inquiry-transitions.tsx`                     | Help text update                     |
| `tests/integration/inquiry-quote-status-sync.integration.test.ts`  | 3 new test cases                     |
