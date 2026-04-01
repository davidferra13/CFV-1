# Research: Chef Tax Export Intent and Gap Check

> **Date:** 2026-04-01
> **Question:** Does the CPA-ready tax export spec fully capture the developer's audit-first intent, and what nuance had to be attached so a builder can execute without inventing scope?
> **Status:** complete

## Origin Context

The developer did not ask for a generic accounting feature plan. The ask was to audit ChefFlow's real tax readiness with proof, convert that audit directly into a minimal build plan, and preserve the reasoning behind the rules so a builder understands why the scope is narrow and why shortcuts are unacceptable. That intent is now permanently attached to the spec in the expanded Developer Notes and execution translation. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:25-68`

The developer's standard was strict: if something cannot be verified in code, schema, or seeded data, it does not count; if a CPA would still need spreadsheet repair, reclassification, or off-system reconstruction, the system fails; and if any nuance in the conversation was underdeveloped in the spec, it had to be filled before handoff. That standard is now reflected in the spec's transcript outline, intent section, builder fence, and validation/final-check sections. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:29-68` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:567-575` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:579-744`

## Summary

The updated spec now captures the real developer intent correctly: this is an audit repair pass, not a finance-product redesign, and the repo justifies that posture because ChefFlow already has real finance primitives but multiple accountant-facing outputs still disagree on revenue truth and one core aggregation view is mathematically unsafe. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:47-68` `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:1003-1029` `app/(chef)/finance/export/route.ts:15-59` `lib/exports/actions.ts:225-426` `app/(chef)/finance/year-end/year-end-client.tsx:53-95` `lib/tax/actions.ts:219-298`

The fidelity-critical layer is now explicit inside the spec itself. The current spec contains transcript outline, developer intent, builder-usable requirements, constraints, behaviors, and an explicit fence against greenfield redesign, which is the level of nuance the developer asked to preserve for the builder. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:25-68` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:567-575`

Two real unknowns remain, both already surfaced honestly rather than hidden: live-tenant frequency of split tax treatment on a single expense, and historical data completeness in real tenants. The spec treats both as operational follow-up or export blockers, not as places to guess. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:602-610` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:736-744`

## Detailed Findings

### 1. The developer was asking for truth-testing, not feature invention

The updated spec now says explicitly that the job is to audit reality, prove what exists, prove what is broken, and close only verified gaps. It also says the builder must treat the work as an audit repair plan rather than permission to invent adjacent accounting workflows. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:29-45` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:57-68` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:567-575`

That framing is justified by the repo itself. ChefFlow already has real finance, tax, event, menu, and commerce surfaces in place, so the work is not "build a finance module from scratch." The finance hub, reporting pages, Year-End pages, Tax Center pages, event/ledger schemas, expense tax mapping table, commerce tables, payroll tables, and sales-tax tables all exist today. `docs/app-complete-audit.md:662-719` `app/(chef)/finance/page.tsx:67-170` `app/(chef)/finance/reporting/page.tsx:13-101` `app/(chef)/finance/year-end/page.tsx:35-108` `app/(chef)/finance/tax/page.tsx:12-41` `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:104-445` `database/migrations/20260401000013_expense_tax_categories.sql:9-32` `database/migrations/20260328000001_commerce_engine_foundation.sql:126-297` `database/migrations/20260320000010_payroll_system.sql:46-81`

### 2. The builder needs the "why" because the current code invites plausible but wrong shortcuts

The strongest example is `event_financial_summary`. The current view joins `ledger_entries` and `expenses` in the same grouped rowset, which multiplies totals when both sides have multiple rows. It also takes tips from `events.tip_amount_cents` instead of tip ledger rows. A builder who does not understand why the audit is strict could easily reuse this because it looks like the canonical event finance view. `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:1003-1029`

The repo also has multiple accountant-facing output paths with different truth definitions. `/finance/export` streams ledger rows only, the all-events export uses the broken event summary, the Year-End client builds an accountant CSV from mixed P&L data, and `lib/tax/actions.ts` creates a separate accountant export path. That is why the updated spec now insists on one export, one truth source, and one canonical dataset. `app/(chef)/finance/export/route.ts:15-59` `lib/exports/actions.ts:225-426` `app/(chef)/finance/year-end/year-end-client.tsx:53-95` `lib/tax/actions.ts:219-298` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:49-55` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:59-67`

Other current pages still use shortcuts that would recreate the same failure if a builder copied their logic forward. Profit by Event uses `quoted_price_cents`, the reconciliation page compares payments against quoted event value, Revenue by Month buckets by `created_at`, and `lib/finance/tax-package.ts` mixes stale schema, quoted price, and status-based filters. That is why the spec now translates the conversation into concrete behaviors: revenue must come from realized cash and normalized settlement/refund data, not quoted price, event status, or completed-event counts. `app/(chef)/finance/reporting/profit-by-event/page.tsx:36-48` `app/(chef)/finance/payouts/reconciliation/page.tsx:48-63` `app/(chef)/finance/reporting/revenue-by-month/page.tsx:35-44` `lib/finance/tax-package.ts:52-150` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:65-68`

The "visible failure is better than fake completeness" nuance is also grounded in the current repo. Several finance pages still fall back to unavailable/reference-only states while presenting hard numbers or placeholder surfaces. The spec now preserves the developer's reasoning here because this area is especially vulnerable to quiet lies. `app/(chef)/finance/sales-tax/page.tsx:19-32` `app/(chef)/finance/payroll/page.tsx:20-23` `app/(chef)/finance/contractors/page.tsx:15-23` `app/(chef)/finance/reporting/profit-loss/page.tsx:15-38` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:53-54` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:573-575`

### 3. What nuance now exists in the spec for builder handoff

The current spec does not stop at build scope. It now carries transcript logic, execution consequences, and a builder-facing scope fence directly inside the document, which is the level of permanent context the developer requested. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:25-68` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:567-575`

This pass closed that fidelity gap in four ways:

- The spec now includes a transcript-outline section that preserves the audit-first framing, the harsh proof standard, the full-chain validation demand, the wide accounting-reality checklist, and the "no spreadsheet repair" standard. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:27-45`
- The spec now translates the conversation into explicit system-level intent, including one truth source, explainability, visible blockers, and no reconstruction as the success condition. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:47-55`
- The spec now includes builder-usable execution translation in the form of concrete requirements, constraints, and behaviors, instead of leaving the developer's reasoning implicit. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:57-68`
- The builder notes now explicitly say this is an audit repair pass, not a greenfield finance redesign. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:567-575`

### 4. Gap check against the actual codebase

No additional product-scope gap was found that requires widening the spec beyond what it already defines. The current spec already covers the current broken aggregation layer, duplicate export paths, unsafe tax-classification aggregation, stale schema helpers, quoted-price reporting logic, continuous-ops normalization, finance controls, owner draws, implementation order, success criteria, and non-negotiable constraints. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:84-95` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:579-744`

The remaining builder risks are execution risks, not missing-scope risks. The highest-risk breakpoints are current consumers of `event_financial_summary`, duplicate tax logic that can drift if left alive, and pages that still present quoted-price or `created_at` figures as accounting truth. The spec already names those risks explicitly. `lib/dashboard/actions.ts:17-57` `lib/client-portal/actions.ts:251-269` `lib/finance/invoice-payment-link-actions.ts:47-82` `lib/tax/actions.ts:145-298` `lib/finance/tax-package.ts:52-150` `lib/finance/tax-prep-actions.ts:359-427` `app/(chef)/finance/reporting/profit-by-event/page.tsx:36-48` `app/(chef)/finance/payouts/reconciliation/page.tsx:53-63` `app/(chef)/finance/reporting/revenue-by-month/page.tsx:35-44` `app/(chef)/finance/reporting/tax-summary/page.tsx:27-45` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:612-624`

## Gaps and Unknowns

- Live-tenant frequency of split tax treatment for a single expense is still unverified. The spec intentionally chooses one authoritative mapping row per expense per year and treats split treatment as follow-up scope if real operator demand appears. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:602-610`
- Historical data completeness in real tenants remains operationally unknown. The spec is explicit that the export must block and surface missing information rather than infer it. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:736-744`
- Fee allocation from `settlement_records` to individual payments is specified for the build, but the report did not verify seeded runtime coverage of every payout-shape edge case. The spec already flags this as an underspecified area that needed explicit implementation rules. `database/migrations/20260328000003_commerce_reconciliation.sql:72-80` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:618-624`

## Recommendations

- **quick fix:** Treat the updated Developer Notes and builder notes as part of the execution contract, not optional prose. They now contain the scope fences and truth rules that protect the build from drifting into another parallel accounting path. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:25-68` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:567-575`
- **quick fix:** When the builder starts, remove or repoint duplicate accountant-facing export paths early. Leaving them alive while new UI work proceeds is the fastest way to reintroduce divergent totals. `app/(chef)/finance/export/route.ts:15-59` `lib/exports/actions.ts:225-426` `app/(chef)/finance/year-end/year-end-client.tsx:53-95` `lib/tax/actions.ts:219-298` `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:590-600`
- **needs discussion:** If real tenants regularly need one raw expense split across multiple tax treatments, that deserves a follow-up spec instead of stretching this one with unverified complexity. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:602-610`
- **needs spec:** If ChefFlow ever needs accrual accounting, automated depreciation schedules, or broader bookkeeping workflows, that is separate scope. This spec is intentionally cash-basis and export-focused. `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md:726-744`
