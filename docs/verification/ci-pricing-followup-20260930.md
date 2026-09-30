# CI pricing follow-up — 2026-09-30

Status: BLOCKED. Partial repair; do not merge or deploy.

Rechecked live refs and merged main 770bec1cf2155a6db0e1448949ffeda0cf815b30, preserving recovered Today/navigation work. PR #17 remains draft. Remote repair head before this update was 4df6ee97f230bb77b8956c189f996d76e617f63f.

## Root causes repaired

- Pricing tests now supply explicit chef configuration instead of relying on intentionally zero system defaults. Existing dollar-value assertions remain intact.
- Multi-night validation uses the selected chef catalog. Weekly ranges, minimum floors, adjusted deposits, confirmations, and checklist terms honor chef policy. Weekly range calculation is extracted into a focused module.
- Calendar date strings retain their day across timezones. UTC parsing formerly shifted Friday/holiday dates to the previous day west of UTC.
- Cost refresh cache assertions now require menus and events invalidation as well as recipe/costing invalidation, matching current production behavior.
- Added tests for timezone preservation, catalog isolation, custom 30% deposits, 48-hour balance terms, configured minimums, and zero unconfigured rates.

## Local evidence (Node 20.20.2 / npm 10.8.2)

- Pricing + route policy: 187 tests passed, zero failures/skips.
- Critical suite: 225 passed, zero failures.
- Changed production-file lint: zero warnings/errors.
- Full unit runner: 3447 Node tests, 3372 passed, 75 failed; Vitest 7 files / 60 passed. Exact remaining names are in the accompanying JSON. Earlier reconciled local run had 123 failures; changes include concurrent main fixes, so the reduction is not wholly attributable to this patch.
- File-line gate still fails; existing compute file remains above baseline. No baseline/threshold changes. Evaluator is smaller after extraction.
- Regression firewall: wiring audit and app typecheck pass; chef-nav CLI Unix IPC permission failure, persona completion (four score-zero scenarios), and canonical runtime verification/restart fail. No healthy canonical server on port 3100 was established. No deployment performed.
- Existing dependency audit remains blocked by critical Next.js advisories; dependencies unchanged in this follow-up.

Fresh GitHub Actions evidence must be checked after publishing this exact tree. Local passing subsets do not prove CI green.
