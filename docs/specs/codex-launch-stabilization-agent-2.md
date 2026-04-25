# Codex Build Spec: Launch Stabilization - Agent 2 (Projected Cost Pipeline)

> **Priority:** P0. Pre-event margins lie because labor/travel/overhead are hardcoded to 0.
> **Risk:** LOW. 1 file changed. No DB migrations. No UI changes.
> **Verification already done:** The helper function `computeProjectedNonFoodCosts` already exists at line 415 and is called at line 555. The return object at line 695 already references the computed variables. HOWEVER, the function still has hardcoded zeros on line 132-134 inside the `bucketExpenses` helper.

---

## CRITICAL RULES FOR CODEX

1. Read `lib/finance/event-pricing-intelligence-actions.ts` COMPLETELY before making any changes.
2. Touch ONLY this one file.
3. Do NOT add any new imports.
4. Do NOT change the return type shapes.
5. Do NOT change any other file.
6. After changes, run: `node scripts/run-typecheck.mjs -p tsconfig.ci.json`
7. Commit with message: `fix(finance): verify projected cost pipeline wiring is complete`

---

## Task: Verify and Complete Projected Cost Wiring

**File:** `lib/finance/event-pricing-intelligence-actions.ts`

This file has PARTIAL work done. The `computeProjectedNonFoodCosts` helper function exists (line 415) and is called (line 555). The `projected` return object (line 695) references `projectedLaborCostCents`, `projectedTravelCostCents`, `projectedOverheadCostCents`.

### What to verify:

1. Read the entire file.
2. Confirm that `projectedLaborCostCents`, `projectedTravelCostCents`, and `projectedOverheadCostCents` are defined as variables (not just in the return object).
3. Confirm that `projectedTotalCostCents` sums ALL four cost layers (food + labor + travel + overhead), not just food.
4. Check that the `bucketExpenses` function (around line 128) uses zeros ONLY as initial accumulator state (this is correct; it accumulates from actual expense records, not projections).

### If the wiring is complete:

Report that the projected cost pipeline is fully wired. Run typecheck. Commit with message: `chore(finance): verify projected cost pipeline wiring complete`

### If you find any variable that is still hardcoded to 0 where it should reference computed data:

Fix it following the pattern already established:

- `projectedLaborCostCents` should come from `projectedNonFood.laborCostCents`
- `projectedTravelCostCents` should come from `projectedNonFood.travelCostCents`
- `projectedOverheadCostCents` should come from `projectedNonFood.overheadCostCents`
- `projectedTotalCostCents` should equal `projectedFoodCostCents + projectedLaborCostCents + projectedTravelCostCents + projectedOverheadCostCents`

---

## What NOT to Do

- Do NOT change `bucketExpenses` initial zero values (those are accumulator starting points, not projections)
- Do NOT add new DB queries (the helper already queries what it needs)
- Do NOT change the return type
- Do NOT touch any UI components
- Do NOT add imports
- Do NOT touch `lib/formulas/true-plate-cost.ts` or `lib/pricing/plate-cost-actions.ts`
