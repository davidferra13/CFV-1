# Private Chef Financial Cockpit Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-private-chef-financial-cockpit-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Private Chef Financial Cockpit slices.

## Goal

Define the smallest compatible Private Chef Financial Cockpit contract without creating a duplicate finance, invoice, ledger, expense, tax, pricing, quote, client, dashboard, or Remy system. The contract composes existing ChefFlow finance data into one private chef-owned stability model for cash runway, receivables, overdue risk, tax set-aside estimates, client concentration, margin risk, and quote implications.

## Fire-Time Inspection

Inspected existing finance-adjacent files and modules:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 7 product thesis, domain model, swarm prompt, and acceptance criteria.
- `app/(chef)/finance/*`: existing chef finance routes for overview, cash flow, invoices, overdue invoices, expenses, tax, reporting, retainers, ledger, payouts, payments, and planning.
- `lib/finance/index.ts`: existing finance public API and action ownership map.
- `lib/finance/cash-flow-actions.ts` and `lib/intelligence/cashflow-projections.ts`: current cash-flow/runway forecast inputs, `requireChef()` pattern, and tenant scoping through `user.tenantId!`.
- `lib/finance/concentration-risk.ts` and `lib/finance/concentration-actions.ts`: current client revenue concentration computation and tenant-scoped ledger reads.
- `lib/finance/margin-calculator.ts`, `lib/finance/profitability-cockpit-actions.ts`, `lib/finance/event-pricing-intelligence.ts`, and `lib/pricing/*`: existing margin, food-cost, pricing, PIE, and event profitability lanes.
- `lib/finance/tax-estimate-actions.ts`, `lib/finance/tax-prep-actions.ts`, `lib/reports/tax-prep.ts`, and tax routes: current quarterly estimate, tax prep, CPA export, and tax package lanes.
- `lib/invoices/*`, `components/dashboard/invoice-pulse-widget.tsx`, `app/(chef)/finance/invoices/*`, `app/api/v2/invoices/*`, and document invoice routes: existing invoice, send, reminder, and paid/overdue surfaces.
- `lib/quotes/actions.ts`, `lib/quotes/*`, quote routes, quote cost/price confidence modules, and `app/api/v2/quotes/*`: current quote ownership and tenant authorization patterns.
- `lib/ledger/*`, `app/api/v2/ledger/route.ts`, `event_financial_summary`, and financial system-integrity tests: existing ledger truth and financial summary sources.
- `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, and `lib/api/v2/middleware.ts`: current route, action, and API auth/tenant boundary patterns.

## No-Duplicate-System Decision

Do not add persistence in this foundation slice. The initial Financial Cockpit is a synthesis contract over existing source systems:

- Cash runway derives from ledger entries, event financial summaries, expenses, payment plans, optional bank-feed/manual cash position, tax estimates, and known obligations.
- Receivables and overdue risk derive from invoice/event financial summaries, invoice delivery state, payment plan installments, outstanding balances, and event dates.
- Tax set-aside estimates derive from tax quarterly estimates, chef tax configuration, Schedule C/tax prep summaries, ledger income, and deductible expenses. They are estimates and must carry disclaimers.
- Client concentration derives from ledger payment history, clients, events, and existing `computeConcentrationRisk()`.
- Margin risk derives from event financial summary, expenses, menu economics, PIE, pricing confidence, margin snapshots, and profitability cockpit data.
- Quote implications derive from quotes, quote cost/price confidence, pricing decisions, payment terms, deposit terms, client concentration, receivables, runway, and margin risk.
- Insurance renewal and debt pressure start as private manual inputs only where source data does not already exist. They must not become public/client facts.

Later slices may add dedicated private tables only if existing systems cannot represent a necessary manual input, review state, or source attribution. Any new tables must be additive, tenant-owned, RLS-protected, indexed by tenant/status/date, and must not replace the ledger, invoices, expenses, tax, pricing, quotes, or client systems.

## Typed Contract

The reusable TypeScript contract lives at `lib/finance/private-chef-financial-cockpit-contract.ts`.

It defines:

- `PrivateChefFinancialCockpitContract`: tenant-owned private aggregate for runway, receivables, tax set-aside, client concentration, margin risk, quote implications, missing inputs, source refs, and overall state.
- `CashRunwayContract`: cash on hand, expected receivables, expected expenses, tax set-aside, known obligations, burn rate, runway days, confidence, and missing inputs.
- `ReceivablesRiskContract`: outstanding and overdue amounts, unpaid/overdue counts, oldest due date, payment-schedule exposure, state, and evidence.
- `TaxSetAsideEstimateContract`: income, deductible expenses, estimated self-employment/federal/state tax, recommended set-aside, paid amount, required disclaimer, missing inputs, and confidence.
- `ClientConcentrationFinancialRiskContract`: top-client share, Herfindahl index, concentrated revenue, state, and source refs.
- `MarginRiskContract`: portfolio/client/event/quote margin state, revenue, known cost, estimated profit, target margin, and missing inputs.
- `QuoteFinancialImplicationContract`: quote-level private stability implication, deposit/price/scope recommendation, runway delta, private pressure reasons, and client-safe terms.
- `ClientSafeQuoteFinancialSummary`: redacted client-safe terms that never expose cash pressure, debt pressure, tax risk, margin leak, client concentration, or runway details.

States and helpers:

- `FinancialCockpitRiskState`: `healthy`, `watch`, `warning`, `critical`, `blocked`, `unknown`.
- `FinancialCockpitVisibilityLevel`: `private_only`, `chef_internal`, `client_safe_summary`, `never_publish`.
- `deriveMostRestrictiveFinancialState()`: combines financial states for aggregate risk.
- `isPrivateFinancialVisibility()`: identifies private/non-publishable levels.
- `getRequiredFinancialSourceSystems()`: maps signal kinds to existing source systems to prevent duplicate ownership.
- `buildClientSafeQuoteFinancialSummary()`: redacts private pressure into narrow terms language.
- `summarizePrivateFinancialCockpitState()`: derives aggregate cockpit state from component states.

## Ownership Boundaries

- Owning domain for the deterministic contract: `lib/finance`.
- Ledger truth stays in `lib/ledger`, ledger routes, ledger entries, and event financial summary views.
- Invoice ownership stays in `lib/invoices`, finance invoice routes, invoice delivery, reminders, and API v2 invoice routes.
- Expense ownership stays in `lib/finance/expense-*`, `lib/expenses/*`, expense routes, receipt scanning, and tax-category modules.
- Tax ownership stays in `lib/finance/tax-*`, CPA export, tax prep, quarterly estimate, and tax package modules.
- Pricing and margin ownership stays in PIE, pricing, menu economics, cost propagation, profitability cockpit, and margin snapshot modules.
- Quote ownership stays in `lib/quotes` and quote routes/actions.
- Client portfolio and concentration ownership stays in clients, ledger-derived revenue history, and existing client contribution/concentration modules.
- Dashboard/rail surfaces may consume a derived private summary, but they do not own the source financial facts.
- Remy may consume a chef-only summary, but client/public Remy responses may only use redacted client-safe quote terms.

The Financial Cockpit is a private synthesis and decision contract. It may read existing systems, but it must not become a second ledger, invoice system, tax workflow, pricing engine, quote engine, client CRM, or dashboard source of truth.

## Visibility Rules

- Default visibility is `private_only`.
- Private facts include cash runway, cash on hand, bank balances, debt pressure, tax exposure, late-payment sensitivity, client concentration, insurance renewal pressure, known obligations, margin leaks, runway deltas, and quote pressure reasons.
- Chef-authenticated surfaces may display private financial facts for decision-making.
- Client/public/staff/vendor/partner surfaces must not display raw cockpit data.
- Client-safe quote language may include only terms such as deposit timing, scope review, price review, payment milestone, or alternative scope. It must not say the chef is short on cash, over-concentrated in a client, behind on tax set-aside, carrying debt, exposed to a low-margin month, or pressured by insurance/obligations.
- Public profile, public discovery, public quote pages, and client portals must not infer financial pressure from hidden private state.
- Tax estimate copy must be clearly presented as an estimate and not as legal/accounting advice.

## Role Boundaries

- Chef: can read and manage private cockpit inputs, manual stability notes, risk review state, and quote implications.
- Client: may receive only explicit client-safe quote/payment terms or approved invoice/payment information they already own.
- Public anonymous user: no access to cockpit data.
- Staff/vendor/partner: no default access to cockpit data. Future access must be explicit, least-privilege, and limited to operational summaries.
- Admin: no routine access to tenant private financial cockpit data. Admin diagnostics must be `requireAdmin()`-gated and avoid raw private facts by default.
- Developer/build agents: can edit this contract and future implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API route, server action, migration, or DB query.

All future chef-side Financial Cockpit server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when a justified multi-role action exists.
- Derive ownership from `user.entityId` or `user.tenantId!`, never from route params, request body fields, client-submitted tenant ids, slugs, or tokens alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant check.
- Verify linked `event_id`, `invoice_id`, `payment_plan_id`, `expense_id`, `quote_id`, `client_id`, `tax_estimate_id`, `ledger_entry_id`, `bank_transaction_id`, and `margin_snapshot_id` belong to the same tenant before using them.
- Treat manual cash, debt, insurance, and stability notes as private tenant data with explicit source refs and review timestamps.
- Revalidate only affected chef routes such as `/finance`, `/finance/overview`, `/finance/cash-flow`, `/finance/invoices`, `/finance/invoices/overdue`, `/finance/tax`, `/finance/reporting`, `/quotes`, `/dashboard`, and future cockpit routes.

All future client/public APIs must:

- Avoid raw Financial Cockpit reads.
- Return only explicit public invoice/payment data already authorized to that client, or `ClientSafeQuoteFinancialSummary`-style terms.
- Avoid exposing tenant ids, cash runway, cash balances, private tax estimates, margin/cost data, debt pressure, client concentration, private notes, source refs, or quote pressure reasons.
- Never rely on UI hiding as the security boundary.

If a future page route is added, register it in `lib/auth/route-policy.ts` under the correct chef/client/public/staff/partner/admin array.

## Integration Points

- Cash runway: compose `ledger_entries`, `event_financial_summary`, payment schedules, upcoming expenses, manual cash position, bank-feed transactions when available, and tax set-aside estimates. Missing bank/cash data must stay explicit.
- Receivables: compose invoice delivery state, outstanding event balances, payment plan installments, overdue invoice routes, invoice reminders, and event dates.
- Overdue risk: derive from due dates, sent invoice state, unpaid installments, client payment behavior, and outstanding balance age.
- Tax set-aside: compose quarterly tax estimates, chef tax config, CPA export/tax prep summaries, deductible expenses, income history, and paid amounts with disclaimer-required output.
- Client concentration: reuse `computeConcentrationRisk()` and ledger/client/event history.
- Margin risk: compose event financial summary, expenses, profitability cockpit, food-cost/plate-cost modules, PIE pricing, quote cost intelligence, and margin snapshots.
- Quote implications: attach private recommendations to quote/pricing decisions for deposit, reprice, reduce scope, decline, or review. Client-facing output must use redacted payment/scope terms only.
- Seasonal volatility: compose revenue forecast, ledger history, events, inquiries, and quote pipeline where available.
- Known obligations: use existing expenses/payment plans first; use manual private inputs only for obligations not represented elsewhere.
- Dashboard/rail: later UI may show a private financial pulse, but it should derive from this contract and existing source systems.
- Remy: chef mode may summarize private financial state. Client/public mode may not expose cockpit state and must use safe summaries only.

## Unknown And Incomplete-State Rules

Unknowns are first-class:

- Missing cash-on-hand or bank-feed data means runway confidence is low and runway days may be `null`.
- Missing receivable due dates means overdue risk is `unknown`, not healthy.
- Missing tax configuration means set-aside estimate is `unknown` or `watch` and must show missing inputs.
- Missing event/quote costs means margin risk is `unknown` and quote launch should require review.
- Missing client revenue history means concentration confidence is low.
- Missing deposit terms means quote implication cannot be treated as fully safe.
- Missing insurance or debt data must not be invented.

Later UI should show missing inputs as review items, not fake precision.

## Likely Files For Later Slices

- Contract and deterministic model: `lib/finance/private-chef-financial-cockpit-contract.ts`, future `lib/finance/private-chef-financial-cockpit.ts`, future `lib/finance/private-chef-financial-cockpit-actions.ts`.
- Cash runway: `lib/finance/cash-flow-actions.ts`, `lib/intelligence/cashflow-projections.ts`, `lib/finance/revenue-forecast-run.ts`, bank-feed actions, payment plans, expenses, and ledger modules.
- Receivables/invoices: `lib/invoices/*`, `lib/finance/payment-reminder-actions.ts`, invoice routes, invoice pulse widgets, payment plan actions, and API v2 invoices.
- Tax: `lib/finance/tax-estimate-actions.ts`, `lib/finance/tax-prep-actions.ts`, `lib/finance/cpa-export-actions.ts`, `lib/reports/tax-prep.ts`, and tax routes.
- Concentration: `lib/finance/concentration-risk.ts`, `lib/finance/concentration-actions.ts`, client contribution modules, clients/events/ledger inputs.
- Margin and pricing: `lib/finance/margin-calculator.ts`, `lib/finance/profitability-cockpit-actions.ts`, `lib/finance/event-pricing-intelligence.ts`, `lib/pricing/*`, `lib/quotes/quote-cost-intelligence.ts`, and margin snapshot modules.
- Quote implications: `lib/quotes/actions.ts`, quote builder/compare/cost components, quote API routes, pricing confidence modules, and Remy output filtering.
- Future chef surfaces: finance cockpit route, dashboard private finance card, quote private implication panel, client detail private financial stability panel, and rail private finance alert.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 7 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether an existing finance, ledger, invoice, tax, quote, pricing, or client source already owns the requested fact before adding persistence.
- If adding persistence, add `tenant_id` or `chef_id`, RLS, tenant/date/status indexes, and explicit privacy comments.
- Confirm every server action has `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant-data query scopes through `user.entityId` or `user.tenantId!`.
- Confirm linked event, invoice, expense, quote, client, tax, payment-plan, ledger, and margin records are same-tenant before use.
- Confirm client/public/staff outputs use only safe DTOs and never raw cockpit facts.
- Confirm route registration in `lib/auth/route-policy.ts` when routes are added.
- Add tests for risk state derivation, unknown/missing data, tenant isolation, source-system reuse, quote redaction, tax disclaimer behavior, and private financial leakage prevention.

## Acceptance Mapping

- Domain objects: defined in `lib/finance/private-chef-financial-cockpit-contract.ts`.
- States: financial signal kinds, risk states, visibility levels, confidence, missing inputs, margin subjects, and quote recommendations are explicit.
- Ownership: this document assigns the synthesis contract to `lib/finance` while preserving ledger, invoices, expenses, tax, pricing, quotes, clients, dashboard, and Remy ownership.
- Visibility: private/default, chef-internal, client-safe terms, and never-publish boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff-vendor-partner/admin/developer boundaries are explicit.
- Route/API/server-action implications: future actions require `requireChef()` or justified `requireAuth()`, tenant scoping via `user.entityId` or `user.tenantId!`, linked-record ownership checks, route-policy registration, and safe DTOs.
- Fire-time inspection checklist: included above.
- No duplicate system: existing finance storage and source modules remain authoritative for this foundation slice.
