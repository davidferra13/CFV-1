# Contract Workflow Hub

## What Changed

Added a contracts landing page and supporting server actions to give chefs a centralized view of all their event contracts.

## Files Modified

- `lib/contracts/actions.ts` - Added new server actions:
  - `getContracts(statusFilter?)` - Lists all contracts with event/client joins, optional status filter
  - `getContractById(contractId)` - Single contract detail with full joins
  - `markContractSent(contractId)` - Transition draft to sent status
  - `markContractSigned(contractId)` - Chef-side manual sign override
  - Exported `ContractStatus` and `ContractListItem` types

- `components/navigation/nav-config.tsx` - Added Contracts nav entry in Sales group (after Proposals), added `ScrollText` icon import, added to flat nav items list

## Files Created

- `app/(chef)/contracts/page.tsx` - Server component that fetches all contracts and renders the list page with error handling (shows error state on fetch failure, not zeros)
- `components/contracts/contract-list.tsx` - Client component with status filter tabs (All, Draft, Sent, Viewed, Signed, Voided) showing contract name, event, client, dates, and status badge

## How It Connects

- Contracts are generated from event pages via `generateEventContract()` (already existed)
- This page provides the overview/hub for tracking all contracts across events
- Links to `/settings/contracts` for template management (already existed)
- Links to `/contracts/[id]` for individual contract detail (route exists but page not yet built)
- Reuses existing `ContractStatusBadge` component
- Database: `event_contracts` table with `contract_status` enum (draft, sent, viewed, signed, voided)

## Tier

Contracts should be a Pro feature under an appropriate module. Gating not yet applied (to be determined by developer).
