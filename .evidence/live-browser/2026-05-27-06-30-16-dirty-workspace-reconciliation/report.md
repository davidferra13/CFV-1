# Dirty Workspace Reconciliation Report

## Executive Takeaway

The current main-worktree dirtiness contains one keepable, well-proven navigation/cannabis access slice; one PIE/pricing resilience slice that is useful but blocked by schema/runtime proof gaps; one wiring-audit infrastructure slice that passed current route checks; and several unrelated evidence, sync, skill, and scratch-script artifacts that should be preserved untouched until the user approves cleanup or queueing.

No app feature work was implemented during this reconciliation pass.

## Setup

- Task: Verification/closeout reconciliation of the dirty ChefFlow workspace on `main`.
- Site/app/route: ChefFlow canonical app, `http://localhost:3100`.
- Date/time: 2026-05-27.
- Browser context used: Local Playwright Chromium using `.auth/chef.json`.
- Session/auth state: Chef auth state only; no credential values recorded.
- Action boundary: Read-only runtime proof, tests, diffs, queue mapping, and documentation.
- Evidence folder: `.evidence/live-browser/2026-05-27-06-30-16-dirty-workspace-reconciliation`

## Work Slices

| Slice                                       | Files                                                                                                                                                                                            | Queue Mapping                                                                                                                                                                                                                                                               | Verification                                                                                                                                                                                                                                                                           | Decision                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef nav, Tables, Circles, Cannabis Portal  | `app/(chef)/layout.tsx`, `components/navigation/*`, `app/(chef)/events/cannabis/page.tsx`, `lib/chef/layout-data-cache.ts`, nav tests/audits                                                     | Related to blocked `BQ-20260515T212828Z-portal-rail-system-foundation`; active `BQ-20260522T011156Z-build-spec-rail-portal-prominence-mini-specs-nav-3-6`; active `BQ-20260522T011157Z-build-spec-regulated-product-compliance-foundation` for cannabis compliance language | Nav unit tests passed, `verify:chef-nav` passed, browser proof passed desktop/mobile route loads, regression firewall passed                                                                                                                                                           | Keep as a coherent hotfix/proof slice pending user approval/commit. Do not mark blocked rail foundation done because this proves only chef-shell scope. |
| PIE ingredient price detail/resilience      | `components/pricing/ingredient-pie-popover.tsx`, `lib/inventory/price-history-actions.ts`, `lib/pricing/ingredient-pie-detail.ts`, `lib/pricing/resolve-price.ts`, root `_*.mjs` scratch scripts | Related to active `BQ-20260527T052717Z-chefflow-pie-costed-menu-proof-capture-pack`; blocked `BQ-20260518T172528Z-add-pie-fallback-safety-regression-harness`; done PIE oracle/serving-index contracts                                                                      | App typecheck passed; focused PIE unit tests passed; direct `_test_pie_detail.mjs` query proof passed. But system q61 still fails against current no-null PIE law, `_trace_tiers.mjs` fails on missing local `pinned_price_*` columns, and unauthenticated `_test_api.mjs` returns 401 | Block before merge/closeout. Keep untouched in workspace pending a scoped PIE proof/fix decision.                                                       |
| Wiring/nav audit infrastructure             | `scripts/audit-chef-nav.ts`, `scripts/wiring-audit.mjs`, `scripts/wiring-audit-results.json`, `tests/unit/nav-regression.test.ts`                                                                | Related to rail/foundation and cohesion/reachability proof items                                                                                                                                                                                                            | `node scripts/wiring-audit.mjs` passed with 981 routes, 978 wired, 0 weak, 0 orphans, 3 skipped. Regression firewall passed same zero-orphan contract.                                                                                                                                 | Keep as verification infrastructure if the consolidated route coverage semantics are approved. Do not treat as product feature completion by itself.    |
| Sync/handoff metadata                       | `.planning/HANDOFF.json`, `docs/sync-status.json`                                                                                                                                                | No direct queue mapping found                                                                                                                                                                                                                                               | Diff only. `docs/sync-status.json` records OpenClaw sync failure state: 6 consecutive failures, timeout/connection/refreshed-view issues                                                                                                                                               | Leave untouched. This is operational state, not part of app closeout.                                                                                   |
| Evidence, QoL skill, root scratch artifacts | `.evidence/live-browser/*`, `.claude/skills/qol/`, `_*.mjs`, `private-chef-home-desktop-snapshot.md`, `tests/unit/cannabis-portal-copy.test.ts`                                                  | QoL skill is tooling; evidence folders map to prior browser research; scratch scripts map mostly to PIE diagnosis                                                                                                                                                           | Evidence inspected. New reconciliation pack added. Scratch scripts include DB/migration/debug probes, not production tests.                                                                                                                                                            | Preserve. Cleanup/archive/delete only with explicit user approval.                                                                                      |

## Verification Commands

- `node --test --import tsx tests/unit/nav-regression.test.ts tests/unit/cannabis-portal-copy.test.ts` - passed, 11 tests.
- `npm run verify:chef-nav` - passed, 462 unique nav hrefs, 505 discoverable static routes covered.
- `npm run typecheck:app` - passed.
- `node --test --import tsx tests/unit/pricing.resolve-price.test.ts tests/unit/pie.reliability.test.ts tests/unit/pie.state-reliability.test.ts tests/unit/pie.price-lifecycle-ledger.test.ts` - passed, 67 tests.
- `npx playwright test --config=playwright.system-integrity.config.ts tests/system-integrity/q61-price-resolution-completeness.spec.ts` - failed 2/6; current test expects `cents: null` fallback while current PIE implementation says inline synthetic should never return null.
- `node _test_pie_detail.mjs` - passed direct DB query proof for Whole Chicken price history, seasonal pattern, denormalized tier, and ingredient name.
- `node _trace_tiers.mjs` - failed on local DB schema missing `ingredients.pinned_price_cents`.
- `node _test_api.mjs` - returned 401 because the route requires authentication.
- `node scripts/wiring-audit.mjs` - passed, 0 weak, 0 orphans.
- `npm run regression:firewall -- --no-restart --route-probe-timeout-ms 20000 --step-timeout-ms 180000` - passed; runtime verify passed and `/events/cannabis` probed as HTTP 307, under 500.
- `npm run dev:status` - healthy yes, 0 duplicates, canonical `http://localhost:3100`.

## Browser Proof

- Runtime proof JSON: `runtime-proof.json`
- Response error summary: `runtime-response-errors.json`
- Screenshots:
  - `screenshots/dashboard-desktop.png`
  - `screenshots/events-cannabis-desktop.png`
  - `screenshots/dashboard-mobile.png`
  - `screenshots/events-cannabis-mobile.png`

Observed route proof:

- `/dashboard` desktop: HTTP 200; Tables, Circles, and Cannabis Portal links present.
- `/events/cannabis` desktop: HTTP 200; Cannabis Portal visible; "All cannabis dinners are strictly private." present.
- `/dashboard` mobile: HTTP 200; Tables visible in mobile route proof; hidden desktop rail links still exist in DOM.
- `/events/cannabis` mobile: HTTP 200; strictly-private copy present.

Runtime caveat:

- Follow-up response capture found three 403 realtime feed responses for inquiries/events/quotes channels.
- Request failures in the first capture were mostly aborted long-poll/server-action requests during route navigation.
- No route rendered a 5xx and the regression firewall runtime verify passed.

## Whole-Site Product Coherence Ledger Draft

Draft artifacts were created in this evidence folder only:

- `whole-site-product-coherence-ledger-spec.json`
- `whole-site-product-coherence-ledger-report.html`

These files are queue-ready spec material, not a queue insertion.
