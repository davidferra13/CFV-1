# Ledger-Backed Next Best Action, 2026-04-22

## Gap

The client next-best-action path was split across ad hoc queries, duplicated action unions, and route-local copy.

## Evidence

- `lib/clients/next-best-action.ts` previously mixed raw queries and hardcoded branching instead of projecting from the canonical interaction ledger.
- `lib/clients/relationship-signals.ts` already owned profile and learned preference facts, not interaction-state.
- Action types and copy were duplicated across `lib/clients/next-best-action.ts`, `components/clients/next-best-action-card.tsx`, `components/clients/next-best-actions-widget.tsx`, `lib/interface/action-layer.ts`, and `app/(chef)/clients/[id]/relationship/page.tsx`.
- The relationship route owned its own action-heading switch, which made it a second source of truth.

## Why The Old Logic Was Insufficient

- The winning action could drift from the canonical interaction history because it was not derived from the ledger.
- UI surfaces could disagree on action labels, icons, headings, and relationship copy.
- The old action payload did not expose enough structured evidence for explainability.

## Smallest Correct Move

- Extend the canonical ledger contract once with the machine-usable state needed for deterministic signal derivation.
- Add one ledger-native signal projection layer instead of spreading new raw queries across consumers.
- Centralize action vocabulary and route copy in one shared contract.
- Rebase selection logic onto booking blocker override plus canonical interaction signals, then let every consumer read the same result.

## What Shipped

- `lib/clients/interaction-signals.ts` now derives deterministic interaction-state signals from the canonical interaction ledger.
- `lib/clients/action-vocabulary.ts` now owns the canonical action union, metadata, route copy, and dashboard relationship-surface copy.
- `lib/clients/next-best-action-core.ts` and `lib/clients/next-best-action.ts` now return explainable next-best actions with `primarySignal`, structured `reasons`, and authoritative source ids.
- Client detail, relationship route, dashboard relationship surface, and next-action widgets now consume the shared vocabulary instead of re-declaring unions and switches.

## Validation

- `node --test --import tsx tests/unit/client-interaction-signals.test.ts tests/unit/next-best-action.test.ts tests/unit/action-layer.test.ts tests/unit/client-relationship-surface-guard.test.ts`
- Focused slice `tsc`
- `npm.cmd run typecheck:app`

## Live Verification Status

- Authenticated Playwright verification reached the dashboard and active-client surfaces with the agent account on `http://localhost:3100`.
- The dedicated `/clients/[id]/relationship` route is currently blocked in local dev by an unrelated existing runtime import chain (`lib/ai/parse-ollama.ts` -> `lib/ai/chat-insights.ts` -> `lib/insights/actions.ts`), so the route-level explainability card could not be re-verified there in this pass.
