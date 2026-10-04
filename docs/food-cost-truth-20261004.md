# Food-cost accuracy checkpoint — 2026-10-04

Status: BLOCKED before integration and production deployment.
Request: "Keep improving chef flows food costing"
Owner: current ChefFlow delivery agent.

Canonical repo: C:\Users\david\Documents\CFv1
Worktree: C:\Users\david\Documents\CFv1-worktrees\food-cost-truth-20261004
Branch: fix/food-cost-truth-20261004; base: 422605dd0.
Observed production: CFv1-worktrees\production-live; revision 065916ad4.
https://app.cheflowhq.com and https://cheflowhq.com and localhost:3100
returned build-version HTTP 200 with buildId 065916ad4.

## Repair

The weakest inspected view was /food-cost: missing revenue produced green 0%;
same-day revenue entries overwrote one another; purchases were labeled food consumed.
The deterministic repair returns no ratio without positive revenue, displays
Revenue needed, keeps purchase/revenue amounts visible, sums same-day entries,
labels Purchases / revenue, and links to the existing daily revenue form.
It changes no schema, auth guard, tenant scoping, or model dependency.

Acceptance: $90 purchases / ($100 + $200 revenue) = 30%, not 45%.
No revenue must not show 0% or a colored chart bar; real zero spending still
shows 0% against positive revenue. Credits and percentages >100% remain valid.
Authenticated desktop/mobile UI and the full release gate remain required.

## Evidence

43 existing calculator tests passed before the change.
Red tests reproduced the old null/overwrite defects after extraction.
51 focused tests passed after repair, repeated at test concurrency 1.
Task-scoped ESLint exited 0; Prettier and git diff --check passed.
Wiring audit passed its zero weak/orphan contract; /food-cost returned 307.
That redirect is reachability evidence, not authenticated behavior.

The required firewall FAILED: seven /studio navigation targets have no route;
Chef aaron-deluca persona gate scored 0; typecheck/runtime checks encountered
Windows paging memory exhaustion (0x800705AF / CLR failure).
Staff alec, Vendor ari-weinzweig, and their Chef interaction passed.
The firewall retry also encountered System.OutOfMemoryException.

The full unit suite was attempted and stopped after process-spawn/memory failures.
A concurrency-2 retry was stopped to preserve the PC. Observed failing files
included commerce-checkout-actions.test.ts and
commerce-checkout-item-normalization.test.ts; no full-suite pass is claimed.
Browser verification failed with Chromium VirtualAlloc errors; retry failed
during tool/runtime launching. Helper typecheck exited 134 from out-of-memory.
No screenshot, authenticated UI, production build or new deployed revision is proven.
No costing test workers remained at the final process inspection.

## Next action

Restore sufficient native-PC memory, repair the existing missing studio navigation
targets and aaron-deluca completion gate, rerun regression:firewall, then verify
authenticated /food-cost at desktop/mobile widths. Integrate only the four costing
files, complete verify:release, use the established production build/restart path,
and verify the new revision and actual behavior. Do not bypass gates.

Concurrent work and production processes were preserved.
Generated wiring-audit-results.json is excluded from this change.
Attempt logs and the rendering probe remain at
.evidence/food-cost-truth-20261004 in the worktree.


## Next improvement: small-quantity ingredient-cost precision

Branch: fix/ingredient-cost-precision-20261004, based on af041bea6.
The shared computeIngredientCost function converted quantities through a helper
that rounded to four decimals before multiplying by the ingredient price.
This erased or exaggerated small spice and liquid portions.

Using a fixture price of 400000 cents/kg, 0.03g previously cost 0 cents and
0.06g cost 40 cents. They now cost 12 and 24 cents.
Private unrounded conversion helpers retain precision for costing; exported
quantity-conversion functions preserve their existing four-decimal contract.
Auth, schemas, source prices, recipe data and model dependencies are unchanged.
Existing recipe, financial and inventory callers already use this shared function.

Six regression tests failed with the old code and passed after the repair.
128 focused tests pass: conversion engine, food-cost calculator and purchase summary.
Formatting, task-scoped ESLint, scoped TypeScript and diff checks pass.
Direct execution confirms the corrected fixture amounts.
No persisted recipe cost refresh or production behavior is claimed.

The native regression firewall was rerun with no restart and bounded step timeouts.
Navigation still fails on the seven missing studio routes; wiring passed its
zero weak/orphan route contract. Final gate details are retained in
.evidence/food-cost-truth-20261004/precision-firewall.log.
The previous production-release checkpoint still applies.
