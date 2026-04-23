# Session Digest: Ledger-Backed Next Best Action

**Date:** 2026-04-22
**Agent:** Codex
**Branch:** main
**Commits:** pending at digest write time

## What Was Done

- Added `lib/clients/interaction-signals.ts` to derive deterministic interaction-state signals from the canonical client interaction ledger instead of re-querying raw sources in every consumer.
- Added `lib/clients/action-vocabulary.ts` as the shared contract for action types, labels, icons, relationship-route copy, and dashboard relationship-surface copy.
- Added `lib/clients/next-best-action-core.ts`, then rebased `lib/clients/next-best-action.ts` onto booking-blocker override plus canonical interaction signals, with explainability payloads (`primarySignal`, structured `reasons`, authoritative source ids).
- Extended `lib/clients/interaction-ledger-core.ts` once with machine-usable state needed for signal derivation, instead of spreading new quote/event queries across consumers.
- Updated client detail, dashboard relationship surface, action-layer consumers, and relationship route consumers to import the shared vocabulary instead of re-declaring unions and switches.
- Added focused unit coverage for signal derivation, precedence resolution, explainability payloads, and relationship-surface drift protection.
- Updated the required living docs and ran `graphify update .`.

## Validation

- `node --test --import tsx tests/unit/client-interaction-signals.test.ts tests/unit/next-best-action.test.ts tests/unit/action-layer.test.ts tests/unit/client-relationship-surface-guard.test.ts`
- Focused slice `tsc`
- `npx eslint` on the touched slice files
- `npm.cmd run typecheck:app`
- `graphify update .`

## Live Verification

- Authenticated Playwright verification reached the dashboard and active-client surfaces on `http://localhost:3100` with the agent account from `.auth/agent.json`.
- The dedicated `/clients/[id]/relationship` route is currently blocked in local dev by an unrelated existing runtime import chain (`lib/ai/parse-ollama.ts` -> `lib/ai/chat-insights.ts` -> `lib/insights/actions.ts`), which returns `500` before the page renders. That prevented full route-level explainability verification on the relationship page in this pass.

## Context For Next Agent

- The canonical path for client actions is now: interaction ledger -> interaction signals -> action vocabulary -> next-best-action projection -> UI consumers.
- `npm.cmd run typecheck:app` is green on the current dirty checkout after this slice.
- The relationship-route runtime blocker is outside the next-best-action slice and should be addressed before claiming full live verification on `/clients/[id]/relationship`.
