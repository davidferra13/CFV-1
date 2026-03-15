# Tip Request System (Uber-style Post-Service Tips)

## Overview

Allows chefs to send a tip request link to clients after completed events. The client opens a public page with suggested tip amounts (like Uber/Lyft), selects an amount, and submits. The tip is recorded in the ledger as income and mirrored to the existing event_tips table.

## How It Works

1. Chef completes an event
2. On the event detail page, chef clicks "Request Tip" button
3. System creates a `tip_request` with a unique public token
4. Chef copies the link and sends it to the client (email, text, etc.)
5. Client opens `/tip/[token]` (no login required)
6. Client sees suggested amounts (percentage-based if event total is known, flat amounts otherwise)
7. Client selects amount, payment method, optional note, and submits
8. System records tip in `tip_requests`, appends to ledger as `tip` entry type, mirrors to `event_tips`

## Database

**Table: `tip_requests`** (migration `20260401000012`)

- Links to tenant, event, and client
- `request_token`: unique public token for the client-facing URL
- `suggested_amounts_cents`: preset flat amounts (default: $15, $20, $25, custom)
- `suggested_percentages`: percentage-based amounts (default: 15%, 18%, 20%, custom)
- `tip_amount_cents`: filled when client submits
- `tip_method`: card, cash, venmo, other
- `status`: pending -> sent -> completed (or declined)
- RLS: chef manages via auth, public read/update via anon for the client page

## Files

| File                                                  | Purpose                                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260401000012_tip_requests.sql` | Database table                                                                                                        |
| `lib/finance/tip-actions.ts`                          | Server actions (createTipRequest, getTipRequests, getTipRequestByToken, recordTip, getTipSummary, getEventTipRequest) |
| `components/events/tip-request-button.tsx`            | Button component for event detail pages                                                                               |
| `app/(public)/tip/[token]/page.tsx`                   | Public tip page (server component)                                                                                    |
| `app/(public)/tip/[token]/tip-form.tsx`               | Interactive tip form (client component)                                                                               |

## Integration Points

- **Ledger**: Tips are appended as `tip` entry type via `appendLedgerEntryFromWebhook` (since the public page has no auth session)
- **Event Tips**: Mirrored to `event_tips` table for the existing tip log panel
- **Activity Log**: Tip request creation is logged via `logChefActivity`

## Existing Tip Infrastructure

This system complements (does not replace) the existing tip tracking:

- `event_tips` table: manual tip recording by chef
- `tip_entries` table: staff tip pooling/distribution
- `TipLogPanel` component: manual tip entry UI
- `gratuity-calc.ts`: deterministic gratuity framing advice
