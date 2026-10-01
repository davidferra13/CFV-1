# Grocery unit integrity delivery - 2026-10-01

Status: implementation and focused verification complete; release held. Branch: `fix/grocery-unit-integrity-20261001`, based on `origin/main` at `3fa5a0818494e557f5fb679f6268bdb537a58cde`.

## Behavior

Before: an ingredient with 2 cups and 8 ounces, without density, became 10 cups. Both event grocery generation and multi-event shopping used raw addition when measurements could not be converted. Initial shopping/print failures also became empty lists with zero cost.

After: incompatible units cause an ingredient-specific calculation error. Fluid ounces, deciliters and milligrams use canonical conversion factors. The arithmetic helper rejects negative/non-finite inputs and refuses non-finite density for cross-family conversion. Existing successful density conversions remain supported. Initial page failures reach the existing chef error boundary. The print page now reuses the existing client `PrintButton`, replacing a server-page no-op event handler and an inline script listener; browser printing still needs authenticated runtime verification.

No upstream project code was incorporated. No database migration, live data write, new route, auth change or paid service was introduced.

## Focused proof

- Red: 13 of 24 arithmetic tests failed before the fix; the three action regressions also failed before the action changes.
- Red: both server-page regressions failed while errors were swallowed.
- Green: 29/29 tests pass with `node --test --import tsx tests/unit/grocery-cross-type-merge.test.ts tests/unit/grocery-unit-integrity.test.ts tests/unit/grocery-action-unit-integrity.test.ts`.
- Focused typecheck exits 0 using an ignored configuration extending the repository tsconfig, including the arithmetic helper and three tests, disabling incremental state/plugins. Command: `node --max-old-space-size=2048 node_modules/typescript/bin/tsc -p .agents/tmp/grocery-unit-integrity.tsconfig.json --noEmit --skipLibCheck --pretty false`.
- Actions execute from real source with isolated database/auth fixtures. Pages execute from real source with their action dependency replaced. These tests do not demonstrate live database behavior, authenticated UI, print rendering or successful retry interaction.

## Repository checks and release limits

- Initial full TypeScript preflight ran out of heap (exit 134). A 12 GB compiler retry exceeded its 180-second bound. This is not a passing full application typecheck.
- First regression firewall run passed completion-claim, navigation, wiring and ingredient identity checks, then exceeded an outer 120-second bound during the local-model persona gate.
- Final firewall command: `npm run regression:firewall -- --no-restart --step-timeout-ms 60000 --route-probe-timeout-ms 5000`. It exceeded a 720-second outer bound while the app-typecheck subprocess remained open; the task-owned process tree was stopped and the launcher exited 1. Navigation/wiring/15 ingredient checks passed, and simulation forge reported 25 cases with zero violations. The persona step produced no final verdict. App typecheck and canonical runtime/affected-route verification did not complete. This is a release blocker, not a passing gate.
- Focused ESLint initially crashed with native exit 3221226505 and no diagnostics. An unchanged configuration retry with a 1 GB Node heap passed all eight changed TypeScript/TSX files (exit 0).
- Native authenticated state was absent in the task and canonical source worktrees, so no authenticated browser proof was obtained.
- Live baseline: `/api/build-version` returned HTTP 200 with build `065916ad4`. Strict readiness returned HTTP 503: env/database/circuit-breaker/background-job checks were ok; AI runtime was degraded with reason `local_only_in_production`. No production changes were made.

## Domain review and remaining UI proof

Menu Intelligence: existing recipe scaling and yield-adjustment inputs still feed both grocery actions; compatible conversion is exercised in the event action fixture. PIE: the pricing resolver remains the existing source; errors no longer become initial zero-cost page data, but price-unit basis is a separate open issue. Client Intelligence: existing chef/tenant checks remain in the actions and pages; fixtures do not prove live isolation. No event, payment, notification or Circle state mutation was added.

The wiring matrix identifies both shopping routes and highlights Page X-Ray. Neither route had an existing scan record. A complete first-page survey, Rail resolver review and authenticated error/retry/print interaction proof remain pending; this delivery does not claim a completed Page X-Ray scan. Source review found a `prep-shopping` Rail profile for `/prep` and `/shopping`, which does not itself match the `/culinary/prep/shopping` routes; fallback profile/resolver behavior must be assessed separately.

Captured verification output lives in [the proof folder](grocery-unit-integrity-20261001/). The original mutable wiring report is excluded from this commit; a scoped summary is retained in that folder.

## Follow-on work

The cooking parity spec is still in progress. Pantry stock must be compared using compatible units before deduction; price estimates need an explicit quantity/unit basis. Imports/exports, nested recipes, household sharing, expiry handling and full mobile cooking workflows need separate source and runtime evidence. This delivery does not claim complete parity with Mealie, Tandoor, Grocy or KitchenOwl.
