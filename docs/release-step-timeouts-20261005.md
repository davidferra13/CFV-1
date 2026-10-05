# Release step timeout recovery — 2026-10-05

Status: BLOCKED for the food-cost production release. The developer-tooling fix is independently verified; no production restart is needed for this script change.

## Problem and change

The firewall accepted a 60-second step budget but hardcoded the persona step to six minutes. Killing only the immediate child also left a detached descendant holding inherited output pipes: a one-second timeout took 7.58 seconds to resolve in the failing fixture.

The persona step now honors an explicitly supplied --step-timeout-ms while preserving its six-minute default. Timed-out commands terminate only their owned process tree: taskkill /PID <child> /T /F on Windows, and a dedicated process group on POSIX. Windows cleanup is bounded to 15 seconds and cleanup failures are included in the failed receipt. Output streams cannot indefinitely delay a timeout result. All timeouts remain failures, and no release check is disabled.

Importing the script for tests no longer starts the firewall.

## Verification

- Red: two timeout-budget assertions and the detached-child deadline assertion failed before the fix.
- Green: all six process/budget tests pass on the Windows project host and Linux. The descendant heartbeat stops; Windows additionally verifies the descendant PID no longer exists.
- Windows detached-child fixture: one-second budget returned a failed timeout in 6.90 seconds, including process-tree cleanup.
- Linux child-group fixture: returned in 1.26 seconds.
- All 128 existing and new focused food-cost tests passed again.
- Scoped ESLint, formatting, and git diff checks are required before committing.

## Full firewall receipt

Command: node scripts/regression-firewall.mjs --no-restart --step-timeout-ms 60000 --route-probe-timeout-ms 15000 --json

The checker completed with a failure receipt rather than stalling:

- Navigation: seven /studio targets still have no route.
- Wiring: passed with zero weak/orphan routes.
- Persona: planning-only pass for the current developer-tooling diff; this is not product-persona approval for the saved food-cost commits.
- App typecheck: timed out, returned failure after 65.24 seconds including cleanup.
- Runtime: could not identify the worktree's canonical server on port 3100.
- Affected route probes: none selected by this tooling-only diff; this is not authenticated food-cost UI proof.

No full production verification, merge, deployment, or service restart was attempted after the failed firewall. Existing user changes in the canonical checkout, including navigation and formatting edits to this script, were preserved.

Next action: reconcile the seven missing Studio navigation targets against the concurrent navigation work, then rerun the required gates on the actual production integration worktree.

Evidence is retained under .evidence/food-cost-truth-20261004/: timeout-red.log, timeout-green.log, timeout-firewall.log, costing-recheck.log, release-health.log.

## Final checks and public release identity

Scoped ESLint, Prettier, staged diff checks, and exact task-file staging passed. Generated wiring output and evidence remain excluded from the commit.

Both localhost and https://app.cheflowhq.com/api/build-version returned HTTP 200 with buildId 065916ad4. The strict readiness endpoint returned HTTP 503: environment, database, circuit breakers, and background jobs were OK; AI runtime was degraded with reason local_only_in_production. No AI provider setting, paid service, or production process was changed. This independent readiness condition must also be addressed through the established release requirements before declaring a production release healthy.
