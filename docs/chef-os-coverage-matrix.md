# ChefFlow Chef OS Coverage Matrix

**Status:** Canonical operational completeness baseline
**Baseline date:** 2026-09-24
**Machine-readable source:** `config/chef-os-coverage.json`
**Verifier:** `scripts/verify-chef-os-coverage.mjs`

## Product Rule

If a supported chef or restaurant operator must manually leave ChefFlow to perform a normal internal operating task, that workflow is incomplete.

An external provider may remain underneath ChefFlow. Banks, card networks, payroll rails, vendor systems, tax authorities, mapping providers, email providers, and printer drivers do not need to be reimplemented. The operator-facing workflow still belongs in ChefFlow whenever integration can make that possible.

Physical work is not an app-completeness failure. Cooking, driving, receiving a physical box, repairing equipment, and an authority action that legally requires a government destination are physical or authority boundaries. ChefFlow must still prepare the action, preserve context, capture the result, and continue the workflow without duplicate entry.

## Completion States

| State | Meaning |
| --- | --- |
| `not_built` | No trustworthy ChefFlow workflow exists. |
| `partial` | Part of the workflow exists, but the operator cannot reliably finish the whole job in ChefFlow. |
| `functional` | The core task works in ChefFlow, but downstream propagation, audit proof, failure recovery, or live verification is incomplete. |
| `closed_loop_verified` | The task starts and finishes in ChefFlow, updates every required downstream system, preserves history, handles failure honestly, and has current verification evidence. |

Only `closed_loop_verified` means complete.
## Baseline

The initial canonical matrix contains **114 internal workflows**.

| State | Count |
| --- | ---: |
| closed-loop verified | 0 |
| functional | 81 |
| partial | 33 |
| not built | 0 |
| workflows with a known manual external step | 10 |

This deliberately replaces the weaker practice of treating an existing page, route, table, or server action as proof that a business workflow is complete.

The existing `docs/feature-inventory.md` remains useful for implementation discovery. Its historical `complete` status means the feature family exists. It does not establish Chef OS closed-loop completeness.

## Chronological Coverage

The 114 workflows are ordered through these operating phases:

1. foundation
2. ingredients
3. vendors
4. culinary
5. planning
6. procurement
7. receiving
8. inventory
9. kitchen
10. food safety
11. service
12. closeout
13. finance
14. people
15. facilities
16. compliance
17. documents
18. management
19. platform

The JSON manifest is the canonical row-level matrix. Every workflow records status, whether a manual external step remains, implementation evidence, and the current closure gap.
## Closed-Loop Test

A workflow can move to `closed_loop_verified` only when all of these are true:

1. The operator can start the task from ChefFlow.
2. The operator can finish the normal digital portion without manually moving information into another app.
3. Required provider actions are invoked or synchronized from ChefFlow when an integration can reasonably do so.
4. The result updates every dependent ChefFlow record automatically.
5. Failures are visible and recoverable. No false success and no silent zero or empty state.
6. The original source material is retained when relevant, including receipts, invoices, photos, confirmations, and documents.
7. History shows what happened, who or what did it, and when.
8. A current automated or live runtime proof demonstrates the full loop.

A feature screenshot, database table, server action, or successful isolated unit test is not enough by itself.

## Immediate Closure Priorities

The highest-leverage incomplete chains in the baseline are:

1. **receipt and vendor invoice chain**
   photo or file -> OCR -> vendor -> line items -> PO match -> receiving match -> discrepancy -> inventory -> ingredient price -> AP -> searchable source -> reconciliation

2. **procurement chain**
   forecast -> recipe demand -> inventory available -> reorder recommendation -> PO -> vendor transmission -> confirmation -> receiving -> invoice -> credit resolution

3. **recipe production chain**
   approved recipe version -> issued production version -> prep assignment -> batch -> actual yield -> portions -> labels -> inventory -> costing variance

4. **sale to truth chain**
   POS or event sale -> recipe depletion -> inventory -> waste and exception adjustments -> COGS -> prime cost -> daily flash -> ledger

5. **labor to payroll chain**
   forecast -> schedule -> timeclock -> breaks and overtime -> approval -> payroll -> payroll liability -> payment evidence -> reconciliation
6. **safety and traceability chain**
   receiving lot -> storage -> batch -> recipe -> service or event -> guest exposure -> recall query -> corrective action -> evidence

7. **period close chain**
   invoices -> expenses -> bank and processor settlement -> inventory valuation -> COGS -> AP and AR -> payroll liabilities -> tax liabilities -> P&L -> balance sheet -> cash flow -> close evidence

## Enforcement

Run:

`npm run verify:chef-os-coverage`

This validates the matrix itself and is part of the normal regression firewall.

Run:

`npm run verify:chef-os-complete`

This is the hard completeness gate. It fails until every tracked workflow is `closed_loop_verified` and no workflow requires a manual external step.

The strict command is expected to fail today. That failure is the correct representation of product truth.

## Maintenance Rule

Any new normal internal operating workflow must be added to `config/chef-os-coverage.json` in the same change that introduces it.

Do not downgrade the definition of complete to make the score improve. Close the workflow instead.
