# Client Interaction Ledger

> **Date:** 2026-04-22
> **Status:** shipped in code

## Why this pass landed

The client detail page had multiple overlapping history projections:

- `lib/clients/unified-timeline.ts`
- `lib/clients/communication-actions.ts`
- `lib/clients/client-history.ts`
- separate activity feeds on `app/(chef)/clients/[id]/page.tsx`

That meant the so-called full relationship timeline was not actually canonical, and revision identity existed only in quote-specific logic.

## What changed

- Added `lib/clients/interaction-ledger.ts` as the canonical read model over existing authoritative tables.
- Added `lib/clients/interaction-ledger-core.ts` as the normalization contract and projection layer.
- Reduced `getUnifiedClientTimeline()` to a compatibility projection on top of the ledger instead of keeping a second merge implementation.
- Extended the client timeline UI to surface revision badges and explainability hints for revision-backed entries.

## Sources now normalized

- `events`
- `inquiries`
- `messages`
- `client_notes`
- `quotes`
- `ledger_entries`
- `client_reviews`
- `activity_events` for high-intent client portal behavior
- `menu_revisions`
- `document_versions`

## Revision contract

Three existing revision patterns now normalize into one artifact contract:

- Quotes: inline lineage via `quotes.version` and `quotes.previous_version_id`
- Menus: dedicated `menu_revisions.version`
- Documents: generic `document_versions.version_number`

The ledger exposes the same fields for all three:

- `lineageKey`
- `sequenceNumber`
- `previousArtifactId`
- `isLatest`
- `contract`

## Intentional non-changes

- No new ledger table
- No mutation path rewrites
- No new source of truth
- No use of `chef_activity_log` as a parallel authority for rows already backed by first-class domain tables

## Next logical follow-ups

- Add precedence and conflict reasoning for learned client signals into the same explainability layer
- Add compatibility adapters for any remaining client communication surfaces still using their own timeline shape
- Add lifecycle verification coverage that asserts expected source coverage for seeded client profiles
