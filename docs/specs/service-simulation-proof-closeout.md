# Spec: Service Simulation Proof Closeout

> **Scope:** Service Simulation only
> **Type:** closeout, additive only
> **Created:** 2026-04-24

## Why This Is The Highest-Leverage Remaining Action

Service Simulation is already built deeply enough that more feature work is low leverage:

- The saved-run persistence and stale-diff path already exist in [`lib/service-simulation/state.ts`](../../lib/service-simulation/state.ts).
- The chef Ops panel already exposes saved rehearsal, severity bands, chronological walkthrough, and fix-and-return links in [`components/events/service-simulation-panel.tsx`](../../components/events/service-simulation-panel.tsx).
- Transition gating already consumes simulation/readiness state in [`components/events/event-transitions.tsx`](../../components/events/event-transitions.tsx).
- Focused Playwright coverage already exists in [`tests/e2e/10-service-simulation.spec.ts`](../../tests/e2e/10-service-simulation.spec.ts).

What is still missing is the proof layer required to call the slice done:

- `docs/specs/service-simulation.md` still marks the feature as `built`, not verified.
- That same spec requires manual UI verification and screenshots before the slice is done.
- `docs/build-state.md` has no supplemental verification entry for Service Simulation.

So the single highest-leverage remaining action is:

**Execute the full Service Simulation proof closeout, fix any issues found, and record the proof.**

## Hard Evidence

- Product scope and required proof are defined in [`docs/specs/service-simulation.md`](../../docs/specs/service-simulation.md).
- Definition-of-done requires real execution, honest states, and automated drift protection in [`docs/definition-of-done.md`](../../docs/definition-of-done.md).
- Current persistence path:
  - latest-run load from `event_service_simulation_runs`
  - save path for new runs
  - stale reason derivation
  - current panel-state construction
- Current UI path:
  - live rollup
  - saved rehearsal card
  - severity-band action groups
  - chronological walkthrough
- Current automated coverage:
  - no-menu truthful waiting state
  - unsimulated and stale soft-gating
  - hard block on must-fix issues

## Goal

Turn Service Simulation from "built" into "verified and closed" without widening the scope.

## Do Exactly This

1. Verify the migration state needed by `event_service_simulation_runs`.
2. Apply the additive migration only if the local database does not already contain the table.
3. Run the focused automated checks for the Service Simulation slice.
4. Run the real Playwright flow for the Service Simulation spec.
5. Sign in with the agent account and manually verify the real UI states.
6. Capture screenshots for:
   - unsimulated no-menu event
   - current saved rehearsal
   - stale saved rehearsal
   - hard-blocked transition gate
7. If verification exposes bugs, fix them only inside the Service Simulation slice and its direct event transition/readiness wiring.
8. Update the proof records:
   - `docs/build-state.md`
   - `docs/session-digests/2026-04-24-draft.md`
   - any changed product-map/docs that reflect the verified state
9. Run `graphify update .` after code changes.
10. Close the session with the repo session-close flow, then commit and push.

## Files To Read First

- `docs/specs/service-simulation.md`
- `docs/definition-of-done.md`
- `lib/service-simulation/state.ts`
- `components/events/service-simulation-panel.tsx`
- `components/events/service-simulation-rollup-card.tsx`
- `components/events/event-transitions.tsx`
- `tests/e2e/10-service-simulation.spec.ts`
- `docs/build-state.md`

## Verification Commands

- `node --test --import tsx tests/unit/service-simulation.test.ts`
- `npm.cmd run typecheck:app`
- `$env:NEXT_DIST_DIR='.next-build-service-simulation'; node scripts/run-next-build.mjs`
- `npx playwright test tests/e2e/10-service-simulation.spec.ts`

Use the real agent account for the manual verification step after automated checks pass.

## Required Manual Proof

Verify in the actual app:

- Ops tab shows truthful waiting state for an early event with no menu.
- `Simulate Service` records a saved rehearsal.
- Changing a material input makes the saved rehearsal stale and names why.
- `Re-simulate` clears stale state.
- Event transition gating reflects unsimulated, stale, and hard-blocked states correctly.
- Every surfaced blocker route actually lands on the fixing surface and can return to the simulation context.

## Allowed Fix Surface

Only change files that are directly part of this slice:

- `lib/service-simulation/*`
- `components/events/service-simulation-*`
- `components/events/event-transitions.tsx`
- directly-related event detail wiring
- focused tests and proof docs

Do not widen into unrelated event, billing, hub, or dashboard work unless a failing verification proves this slice depends on it.

## Out Of Scope

- New simulation features
- Client-facing simulation
- Additional AI narration
- New workflow systems
- Broad event-shell redesign
- Unrelated dirty-worktree cleanup

## Done Means

This slice is done only when all of the following are true:

- focused unit tests pass
- affected-surface typecheck passes
- focused production build passes
- focused Playwright spec passes
- manual agent-account verification is completed
- screenshots are captured
- `docs/build-state.md` records the proof
- session close docs are updated
- commit and push are finished
