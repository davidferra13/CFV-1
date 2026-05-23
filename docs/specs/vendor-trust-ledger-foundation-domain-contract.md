# Vendor Trust Ledger Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-vendor-trust-ledger-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Vendor Trust Ledger slices.

## Goal

Define the smallest compatible Vendor Trust Ledger contract without creating a duplicate vendor directory, supplier preference system, price oracle, purchase-order system, event assignment table, vendor communication system, or incident system. The contract composes current ChefFlow vendor, procurement, event, price, PIE, communication, receipt, and incident inputs into one chef-owned reliability and sourcing memory model.

## Fire-Time Inspection

Inspected existing vendor, supplier, sourcing, pricing, procurement, event, communication, and security files:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 4 source thesis, domain model, swarm prompt, and acceptance criteria.
- `lib/vendors/vendor-actions.ts`: current chef-owned vendor directory, price entry, preferred vendor, and tenant-scoped server action patterns.
- `lib/vendors/scorecard-actions.ts`: existing computed vendor scorecard over orders, catalog depth, price stability, manual rating, event assignments, and data completeness.
- `lib/vendors/sourcing-actions.ts`: current callable vendor queue for saved and national vendors.
- `lib/vendors/vendor-communication-actions.ts`, `vendor-communication-types.ts`, `vendor-order-draft.ts`, and `order-actions.ts`: current communication preferences, vendor orders, order status, and vendor-scoped order update boundaries.
- `lib/vendors/price-insights.ts`, `price-insights-actions.ts`, `price-normalization.ts`, `price-point-actions.ts`, `vendor-item-actions.ts`, `catalog-import-actions.ts`, and `document-intake-actions.ts`: current price, catalog, item, import, and document ingestion lanes.
- `lib/pricing/pie-national-price-oracle-contract.ts`: current PIE reliability language, final costing states, pricing proof requirements, and fallback rules.
- `lib/calling/vendor-action-extraction.ts` and related actions: vendor call extraction and action-intelligence inputs.
- `lib/communication/control-plane.ts`, quick reply modules, and vendor communication modules: safe communication and follow-up integration points.
- Vendor-related migrations: `vendors`, `vendor_price_points`, `vendor_event_assignments`, `event_vendor_deliveries`, `vendor_communication_preferences`, `vendor_orders`, `vendor_order_items`, `chef_supplier_preferences`, `supplier_calls`, `sourcing_sessions`, `vendor_call_metrics`, and receipt/vendor expense wiring.
- `lib/auth/get-user.ts` and `lib/auth/route-policy.ts`: required auth and route classification patterns for future implementation.

## No-Duplicate-System Decision

Do not add persistence in this foundation slice. The initial Vendor Trust Ledger must treat existing systems as source inputs:

- `vendors`: chef-owned vendor profile, category/type, contact, notes, preferred state, manual rating, and active state.
- `vendor_price_points`, vendor price entries, vendor items, catalog imports, document intake, and price insights: product cost and price volatility evidence.
- `vendor_event_assignments` and `event_vendor_deliveries`: event linkage, delivery schedule, amount, notes, delivery status, and route/date evidence.
- `vendor_orders` and `vendor_order_items`: order lifecycle, sent/confirmed/received timing, ingredient categories, and fulfillment evidence.
- `chef_supplier_preferences`: chef-specific preferred stores/suppliers that can bias PIE/source resolution.
- `supplier_calls`, `sourcing_sessions`, vendor call metrics, and vendor action extraction: contact attempts, quoted availability, promises, substitutions, and call outcomes.
- Expenses, receipts, purchase orders, invoices, refunds, and overcharge notes: financial/procurement evidence.
- Communications, incident/recovery modules, event closeout, Remy, and CIL: chef-reviewed reliability, issue, and follow-up signals.

Later slices may add dedicated tables only if existing storage cannot represent vendor performance events, trust score snapshots, incident capture, or review queues. Any new table must be additive, tenant-owned, RLS-protected, indexed by tenant/vendor/event/state, and must not replace the existing vendor directory, price point, vendor order, event assignment, sourcing, supplier preference, communication, purchase-order, or incident systems.

## Typed Contract

The reusable TypeScript contract lives at `lib/vendors/vendor-trust-ledger-contract.ts`.

It defines:

- `VendorProfileTrustSnapshot`: normalized chef-owned vendor profile view for reliability decisions.
- `VendorPerformanceEventContract`: source-backed performance event for late delivery, missing item, bad substitution, quality issue, overcharge, refund, exceptional quality, communication issue, allergen handling issue, recovery, and related procurement outcomes.
- `VendorTrustScoreContract`: explainable score by vendor, product category, product, route, event type, season, and client importance.
- `SourcingRiskContext`: event/menu/PIE procurement context for a vendor decision.
- `VendorSourcingRiskAssessment`: risk output with unknowns, warnings, blocking reasons, procurement warnings, PIE signals, and incident prompts.
- `PieVendorReliabilitySignal`: reliability signal that PIE can surface beside cost.
- `VendorSafeFollowupExport`: vendor-safe follow-up DTO that redacts chef-only notes.
- `VendorTrustLedgerContract`: aggregate chef-internal contract for later slices.

States and helper functions:

- `VendorPerformanceEventState`: `draft`, `observed`, `vendor_acknowledged`, `chef_confirmed`, `disputed`, `resolved`, `archived`, `unknown`.
- `VendorTrustVisibility`: `private_chef_only`, `chef_internal`, `vendor_safe_followup`, `event_safe_warning`, `pie_reliability_signal`, `client_public_never`.
- `VendorTrustBucket`: `preferred`, `reliable`, `watch`, `risky`, `blocked`, `unknown`.
- `VendorSourcingRiskState`: `clear`, `watch`, `review_required`, `blocked`, `unknown`.
- `deriveMostRestrictiveVendorTrustBucket()`: preserves unknown and blocked as non-automatic states.
- `deriveVendorSourcingRiskAssessment()`: derives conservative sourcing risk from profile state, matching scores, recent events, unresolved incidents, and missing evidence.
- `buildPieVendorReliabilitySignal()`: converts sourcing risk into a PIE-safe reliability signal.
- `buildVendorSafeFollowupExport()`: filters to vendor-safe follow-up events and strips `privateNotes`.

## Ownership Boundaries

- Owning deterministic contract: `lib/vendors`.
- Vendor directory ownership stays in `lib/vendors/vendor-actions.ts`, vendor pages, and `vendors`.
- Vendor scorecard ownership stays in `lib/vendors/scorecard-actions.ts` until a later slice proves a persisted trust-score snapshot is needed.
- Price, item, catalog, and document-intake ownership stays in the existing vendor price modules and PIE price oracle modules.
- Vendor order and communication ownership stays in `lib/vendors/vendor-communication-actions.ts`, `vendor-order-draft.ts`, `order-actions.ts`, and related tables.
- Event vendor assignment and delivery ownership stays in `vendor_event_assignments`, `event_vendor_deliveries`, event readiness, loadout, and procurement surfaces.
- Supplier preference and national/source health ownership stays in PIE/OpenClaw source modules.
- Incident and recovery ownership stays in crisis/recovery and event closeout modules. Vendor Trust Ledger may consume confirmed incident signals but must not become a second incident system.

The Vendor Trust Ledger is a synthesis and policy layer. It may read existing systems and later persist missing trust events or score snapshots, but it must not become a second vendor CRM, second purchase-order system, second PIE oracle, second communication center, second event assignment system, or hidden incident log.

## Visibility And Privacy Rules

- Default visibility is `private_chef_only`.
- Public and client surfaces must never see raw vendor trust memories, private vendor notes, disputes, pricing sensitivity, refunds, overcharges, vendor relationship concerns, or internal reliability labels.
- Chef-authenticated surfaces may display full vendor trust context.
- PIE may receive `pie_reliability_signal` fields only: vendor id/name, reliability bucket, unknown count, warning labels, final costing state, and source labels. PIE must not receive private notes.
- Event readiness and procurement surfaces may receive `event_safe_warning` fields only: warning labels, blocking reasons, vendor id/name, event id, and incident capture prompts.
- Vendor follow-up surfaces may receive only `vendor_safe_followup` event summaries and requested resolutions. Private chef notes, client names beyond order context, internal risk labels, and unrelated event data are stripped.
- Client/public surfaces may receive only explicit client-safe service status copy such as "supplier confirmed" or "ingredient availability under review." They must not receive the trust ledger.
- Remy chef mode may summarize private vendor risk. Remy client/public/vendor modes must use safe DTOs only.

## Role Boundaries

- Chef: can read and manage vendor trust context, private notes, incident captures, trust score review, sourcing risk, procurement warnings, and PIE reliability signals.
- Vendor: can read or receive only vendor-safe follow-up for its own order, delivery, or issue. Vendor access does not imply access to chef trust scores or private notes.
- Staff/delegate/collaborator: can receive only assignment-scoped event/procurement warnings required for their work.
- Client/host: may see high-level sourcing status only when explicitly exposed; no vendor trust memories, internal warnings, refunds, disputes, or private supplier notes.
- Public anonymous user: no access to Vendor Trust Ledger data.
- Admin/partner: no routine tenant vendor trust access. Admin diagnostics must be admin-gated and avoid raw tenant procurement details by default.
- Developer/build agents: can edit this contract and future implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API, server action, migration, or DB query.

All future chef-side Vendor Trust Ledger server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when the action is explicitly multi-role.
- Derive ownership from `user.entityId` or `user.tenantId!`, never request body fields or route params alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant owner check.
- Verify linked `vendor_id`, `event_id`, `vendor_order_id`, `vendor_order_item_id`, `vendor_event_assignment_id`, `delivery_id`, `expense_id`, `receipt_id`, `purchase_order_id`, `invoice_id`, `supplier_call_id`, `sourcing_session_id`, `communication_thread_id`, `incident_id`, and `client_id` belong to the same tenant before using them in trust derivation or mutation.
- Treat route params such as `params.vendorId` or `params.eventId` as selectors only after tenant ownership is proven.
- Revalidate only affected chef routes such as `/vendors`, `/vendors/[id]`, `/events/[id]`, `/procurement`, `/pricing`, `/communication`, and future vendor trust routes.

All future vendor-safe actions or APIs must:

- Authenticate with explicit vendor auth, partner auth, a scoped event token, or a signed order/delivery token before reading anything.
- Resolve the order, delivery, assignment, or communication thread first, then verify the actor is linked to that vendor and tenant.
- Return only `VendorSafeFollowupExport` or equivalent safe DTOs.
- Never expose private notes, trust scores, risk labels, unrelated event details, client household memory, pricing strategy, refunds outside the relevant order, or internal incident analysis.

All future PIE, procurement, Remy, staff/delegate, client, or public integrations must:

- Use the least-privilege DTO for that audience.
- Avoid raw trust memory reads from client/public code.
- Never infer security from UI hiding. Server-side auth and tenant scoping must exist independently.

When future routes are added, register them in `lib/auth/route-policy.ts` under the correct chef, vendor, staff, partner, admin, client, or public bucket.

## Integration Points

- Vendor profile: reuse `vendors` for identity, active state, preferred status, vendor type, contact, manual rating, notes, delivery/contact metadata where available.
- Vendor scorecard: compose existing scorecard metrics but keep the trust ledger more explicit about unknowns, incidents, substitutions, delivery, quality, and client/event sensitivity.
- Event vendor assignment and delivery: reuse `vendor_event_assignments` and `event_vendor_deliveries` as source refs for which vendor supplied which event and whether delivery timing or status created risk.
- Vendor orders: reuse `vendor_orders` and `vendor_order_items` for order timing, confirmation, receiving, ingredient category, estimated totals, missing item, and substitution evidence.
- Price and PIE: feed `PieVendorReliabilitySignal` to cost decisions so PIE can surface reliability risk beside price and block fake precision when evidence is missing.
- Price volatility: consume vendor price points, price insights, catalog imports, receipts, invoices, expenses, and price anomaly verdicts as evidence, not as raw trust by themselves.
- Procurement warnings: surface vendor risk before menu promises, ordering, quote lock, event readiness, and loadout decisions.
- Incident capture: provide event/order/delivery/source refs and prompts for missing item, bad substitution, quality issue, overcharge, refund, late delivery, allergen handling, and recovery capture.
- Communications: route vendor follow-up through existing communication controls; send only vendor-safe issue summaries and requested resolutions.
- Remy and CIL: chef mode can explain risk and missing evidence. Non-chef modes must use safe DTOs only.
- Staff/delegate/event execution: use event-safe procurement warnings for task planning; do not expose private vendor trust ledger notes.

## Unknown-State Rules

Unknowns are first-class:

- Missing vendor event history, category evidence, delivery-zone proof, lead-time proof, allergen handling proof, luxury proof, substitution history, refund/overcharge history, or recent score data is `unknown`, not trusted.
- Unknown vendor reliability blocks automatic "preferred" or "safe" wording in PIE and procurement.
- Unknowns should produce review prompts and incident-capture prompts, not fake confidence.
- Missing tenant ownership blocks all trust derivation.
- Missing event ownership blocks event-scoped risk and assignment warnings.
- Missing vendor ownership blocks all vendor trust reads and writes.
- Resolved/archived issues may inform history, but unresolved high-severity issues block automatic recommendations.

## Likely Files For Later Slices

- Contract and deterministic model: `lib/vendors/vendor-trust-ledger-contract.ts`, future `lib/vendors/vendor-trust-ledger.ts`.
- Existing vendor directory and price inputs: `lib/vendors/vendor-actions.ts`, `lib/vendors/price-point-actions.ts`, `lib/vendors/price-insights.ts`, `lib/vendors/vendor-item-actions.ts`, catalog/document intake modules, and `vendors`.
- Existing vendor scorecard: `lib/vendors/scorecard-actions.ts`.
- Existing sourcing inputs: `lib/vendors/sourcing-actions.ts`, `lib/vendors/vendor-matching.ts`, supplier calls, sourcing sessions, vendor call metrics, and national vendor data.
- Existing vendor communication/order inputs: `lib/vendors/vendor-communication-actions.ts`, `lib/vendors/vendor-order-draft.ts`, `lib/vendors/order-actions.ts`, `vendor_orders`, `vendor_order_items`, and communication modules.
- Existing event/procurement inputs: event detail/readiness/loadout modules, `vendor_event_assignments`, `event_vendor_deliveries`, shopping/procurement modules, expenses, receipts, purchase orders, and invoices.
- PIE integrations: `lib/pricing/*`, `lib/vendors/price-insights-actions.ts`, pricing recommendation surfaces, and menu costing flows.
- Future chef surfaces: vendor trust ledger, vendor detail trust tab, procurement warning card, PIE reliability badge, event readiness sourcing risk card, and mobile incident capture.
- Security registration: `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, route/API files added by later slices.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 4 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether existing vendor directory, scorecard, price, sourcing, order, event assignment, delivery, receipt, expense, purchase-order, communication, incident, PIE, or Remy modules already satisfy the requested data need.
- If adding private persistence, add `tenant_id` or `chef_id`, RLS, indexes by tenant/vendor/event/state, and explicit privacy comments.
- Confirm every server action has `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query uses `user.entityId` or `user.tenantId!` for `.eq('tenant_id', ...)` or `.eq('chef_id', ...)`.
- Confirm route additions are registered in `lib/auth/route-policy.ts`.
- Confirm every route param ID is combined with tenant ownership before data is read or mutated.
- Confirm vendor/staff/delegate/client/public outputs use only safe DTOs and never raw private notes, trust scores where not allowed, internal risk labels, client household memory, pricing strategy, unrelated event details, or incident analysis.
- Add tests for trust computation, unknown state, tenant isolation, route guessing, private note leakage, PIE reliability labels, procurement warning visibility, event risk visibility, vendor-safe follow-up, incident capture, mobile quick capture, and empty/error/loading states when behavior is implemented.

## Acceptance Mapping

- Domain objects: defined in `lib/vendors/vendor-trust-ledger-contract.ts`.
- States: performance event state, visibility, trust bucket, sourcing risk state, PIE final state, source ref, signal, severity, client importance, and vendor status are explicit.
- Ownership: this document assigns Vendor Trust Ledger to `lib/vendors` as a synthesis contract while preserving existing vendor, price, sourcing, order, event assignment, delivery, communication, procurement, PIE, incident, and Remy ownership.
- Visibility: private chef-only, chef-internal, vendor-safe follow-up, event-safe warning, PIE reliability signal, and client/public-never boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef, vendor, staff/delegate/collaborator, client/host, public, admin/partner, and developer boundaries are explicit.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage and source modules remain authoritative for the foundation slice.
