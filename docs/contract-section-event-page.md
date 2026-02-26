# Contract Section — Chef Event Detail Page

## What changed

Added a `ContractSection` component to the chef event detail page that surfaces the e-sign contract workflow directly on the event view.

## Files created / modified

| File                                        | Change                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `components/contracts/contract-section.tsx` | New Server Component — renders contract card based on current status                           |
| `app/(chef)/events/[id]/page.tsx`           | Added import + `<ContractSection>` placement after the Event Details / Client Information grid |

## How it works

### `components/contracts/contract-section.tsx`

A React Server Component that:

1. Returns `null` immediately if `eventStatus === 'cancelled'` — no contract UI on cancelled events.
2. Calls `getEventContract(eventId)` and `listContractTemplates()` in parallel (both wrapped in `.catch(() => ...)` so the page never crashes if the table migrations have not yet run).
3. Renders a `Card` with "Service Contract" as the section heading.
4. Delegates all interactive buttons (generate, send, void, resend) to the existing `SendContractButton` client component (`components/contracts/send-contract-button.tsx`), passing the resolved contract and templates as props.
5. Adds server-rendered context layers on top of the interactive panel:
   - `ContractStatusBadge` in the card header
   - A truncated body preview (`<pre className="whitespace-pre-wrap">`) for draft contracts (first 200 chars)
   - A signed-date paragraph for signed contracts
   - A void-reason paragraph for voided contracts
   - A "No contract generated yet" message when there is no contract
   - A "Download PDF" link in the header for signed contracts (links to `/api/documents/contract/[contractId]`)

### Placement in the event page

The `<ContractSection>` is inserted immediately after the closing `</div>` of the two-column main content grid (Event Details + Client Information cards), which is around line 380 of the page. This means it appears as a full-width card below the core event details, before the Guests & RSVPs section.

## Why no new data fetch was added to `Promise.all`

`ContractSection` is a Server Component that performs its own parallel data fetch internally. Adding it to the page's existing giant `Promise.all` would have required threading extra return values through a deeply destructured tuple already at 20 elements. Keeping the fetches inside the component is the cleaner pattern for a self-contained section with its own error handling.

## Relationship to existing contract infrastructure

- `lib/contracts/actions.ts` — fully pre-existing backend; no changes made
- `components/contracts/send-contract-button.tsx` — fully pre-existing client component; reused as-is
- `components/contracts/contract-status-badge.tsx` — fully pre-existing badge; reused as-is
- `app/(client)/my-events/[id]/contract/page.tsx` — pre-existing client signing page; not touched

## Rules followed

- No `react-markdown` — contract body preview uses `<pre className="whitespace-pre-wrap">`
- Button variants: only `primary`, `secondary`, `danger`, `ghost` (enforced inside `SendContractButton`)
- Badge variants: only `default`, `success`, `warning`, `error`, `info` (enforced inside `ContractStatusBadge`)
- No existing code was changed — only additions
- No migration files required — this is purely a UI layer over a pre-existing backend
