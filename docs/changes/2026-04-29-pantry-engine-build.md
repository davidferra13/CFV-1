# Pantry Engine Build

Date: 2026-04-29
Branch: feature/pantry-engine

## What Changed

- Added additive pantry provenance and confidence SQL in `database/migrations/20260429000022_pantry_engine_confidence.sql`.
- Added pure Pantry Engine computation in `lib/inventory/pantry-engine.ts`.
- Added server actions for confidence-aware pantry positions and review summaries in `lib/inventory/pantry-engine-actions.ts`.
- Changed inventory counts so saved counts append opening balance or correction movements instead of only mutating `inventory_counts`.
- Updated the ops inventory page to show computed stock with confidence labels and honest unknown states.
- Updated receipt approval so inventory receives only use actual reviewed receipt quantities and units.
- Fixed staff meal inventory movement writes to use `transaction_type`.

## Trust Rules

- Legacy counts without ledger movements are shown as unknown.
- Pending review movements create conflict state.
- Old ledger positions become stale after the configured freshness window.
- Unsafe or missing receipt quantities are not added to inventory truth.
- Manual count changes create append-only movements.

## Verification

- `node --test --import tsx tests/unit/pantry-engine.test.ts` passed.
- `npx tsc --noEmit --skipLibCheck --pretty false` still fails on pre-existing unrelated calendar dependency, Auth.js, Capacitor, and client default knowledge typing issues. No Pantry Engine errors remain in the reported output.

## Deployment Note

Back up the database before applying the migration. Do not run `drizzle-kit push`.
