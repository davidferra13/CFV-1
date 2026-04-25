# Event Operating Spine

## What Changed

- Added a shared deterministic event spine model in `lib/events/operating-spine.ts`.
- Added `EventOperatingSpineCard` for chef and client event surfaces.
- Chef event detail now shows one next-action card across intake, booking, menu and dietary, prep and stock, Finance, communication, and follow-up.
- Client event detail now shows booking progress from the same spine contract.
- Public booking status now exposes stored time, dietary notes, and additional notes, then shows booking readiness before proposal or payment exists.
- Chef primary navigation now uses Today, Inbox, Events, Clients, Culinary, and Finance. Pipeline remains secondary.

## Why

Chef Bob and Client Joy need one honest status layer for an event instead of scattered cards that can disagree. The spine shows owner, next step, missing details, and failure states without adding a new database model.

## Verification

- `node --test --import tsx tests/unit/event-operating-spine.test.ts`
- `npx tsc --noEmit --skipLibCheck --pretty false`

## Migration Note

No migration was added or applied.
