# P1 Work Continuity Drift Guard

Status: ready for builder
Priority: P1
Created: 2026-04-24
Scope: additive guardrails for the repo-local Work Continuity Control Plane

## Highest-Leverage Action

Build an additive drift guard for the Work Continuity Control Plane: a deterministic verification script and unit-test coverage that prove the generated JSON/report still satisfy the source-backed continuity contract after docs, session logs, and research notes change.

This is the highest-leverage remaining action inside the work-continuity scope because the first slice created the index and report, but the control plane can still silently become misleading if a source line moves, a required seed item disappears, the generated report is stale, or the Start Here recommendation changes without review.

## Evidence

- The original P0 requires a source-backed registry/dashboard, not a prose-only handoff (`docs/specs/p0-work-continuity-control-plane.md:10`, `docs/specs/p0-work-continuity-control-plane.md:32`).
- The original P0 explicitly requires missing source files to warn rather than hard-fail (`docs/specs/p0-work-continuity-control-plane.md:106`).
- The original P0 requires at least 10 seed items and exactly one Start Here recommendation (`docs/specs/p0-work-continuity-control-plane.md:210`, `docs/specs/p0-work-continuity-control-plane.md:212`).
- The generated report currently has exactly one Start Here recommendation, pointing at ticketed events repair (`docs/research/work-continuity-index.md:33`, `docs/research/work-continuity-index.md:35`).
- The generated report currently records 14 configured source files and no source warnings (`docs/research/work-continuity-index.md:227`, `docs/research/work-continuity-index.md:229`, `docs/research/work-continuity-index.md:231`).
- The current implementation hardcodes the Start Here item and renders source warnings, but there is no artifact-level freshness guard in the generator itself (`lib/work-continuity/build-index.ts:21`, `lib/work-continuity/build-index.ts:134`, `lib/work-continuity/build-index.ts:140`).
- Current unit coverage exercises parsers, normalization, missing-source behavior, and stable sorting, but not the generated JSON/report contract as an artifact (`tests/unit/work-continuity-index.test.ts:27`, `tests/unit/work-continuity-index.test.ts:46`, `tests/unit/work-continuity-index.test.ts:66`, `tests/unit/work-continuity-index.test.ts:73`, `tests/unit/work-continuity-index.test.ts:86`).

## Non-Goals

- Do not change product workflows.
- Do not resolve any indexed work item.
- Do not add external services.
- Do not add an admin UI.
- Do not require a clean worktree.
- Do not make missing optional source files fail generation.

## Deliverable

Add a focused drift-guard layer around the existing generator.

Minimum outputs:

1. `scripts/verify-work-continuity-index.mjs`
2. `tests/unit/work-continuity-artifact-contract.test.ts`
3. If needed, small exported helpers in `lib/work-continuity/build-index.ts`

Optional, only if it stays tiny:

- Add an npm script such as `"verify:work-continuity": "node scripts/verify-work-continuity-index.mjs"`.

## Required Behavior

The verifier must:

1. Regenerate the work-continuity artifacts in memory or in place using the existing generator.
2. Read `reports/work-continuity-index.json`.
3. Read `docs/research/work-continuity-index.md`.
4. Assert the JSON contains all required seed IDs:
   - `built-but-unverified-specs`
   - `ticketed-events-critical-blockers`
   - `openclaw-health-split`
   - `openclaw-cadence-policy-scattered`
   - `survey-handoff-demotion`
   - `preserved-dirty-checkout-policy`
   - `openclaw-social-ingestion-boundary`
   - `vr-mr-source-drift`
   - `ingredient-pricing-coverage-risk`
   - `mempalace-live-query-failure`
5. Assert every item has at least one `sourcePaths` entry.
6. Assert every `sourcePaths` entry with a `line` points to an existing line in the referenced file.
7. Assert source lines with labels still resolve to non-empty text.
8. Assert the markdown report contains exactly one `## Start Here` heading.
9. Assert the markdown Start Here recommendation matches `index.startHere`.
10. Assert JSON count totals match the item list.
11. Assert warnings are allowed only for missing source files or explicit parser evidence misses, and are printed clearly.
12. Exit non-zero only for parser/runtime/contract failures, not for missing optional source files already represented as warnings.

## Test Coverage

Add unit tests covering:

- required seed IDs are enforced
- source line references resolve against real files
- report Start Here count is exactly one
- report Start Here text matches JSON
- count totals match indexed items
- missing optional source behavior remains warning-based, not fatal

Prefer temporary directories for mutation-sensitive tests where practical. Avoid relying on a clean git checkout.

## Acceptance Criteria

- `node scripts/generate-work-continuity-index.mjs` exits `0`.
- `node scripts/verify-work-continuity-index.mjs` exits `0`.
- `node --test --import tsx tests/unit/work-continuity-index.test.ts tests/unit/work-continuity-artifact-contract.test.ts` exits `0`.
- `npm run typecheck` exits `0`, unless blocked by unrelated checkout issues documented in the closeout.
- The verifier reports item count, warning count, and Start Here recommendation.
- No product workflow behavior changes.

## Handoff Output For Next Session

After implementation, append a session-log entry that states:

- whether the drift guard passed
- indexed item count
- warning count
- current Start Here recommendation
- verification commands run
- any source files missing or parse-skipped
