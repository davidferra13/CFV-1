# Food-cost release integration  2026-10-05

Status: BLOCKED. Product source is integrated and focused checks pass; it is not merged to main or deployed.

## Canonical integration

Base: origin/main 3fa5a0818. The seven missing Studio navigation destinations were a stale-branch blocker: current main already contains fix 377c7b9e5. No new Studio implementation or competing navigation change was created.

Existing costing work was reused:

- b77509235: missing revenue is distinct from zero purchasing; all same-day revenue rows are summed; labels describe purchases/revenue rather than inventory-adjusted consumption.
- f8c482015: ingredient cost retains conversion precision until final cent rounding.
- 086cb9e6a: original precision checkpoint.
- 4d4b4d166: bounded release-step recovery, resolved against main while retaining ingredient-identity and simulation-forge checks.

The canonical dirty checkout and the production checkout were not edited.

## Fresh verification

- 134 focused tests passed: conversion, recipe costing, purchase summary, and release-step lifecycle.
- Chef navigation audit passed on current main plus the costing fixes.
- Wiring passed: 985 routes, zero weak routes, zero orphans.
- All 15 ingredient identity tests passed.
- All 25 simulation-forge release fixtures passed with no violations.
- Twelve browser checks passed in installed Edge: missing revenue, recorded revenue, and empty data, each at 375, 768, 1024, and 1440 pixels.
- Real FoodCostDashboard React markup was rendered with production CSS. The Record revenue link reaches its anchor; no page errors or page overflow occurred.
- The phone screenshot was visually inspected: bright surface, readable missing-revenue state, existing data-entry link, and visible invoice dollars.
- Browser scope is isolated component proof. Authenticated /food-cost and database persistence remain unverified.
- Scoped ESLint and diff checks passed during cherry-pick conflict resolution. Final formatting/diff checks must pass before this checkpoint is committed.

## Outcome-first workflow review

1. Required outcome: show the cost implied by actual quantity, price, compatible units and density, and show a purchases/revenue ratio only with positive recorded revenue. Focused fixtures verify missing, empty, duplicate-day, credit, and small-portion cases.
2. Required method: valid unit conversions and final monetary rounding are correctness constraints. The UI does not prescribe a new revenue or invoice entry routine.
3. Established habit: the existing DailyRevenueForm and vendor invoice records remain canonical. The missing-revenue link points to the existing form; there is no second ledger or setup.
4. Alternatives: none added. Existing inputs share the same deterministic helpers and missing-data semantics. Purchasing is explicitly distinct from consumption.
5. Less work: no additional entry is required. Duplicate same-day rows are correctly aggregated and tiny portions remain accurate. Browser cases verify the direct recovery link and responsive data states; authenticated end-to-end proof is still outstanding.

## Blocking release evidence

The full firewall was run without restarting production. App typecheck exceeded its 180-second budget; the runtime inspection was subsequently stopped when the PC was struggling to respond. A second isolated full app typecheck, with the normal 8 GB compiler limit and five-minute budget, also timed out after 305.65 seconds including owned-child cleanup. No full verify:release pass is claimed.

The persona step only produced a planning result because the latest commit and generated working diff were developer tooling. This is not product-persona approval for the entire integrated range and must be explicitly covered before release.

Local and public build-version endpoints returned HTTP 200 with production build 065916ad4. Strict readiness returned HTTP 503:

- database: unreachable; local port 54322 refused the connection;
- AI runtime: degraded, local_only_in_production;
- environment, circuit breakers, background jobs: OK.

Docker context was verified as desktop-linux on this PC's named pipe. Repository configuration names the existing chefflow_postgres container and retained volume. Starting that container timed out after 30 seconds (35.70 seconds including cleanup). Docker backend processes exist, but the engine ping also timed out. No database was created, restored, migrated, deleted, or reconfigured. No shared Docker restart or production service restart was performed.

## Exact next action

Recover the existing shared Docker Desktop engine through its owner-controlled recovery path, start the existing chefflow_postgres container, and verify database readiness. Then obtain a complete app typecheck, whole-range persona proof, authenticated food-cost UI proof, and the required production release checks before merging and deploying main.

Evidence remains in .evidence/food-cost-release-20261005/: focused.log, firewall.log, app-types-isolated.log, render-proof.json, render-edge.log, twelve screenshots, and postgres-recovery.log. These logs and generated wiring output are excluded from the commit.
