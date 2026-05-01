# Pricing and Menus Freeze Lanes

- Date: 2026-05-01
- Branch: `feature/v1-builder-runtime-scaffold`
- Scope: `lib/pricing/**`, `lib/menus/**`
- Module owners: `pricing-trust`, `menus-offers`, and safety-adjacent menu approval and dietary behavior
- Decision: report-only cleanup. No files were deleted.

## Method

Orphan bucket means files under `lib/pricing` or `lib/menus` that are not listed in `tsconfig.ci.expanded.json`.

Proof used:

- `rg --files lib/pricing lib/menus`
- `Select-String` against `tsconfig.ci.expanded.json` for listed `lib/pricing` and `lib/menus` entries
- Exact path scans for each orphan, excluding the candidate file itself
- Symbol scans for low-ref files
- Barrel export scan for `export * from` and `export { ... } from`

No safe prune-candidates were found. The low-ref files are not simple wrappers, or they touch money, costing, client menu approval, dish feedback, menu revisions, tasting sync, rotation safety, or recipe-adjacent behavior.

## Summary

| Classification    | Count | Decision                                                                                       |
| ----------------- | ----: | ---------------------------------------------------------------------------------------------- |
| `keep/recover`    |    45 | Retain. Code reachability, relative imports, tests, scripts, or high-risk recover value found. |
| `duplicate`       |     4 | Retain for now. Plausible canonical owners exist, but the files are not simple wrappers.       |
| `uncertain`       |     7 | Retain. No live import proof, but behavior is safety, costing, feedback, or recipe-adjacent.   |
| `prune-candidate` |     0 | No deletion.                                                                                   |

## Menu Orphans

| File                                            | Classification | Owner proof and reachability                                                                                                                                           |
| ----------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/menus/canonical-dish-menu-core.ts`         | `keep/recover` | Exact code import from `lib/hub/menu-poll-actions.ts`.                                                                                                                 |
| `lib/menus/constraint-recipe-picker-actions.ts` | `keep/recover` | Exact code import from `app/(chef)/menus/[id]/page.tsx`. Recipe-adjacent read flow, not deletion-safe.                                                                 |
| `lib/menus/constraint-recipe-picker-types.ts`   | `keep/recover` | Exact type import from `components/menus/constraint-recipe-picker.tsx`.                                                                                                |
| `lib/menus/dish-feedback-query.ts`              | `uncertain`    | No live import found. Dish feedback aggregation is documented and client memory-adjacent, so recover instead of prune.                                                 |
| `lib/menus/dish-source-actions.ts`              | `keep/recover` | Exact imports from `components/culinary/menu-assembly-browser.tsx` and dynamic import from `lib/notes/workflow-actions.ts`.                                            |
| `lib/menus/estimate-actions.ts`                 | `keep/recover` | Exact imports from `components/menus/menu-cost-estimator.tsx` and system integrity tests. Costing-adjacent.                                                            |
| `lib/menus/menu-intelligence-cache.ts`          | `keep/recover` | Exact import from `lib/menus/menu-intelligence-actions.ts`.                                                                                                            |
| `lib/menus/menu-lifecycle.ts`                   | `keep/recover` | Exact import from `lib/hub/menu-poll-actions.ts` and unit coverage. Client approval lifecycle-adjacent.                                                                |
| `lib/menus/menu-share-actions.ts`               | `keep/recover` | Exact imports from public menu-pick route and menu share panel.                                                                                                        |
| `lib/menus/menu-simulator.ts`                   | `keep/recover` | Exact imports from culinary and menus simulator panels.                                                                                                                |
| `lib/menus/quick-price-actions.ts`              | `keep/recover` | Exact imports from `components/menus/quick-price-calculator.tsx`. Pricing-adjacent.                                                                                    |
| `lib/menus/recipe-book-suggestions-actions.ts`  | `keep/recover` | Exact imports from `lib/ai/menu-suggestions.ts` and `components/menus/menu-ai-suggestions-panel.tsx`. It searches existing recipe book context, not recipe generation. |
| `lib/menus/rotation-guard.ts`                   | `uncertain`    | No live import found. Rotation safety is menu and client-history adjacent, so recover instead of prune.                                                                |
| `lib/menus/tasting-menu-bridge.ts`              | `keep/recover` | Relative import from `lib/menus/tasting-menu-actions.ts`, plus direct symbol calls for materialized menu sync.                                                         |

## Pricing Orphans

| File                                         | Classification | Owner proof and reachability                                                                                                                                                                                  |
| -------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/pricing/benchmarks.ts`                  | `keep/recover` | Exact import from `components/onboarding/onboarding-steps/pricing-step.tsx`.                                                                                                                                  |
| `lib/pricing/buyable-price-contract.ts`      | `keep/recover` | Exact imports from grocery pricing, universal lookup, and unit tests.                                                                                                                                         |
| `lib/pricing/category-baseline.ts`           | `keep/recover` | Relative import from `lib/pricing/resolve-price.ts`. Price fallback behavior is not deletion-safe.                                                                                                            |
| `lib/pricing/config-actions.ts`              | `keep/recover` | Exact imports from settings forms, quotes, and correspondence code.                                                                                                                                           |
| `lib/pricing/config-types.ts`                | `keep/recover` | Exact type imports from settings, quotes, and templates.                                                                                                                                                      |
| `lib/pricing/cost-confidence.ts`             | `keep/recover` | Exact imports from costing confidence badge and unit tests.                                                                                                                                                   |
| `lib/pricing/costing-coverage-actions.ts`    | `uncertain`    | No live import found. Recipe and menu costing coverage is money and recipe-adjacent, so recover instead of prune.                                                                                             |
| `lib/pricing/cost-refresh-actions.ts`        | `keep/recover` | Exact imports from admin health, finance expense line items, recipes, and tests.                                                                                                                              |
| `lib/pricing/coverage-check.ts`              | `keep/recover` | Exact imports from price checker, grocery sidebar, and price catalog.                                                                                                                                         |
| `lib/pricing/coverage-report.ts`             | `keep/recover` | Exact import from runtime health contract.                                                                                                                                                                    |
| `lib/pricing/cross-store-average.ts`         | `keep/recover` | Exact import from pricing sync.                                                                                                                                                                               |
| `lib/pricing/event-pricing-enforcement.ts`   | `keep/recover` | Exact imports from quote send route and quote actions.                                                                                                                                                        |
| `lib/pricing/geographic-proof-actions.ts`    | `keep/recover` | Exact imports from admin pricing health route and run form.                                                                                                                                                   |
| `lib/pricing/geographic-proof-classifier.ts` | `keep/recover` | Exact imports from geographic proof query and unit tests.                                                                                                                                                     |
| `lib/pricing/geographic-proof-evidence.ts`   | `keep/recover` | Exact imports from geographic proof query and unit tests.                                                                                                                                                     |
| `lib/pricing/geographic-proof-query.ts`      | `keep/recover` | Exact imports from readiness actions, proof actions, and audit script.                                                                                                                                        |
| `lib/pricing/geography-basket.ts`            | `keep/recover` | Exact imports from proof query, evidence, and tests.                                                                                                                                                          |
| `lib/pricing/get-flagged-prices.ts`          | `keep/recover` | Exact import from chef culinary ingredients page.                                                                                                                                                             |
| `lib/pricing/ingredient-health-actions.ts`   | `keep/recover` | Exact imports from costing page, recipes ingredients page, and ingredient health banner.                                                                                                                      |
| `lib/pricing/ingredient-health-types.ts`     | `keep/recover` | Exact type import from ingredient health banner.                                                                                                                                                              |
| `lib/pricing/ingredient-matching-actions.ts` | `keep/recover` | Exact imports from ingredient match review and ingredient health banner.                                                                                                                                      |
| `lib/pricing/ingredient-matching-utils.ts`   | `keep/recover` | Dynamic imports from recipe actions and pricing auto-enrichment.                                                                                                                                              |
| `lib/pricing/insights-actions.ts`            | `duplicate`    | No live import found. Canonical live quote insight surface uses `lib/finance/pricing-insights.ts` and `lib/finance/pricing-insights-actions.ts`, but this file is not a simple wrapper, so it was not pruned. |
| `lib/pricing/name-normalizer.ts`             | `keep/recover` | Exact imports from pricing sync and nutrition enrichment.                                                                                                                                                     |
| `lib/pricing/no-blank-price-contract.ts`     | `keep/recover` | Exact imports from finance event pricing intelligence and unit tests.                                                                                                                                         |
| `lib/pricing/plate-cost-actions.ts`          | `keep/recover` | Exact import from `components/culinary/true-cost-breakdown.tsx`.                                                                                                                                              |
| `lib/pricing/price-comparison.ts`            | `duplicate`    | No live import found. Canonical live vendor comparison uses `lib/vendors/vendor-actions.ts`; grocery pricing also owns local comparison data. This file contains direct SQL logic, so it was not pruned.      |
| `lib/pricing/price-intelligence-governor.ts` | `keep/recover` | Exact import from admin health actions.                                                                                                                                                                       |
| `lib/pricing/pricing-coverage-gate.ts`       | `keep/recover` | Exact imports from admin health actions and unit tests.                                                                                                                                                       |
| `lib/pricing/pricing-decision.ts`            | `keep/recover` | Exact imports from quote actions and pricing summary components.                                                                                                                                              |
| `lib/pricing/pricing-enforcement-gate.ts`    | `keep/recover` | Exact imports from event pricing enforcement, finance event pricing intelligence, and unit tests.                                                                                                             |
| `lib/pricing/pricing-readiness-actions.ts`   | `keep/recover` | Exact imports from prices page, costing page, and readiness card.                                                                                                                                             |
| `lib/pricing/pricing-trust.ts`               | `keep/recover` | Exact imports from pricing coverage gate and unit tests.                                                                                                                                                      |
| `lib/pricing/recommend-actions.ts`           | `duplicate`    | No live import found. Formula owner is `lib/formulas/pricing-recommendation.ts`, but this action fetches event and cost data directly, so it was not pruned.                                                  |
| `lib/pricing/resolve-price.ts`               | `keep/recover` | Exact imports from tests, menu estimate actions, recipe actions, and pricing lookup. Core price resolution.                                                                                                   |
| `lib/pricing/seasonal-analysis.ts`           | `duplicate`    | No live import found. Canonical live seasonal price history appears in `lib/inventory/price-history-actions.ts`, but this file has direct SQL and is not a wrapper, so it was not pruned.                     |
| `lib/pricing/sourceability.ts`               | `keep/recover` | Exact imports from public ingredient page and availability badge.                                                                                                                                             |
| `lib/pricing/standard-unit-normalization.ts` | `keep/recover` | Exact imports from geographic proof query, evidence, and unit tests.                                                                                                                                          |
| `lib/pricing/universal-price-lookup.ts`      | `keep/recover` | Exact imports from pricing stress and module verification scripts.                                                                                                                                            |
| `lib/pricing/web-sourcing-actions.ts`        | `keep/recover` | Exact import from web sourcing panel.                                                                                                                                                                         |

## Deletion Decision

No deletes were made.

Reasons:

- No file met both requirements: no refs and clear canonical owner as a simple duplicate wrapper.
- Several unreferenced files are still safety, costing, feedback, menu, or recipe-adjacent.
- The duplicate-classified pricing files contain direct data access or business logic, not only pass-through wrapper behavior.
- `tsconfig.ci.expanded.json` did not require updates because no files were removed.

## Follow-Up Candidates

These should be handled by a later owner decision, not by freeze pruning:

| File                                      | Suggested next action                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `lib/menus/dish-feedback-query.ts`        | Decide whether to recover into the canonical dish feedback or client memory surface.                                  |
| `lib/menus/rotation-guard.ts`             | Decide whether to recover into menu builder rotation warnings.                                                        |
| `lib/pricing/costing-coverage-actions.ts` | Decide whether to recover into recipe and menu costing coverage UI.                                                   |
| `lib/pricing/insights-actions.ts`         | Decide whether to migrate any missing behavior into finance pricing insights before deletion.                         |
| `lib/pricing/price-comparison.ts`         | Decide whether any SQL behavior differs from vendor and grocery comparison owners before deletion.                    |
| `lib/pricing/recommend-actions.ts`        | Decide whether event cost fetching should become a supported wrapper around `lib/formulas/pricing-recommendation.ts`. |
| `lib/pricing/seasonal-analysis.ts`        | Decide whether any seasonal pricing behavior should merge into inventory price history.                               |
